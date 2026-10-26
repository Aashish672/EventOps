import pytest
from agents.models import AgentRun, ChangeLogEntry
from agents.services import apply_agent_proposal, reject_agent_proposal
from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied, ValidationError
from django.utils import timezone
from events.models import BudgetCategory, Event, Task
from organizations.models import Membership, Organization

User = get_user_model()

@pytest.fixture
def test_setup(db):
    org = Organization.objects.create(name="Apex Agency", slug="apex-agency")
    owner = User.objects.create_user(username="owner", email="owner@apex.dev", password="pw")
    planner = User.objects.create_user(username="planner", email="planner@apex.dev", password="pw")
    unauthorized_user = User.objects.create_user(username="stranger", email="stranger@other.dev", password="pw")
    Membership.objects.create(organization=org, user=owner, role="owner")
    Membership.objects.create(organization=org, user=planner, role="planner")
    now = timezone.now()
    event = Event.objects.create(
        organization=org,
        name="Global Summit",
        start_date=now,
        end_date=now + timezone.timedelta(days=2),
    )
    task = Task.objects.create(
        organization=org,
        event=event,
        title="Rigging Setup",
        status="todo",
    )
    category = BudgetCategory.objects.create(
        organization=org,
        event=event,
        name="Production",
        allocated_amount="10000.00",
    )
    return {
        "org": org,
        "owner": owner,
        "planner": planner,
        "unauthorized_user": unauthorized_user,
        "event": event,
        "task": task,
        "category": category,
    }
@pytest.mark.django_db
def test_apply_agent_proposal_updates_task_and_logs_audit(test_setup):
    """Verify that approving a proposal updates the task and writes an immutable ChangeLogEntry."""
    event = test_setup["event"]
    task = test_setup["task"]
    owner = test_setup["owner"]
    proposed_diff = {
        "mutations": [
            {
                "action": "update",
                "entity_type": "Task",
                "entity_id": str(task.id),
                "fields": {"status": "in_progress", "title": "Rigging Setup (Updated)"},
            }
        ]
    }
    agent_run = AgentRun.objects.create(
        organization=test_setup["org"],
        event=event,
        agent_type=AgentRun.AgentType.RISK_CHANGE_IMPACT,
        trigger="schedule_change",
        reasoning="Shifting task to in progress due to early equipment delivery.",
        proposed_diff=proposed_diff,
        state=AgentRun.State.PENDING,
    )
    # Execute single write path
    updated_run = apply_agent_proposal(str(agent_run.id), user=owner)
    # 1. Check AgentRun state
    assert updated_run.state == AgentRun.State.APPROVED
    assert updated_run.reviewed_by == owner
    assert updated_run.reviewed_at is not None
    # 2. Check task mutation
    task.refresh_from_db()
    assert task.status == "in_progress"
    assert task.title == "Rigging Setup (Updated)"
    # 3. Check ChangeLogEntry audit record
    logs = ChangeLogEntry.objects.filter(agent_run=agent_run)
    assert logs.count() == 1
    log = logs.first()
    assert log.entity_type == "Task"
    assert log.entity_id == str(task.id)
    assert log.actor_type == ChangeLogEntry.ActorType.AGENT
    assert log.before["status"] == "todo"
    assert log.after["status"] == "in_progress"
@pytest.mark.django_db
def test_apply_agent_proposal_rejects_unauthorized_user(test_setup):
    """Verify that an unauthorized user cannot approve proposals."""
    event = test_setup["event"]
    stranger = test_setup["unauthorized_user"]
    agent_run = AgentRun.objects.create(
        organization=test_setup["org"],
        event=event,
        agent_type=AgentRun.AgentType.EVENT_PLANNING,
        trigger="manual",
        proposed_diff={"mutations": []},
        state=AgentRun.State.PENDING,
    )
    with pytest.raises(PermissionDenied):
        apply_agent_proposal(str(agent_run.id), user=stranger)
    agent_run.refresh_from_db()
    assert agent_run.state == AgentRun.State.PENDING
@pytest.mark.django_db
def test_reject_agent_proposal_makes_no_mutations(test_setup):
    """Verify that rejecting a proposal marks it rejected and mutates zero business records."""
    event = test_setup["event"]
    task = test_setup["task"]
    planner = test_setup["planner"]
    agent_run = AgentRun.objects.create(
        organization=test_setup["org"],
        event=event,
        agent_type=AgentRun.AgentType.RISK_CHANGE_IMPACT,
        trigger="date_shift",
        reasoning="Proposing to cancel task.",
        proposed_diff={
            "mutations": [
                {
                    "action": "update",
                    "entity_type": "Task",
                    "entity_id": str(task.id),
                    "fields": {"status": "done"},
                }
            ]
        },
        state=AgentRun.State.PENDING,
    )
    # Execute rejection
    rejected_run = reject_agent_proposal(str(agent_run.id), user=planner, rejection_reason="Not needed.")
    assert rejected_run.state == AgentRun.State.REJECTED
    assert "Not needed." in rejected_run.reasoning
    # Verify task was NOT modified
    task.refresh_from_db()
    assert task.status == "todo"
    # Verify ZERO ChangeLogEntry records created
    assert ChangeLogEntry.objects.filter(agent_run=agent_run).count() == 0


@pytest.mark.django_db
def test_apply_agent_proposal_missing_entity_raises_validation_error(test_setup):
    """Verify that targeting a non-existent entity raises a clean ValidationError."""
    event = test_setup["event"]
    owner = test_setup["owner"]
    agent_run = AgentRun.objects.create(
        organization=test_setup["org"],
        event=event,
        agent_type=AgentRun.AgentType.RISK_CHANGE_IMPACT,
        trigger="schedule_check",
        proposed_diff={
            "mutations": [
                {
                    "action": "update",
                    "entity_type": "Task",
                    "entity_id": "00000000-0000-0000-0000-000000000000",
                    "fields": {"status": "done"},
                }
            ]
        },
        state=AgentRun.State.PENDING,
    )
    with pytest.raises(ValidationError) as exc_info:
        apply_agent_proposal(str(agent_run.id), user=owner)
    assert "does not exist in this organization" in str(exc_info.value)


@pytest.mark.django_db
def test_apply_budget_category_dynamic_field_updates(test_setup):
    """Verify that updating BudgetCategory supports both name and allocated_amount."""
    category = test_setup["category"]
    owner = test_setup["owner"]
    agent_run = AgentRun.objects.create(
        organization=test_setup["org"],
        event=test_setup["event"],
        agent_type=AgentRun.AgentType.BUDGET_INTELLIGENCE,
        trigger="rebalance",
        proposed_diff={
            "mutations": [
                {
                    "action": "update",
                    "entity_type": "BudgetCategory",
                    "entity_id": str(category.id),
                    "fields": {"name": "Audio Visual & Rigging", "allocated_amount": "15000.00"},
                }
            ]
        },
        state=AgentRun.State.PENDING,
    )
    apply_agent_proposal(str(agent_run.id), user=owner)
    category.refresh_from_db()
    assert category.name == "Audio Visual & Rigging"
    assert str(category.allocated_amount) == "15000.00"


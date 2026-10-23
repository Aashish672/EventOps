from datetime import timedelta

import pytest
from agents.models import AgentRun
from agents.orchestration.engine import TaskDependencyEngine
from django.utils import timezone
from events.models import Event, Task, VendorBooking
from organizations.models import Organization
from vendors.models import Vendor


@pytest.fixture
def engine_data(db):
    """Provides a fresh multi-tenant event environment with tasks and vendors."""
    org = Organization.objects.create(name="Acme Corp", slug="acme-corp")
    now = timezone.now().replace(microsecond=0)

    event = Event.objects.create(
        organization=org,
        name="Tech Conference 2026",
        start_date=now + timedelta(days=10),
        end_date=now + timedelta(days=12),
        status="planning",
    )

    # 1. Normal active task
    task_active = Task.objects.create(
        organization=org,
        event=event,
        title="Finalize keynote presentation",
        due_date=now + timedelta(days=5),
        status="todo",
    )

    # 2. Completed task (should be skipped)
    task_done = Task.objects.create(
        organization=org,
        event=event,
        title="Initial venue deposit",
        due_date=now + timedelta(days=1),
        status="done",
    )

    # 3. Task without due date
    task_no_date = Task.objects.create(
        organization=org,
        event=event,
        title="Send social media reminders",
        due_date=None,
        status="todo",
    )

    # 4. Catering vendor and booking
    caterer = Vendor.objects.create(
        organization=org,
        name="Grand Feast Catering",
        category="catering",
    )
    booking = VendorBooking.objects.create(
        organization=org,
        event=event,
        vendor=caterer,
        status="contract_sent",
        agreed_price="5000.00",
    )

    # 5. Catering-specific task
    task_catering = Task.objects.create(
        organization=org,
        event=event,
        title="Review dinner menu options",
        due_date=now + timedelta(days=6),
        status="in_progress",
    )

    return {
        "org": org,
        "event": event,
        "task_active": task_active,
        "task_done": task_done,
        "task_no_date": task_no_date,
        "task_catering": task_catering,
        "vendor": caterer,
        "booking": booking,
        "now": now,
    }


# ============================================================================
# TASK DEPENDENCY ENGINE UNIT TESTS
# ============================================================================


def test_evaluate_date_shift_forward_proportional(engine_data):
    """Moving an event forward shifts active task due dates proportionally."""
    event = engine_data["event"]
    task_active = engine_data["task_active"]
    task_done = engine_data["task_done"]

    old_start = event.start_date
    new_start = old_start + timedelta(days=5)

    report = TaskDependencyEngine.evaluate_date_shift(
        event=event,
        old_start_date=old_start,
        new_start_date=new_start,
        old_end_date=event.end_date,
        new_end_date=event.end_date + timedelta(days=5),
    )

    assert report.delta_days == 5.0
    assert report.risk_severity in ("low", "medium", "high")

    # Completed tasks must be ignored
    affected_ids = [t.task_id for t in report.affected_tasks]
    assert str(task_done.id) not in affected_ids
    assert str(task_active.id) in affected_ids

    # Active task should have its proposed due date shifted by +5 days
    active_analysis = next(t for t in report.affected_tasks if t.task_id == str(task_active.id))
    assert active_analysis.suggested_action == "shift_due_date"
    assert active_analysis.proposed_due_date == task_active.due_date + timedelta(days=5)

    # Verify mutations comply with Single Write Path
    mutations = report.to_proposal_mutations()
    assert len(mutations) >= 1
    match = next(m for m in mutations if m["entity_id"] == str(task_active.id))
    assert match["action"] == "update"
    assert match["entity_type"] == "Task"
    assert match["fields"]["due_date"] == active_analysis.proposed_due_date.isoformat()


def test_evaluate_date_shift_critical_conflict(engine_data):
    """Tasks proposed past the new event end date are flagged as critical bottlenecks."""
    event = engine_data["event"]
    task_active = engine_data["task_active"]

    old_start = event.start_date
    new_start = old_start + timedelta(days=5)
    # Intentionally set a constricted new end date that precedes the shifted task deadline
    constricted_end = task_active.due_date + timedelta(days=2)

    report = TaskDependencyEngine.evaluate_date_shift(
        event=event,
        old_start_date=old_start,
        new_start_date=new_start,
        old_end_date=event.end_date,
        new_end_date=constricted_end,
    )

    assert report.risk_severity == "critical"
    active_analysis = next(t for t in report.affected_tasks if t.task_id == str(task_active.id))
    assert active_analysis.has_conflict is True
    assert active_analysis.suggested_action == "escalate_bottleneck"


def test_evaluate_vendor_cancellation_catering(engine_data):
    """Cancelling a caterer detects dependent tasks by keyword and sets critical severity."""
    event = engine_data["event"]
    booking = engine_data["booking"]
    task_catering = engine_data["task_catering"]
    task_active = engine_data["task_active"]

    report = TaskDependencyEngine.evaluate_vendor_cancellation(
        event=event,
        booking=booking,
    )

    assert report.risk_severity == "critical"
    assert len(report.vendor_fallouts) == 1
    assert report.vendor_fallouts[0]["vendor_name"] == "Grand Feast Catering"

    # Catering task should be flagged
    affected_ids = [t.task_id for t in report.affected_tasks]
    assert str(task_catering.id) in affected_ids
    # Unrelated keynote task should NOT be flagged
    assert str(task_active.id) not in affected_ids


# ============================================================================
# DJANGO SIGNAL INTEGRATION TESTS
# ============================================================================


def test_signal_event_date_shift_creates_agent_run(engine_data):
    """Saving an event with shifted start_date triggers the signal and creates a pending AgentRun."""
    event = engine_data["event"]

    # Shift start date by 4 days
    event.start_date = event.start_date + timedelta(days=4)
    event.end_date = event.end_date + timedelta(days=4)
    event.save()

    # Verify AgentRun was created
    runs = AgentRun.objects.filter(
        event=event,
        agent_type=AgentRun.AgentType.RISK_CHANGE_IMPACT,
    )
    assert runs.count() == 1

    run = runs.first()
    assert run.state == AgentRun.State.PENDING
    assert "event_date_shifted_forward" in run.trigger
    assert "mutations" in run.proposed_diff
    assert len(run.proposed_diff["mutations"]) >= 1


def test_signal_event_unchanged_date_creates_no_agent_run(engine_data):
    """Updating non-date fields on an event does NOT trigger agent proposals."""
    event = engine_data["event"]

    event.description = "Updated description with no schedule change"
    event.save()

    runs = AgentRun.objects.filter(
        event=event,
        agent_type=AgentRun.AgentType.RISK_CHANGE_IMPACT,
    )
    assert runs.count() == 0


def test_signal_vendor_cancellation_creates_agent_run(engine_data):
    """Setting a booking status to 'rejected' creates a pending AgentRun with vendor fallout."""
    event = engine_data["event"]
    booking = engine_data["booking"]

    booking.status = "rejected"
    booking.save()

    runs = AgentRun.objects.filter(
        event=event,
        agent_type=AgentRun.AgentType.RISK_CHANGE_IMPACT,
    )
    assert runs.count() == 1

    run = runs.first()
    assert run.state == AgentRun.State.PENDING
    assert "vendor_cancelled" in run.trigger
    assert run.proposed_diff["vendor_fallouts"][0]["vendor_name"] == "Grand Feast Catering"

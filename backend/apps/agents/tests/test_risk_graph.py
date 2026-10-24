from datetime import timedelta

import pytest
from agents.orchestration.graph import (
    evaluate_ripple_effects_node,
    generate_remediation_proposal_node,
    inspect_context_node,
    run_risk_impact_agent,
)
from agents.orchestration.llm import MockRiskImpactLLM
from agents.orchestration.schemas import (
    RiskRemediationProposal,
    TaskAdjustment,
)
from agents.orchestration.state import AgentState
from django.utils import timezone
from events.models import BudgetCategory, BudgetLineItem, Event, Task, VendorBooking
from organizations.models import Organization
from vendors.models import Vendor


@pytest.fixture
def graph_test_data(db):
    """Provides a fresh multi-tenant event environment for graph testing."""
    org = Organization.objects.create(name="Starlight Events", slug="starlight-events")
    now = timezone.now().replace(microsecond=0)

    event = Event.objects.create(
        organization=org,
        name="Global Leadership Forum 2026",
        start_date=now + timedelta(days=20),
        end_date=now + timedelta(days=22),
        status="planning",
    )

    task = Task.objects.create(
        organization=org,
        event=event,
        title="Stage & Lighting Setup",
        due_date=now + timedelta(days=19),
        status="todo",
    )

    budget_cat = BudgetCategory.objects.create(
        organization=org,
        event=event,
        name="Audio/Visual",
        allocated_amount="12000.00",
    )
    BudgetLineItem.objects.create(
        organization=org,
        event=event,
        category=budget_cat,
        description="Stage Trussing",
        estimated_cost="5000.00",
    )

    vendor = Vendor.objects.create(
        organization=org,
        name="Apex Soundworks",
        category="entertainment",
    )
    VendorBooking.objects.create(
        organization=org,
        event=event,
        vendor=vendor,
        status="booked",
        agreed_price="4500.00",
    )

    return {
        "org": org,
        "event": event,
        "task": task,
        "budget_cat": budget_cat,
        "vendor": vendor,
        "now": now,
    }


# ============================================================================
# INDIVIDUAL NODE TESTS
# ============================================================================


def test_inspect_context_node(graph_test_data):
    """Node 1 must gather snapshots of event, tasks, budget, and vendors."""
    event = graph_test_data["event"]
    org = graph_test_data["org"]

    initial_state: AgentState = {
        "event_id": str(event.id),
        "org_id": str(org.id),
        "trigger": "Manual risk check",
        "event_summary": {},
        "tasks_snapshot": [],
        "budget_snapshot": {},
        "vendors_snapshot": [],
        "reasoning": "",
        "errors": [],
        "raw_proposal": {},
        "proposed_diff": {},
    }

    result = inspect_context_node(initial_state)

    assert result["event_summary"]["name"] == "Global Leadership Forum 2026"
    assert len(result["tasks_snapshot"]) == 1
    assert result["tasks_snapshot"][0]["title"] == "Stage & Lighting Setup"
    assert len(result["budget_snapshot"]["categories"]) == 1
    assert len(result["vendors_snapshot"]) == 1


def test_evaluate_ripple_effects_node(graph_test_data):
    """Node 2 invokes the LLM with structured output and returns reasoning."""
    event = graph_test_data["event"]
    org = graph_test_data["org"]
    task = graph_test_data["task"]

    custom_proposal = RiskRemediationProposal(
        risk_severity="high",
        impact_summary="AV vendor contract is tight. Recommending schedule shift.",
        reasoning="Stage setup deadline should be adjusted to allow buffer.",
        task_adjustments=[
            TaskAdjustment(
                task_id=str(task.id),
                title=task.title,
                proposed_due_date=(task.due_date + timedelta(days=2)).isoformat(),
                suggested_action="shift_due_date",
                reason="Buffer extension",
            )
        ],
        budget_adjustments=[],
    )

    mock_llm = MockRiskImpactLLM(canned_proposal=custom_proposal)

    state: AgentState = {
        "event_id": str(event.id),
        "org_id": str(org.id),
        "trigger": "AV schedule slip",
        "event_summary": {"name": event.name},
        "tasks_snapshot": [{"id": str(task.id), "title": task.title}],
        "budget_snapshot": {},
        "vendors_snapshot": [],
        "reasoning": "",
        "errors": [],
        "raw_proposal": {},
        "proposed_diff": {},
    }

    result = evaluate_ripple_effects_node(state, llm=mock_llm)

    assert result["reasoning"] == custom_proposal.reasoning
    assert result["raw_proposal"]["risk_severity"] == "high"
    assert len(result["raw_proposal"]["task_adjustments"]) == 1


def test_generate_remediation_proposal_node(graph_test_data):
    """Node 3 must format task and budget adjustments into Single Write Path mutations."""
    task = graph_test_data["task"]
    budget_cat = graph_test_data["budget_cat"]

    state: AgentState = {
        "event_id": str(graph_test_data["event"].id),
        "org_id": str(graph_test_data["org"].id),
        "trigger": "test",
        "event_summary": {},
        "tasks_snapshot": [],
        "budget_snapshot": {},
        "vendors_snapshot": [],
        "reasoning": "Test reasoning",
        "errors": [],
        "raw_proposal": {
            "risk_severity": "critical",
            "impact_summary": "Critical vendor delay",
            "task_adjustments": [
                {
                    "task_id": str(task.id),
                    "title": task.title,
                    "proposed_due_date": "2026-11-20T10:00:00Z",
                    "suggested_action": "shift_due_date",
                    "reason": "Postponed",
                }
            ],
            "budget_adjustments": [
                {
                    "category_id": str(budget_cat.id),
                    "category_name": budget_cat.name,
                    "recommended_buffer": "15000.00",
                    "reason": "AV contingency reserve",
                }
            ],
        },
        "proposed_diff": {},
    }

    result = generate_remediation_proposal_node(state)
    proposed_diff = result["proposed_diff"]

    assert proposed_diff["risk_severity"] == "critical"
    mutations = proposed_diff["mutations"]
    assert len(mutations) == 2

    # Task mutation check
    task_mut = next(m for m in mutations if m["entity_type"] == "Task")
    assert task_mut["action"] == "update"
    assert task_mut["entity_id"] == str(task.id)
    assert task_mut["fields"]["due_date"] == "2026-11-20T10:00:00Z"

    # Budget mutation check
    budget_mut = next(m for m in mutations if m["entity_type"] == "BudgetCategory")
    assert budget_mut["action"] == "update"
    assert budget_mut["entity_id"] == str(budget_cat.id)
    assert budget_mut["fields"]["allocated_amount"] == "15000.00"


# ============================================================================
# END-TO-END WORKFLOW INTEGRATION TESTS
# ============================================================================


def test_full_risk_impact_agent_workflow(graph_test_data):
    """The compiled LangGraph workflow executes end-to-end and produces Single Write Path mutations."""
    event = graph_test_data["event"]
    org = graph_test_data["org"]
    task = graph_test_data["task"]

    canned = RiskRemediationProposal(
        risk_severity="medium",
        impact_summary="Event schedule moved forward by 3 days.",
        reasoning="Adjusted task deadlines to maintain 24h operational buffer.",
        task_adjustments=[
            TaskAdjustment(
                task_id=str(task.id),
                title=task.title,
                proposed_due_date="2026-11-18T10:00:00Z",
                suggested_action="shift_due_date",
                reason="Proportional timeline shift",
            )
        ],
        budget_adjustments=[],
    )

    mock_llm = MockRiskImpactLLM(canned_proposal=canned)

    final_state = run_risk_impact_agent(
        event_id=str(event.id),
        org_id=str(org.id),
        trigger="Event shifted forward 3 days",
        llm=mock_llm,
    )

    assert final_state["reasoning"] == canned.reasoning
    assert final_state["proposed_diff"]["risk_severity"] == "medium"
    assert len(final_state["proposed_diff"]["mutations"]) == 1
    assert final_state["proposed_diff"]["mutations"][0]["entity_id"] == str(task.id)


def test_graph_tenant_isolation(graph_test_data):
    """Running the agent with an unauthorized org_id must fail gracefully without data leakage."""
    event = graph_test_data["event"]
    other_org = Organization.objects.create(name="Other Corp", slug="other-corp")

    final_state = run_risk_impact_agent(
        event_id=str(event.id),
        org_id=str(other_org.id),
        trigger="Unauthorized probe",
        llm=MockRiskImpactLLM(),
    )

    # Event summary must report error and tasks must be empty
    assert "error" in final_state["event_summary"]
    assert len(final_state["tasks_snapshot"]) == 0

from datetime import timedelta

import pytest
from agents.orchestration.llm import MockEventPlanningLLM
from agents.orchestration.planning_graph import (
    decompose_and_plan_node,
    generate_plan_proposal_node,
    inspect_planning_context_node,
    run_event_planning_agent,
)
from agents.orchestration.schemas import (
    EventPlanProposal,
    MilestoneBlueprint,
    TaskBlueprint,
)
from agents.orchestration.state import AgentState
from django.contrib.auth import get_user_model
from django.utils import timezone
from events.models import Event, Task
from organizations.models import Membership, Organization

User = get_user_model()


@pytest.fixture
def planning_test_data(db):
    """Provides an organization, team membership, and event environment for planning tests."""
    org = Organization.objects.create(name="Apex Productions", slug="apex-productions")
    now = timezone.now().replace(microsecond=0)

    user = User.objects.create_user(
        username="lead_planner",
        email="planner@apexevents.com",
        password="secretpassword123",
    )
    Membership.objects.create(organization=org, user=user, role="coordinator")

    event = Event.objects.create(
        organization=org,
        name="Global Tech Summit 2026",
        description="Flagship annual technology conference with 1,000 attendees.",
        start_date=now + timedelta(days=30),
        end_date=now + timedelta(days=32),
        status="draft",
    )

    task = Task.objects.create(
        organization=org,
        event=event,
        title="Initial Venue Inquiry",
        due_date=now + timedelta(days=5),
        status="done",
    )

    return {
        "org": org,
        "event": event,
        "user": user,
        "task": task,
        "now": now,
    }


# ============================================================================
# INDIVIDUAL NODE TESTS
# ============================================================================


def test_inspect_planning_context_node(planning_test_data):
    """Node 1 must gather snapshots of event summary, tasks, and team members."""
    event = planning_test_data["event"]
    org = planning_test_data["org"]

    initial_state: AgentState = {
        "event_id": str(event.id),
        "org_id": str(org.id),
        "trigger": "Initial event roadmap creation",
        "event_summary": {},
        "tasks_snapshot": [],
        "budget_snapshot": {},
        "vendors_snapshot": [],
        "team_snapshot": [],
        "planning_options": {},
        "reasoning": "",
        "errors": [],
        "raw_proposal": {},
        "proposed_diff": {},
    }

    result = inspect_planning_context_node(initial_state)

    assert result["event_summary"]["name"] == "Global Tech Summit 2026"
    assert len(result["tasks_snapshot"]) == 1
    assert result["tasks_snapshot"][0]["title"] == "Initial Venue Inquiry"
    assert len(result["team_snapshot"]) == 1
    assert result["team_snapshot"][0]["email"] == "planner@apexevents.com"
    assert result["team_snapshot"][0]["role"] == "coordinator"


def test_decompose_and_plan_node(planning_test_data):
    """Node 2 invokes the planning LLM and stores reasoning & structured raw_proposal."""
    event = planning_test_data["event"]
    org = planning_test_data["org"]

    custom_proposal = EventPlanProposal(
        plan_summary="Custom operational roadmap with 3 milestones and 12 tasks.",
        event_category="Conference",
        milestones=[
            MilestoneBlueprint(
                name="Concept & Permitting",
                target_date="2026-11-01T10:00:00Z",
                description="Finalize permits and insurance",
            )
        ],
        tasks=[
            TaskBlueprint(
                title="File City Permit",
                description="Submit permit application",
                due_date="2026-11-01T10:00:00Z",
                suggested_role="planner",
                priority="high",
                milestone_name="Concept & Permitting",
            )
        ],
        reasoning="Test reverse-scheduling reasoning chain.",
    )

    mock_llm = MockEventPlanningLLM(canned_proposal=custom_proposal)

    state: AgentState = {
        "event_id": str(event.id),
        "org_id": str(org.id),
        "trigger": "Create roadmap",
        "event_summary": {"name": event.name, "start_date": str(event.start_date)},
        "tasks_snapshot": [],
        "budget_snapshot": {},
        "vendors_snapshot": [],
        "team_snapshot": [{"email": "planner@apexevents.com", "role": "coordinator"}],
        "planning_options": {"category": "Conference"},
        "reasoning": "",
        "errors": [],
        "raw_proposal": {},
        "proposed_diff": {},
    }

    result = decompose_and_plan_node(state, llm=mock_llm)

    assert result["reasoning"] == custom_proposal.reasoning
    assert result["raw_proposal"]["plan_summary"] == custom_proposal.plan_summary
    assert len(result["raw_proposal"]["tasks"]) == 1
    assert result["raw_proposal"]["tasks"][0]["title"] == "File City Permit"


def test_generate_plan_proposal_node(planning_test_data):
    """Node 3 must map synthesized TaskBlueprints into Single Write Path 'create' mutations."""
    state: AgentState = {
        "event_id": str(planning_test_data["event"].id),
        "org_id": str(planning_test_data["org"].id),
        "trigger": "test",
        "event_summary": {},
        "tasks_snapshot": [],
        "budget_snapshot": {},
        "vendors_snapshot": [],
        "team_snapshot": [],
        "planning_options": {},
        "reasoning": "Roadmap synthesized",
        "errors": [],
        "raw_proposal": {
            "plan_summary": "Roadmap summary",
            "event_category": "Conference",
            "milestones": [
                {
                    "name": "Phase 1: Permits",
                    "target_date": "2026-11-01T10:00:00Z",
                    "description": "Permit phase",
                }
            ],
            "tasks": [
                {
                    "title": "Secure Venue Permit",
                    "description": "Permit description",
                    "due_date": "2026-11-01T10:00:00Z",
                    "suggested_role": "planner",
                    "priority": "high",
                    "milestone_name": "Phase 1: Permits",
                },
                {
                    "title": "Book Stage Audio Equipment",
                    "description": "A/V description",
                    "due_date": "2026-11-10T10:00:00Z",
                    "suggested_role": "coordinator",
                    "priority": "medium",
                    "milestone_name": "Phase 1: Permits",
                },
            ],
        },
        "proposed_diff": {},
    }

    result = generate_plan_proposal_node(state)
    proposed_diff = result["proposed_diff"]

    assert proposed_diff["total_tasks"] == 2
    assert proposed_diff["plan_summary"] == "Roadmap summary"
    mutations = proposed_diff["mutations"]
    assert len(mutations) == 2

    for mutation in mutations:
        assert mutation["action"] == "create"
        assert mutation["entity_type"] == "Task"
        assert "title" in mutation["fields"]
        assert mutation["fields"]["status"] == "todo"
        assert "due_date" in mutation["fields"]
        assert "milestone_name" in mutation["metadata"]
        assert "suggested_role" in mutation["metadata"]


# ============================================================================
# END-TO-END WORKFLOW INTEGRATION TESTS
# ============================================================================


def test_full_event_planning_agent_workflow(planning_test_data):
    """The compiled LangGraph planning workflow executes end-to-end with MockEventPlanningLLM."""
    event = planning_test_data["event"]
    org = planning_test_data["org"]

    mock_llm = MockEventPlanningLLM()

    final_state = run_event_planning_agent(
        event_id=str(event.id),
        org_id=str(org.id),
        trigger="Initial planning roadmap generation",
        planning_options={"category": "Technology Summit", "scale": "1000 attendees"},
        llm=mock_llm,
    )

    assert "errors" not in final_state or len(final_state["errors"]) == 0
    assert final_state["reasoning"] != ""
    assert "proposed_diff" in final_state

    proposed_diff = final_state["proposed_diff"]
    assert proposed_diff["total_tasks"] >= 12
    assert len(proposed_diff["mutations"]) >= 12

    # Every proposed mutation must follow the Single Write Path create contract
    for mut in proposed_diff["mutations"]:
        assert mut["action"] == "create"
        assert mut["entity_type"] == "Task"
        assert mut["fields"]["status"] == "todo"
        assert mut["fields"]["title"] != ""
        assert mut["fields"]["due_date"] is not None


def test_planning_graph_tenant_isolation(planning_test_data):
    """Running the agent with an unauthorized org_id must not leak other tenants' data."""
    event = planning_test_data["event"]
    other_org = Organization.objects.create(name="Rival Events", slug="rival-events")

    final_state = run_event_planning_agent(
        event_id=str(event.id),
        org_id=str(other_org.id),
        trigger="Unauthorized probe",
        llm=MockEventPlanningLLM(),
    )

    # Event summary must report error and tasks/team snapshots must be empty
    assert "error" in final_state["event_summary"]
    assert len(final_state["tasks_snapshot"]) == 0
    assert len(final_state["team_snapshot"]) == 0

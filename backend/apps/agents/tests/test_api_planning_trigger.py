from datetime import timedelta

import pytest
from agents.models import AgentRun, ChangeLogEntry
from django.contrib.auth import get_user_model
from django.utils import timezone
from events.models import Event, Task
from organizations.models import Membership, Organization
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture(autouse=True)
def mock_llm_environment(monkeypatch):
    """Enforce mock LLM for fast, deterministic, zero-cost API test execution."""
    monkeypatch.setenv("MOCK_LLM", "True")


@pytest.fixture
def planning_trigger_data(db):
    """Provides a multi-tenant environment with planner, viewer, and outsider roles."""
    org = Organization.objects.create(name="Starlight Events", slug="starlight-events")
    other_org = Organization.objects.create(name="Rival Corp", slug="rival-corp")

    planner = User.objects.create_user(
        username="lead_planner", email="planner@starlight.com", password="password"
    )
    viewer = User.objects.create_user(
        username="auditor_viewer", email="viewer@starlight.com", password="password"
    )
    outsider = User.objects.create_user(
        username="foreign_planner", email="planner@rival.com", password="password"
    )

    Membership.objects.create(organization=org, user=planner, role="planner")
    Membership.objects.create(organization=org, user=viewer, role="viewer")
    Membership.objects.create(organization=other_org, user=outsider, role="planner")

    now = timezone.now().replace(microsecond=0)
    event = Event.objects.create(
        organization=org,
        name="Global Tech Summit 2026",
        description="Flagship technology symposium.",
        start_date=now + timedelta(days=30),
        end_date=now + timedelta(days=32),
        status="draft",
    )

    return {
        "org": org,
        "other_org": other_org,
        "planner": planner,
        "viewer": viewer,
        "outsider": outsider,
        "event": event,
        "now": now,
    }


# ============================================================================
# ON-DEMAND EVENT PLANNING TRIGGER API TESTS
# ============================================================================


def test_generate_plan_endpoint_success_as_planner(api_client, planning_trigger_data):
    """An authorized planner can trigger on-demand event planning and receives HTTP 201."""
    planner = planning_trigger_data["planner"]
    event = planning_trigger_data["event"]

    api_client.force_authenticate(user=planner)
    url = f"/api/events/{event.id}/generate-plan/"
    payload = {
        "category": "Technology Conference",
        "scale": "1000 attendees",
        "notes": "Prioritize AV production and municipal permits",
        "trigger_reason": "Sprint kickoff roadmap generation",
    }
    response = api_client.post(url, payload, format="json")

    assert response.status_code == status.HTTP_201_CREATED
    data = response.data
    assert data["agent_type"] == "event_planning"
    assert data["state"] == "pending"
    assert str(data["event"]) == str(event.id)
    assert "mutations" in data["proposed_diff"]

    mutations = data["proposed_diff"]["mutations"]
    assert len(mutations) >= 12

    for mutation in mutations:
        assert mutation["action"] == "create"
        assert mutation["entity_type"] == "Task"
        assert "title" in mutation["fields"]
        assert mutation["fields"]["status"] == "todo"

    agent_run = AgentRun.objects.get(id=data["id"])
    assert agent_run.agent_type == AgentRun.AgentType.EVENT_PLANNING
    assert agent_run.input_snapshot["planning_options"]["category"] == "Technology Conference"


def test_generate_plan_endpoint_tenant_isolation_blocked(api_client, planning_trigger_data):
    """Users from an outside organization cannot trigger roadmap planning on another tenant's event."""
    outsider = planning_trigger_data["outsider"]
    event = planning_trigger_data["event"]

    api_client.force_authenticate(user=outsider)
    url = f"/api/events/{event.id}/generate-plan/"
    response = api_client.post(url, {"category": "Intrusion Attempt"}, format="json")

    # DRF get_object() automatically filters by organization, returning 404
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_generate_plan_endpoint_viewer_role_forbidden(api_client, planning_trigger_data):
    """Users with only viewer role are blocked from triggering agent runs."""
    viewer = planning_trigger_data["viewer"]
    event = planning_trigger_data["event"]

    api_client.force_authenticate(user=viewer)
    url = f"/api/events/{event.id}/generate-plan/"
    response = api_client.post(url, {"category": "Conference"}, format="json")

    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_generate_plan_endpoint_unauthenticated(api_client, planning_trigger_data):
    """Unauthenticated requests are rejected."""
    event = planning_trigger_data["event"]
    url = f"/api/events/{event.id}/generate-plan/"
    response = api_client.post(url, {}, format="json")

    assert response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)


def test_full_planning_lifecycle_trigger_to_approval(api_client, planning_trigger_data):
    """
    End-to-end integration test:
    1. Planner calls /generate-plan/ -> 201 Created (Pending Proposal with 14 tasks)
    2. Planner reviews proposal and calls /agent-runs/{id}/approve/ -> 200 OK
    3. Single Write Path creates all 14 tasks in Task table and records 14 ChangeLogEntry records
    """
    planner = planning_trigger_data["planner"]
    event = planning_trigger_data["event"]

    api_client.force_authenticate(user=planner)

    # Initial state: event has 0 tasks
    assert Task.objects.filter(event=event).count() == 0

    # 1. Trigger event planning
    trigger_url = f"/api/events/{event.id}/generate-plan/"
    trigger_res = api_client.post(
        trigger_url,
        {
            "category": "Corporate Summit",
            "scale": "500 attendees",
            "trigger_reason": "End-to-end lifecycle verification",
        },
        format="json",
    )
    assert trigger_res.status_code == status.HTTP_201_CREATED
    agent_run_id = trigger_res.data["id"]
    mutations_count = len(trigger_res.data["proposed_diff"]["mutations"])
    assert mutations_count >= 12

    # 2. Planner calls the approval action on AgentRunViewSet
    approve_url = f"/api/agent-runs/{agent_run_id}/approve/"
    approve_res = api_client.post(approve_url, {}, format="json")
    assert approve_res.status_code == status.HTTP_200_OK

    # 3. Verify database was cleanly populated with the synthesized tasks
    agent_run = AgentRun.objects.get(id=agent_run_id)
    assert agent_run.state == AgentRun.State.APPROVED
    assert agent_run.reviewed_by == planner

    created_tasks = Task.objects.filter(event=event)
    assert created_tasks.count() == mutations_count

    # 4. Verify immutable audit log records were created for each applied task
    audit_logs = ChangeLogEntry.objects.filter(agent_run=agent_run)
    assert audit_logs.count() == mutations_count
    for log_entry in audit_logs:
        assert log_entry.actor_type == "agent"
        assert log_entry.actor_id == "event_planning"
        assert log_entry.entity_type == "Task"
        assert log_entry.after is not None
        assert "title" in log_entry.after

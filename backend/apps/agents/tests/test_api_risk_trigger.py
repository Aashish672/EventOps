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


@pytest.fixture
def risk_trigger_data(db):
    """Provides a multi-tenant environment with planner, viewer, and outsider roles."""
    org = Organization.objects.create(name="Apex Horizons", slug="apex-horizons")
    other_org = Organization.objects.create(name="Rival Group", slug="rival-group")

    planner = User.objects.create_user(
        username="planner_user", email="planner@example.com", password="password"
    )
    viewer = User.objects.create_user(
        username="viewer_user", email="viewer@example.com", password="password"
    )
    outsider = User.objects.create_user(
        username="outsider_user", email="outsider@example.com", password="password"
    )

    Membership.objects.create(organization=org, user=planner, role="planner")
    Membership.objects.create(organization=org, user=viewer, role="viewer")
    Membership.objects.create(organization=other_org, user=outsider, role="planner")

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
        title="Coordinate Audio/Visual Setup",
        due_date=now + timedelta(days=15),
        status="todo",
    )

    return {
        "org": org,
        "other_org": other_org,
        "planner": planner,
        "viewer": viewer,
        "outsider": outsider,
        "event": event,
        "task": task,
        "now": now,
    }


# ============================================================================
# ON-DEMAND RISK TRIGGER API TESTS
# ============================================================================


def test_analyze_risk_endpoint_success_as_planner(api_client, risk_trigger_data):
    """An authorized planner can trigger on-demand risk analysis and receives HTTP 201."""
    planner = risk_trigger_data["planner"]
    event = risk_trigger_data["event"]

    api_client.force_authenticate(user=planner)
    url = f"/api/events/{event.id}/analyze-risk/"
    response = api_client.post(url, {"trigger_reason": "Pre-summit audit"}, format="json")

    assert response.status_code == status.HTTP_201_CREATED
    data = response.data
    assert data["agent_type"] == "risk_change_impact"
    assert data["state"] == "pending"
    assert str(data["event"]) == str(event.id)
    assert "mutations" in data["proposed_diff"]
    assert AgentRun.objects.filter(id=data["id"]).exists()


def test_analyze_risk_endpoint_tenant_isolation_blocked(api_client, risk_trigger_data):
    """Users from an outside organization cannot trigger risk analysis on another tenant's event."""
    outsider = risk_trigger_data["outsider"]
    event = risk_trigger_data["event"]

    api_client.force_authenticate(user=outsider)
    url = f"/api/events/{event.id}/analyze-risk/"
    response = api_client.post(url, {"trigger_reason": "Unauthorized probe"}, format="json")

    # DRF get_object() automatically filters by organization, returning 404
    assert response.status_code == status.HTTP_404_NOT_FOUND


def test_analyze_risk_endpoint_viewer_role_forbidden(api_client, risk_trigger_data):
    """Users with only viewer role are blocked from triggering agent runs."""
    viewer = risk_trigger_data["viewer"]
    event = risk_trigger_data["event"]

    api_client.force_authenticate(user=viewer)
    url = f"/api/events/{event.id}/analyze-risk/"
    response = api_client.post(url, {"trigger_reason": "Viewer audit"}, format="json")

    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_analyze_risk_endpoint_unauthenticated(api_client, risk_trigger_data):
    """Unauthenticated requests are rejected."""
    event = risk_trigger_data["event"]
    url = f"/api/events/{event.id}/analyze-risk/"
    response = api_client.post(url, {}, format="json")

    assert response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)


def test_full_risk_lifecycle_trigger_to_approval(api_client, risk_trigger_data):
    """
    End-to-end integration test:
    1. Planner calls /analyze-risk/ -> 201 Created (Pending Proposal)
    2. Planner reviews proposal and calls /agent-runs/{id}/approve/ -> 200 OK
    3. Single Write Path applies task mutations and records ChangeLogEntry audit record
    """
    planner = risk_trigger_data["planner"]
    event = risk_trigger_data["event"]
    task = risk_trigger_data["task"]

    api_client.force_authenticate(user=planner)

    # 1. Trigger risk analysis
    trigger_url = f"/api/events/{event.id}/analyze-risk/"
    trigger_res = api_client.post(
        trigger_url, {"trigger_reason": "End-to-end lifecycle verification"}, format="json"
    )
    assert trigger_res.status_code == status.HTTP_201_CREATED
    agent_run_id = trigger_res.data["id"]

    # Manually ensure proposed_diff has an actionable mutation for our task if mock LLM returned empty adjustments
    agent_run = AgentRun.objects.get(id=agent_run_id)
    new_due_date = (task.due_date + timedelta(days=5)).isoformat()
    agent_run.proposed_diff["mutations"] = [
        {
            "action": "update",
            "entity_type": "Task",
            "entity_id": str(task.id),
            "fields": {"due_date": new_due_date},
        }
    ]
    agent_run.save()

    # 2. Planner calls the approval action
    approve_url = f"/api/agent-runs/{agent_run_id}/approve/"
    approve_res = api_client.post(approve_url, {}, format="json")
    assert approve_res.status_code == status.HTTP_200_OK

    # 3. Verify database was mutated cleanly
    agent_run.refresh_from_db()
    assert agent_run.state == AgentRun.State.APPROVED
    assert agent_run.reviewed_by == planner

    task.refresh_from_db()
    assert task.due_date.isoformat().startswith(new_due_date[:10])

    # 4. Verify immutable audit log was created
    audit_logs = ChangeLogEntry.objects.filter(agent_run=agent_run)
    assert audit_logs.count() == 1
    log_entry = audit_logs.first()
    assert log_entry.actor_type == "agent"
    assert log_entry.actor_id == agent_run.agent_type
    assert log_entry.entity_type == "Task"
    assert log_entry.entity_id == str(task.id)

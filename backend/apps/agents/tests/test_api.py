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
def setup_data(db):
    org = Organization.objects.create(name="Apex Events", slug="apex-events")
    other_org = Organization.objects.create(name="Other Org", slug="other-org")

    planner_user = User.objects.create_user(username="planner", email="planner@example.com", password="password")
    viewer_user = User.objects.create_user(username="viewer", email="viewer@example.com", password="password")
    outsider_user = User.objects.create_user(username="outsider", email="outsider@example.com", password="password")

    Membership.objects.create(organization=org, user=planner_user, role="planner")
    Membership.objects.create(organization=org, user=viewer_user, role="viewer")
    Membership.objects.create(organization=other_org, user=outsider_user, role="planner")

    event = Event.objects.create(
        organization=org,
        name="Annual Gala",
        start_date=timezone.now(),
        end_date=timezone.now() + timezone.timedelta(days=1),
    )

    task = Task.objects.create(
        organization=org,
        event=event,
        title="Coordinate Catering",
        status="todo",
    )

    agent_run = AgentRun.objects.create(
        organization=org,
        event=event,
        agent_type=AgentRun.AgentType.RISK_CHANGE_IMPACT,
        trigger="Vendor delay alert",
        reasoning="Catering contract delayed by 2 days.",
        proposed_diff={
            "mutations": [
                {
                    "action": "update",
                    "entity_type": "Task",
                    "entity_id": str(task.id),
                    "fields": {"status": "in_progress"},
                }
            ]
        },
        state=AgentRun.State.PENDING,
    )

    return {
        "org": org,
        "other_org": other_org,
        "planner_user": planner_user,
        "viewer_user": viewer_user,
        "outsider_user": outsider_user,
        "event": event,
        "task": task,
        "agent_run": agent_run,
    }


@pytest.mark.django_db
def test_list_agent_runs_tenant_isolation(api_client, setup_data):
    # Planner can list runs
    api_client.force_authenticate(user=setup_data["planner_user"])
    url = f"/api/agent-runs/?event={setup_data['event'].id}"
    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    results = response.data.get("results", response.data) if isinstance(response.data, dict) else response.data
    assert len(results) == 1

    # Outsider from another org sees empty list
    api_client.force_authenticate(user=setup_data["outsider_user"])
    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    results = response.data.get("results", response.data) if isinstance(response.data, dict) else response.data
    assert len(results) == 0


@pytest.mark.django_db
def test_approve_proposal_as_planner(api_client, setup_data):
    api_client.force_authenticate(user=setup_data["planner_user"])
    url = f"/api/agent-runs/{setup_data['agent_run'].id}/approve/"
    response = api_client.post(url)

    assert response.status_code == status.HTTP_200_OK
    assert response.data["state"] == AgentRun.State.APPROVED

    setup_data["task"].refresh_from_db()
    assert setup_data["task"].status == "in_progress"

    # Verify ChangeLogEntry was created
    assert ChangeLogEntry.objects.filter(agent_run=setup_data["agent_run"]).exists()


@pytest.mark.django_db
def test_approve_proposal_as_viewer_forbidden(api_client, setup_data):
    api_client.force_authenticate(user=setup_data["viewer_user"])
    url = f"/api/agent-runs/{setup_data['agent_run'].id}/approve/"
    response = api_client.post(url)

    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_reject_proposal_with_feedback(api_client, setup_data):
    api_client.force_authenticate(user=setup_data["planner_user"])
    url = f"/api/agent-runs/{setup_data['agent_run'].id}/reject/"
    response = api_client.post(url, {"reason": "Not applicable at this stage"}, format="json")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["state"] == AgentRun.State.REJECTED


@pytest.mark.django_db
def test_edit_approve_proposal(api_client, setup_data):
    api_client.force_authenticate(user=setup_data["planner_user"])
    url = f"/api/agent-runs/{setup_data['agent_run'].id}/edit-approve/"

    modified_diff = {
        "mutations": [
            {
                "action": "update",
                "entity_type": "Task",
                "entity_id": str(setup_data["task"].id),
                "fields": {"status": "done"},
            }
        ]
    }
    response = api_client.post(url, {"modified_diff": modified_diff}, format="json")

    assert response.status_code == status.HTTP_200_OK
    assert response.data["state"] == AgentRun.State.EDITED_APPROVED

    setup_data["task"].refresh_from_db()
    assert setup_data["task"].status == "done"


@pytest.mark.django_db
def test_change_log_read_only_and_filtered(api_client, setup_data):
    # Create an audit log entry
    ChangeLogEntry.objects.create(
        organization=setup_data["org"],
        event=setup_data["event"],
        actor_type=ChangeLogEntry.ActorType.AGENT,
        actor_id="test-agent",
        entity_type="task",
        entity_id=str(setup_data["task"].id),
        before={"status": "pending"},
        after={"status": "in_progress"},
    )

    api_client.force_authenticate(user=setup_data["planner_user"])
    url = f"/api/change-log/?event={setup_data['event'].id}"
    response = api_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    results = response.data.get("results", response.data) if isinstance(response.data, dict) else response.data
    assert len(results) >= 1

    # Disallow direct POST to audit log
    post_res = api_client.post(url, {"entity_type": "task"}, format="json")
    assert post_res.status_code == status.HTTP_405_METHOD_NOT_ALLOWED

"""
Integration tests for POST /api/events/{id}/analyze-budget/
Uses SQLite (USE_SQLITE=True) and MockBudgetIntelligenceLLM.
"""

from datetime import timedelta

import pytest
from agents.models import AgentRun
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from events.models import BudgetCategory, BudgetLineItem, Event
from organizations.models import Membership, Organization
from rest_framework.test import APIClient

User = get_user_model()

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def mock_llm_environment(monkeypatch):
    """Enforce mock LLM for fast, deterministic, zero-cost API test execution."""
    monkeypatch.setenv("MOCK_LLM", "True")


@pytest.fixture()
def org():
    return Organization.objects.create(name="BudgetAPITestOrg")


@pytest.fixture()
def planner(org):
    u = User.objects.create_user(
        username="budget_api_planner", password="pass", email="bap@test.com"
    )
    Membership.objects.create(organization=org, user=u, role="planner")
    return u


@pytest.fixture()
def coordinator(org):
    u = User.objects.create_user(
        username="budget_coordinator", password="pass", email="bc@test.com"
    )
    Membership.objects.create(organization=org, user=u, role="coordinator")
    return u


@pytest.fixture()
def event(org, planner):
    now = timezone.now()
    return Event.objects.create(
        organization=org,
        name="Budget API Gala",
        start_date=now + timedelta(days=60),
        end_date=now + timedelta(days=60, hours=8),
        status="planning",
        assigned_planner=planner,
    )


@pytest.fixture()
def budget_with_items(org, event):
    cat = BudgetCategory.objects.create(
        organization=org, event=event, name="Venue", allocated_amount="10000.00"
    )
    BudgetLineItem.objects.create(
        organization=org,
        event=event,
        category=cat,
        description="Main hall rental",
        estimated_cost="8000.00",
        actual_cost="9500.00",
    )
    BudgetLineItem.objects.create(
        organization=org,
        event=event,
        category=cat,
        description="AV equipment",
        estimated_cost="1500.00",
        actual_cost="1400.00",
    )
    return cat


@pytest.fixture()
def planner_client(planner):
    client = APIClient()
    client.force_authenticate(user=planner)
    return client


@pytest.fixture()
def coordinator_client(coordinator):
    client = APIClient()
    client.force_authenticate(user=coordinator)
    return client


class TestAnalyzeBudgetEndpoint:
    def test_planner_can_trigger_budget_analysis(
        self, planner_client, event, budget_with_items
    ):
        url = reverse("event-analyze-budget", kwargs={"pk": str(event.id)})
        response = planner_client.post(url)
        assert response.status_code == 201
        data = response.json()
        assert data["agent_type"] == "budget_intelligence"
        assert data["state"] == "pending"
        assert (
            AgentRun.objects.filter(
                event=event, agent_type="budget_intelligence"
            ).count()
            == 1
        )

    def test_coordinator_cannot_trigger_budget_analysis(
        self, coordinator_client, event, budget_with_items
    ):
        url = reverse("event-analyze-budget", kwargs={"pk": str(event.id)})
        response = coordinator_client.post(url)
        assert response.status_code == 403

    def test_unauthenticated_cannot_trigger(self, event):
        client = APIClient()
        url = reverse("event-analyze-budget", kwargs={"pk": str(event.id)})
        response = client.post(url)
        assert response.status_code in (401, 403)

    def test_budget_agent_run_has_correct_fields(
        self, planner_client, event, budget_with_items
    ):
        url = reverse("event-analyze-budget", kwargs={"pk": str(event.id)})
        response = planner_client.post(
            url, {"trigger_reason": "manual_check"}, format="json"
        )
        assert response.status_code == 201
        data = response.json()
        assert "proposed_diff" in data
        assert "reasoning" in data
        assert data["agent_type"] == AgentRun.AgentType.BUDGET_INTELLIGENCE
        assert data["trigger"] == "manual_check"

    def test_agent_run_can_be_approved(
        self, planner_client, event, budget_with_items
    ):
        """Verifies the Single Write Path: created proposal can be approved via /approve/."""
        trigger_url = reverse("event-analyze-budget", kwargs={"pk": str(event.id)})
        trigger_resp = planner_client.post(trigger_url)
        assert trigger_resp.status_code == 201
        agent_run_id = trigger_resp.json()["id"]

        approve_url = f"/api/agent-runs/{agent_run_id}/approve/"
        approve_resp = planner_client.post(approve_url)
        assert approve_resp.status_code == 200
        assert approve_resp.json()["state"] in ("approved", "edited_approved")

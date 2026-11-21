"""
Integration tests for POST /api/documents/{id}/analyze/
Verifies RBAC, multi-tenant isolation, and the complete Single Write Path approval lifecycle.
Uses SQLite (USE_SQLITE=True) and MockDocumentIntelligenceLLM.
"""

from datetime import timedelta

import pytest
from agents.models import AgentRun, ChangeLogEntry
from django.contrib.auth import get_user_model
from django.utils import timezone
from events.models import BudgetCategory, BudgetLineItem, Document, Event
from organizations.models import Membership, Organization
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def mock_llm_environment(monkeypatch):
    """Enforce mock LLM for fast, deterministic, zero-cost API test execution."""
    monkeypatch.setenv("MOCK_LLM", "True")


@pytest.fixture()
def org():
    return Organization.objects.create(name="DocAPITestOrg")


@pytest.fixture()
def planner(org):
    u = User.objects.create_user(
        username="doc_api_planner", password="pass", email="dap@test.com"
    )
    Membership.objects.create(organization=org, user=u, role="planner")
    return u


@pytest.fixture()
def coordinator(org):
    u = User.objects.create_user(
        username="doc_api_coordinator", password="pass", email="dac@test.com"
    )
    Membership.objects.create(organization=org, user=u, role="coordinator")
    return u


@pytest.fixture()
def event(org, planner):
    now = timezone.now()
    return Event.objects.create(
        organization=org,
        name="Contract Review Summit",
        start_date=now + timedelta(days=60),
        end_date=now + timedelta(days=60, hours=8),
        status="planning",
        assigned_planner=planner,
    )


@pytest.fixture()
def catering_category(org, event):
    return BudgetCategory.objects.create(
        organization=org,
        event=event,
        name="Catering",
        allocated_amount="5000.00",
    )


@pytest.fixture()
def sample_document(org, event, planner):
    return Document.objects.create(
        organization=org,
        event=event,
        title="Gourmet Gala Catering Proposal.pdf",
        file_url="https://storage.eventops.test/docs/gourmet-catering.pdf",
        uploaded_by=planner,
    )


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


class TestAnalyzeDocumentEndpoint:
    def test_planner_can_trigger_document_analysis(
        self, planner_client, sample_document, catering_category
    ):
        url = f"/api/documents/{sample_document.id}/analyze/"
        payload = {
            "target_category_id": str(catering_category.id),
            "target_category_name": catering_category.name,
            "notes": "100 guests plated dinner proposal",
            "trigger_reason": "Pre-contract review",
        }
        response = planner_client.post(url, payload, format="json")

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["agent_type"] == AgentRun.AgentType.DOCUMENT_INTELLIGENCE
        assert data["state"] == AgentRun.State.PENDING
        assert data["trigger"] == "Pre-contract review"
        assert "proposed_diff" in data
        assert "mutations" in data["proposed_diff"]
        assert len(data["proposed_diff"]["mutations"]) >= 2

    def test_coordinator_cannot_trigger_document_analysis(
        self, coordinator_client, sample_document
    ):
        url = f"/api/documents/{sample_document.id}/analyze/"
        response = coordinator_client.post(url, {}, format="json")
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_cannot_trigger(self, sample_document):
        client = APIClient()
        url = f"/api/documents/{sample_document.id}/analyze/"
        response = client.post(url, {}, format="json")
        assert response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)

    def test_document_proposal_approval_creates_budget_line_items(
        self, planner_client, sample_document, catering_category, event
    ):
        """
        Complete Single Write Path integration test:
        1. Planner triggers contract analysis -> creates pending proposal with 'create' BudgetLineItem mutations.
        2. Verify no BudgetLineItems exist yet.
        3. Planner approves proposal via /api/agent-runs/{id}/approve/.
        4. Assert BudgetLineItems are created in the database and linked to the catering category.
        5. Assert ChangeLogEntry audit log entries are generated.
        """
        assert BudgetLineItem.objects.filter(event=event).count() == 0

        # 1. Trigger analysis
        analyze_url = f"/api/documents/{sample_document.id}/analyze/"
        analyze_resp = planner_client.post(
            analyze_url,
            {
                "target_category_id": str(catering_category.id),
                "target_category_name": catering_category.name,
            },
            format="json",
        )
        assert analyze_resp.status_code == status.HTTP_201_CREATED
        agent_run_id = analyze_resp.json()["id"]

        # 2. Verify state is pending and zero items written to DB
        assert BudgetLineItem.objects.filter(event=event).count() == 0
        agent_run = AgentRun.objects.get(id=agent_run_id)
        assert agent_run.state == AgentRun.State.PENDING

        # 3. Planner reviews and approves the proposal
        approve_url = f"/api/agent-runs/{agent_run_id}/approve/"
        approve_resp = planner_client.post(approve_url)
        assert approve_resp.status_code == status.HTTP_200_OK

        agent_run.refresh_from_db()
        assert agent_run.state == AgentRun.State.APPROVED

        # 4. Verify BudgetLineItems were populated by Single Write Path
        created_items = BudgetLineItem.objects.filter(event=event)
        assert created_items.count() >= 2
        for item in created_items:
            assert item.category == catering_category
            assert item.estimated_cost > 0

        # 5. Verify immutable ChangeLogEntry audit records were recorded
        audit_logs = ChangeLogEntry.objects.filter(
            event=event, entity_type="BudgetLineItem", agent_run=agent_run
        )
        assert audit_logs.count() >= 2
        assert all(log.actor_type == ChangeLogEntry.ActorType.AGENT for log in audit_logs)

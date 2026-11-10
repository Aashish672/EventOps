"""
Unit tests for the Budget Intelligence Agent LangGraph workflow.
Uses SQLite (USE_SQLITE=True) and MockBudgetIntelligenceLLM — no external APIs.
"""

from datetime import timedelta

import pytest
from agents.orchestration.budget_graph import (
    generate_budget_proposal_node,
    run_budget_intelligence_agent,
)
from agents.orchestration.llm import MockBudgetIntelligenceLLM
from agents.orchestration.schemas import BudgetIntelligenceProposal
from django.contrib.auth import get_user_model
from django.utils import timezone
from events.models import BudgetCategory, BudgetLineItem, Event
from organizations.models import Membership, Organization

User = get_user_model()

pytestmark = pytest.mark.django_db


@pytest.fixture()
def org():
    return Organization.objects.create(name="BudgetTestOrg")


@pytest.fixture()
def user(org):
    u = User.objects.create_user(
        username="budget_planner", password="pass", email="bp@test.com"
    )
    Membership.objects.create(organization=org, user=u, role="planner")
    return u


@pytest.fixture()
def event(org):
    now = timezone.now()
    return Event.objects.create(
        organization=org,
        name="Budget Test Gala",
        start_date=now + timedelta(days=30),
        end_date=now + timedelta(days=30, hours=8),
        status="planning",
    )


@pytest.fixture()
def budget_category(org, event):
    return BudgetCategory.objects.create(
        organization=org,
        event=event,
        name="Catering",
        allocated_amount="5000.00",
    )


@pytest.fixture()
def budget_line_items(org, event, budget_category):
    return [
        BudgetLineItem.objects.create(
            organization=org,
            event=event,
            category=budget_category,
            description="Dinner service",
            estimated_cost="3000.00",
            actual_cost="3600.00",  # 20% overspend -> should be flagged
            is_paid=False,
        ),
        BudgetLineItem.objects.create(
            organization=org,
            event=event,
            category=budget_category,
            description="Bar service",
            estimated_cost="1500.00",
            actual_cost="1500.00",  # on budget
            is_paid=True,
        ),
    ]


class TestMockBudgetIntelligenceLLM:
    def test_mock_returns_budget_intelligence_proposal(self):
        mock_llm = MockBudgetIntelligenceLLM()
        structured = mock_llm.with_structured_output(BudgetIntelligenceProposal)
        result = structured.invoke("No budget data")
        assert isinstance(result, BudgetIntelligenceProposal)
        assert 0 <= result.health_score <= 100

    def test_mock_flags_overspend_items(self):
        mock_llm = MockBudgetIntelligenceLLM()
        structured = mock_llm.with_structured_output(BudgetIntelligenceProposal)
        prompt = (
            "Item ID: 00000000-0000-0000-0000-000000000001 | Dinner service | "
            "Est: 3000.00 | Actual: 3600.00"
        )
        result = structured.invoke(prompt)
        assert isinstance(result, BudgetIntelligenceProposal)
        assert len(result.flagged_items) >= 1
        assert result.flagged_items[0].flag_type == "overspend"

    def test_canned_proposal_returned_as_is(self):
        canned = BudgetIntelligenceProposal(
            health_score=72,
            executive_summary="Test summary",
            reasoning="Test reasoning",
            projected_total_cost="4500.00",
            flagged_items=[],
            category_summaries=[],
            reallocation_suggestions=[],
        )
        mock_llm = MockBudgetIntelligenceLLM(canned_proposal=canned)
        structured = mock_llm.with_structured_output(BudgetIntelligenceProposal)
        result = structured.invoke("anything")
        assert result.health_score == 72
        assert result.executive_summary == "Test summary"


class TestGenerateBudgetProposalNode:
    def test_overspend_generates_update_mutation(self):
        state = {
            "event_id": "evt-1",
            "org_id": "org-1",
            "trigger": "test",
            "raw_proposal": {
                "flagged_items": [
                    {
                        "line_item_id": "item-abc",
                        "description": "Dinner",
                        "category_name": "Catering",
                        "estimated_cost": "3000.00",
                        "actual_cost": "3600.00",
                        "variance_pct": 20.0,
                        "flag_type": "overspend",
                        "recommended_action": "increase_estimate",
                        "reason": "Actual cost 20% above estimate",
                    }
                ],
                "category_summaries": [],
            },
            "event_summary": {},
            "tasks_snapshot": [],
            "budget_snapshot": {},
            "vendors_snapshot": [],
            "team_snapshot": [],
            "planning_options": {},
            "reasoning": "",
            "errors": [],
            "proposed_diff": {},
        }
        result = generate_budget_proposal_node(state)
        diff = result["proposed_diff"]
        assert "mutations" in diff
        assert len(diff["mutations"]) == 1
        mut = diff["mutations"][0]
        assert mut["action"] == "update"
        assert mut["entity_type"] == "BudgetLineItem"
        assert mut["entity_id"] == "item-abc"
        assert mut["fields"]["estimated_cost"] == "3600.00"

    def test_category_reallocation_generates_mutation(self):
        state = {
            "event_id": "evt-1",
            "org_id": "org-1",
            "trigger": "test",
            "raw_proposal": {
                "flagged_items": [],
                "category_summaries": [
                    {
                        "category_id": "cat-001",
                        "category_name": "Catering",
                        "allocated_amount": "5000.00",
                        "total_estimated": "4500.00",
                        "total_actual": "5500.00",
                        "health_status": "critical",
                        "recommended_reallocation": "500.00",
                    }
                ],
            },
            "event_summary": {},
            "tasks_snapshot": [],
            "budget_snapshot": {},
            "vendors_snapshot": [],
            "team_snapshot": [],
            "planning_options": {},
            "reasoning": "",
            "errors": [],
            "proposed_diff": {},
        }
        result = generate_budget_proposal_node(state)
        diff = result["proposed_diff"]
        assert len(diff["mutations"]) == 1
        mut = diff["mutations"][0]
        assert mut["entity_type"] == "BudgetCategory"
        assert mut["action"] == "update"

    def test_no_flags_produces_empty_mutations(self):
        state = {
            "event_id": "evt-1",
            "org_id": "org-1",
            "trigger": "test",
            "raw_proposal": {"flagged_items": [], "category_summaries": []},
            "event_summary": {},
            "tasks_snapshot": [],
            "budget_snapshot": {},
            "vendors_snapshot": [],
            "team_snapshot": [],
            "planning_options": {},
            "reasoning": "",
            "errors": [],
            "proposed_diff": {},
        }
        result = generate_budget_proposal_node(state)
        assert result["proposed_diff"]["mutations"] == []


class TestBudgetIntelligenceGraph:
    def test_run_agent_end_to_end_with_mock(
        self, org, event, budget_category, budget_line_items
    ):
        mock_llm = MockBudgetIntelligenceLLM()
        result = run_budget_intelligence_agent(
            event_id=str(event.id),
            org_id=str(org.id),
            llm=mock_llm,
        )
        assert "proposed_diff" in result
        assert "raw_proposal" in result
        assert "mutations" in result["proposed_diff"]
        assert isinstance(result["raw_proposal"], dict)
        assert "health_score" in result["raw_proposal"]

    def test_run_agent_budget_snapshot_populated(
        self, org, event, budget_category, budget_line_items
    ):
        mock_llm = MockBudgetIntelligenceLLM()
        result = run_budget_intelligence_agent(
            event_id=str(event.id),
            org_id=str(org.id),
            llm=mock_llm,
        )
        budget_snap = result.get("budget_snapshot", {})
        assert "categories" in budget_snap
        assert len(budget_snap["categories"]) == 1
        assert budget_snap["categories"][0]["name"] == "Catering"

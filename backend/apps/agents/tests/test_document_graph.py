"""
Unit tests for the Document Intelligence & Vendor Negotiator Agent LangGraph workflow.
Uses SQLite (USE_SQLITE=True) and MockDocumentIntelligenceLLM — no external APIs.
"""

from datetime import timedelta

import pytest
from agents.orchestration.document_graph import (
    generate_document_proposal_node,
    run_document_intelligence_agent,
    sanitize_monetary_amount,
)
from agents.orchestration.llm import MockDocumentIntelligenceLLM
from agents.orchestration.schemas import (
    ContractExtractionProposal,
)
from django.contrib.auth import get_user_model
from django.utils import timezone
from events.models import BudgetCategory, Document, Event
from organizations.models import Membership, Organization

User = get_user_model()

pytestmark = pytest.mark.django_db


@pytest.fixture()
def org():
    return Organization.objects.create(name="DocTestOrg")


@pytest.fixture()
def user(org):
    u = User.objects.create_user(
        username="doc_planner", password="pass", email="dp@test.com"
    )
    Membership.objects.create(organization=org, user=u, role="planner")
    return u


@pytest.fixture()
def event(org):
    now = timezone.now()
    return Event.objects.create(
        organization=org,
        name="Contract Gala 2026",
        start_date=now + timedelta(days=45),
        end_date=now + timedelta(days=45, hours=8),
        status="planning",
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
def sample_document(org, event, user):
    return Document.objects.create(
        organization=org,
        event=event,
        title="Gourmet Gala Catering Proposal.pdf",
        file_url="https://storage.eventops.test/docs/gourmet-catering.pdf",
        uploaded_by=user,
    )


class TestSanitizeMonetaryAmount:
    def test_handles_currency_symbols_and_commas(self):
        assert sanitize_monetary_amount("$12,500.50") == "12500.50"
        assert sanitize_monetary_amount("€1,200") == "1200.00"
        assert sanitize_monetary_amount("450") == "450.00"

    def test_handles_empty_or_invalid_values(self):
        assert sanitize_monetary_amount("") == "0.00"
        assert sanitize_monetary_amount(None) == "0.00"
        assert sanitize_monetary_amount("free") == "0.00"


class TestMockDocumentIntelligenceLLM:
    def test_returns_contract_extraction_proposal(self):
        mock_llm = MockDocumentIntelligenceLLM()
        structured = mock_llm.with_structured_output(ContractExtractionProposal)
        result = structured.invoke("General production quote")
        assert isinstance(result, ContractExtractionProposal)
        assert result.vendor_name != ""
        assert len(result.extracted_items) >= 2

    def test_detects_catering_from_prompt(self):
        mock_llm = MockDocumentIntelligenceLLM()
        structured = mock_llm.with_structured_output(ContractExtractionProposal)
        result = structured.invoke(
            "Document: catering proposal for 100 guests. Allocated Category Budget: $5000.00"
        )
        assert "Catering" in result.vendor_name or "Gourmet" in result.vendor_name
        assert result.budget_status == "exceeds_budget"
        assert "Dear" in result.negotiation_draft

    def test_within_budget_when_allocation_is_high(self):
        mock_llm = MockDocumentIntelligenceLLM()
        structured = mock_llm.with_structured_output(ContractExtractionProposal)
        result = structured.invoke(
            "Document: catering quote. Allocated Category Budget: $10000.00"
        )
        assert result.budget_status == "within_budget"
        assert result.negotiation_draft == ""

    def test_canned_proposal_returned_as_is(self):
        canned = ContractExtractionProposal(
            vendor_name="Custom Vendor",
            total_quoted_amount="3500.00",
            extracted_items=[],
            budget_status="within_budget",
            target_category_name="Custom Category",
            allocated_category_budget="4000.00",
            variance_amount="-500.00",
            negotiation_draft="",
            reasoning="Canned reasoning",
        )
        mock_llm = MockDocumentIntelligenceLLM(canned_proposal=canned)
        structured = mock_llm.with_structured_output(ContractExtractionProposal)
        result = structured.invoke("anything")
        assert result.vendor_name == "Custom Vendor"
        assert result.total_quoted_amount == "3500.00"


class TestGenerateDocumentProposalNode:
    def test_extracted_items_generate_create_mutations(self):
        state = {
            "event_id": "evt-1",
            "org_id": "org-1",
            "trigger": "test",
            "raw_proposal": {
                "vendor_name": "Sound Masters Inc.",
                "total_quoted_amount": "4500.00",
                "extracted_items": [
                    {
                        "description": "Sound System Rigging",
                        "amount": "$2,500.00",
                        "quantity": 1,
                        "unit_price": "2500.00",
                        "is_tax": False,
                        "milestone": "Setup",
                    },
                    {
                        "description": "Sales Tax",
                        "amount": "200.00",
                        "quantity": 1,
                        "unit_price": "200.00",
                        "is_tax": True,
                        "milestone": "",
                    },
                ],
                "budget_status": "within_budget",
                "variance_amount": "0.00",
                "negotiation_draft": "",
            },
            "event_summary": {},
            "tasks_snapshot": [],
            "budget_snapshot": {},
            "vendors_snapshot": [],
            "team_snapshot": [],
            "planning_options": {
                "target_category_id": "cat-123",
                "target_category_name": "AV & Staging",
            },
            "reasoning": "",
            "errors": [],
            "proposed_diff": {},
        }
        result = generate_document_proposal_node(state)
        diff = result["proposed_diff"]
        mutations = diff["mutations"]
        assert len(mutations) == 2

        first_mut = mutations[0]
        assert first_mut["action"] == "create"
        assert first_mut["entity_type"] == "BudgetLineItem"
        assert first_mut["fields"]["category_id"] == "cat-123"
        assert first_mut["fields"]["estimated_cost"] == "2500.00"
        assert "[Sound Masters Inc.] Sound System Rigging" in first_mut["fields"]["description"]

        tax_mut = mutations[1]
        assert "Tax & Surcharge" in tax_mut["fields"]["description"]
        assert tax_mut["fields"]["estimated_cost"] == "200.00"

    def test_empty_items_produce_empty_mutations(self):
        state = {
            "event_id": "evt-1",
            "org_id": "org-1",
            "trigger": "test",
            "raw_proposal": {
                "vendor_name": "Empty Vendor",
                "extracted_items": [],
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
        result = generate_document_proposal_node(state)
        assert result["proposed_diff"]["mutations"] == []


class TestDocumentIntelligenceGraph:
    def test_run_agent_end_to_end_with_mock(
        self, org, event, catering_category, sample_document
    ):
        mock_llm = MockDocumentIntelligenceLLM()
        result = run_document_intelligence_agent(
            event_id=str(event.id),
            org_id=str(org.id),
            document_id=str(sample_document.id),
            document_title=sample_document.title,
            file_url=sample_document.file_url,
            target_category_id=str(catering_category.id),
            target_category_name=catering_category.name,
            llm=mock_llm,
        )

        assert "proposed_diff" in result
        assert "raw_proposal" in result
        mutations = result["proposed_diff"].get("mutations", [])
        assert len(mutations) >= 2
        assert all(m["action"] == "create" for m in mutations)
        assert all(m["entity_type"] == "BudgetLineItem" for m in mutations)

        raw = result["raw_proposal"]
        assert "vendor_name" in raw
        assert "total_quoted_amount" in raw
        assert raw["budget_status"] in ("within_budget", "exceeds_budget")

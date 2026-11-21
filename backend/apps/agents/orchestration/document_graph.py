"""
LangGraph Document Intelligence & Vendor Negotiator Agent — 3-node workflow.

Node 1: inspect_document_context   — read-only snapshot of document metadata, event summary, and budget categories
Node 2: analyze_contract_node      — LLM parses line items, compares quote with budget, drafts negotiation counter-offer
Node 3: generate_document_proposal — maps parsed deliverables into Single Write Path 'create' BudgetLineItem mutations
"""

import logging
import re
from decimal import Decimal, InvalidOperation
from typing import Any

from agents.orchestration.schemas import ContractExtractionProposal
from agents.orchestration.state import AgentState
from agents.orchestration.tools import get_event_budget, get_event_summary
from events.models import Document
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, START, StateGraph

logger = logging.getLogger(__name__)


# ===========================================================================
# PROMPTS
# ===========================================================================

DOCUMENT_SYSTEM_PROMPT = """You are EventOps Document Intelligence & Vendor Negotiator Agent.
Your role is to analyze vendor contracts, quotes, or invoices and propose actionable Single Write Path budget items and negotiation advice.

Rules:
1. Extract the vendor name, date, payment terms, and cancellation policies from the document.
2. Parse discrete deliverables and fee items into extracted_items:
   - description: clean service/product name
   - amount: clean decimal string (e.g. '1250.00'), stripped of currency symbols and commas
   - quantity: integer units
   - unit_price: unit rate decimal string if given
   - is_tax: true if item represents sales tax, VAT, gratuity, or service fee
   - milestone: contractual milestone or deadline if stated
3. Cross-reference total quoted amount against the target budget category allocation:
   - If total_quoted > allocated_budget, budget_status is 'exceeds_budget'.
   - If total_quoted <= allocated_budget, budget_status is 'within_budget'.
   - Calculate variance_amount = total_quoted - allocated_budget (positive if over budget).
4. If budget_status is 'exceeds_budget', draft a polite, professional negotiation email in negotiation_draft.
   - Acknowledge vendor strengths and interest.
   - Politely explain the event's budgeted allocation constraint.
   - Propose specific, constructive options (e.g., volume discount, scope adjustments, packaging concessions).
5. Be strictly grounded in the document context. Never fabricate line items or amounts not justified by the context.
"""


def format_contract_analysis_prompt(
    document_info: dict[str, Any],
    event_summary: dict[str, Any],
    budget_snapshot: dict[str, Any],
    target_category_name: str,
    target_allocated_budget: str,
    additional_notes: str = "",
) -> str:
    """Formats document metadata and event budget limits into a structured LLM prompt."""
    lines = []

    lines.append(
        f"EVENT: {event_summary.get('name', 'Unknown')} | Status: {event_summary.get('status', 'N/A')}"
    )
    lines.append(
        f"Event Dates: {event_summary.get('start_date', 'N/A')} -> {event_summary.get('end_date', 'N/A')}\n"
    )

    lines.append("DOCUMENT DETAILS:")
    lines.append(f"  Title: {document_info.get('title', 'Vendor Document')}")
    lines.append(f"  File URL / Path: {document_info.get('file_url', 'N/A')}")
    if additional_notes:
        lines.append(f"  Planner Notes / Scope: {additional_notes}")

    lines.append(f"\nTARGET BUDGET CATEGORY: {target_category_name}")
    lines.append(f"  Allocated Category Budget: ${target_allocated_budget}")

    categories = budget_snapshot.get("categories", [])
    if categories:
        lines.append(f"\nEXISTING EVENT BUDGET CATEGORIES ({len(categories)}):")
        for cat in categories:
            lines.append(f"  - {cat['name']} | Allocated: ${cat['allocated_amount']}")

    lines.append(
        "\nAnalyze the contract/quote document and return a ContractExtractionProposal."
    )
    return "\n".join(lines)


# ===========================================================================
# SANITIZATION HELPERS
# ===========================================================================

def sanitize_monetary_amount(val: Any) -> str:
    """Sanitizes monetary string or number to clean 2-decimal string format."""
    if val is None:
        return "0.00"
    cleaned = re.sub(r"[^\d.]", "", str(val).strip())
    try:
        dec = Decimal(cleaned)
        return f"{dec:.2f}"
    except (InvalidOperation, ValueError):
        return "0.00"


# ===========================================================================
# WORKFLOW NODES
# ===========================================================================

def inspect_document_context_node(state: AgentState) -> dict[str, Any]:
    """Node 1: Gathers read-only snapshots of the document, event, and budget categories."""
    event_id = state["event_id"]
    org_id = state["org_id"]
    options = state.get("planning_options", {})
    document_id = options.get("document_id")

    logger.info(
        "inspect_document_context_node: Fetching context for doc=%s event=%s org=%s",
        document_id,
        event_id,
        org_id,
    )

    event_summary = get_event_summary.invoke({"event_id": event_id, "org_id": org_id})
    budget_snapshot = get_event_budget.invoke({"event_id": event_id, "org_id": org_id})

    # Fetch document record if document_id provided
    doc_info: dict[str, Any] = {
        "id": document_id,
        "title": options.get("document_title", "Vendor Quote"),
        "file_url": options.get("file_url", ""),
    }
    if document_id:
        try:
            doc_record = Document.objects.filter(
                id=document_id, organization_id=org_id
            ).first()
            if doc_record:
                doc_info["id"] = str(doc_record.id)
                doc_info["title"] = doc_record.title
                doc_info["file_url"] = doc_record.file_url
        except Exception as e:  # noqa: BLE001
            logger.warning(
                "inspect_document_context_node: Unable to fetch document record: %s", e
            )

    # Resolve target category allocation
    target_category_name = options.get("target_category_name", "Vendor Quotes & Contracts")
    target_category_id = options.get("target_category_id")
    target_allocated = "0.00"

    for cat in budget_snapshot.get("categories", []):
        if (target_category_id and str(cat["id"]) == str(target_category_id)) or (
            cat["name"].lower() == target_category_name.lower()
        ):
            target_category_name = cat["name"]
            target_allocated = str(cat["allocated_amount"])
            target_category_id = str(cat["id"])
            break

    enriched_options = {
        **options,
        "document_info": doc_info,
        "target_category_name": target_category_name,
        "target_category_id": target_category_id,
        "target_allocated_budget": target_allocated,
    }

    return {
        "event_summary": event_summary,
        "budget_snapshot": budget_snapshot,
        "planning_options": enriched_options,
    }


def analyze_contract_node(state: AgentState, llm: Any = None) -> dict[str, Any]:
    """Node 2: Invokes LLM with ContractExtractionProposal structured output."""
    logger.info("analyze_contract_node: Running contract analysis for event %s", state["event_id"])

    from agents.orchestration.llm import MockDocumentIntelligenceLLM, get_llm

    active_llm = llm or get_llm(agent_type="document_intelligence")
    options = state.get("planning_options", {})
    doc_info = options.get("document_info", {})

    prompt_content = format_contract_analysis_prompt(
        document_info=doc_info,
        event_summary=state.get("event_summary", {}),
        budget_snapshot=state.get("budget_snapshot", {}),
        target_category_name=options.get("target_category_name", "Vendor Quotes & Contracts"),
        target_allocated_budget=options.get("target_allocated_budget", "0.00"),
        additional_notes=options.get("notes", ""),
    )

    messages = [
        SystemMessage(content=DOCUMENT_SYSTEM_PROMPT),
        HumanMessage(content=prompt_content),
    ]

    try:
        structured_llm = active_llm.with_structured_output(ContractExtractionProposal)
        proposal: ContractExtractionProposal = structured_llm.invoke(messages)
        logger.info(
            "analyze_contract_node: Proposal generated for vendor '%s' (Total: $%s, Status: %s)",
            proposal.vendor_name,
            proposal.total_quoted_amount,
            proposal.budget_status,
        )
        return {
            "raw_proposal": proposal.model_dump(),
            "reasoning": proposal.reasoning,
        }
    except Exception as e:  # noqa: BLE001
        logger.warning(
            "analyze_contract_node: Primary LLM error (%s). Falling back to MockDocumentIntelligenceLLM.",
            e,
        )
        fallback = MockDocumentIntelligenceLLM()
        structured_fallback = fallback.with_structured_output(ContractExtractionProposal)
        proposal = structured_fallback.invoke(messages)
        return {
            "raw_proposal": proposal.model_dump(),
            "reasoning": proposal.reasoning,
            "errors": [f"LLM fallback used: {e}"],
        }


def generate_document_proposal_node(state: AgentState) -> dict[str, Any]:
    """Node 3: Maps parsed contract line items into Single Write Path 'create' BudgetLineItem mutations."""
    raw_proposal = state.get("raw_proposal", {})
    extracted_items = raw_proposal.get("extracted_items", [])
    options = state.get("planning_options", {})

    target_category_id = options.get("target_category_id")
    target_category_name = raw_proposal.get(
        "target_category_name", options.get("target_category_name", "Vendor Quotes & Contracts")
    )
    vendor_name = raw_proposal.get("vendor_name", "Vendor")

    mutations: list[dict[str, Any]] = []

    for item in extracted_items:
        clean_amount = sanitize_monetary_amount(item.get("amount", "0.00"))
        desc = item.get("description", "Deliverable").strip()
        is_tax = item.get("is_tax", False)

        item_prefix = f"[{vendor_name}]" if vendor_name else "[Vendor]"
        if is_tax:
            full_description = f"{item_prefix} Tax & Surcharge: {desc}"
        else:
            full_description = f"{item_prefix} {desc}"

        mutations.append({
            "action": "create",
            "entity_type": "BudgetLineItem",
            "fields": {
                "category_id": target_category_id,
                "category_name": target_category_name,
                "description": full_description,
                "estimated_cost": clean_amount,
                "actual_cost": "0.00",
                "is_paid": False,
            },
            "reasoning": (
                f"Parsed from {vendor_name} contract. "
                f"Milestone: {item.get('milestone') or 'Standard delivery'}"
            ),
        })

    proposed_diff = {
        "mutations": mutations,
        "vendor_name": vendor_name,
        "total_quoted_amount": raw_proposal.get("total_quoted_amount", "0.00"),
        "budget_status": raw_proposal.get("budget_status", "unknown"),
        "variance_amount": raw_proposal.get("variance_amount", "0.00"),
        "negotiation_draft": raw_proposal.get("negotiation_draft", ""),
        "payment_terms": raw_proposal.get("payment_terms", ""),
        "cancellation_terms": raw_proposal.get("cancellation_terms", ""),
    }

    logger.info(
        "generate_document_proposal_node: %d 'create' BudgetLineItem mutations formulated for event %s",
        len(mutations),
        state["event_id"],
    )

    return {"proposed_diff": proposed_diff}


# ===========================================================================
# GRAPH COMPILATION & RUNNER
# ===========================================================================

def build_document_intelligence_graph(llm: Any = None) -> Any:
    """Compiles the 3-node LangGraph StateGraph workflow for Document Intelligence."""
    workflow = StateGraph(AgentState)

    workflow.add_node("inspect_document_context", inspect_document_context_node)
    workflow.add_node(
        "analyze_contract",
        lambda state: analyze_contract_node(state, llm=llm),
    )
    workflow.add_node("generate_document_proposal", generate_document_proposal_node)

    workflow.add_edge(START, "inspect_document_context")
    workflow.add_edge("inspect_document_context", "analyze_contract")
    workflow.add_edge("analyze_contract", "generate_document_proposal")
    workflow.add_edge("generate_document_proposal", END)

    return workflow.compile()


def run_document_intelligence_agent(
    event_id: str,
    org_id: str,
    document_id: str | None = None,
    document_title: str = "",
    file_url: str = "",
    target_category_id: str | None = None,
    target_category_name: str = "Vendor Quotes & Contracts",
    notes: str = "",
    llm: Any = None,
) -> AgentState:
    """Convenience runner executing the compiled LangGraph document workflow end-to-end."""
    app = build_document_intelligence_graph(llm=llm)

    initial_state: AgentState = {
        "event_id": event_id,
        "org_id": org_id,
        "trigger": f"contract_analysis_requested:{document_title or document_id or 'doc'}",
        "event_summary": {},
        "tasks_snapshot": [],
        "budget_snapshot": {},
        "vendors_snapshot": [],
        "team_snapshot": [],
        "planning_options": {
            "document_id": document_id,
            "document_title": document_title,
            "file_url": file_url,
            "target_category_id": target_category_id,
            "target_category_name": target_category_name,
            "notes": notes,
        },
        "reasoning": "",
        "errors": [],
        "raw_proposal": {},
        "proposed_diff": {},
    }

    logger.info(
        "run_document_intelligence_agent: Starting for doc=%s event=%s org=%s",
        document_id,
        event_id,
        org_id,
    )
    return app.invoke(initial_state)

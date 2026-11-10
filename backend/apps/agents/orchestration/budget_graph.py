"""
LangGraph Budget Intelligence Agent - 3-node workflow

Node 1: inspect_budget_context   - read_only snapshot of event budget + vendors
Node 2: analyze_budget_node      - LLM analyzes variance, flags issues, proposed reallocations
Node 3: generate_budget_proposal - maps proposal into Single Write Path mutations
"""

import logging
from typing import Any

from agents.orchestration.schemas import BudgetIntelligenceProposal
from agents.orchestration.state import AgentState
from agents.orchestration.tools import (
    get_event_budget,
    get_event_summary,
    get_event_vendors,
)
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, START, StateGraph

logger = logging.getLogger(__name__)

BUDGET_SYSTEM_PROMPT = """You are EventOps Budget Intelligence Agent.
Your role is to analyze an event's budget health and propose actionable corrective measures.

Rules:
1. Read the budget snapshot carefully - categories have an allocated_amount, line items have 
estimated_cost and actual_cost.
2. Compute variance_pct = (actual - estimated) / estimated * 100 for each line item with actual_cost > 0.
3. Flag any line item where |variance_pct| > 10% OR where actual_cost > estimated_cost.
4. Summarise each category's health: healthy (<90% of allocated used), warning (90-110%), critical (>110%).
5. Propose reallocations only when a category is warning or critical and a healthy catehory has surplus.
6. health_score = 100 - (number of critical categories * 20) - (number of warning categories * 5), clamped 0-100.
7. projected_total_cost = sum of all actual_costs + sum of estimated_costs for unpaid items.
8. Be concise and data-driven. Never fabricate numbers not present in the snapshot.
"""

def format_budget_analysis_prompt(
    event_summary: dict[str, Any],
    budget_snapshot: dict[str, Any],
    vendors_snapshot: list[dict[str, Any]],
) -> str:
    """Formats structured context into a human-readable LLM prompt."""
    lines = []
    lines.append(
        f"EVENT: {event_summary.get('name', 'Unknown')} | Status: {event_summary.get('status', 'N/A')}"
    )
    lines.append(f"Dates: {event_summary.get('start_date')} -> {event_summary.get('end_date')}\n")
    categories = budget_snapshot.get("categories", [])
    lines.append(f"BUDGET SNAPSHOT ({len(categories)} categories):")
    for cat in categories:
        lines.append(f"\n  Category: {cat['name']} | Allocated: {cat['allocated_amount']}")
        for item in cat.get("line_items", []):
            paid_flag = "[PAID]" if item.get("is_paid") else ""
            lines.append(
                f"    - Item ID: {item['id']} | {item['description']} | "
                f"Est: {item['estimated_cost']} | Actual: {item.get('actual_cost', '0.00')} {paid_flag}"
            )
    lines.append(f"\nVENDOR BOOKINGS ({len(vendors_snapshot)}):")
    for v in vendors_snapshot:
        lines.append(
            f"  - {v['vendor_name']} ({v['vendor_category']}) | "
            f"{v['status']} | Price: {v.get('agreed_price', 'N/A')}"
        )
    lines.append("\nAnalyse the budget and return a BudgetIntelligenceProposal.")
    return "\n".join(lines)

# WORKFLOW NODES


def inspect_budget_context_node(state: AgentState) -> dict[str, Any]:
    """Node 1: Gathers read-only snapshots of the event budget and vendors."""
    event_id = state["event_id"]
    org_id = state["org_id"]
    logger.info(
        "inspect_budget_context_node: Fetching context for event %s in org %s",
        event_id,
        org_id,
    )
    event_summary = get_event_summary.invoke({"event_id": event_id, "org_id": org_id})
    budget_snapshot = get_event_budget.invoke({"event_id": event_id, "org_id": org_id})
    vendors_snapshot = get_event_vendors.invoke({"event_id": event_id, "org_id": org_id})
    logger.info(
        "inspect_budget_context_node: %d categories, %d vendors fetched",
        len(budget_snapshot.get("categories", [])),
        len(vendors_snapshot),
    )
    return {
        "event_summary": event_summary,
        "budget_snapshot": budget_snapshot,
        "vendors_snapshot": vendors_snapshot,
    }
def analyze_budget_node(state: AgentState, llm: Any = None) -> dict[str, Any]:
    """Node 2: Invokes the LLM to analyze budget variance and produce a structured proposal."""
    logger.info("analyze_budget_node: Running analysis for event %s", state["event_id"])
    from agents.orchestration.llm import MockBudgetIntelligenceLLM, get_llm
    active_llm = llm or get_llm(agent_type="budget_intelligence")
    prompt_content = format_budget_analysis_prompt(
        event_summary=state.get("event_summary", {}),
        budget_snapshot=state.get("budget_snapshot", {}),
        vendors_snapshot=state.get("vendors_snapshot", []),
    )
    messages = [
        SystemMessage(content=BUDGET_SYSTEM_PROMPT),
        HumanMessage(content=prompt_content),
    ]
    try:
        structured_llm = active_llm.with_structured_output(BudgetIntelligenceProposal)
        proposal: BudgetIntelligenceProposal = structured_llm.invoke(messages)
        logger.info(
            "analyze_budget_node: Proposal generated — health_score=%s, %d flags",
            proposal.health_score,
            len(proposal.flagged_items),
        )
        return {
            "raw_proposal": proposal.model_dump(),
            "reasoning": proposal.reasoning,
        }
    except Exception as e:  # noqa: BLE001
        logger.warning(
            "analyze_budget_node: Primary LLM error (%s). Falling back to MockBudgetIntelligenceLLM.",
            e,
        )
        fallback = MockBudgetIntelligenceLLM()
        structured_fallback = fallback.with_structured_output(BudgetIntelligenceProposal)
        proposal = structured_fallback.invoke(messages)
        return {
            "raw_proposal": proposal.model_dump(),
            "reasoning": proposal.reasoning,
            "errors": [f"LLM fallback used: {e}"],
        }
def generate_budget_proposal_node(state: AgentState) -> dict[str, Any]:
    """Node 3: Maps the BudgetIntelligenceProposal into Single Write Path update mutations."""
    raw_proposal = state.get("raw_proposal", {})
    flagged_items = raw_proposal.get("flagged_items", [])
    category_summaries = raw_proposal.get("category_summaries", [])
    mutations: list[dict[str, Any]] = []
    # Generate update mutations for overspent line items (align estimate to actual reality)
    for flag in flagged_items:
        if flag.get("flag_type") == "overspend" and flag.get("line_item_id"):
            mutations.append({
                "action": "update",
                "entity_type": "BudgetLineItem",
                "entity_id": flag["line_item_id"],
                "fields": {
                    "estimated_cost": flag["actual_cost"],
                },
                "reasoning": flag.get("reason", ""),
            })
    # Generate update mutations for categories needing reallocation
    for summary in category_summaries:
        realloc = summary.get("recommended_reallocation", "0.00")
        try:
            if float(realloc) != 0.0:
                new_amount = float(summary["allocated_amount"]) + float(realloc)
                mutations.append({
                    "action": "update",
                    "entity_type": "BudgetCategory",
                    "entity_id": summary["category_id"],
                    "fields": {
                        "allocated_amount": f"{new_amount:.2f}",
                    },
                    "reasoning": (
                        f"Reallocation of {realloc} for {summary['category_name']} "
                        f"({summary['health_status']} status)"
                    ),
                })
        except (ValueError, TypeError):
            pass
    proposed_diff = {"mutations": mutations}
    logger.info(
        "generate_budget_proposal_node: %d mutations formulated for event %s",
        len(mutations),
        state["event_id"],
    )
    return {"proposed_diff": proposed_diff}

# GRAPH COMPILATION
def build_budget_intelligence_graph(llm: Any = None) -> Any:
    """Compiles the 3-node LangGraph StateGraph workflow for Budget Intelligence."""
    workflow = StateGraph(AgentState)
    workflow.add_node("inspect_budget_context", inspect_budget_context_node)
    workflow.add_node(
        "analyze_budget",
        lambda state: analyze_budget_node(state, llm=llm),
    )
    workflow.add_node("generate_budget_proposal", generate_budget_proposal_node)
    workflow.add_edge(START, "inspect_budget_context")
    workflow.add_edge("inspect_budget_context", "analyze_budget")
    workflow.add_edge("analyze_budget", "generate_budget_proposal")
    workflow.add_edge("generate_budget_proposal", END)
    return workflow.compile()
def run_budget_intelligence_agent(
    event_id: str,
    org_id: str,
    llm: Any = None,
) -> AgentState:
    """Convenience runner executing the compiled LangGraph budget workflow end-to-end."""
    app = build_budget_intelligence_graph(llm=llm)
    initial_state: AgentState = {
        "event_id": event_id,
        "org_id": org_id,
        "trigger": "budget_analysis_requested",
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
    logger.info(
        "run_budget_intelligence_agent: Starting for event %s in org %s",
        event_id,
        org_id,
    )
    return app.invoke(initial_state)

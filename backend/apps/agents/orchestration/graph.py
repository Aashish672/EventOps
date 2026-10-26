import logging
from typing import Any

from agents.orchestration.llm import get_llm
from agents.orchestration.prompts import (
    RISK_IMPACT_SYSTEM_PROMPT,
    format_risk_analysis_prompt,
)
from agents.orchestration.schemas import RiskRemediationProposal
from agents.orchestration.state import AgentState
from agents.orchestration.tools import (
    get_event_budget,
    get_event_summary,
    get_event_tasks,
    get_event_vendors,
)
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, START, StateGraph

logger = logging.getLogger(__name__)


# ==========================================================================
# WORKFLOW NODES
# ==========================================================================


def inspect_context_node(state: AgentState) -> dict[str, Any]:
    """
    Node 1: Gathers real-time read-only snapshots of the event, tasks,
    budget, and vendor contracts using tenant-isloated tools.
    """

    event_id = state["event_id"]
    org_id = state["org_id"]

    logger.info("inspect_context_node: Gathering state for Event %s (Org %s)",
    event_id, org_id)

    event_summary = get_event_summary.invoke({"event_id": event_id, "org_id": org_id})
    tasks = get_event_tasks.invoke({"event_id": event_id, "org_id": org_id})
    budget = get_event_budget.invoke({"event_id": event_id, "org_id": org_id})
    vendors = get_event_vendors.invoke({"event_id": event_id, "org_id": org_id})

    return {
        "event_summary": event_summary if isinstance(event_summary, dict) else {},
        "tasks_snapshot": tasks if isinstance(tasks, list) else [],
        "budget_snapshot": budget if isinstance(budget, dict) else {},
        "vendors_snapshot": vendors if isinstance(vendors, list) else [],
    }

def evaluate_ripple_effects_node(state: AgentState, llm: Any=None) -> dict[str, Any]:
    """
    Node 2: Feeds the gathered snapshots and trigger condition into the LLM
    to generate an expert Chain-of_Thought analysis and structured RiskRemediationProposal.
    """
    logger.info("evaluate_ripple_effects_node: Running LLM reasoning on Event %s", state["event_id"])

    client = llm or get_llm()
    structured_client = client.with_structured_output(RiskRemediationProposal)

    prompt_content = format_risk_analysis_prompt(
        event_summary=state.get("event_summary", {}),
        trigger=state.get("trigger", "Operational change eveluation"),
        tasks=state.get("tasks_snapshot",[]),
        budget=state.get("budget_snapshot", {}),
        vendors=state.get("vendors_snapshot", []),
    )

    messages = [
        SystemMessage(content=RISK_IMPACT_SYSTEM_PROMPT),
        HumanMessage(content=prompt_content),
    ]

    try:
        proposal: RiskRemediationProposal = structured_client.invoke(messages)
        return {
            "reasoning": proposal.reasoning,
            "raw_proposal": proposal.model_dump(),
        }
    
    except Exception as e:
        logger.exception("evaluate_ripple_effects_node encountered an error")
        return {
            "errors": [str(e)],
            "raw_proposal": {
                "risk_severity": "high",
                "impact_summary": f"Automated analysis error: {e}",
                "reasoning": "Failed to complete structured LLM evaluation",
                "task_adjustments": [],
                "budget_adjustments": [],
            },
        }

def generate_remediation_proposal_node(state: AgentState) -> dict[str, Any]:
    """
    Node 3: Converts the LLM's recommended adjustments into strict,
    validated Single Write Path mutations ready for human review.
    """
    raw_proposal = state.get("raw_proposal", {})
    task_adjustments = raw_proposal.get("task_adjustments", [])
    budget_adjustments = raw_proposal.get("budget_adjustments", [])

    mutations: list[dict[str, Any]] = []
    valid_task_ids = {str(t["id"]) for t in state.get("tasks_snapshot", []) if "id" in t}
    valid_category_ids = {
        str(c["id"])
        for c in state.get("budget_snapshot", {}).get("categories", [])
        if "id" in c
    }

    # 1. Translate task schedule shifts into Single Write Path mutations
    for adj in task_adjustments:
        task_id = str(adj.get("task_id"))
        is_valid_task = not valid_task_ids or task_id in valid_task_ids
        if (
            adj.get("suggested_action") in ("shift_due_date", "escalate_bottleneck")
            and is_valid_task
            and adj.get("proposed_due_date")
        ):
            mutations.append(
                {
                    "action": "update",
                    "entity_type": "Task",
                    "entity_id": task_id,
                    "fields": {
                        "due_date": adj["proposed_due_date"],
                    },
                }
            )

    # 2. Translate budget adjustments into Single Write Path mutations
    for b_adj in budget_adjustments:
        cat_id = str(b_adj.get("category_id"))
        is_valid_cat = not valid_category_ids or cat_id in valid_category_ids
        if is_valid_cat and b_adj.get("recommended_buffer"):
            mutations.append({
                "action": "update",
                "entity_type": "BudgetCategory",
                "entity_id": cat_id,
                "fields": {
                    "allocated_amount": b_adj["recommended_buffer"],
                },
            })
    
    proposed_diff = {
        "mutations": mutations,
        "risk_severity": raw_proposal.get("risk_severity", "medium"),
        "impact_summary": raw_proposal.get("impact_summary", ""),
        "task_adjustments": task_adjustments,
        "budget_adjustments": budget_adjustments,
    }

    logger.info(
        "generate_remediation_proposal_node: Generated %d Single Write Path mutations for Event %s",
        len(mutations),
        state["event_id"],
    )

    return {"proposed_diff": proposed_diff}

# ====================================================================
# GRAPH COMPILATION & RUNNER
# ====================================================================

def build_risk_impact_graph(llm: Any = None) -> Any:
    """Compiles the 3-node LangGraph workflow."""
    workflow = StateGraph(AgentState)

    #1. Add nodes
    workflow.add_node("inspect_context", inspect_context_node)
    workflow.add_node(
        "evaluate_ripple_effects", lambda state: evaluate_ripple_effects_node(state, llm=llm),
    )
    workflow.add_node("generate_remediation_proposal", generate_remediation_proposal_node)

    # Add linear edges
    workflow.add_edge(START, "inspect_context")
    workflow.add_edge("inspect_context", "evaluate_ripple_effects")
    workflow.add_edge("evaluate_ripple_effects", "generate_remediation_proposal")
    workflow.add_edge("generate_remediation_proposal", END)

    return workflow.compile()

def run_risk_impact_agent(
    event_id: str,
    org_id: str,
    trigger: str,
    llm: Any = None,
) -> AgentState:
    """ Convenience runner executing the compiled LangGraph workflow end-to-end."""
    app = build_risk_impact_graph(llm=llm)

    initial_state: AgentState = {
        "event_id": event_id,
        "org_id": org_id,
        "trigger": trigger,
        "event_summary": {},
        "tasks_snapshot": [],
        "budget_snapshot": {},
        "vendors_snapshot": [],
        "reasoning": "",
        "errors": [],
        "raw_proposal": {},
        "proposed_diff": {},
    }

    return app.invoke(initial_state)

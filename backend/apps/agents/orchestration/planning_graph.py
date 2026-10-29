import logging
from typing import Any

from agents.orchestration.llm import get_llm
from agents.orchestration.prompts import (
    EVENT_PLANNING_SYSTEM_PROMPT,
    format_event_planning_prompt,
)
from agents.orchestration.schemas import EventPlanProposal
from agents.orchestration.state import AgentState
from agents.orchestration.tools import (
    get_event_summary,
    get_event_tasks,
    get_organization_team,
)
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import END, START, StateGraph

logger = logging.getLogger(__name__)


# ==========================================================================
# WORKFLOW NODES
# ==========================================================================


def inspect_planning_context_node(state: AgentState) -> dict[str, Any]:
    """Node 1: Gathers real-time read-only snapshots of the event summary,
    existing tasks, and organization team members using tenant-isolated tools.
    """
    event_id = state["event_id"]
    org_id = state["org_id"]

    logger.info(
        "inspect_planning_context_node: Inspecting event %s in org %s",
        event_id,
        org_id,
    )

    event_summary = get_event_summary.invoke({"event_id": event_id, "org_id": org_id})
    tasks = get_event_tasks.invoke({"event_id": event_id, "org_id": org_id})
    team = get_organization_team.invoke({"org_id": org_id})

    return {
        "event_summary": event_summary if isinstance(event_summary, dict) else {},
        "tasks_snapshot": tasks if isinstance(tasks, list) else [],
        "team_snapshot": team if isinstance(team, list) else [],
    }


def decompose_and_plan_node(state: AgentState, llm: Any = None) -> dict[str, Any]:
    """Node 2: Invokes the planning LLM to generate operational milestones
    and reverse-scheduled tasks based on the event date and available team.
    """
    logger.info(
        "decompose_and_plan_node: Generating roadmap for event %s",
        state["event_id"],
    )

    client = llm or get_llm(agent_type="event_planning")
    structured_client = client.with_structured_output(EventPlanProposal)

    prompt_content = format_event_planning_prompt(
        event_summary=state.get("event_summary", {}),
        team=state.get("team_snapshot", []),
        existing_tasks=state.get("tasks_snapshot", []),
        planning_options=state.get("planning_options", {}),
    )

    messages = [
        SystemMessage(content=EVENT_PLANNING_SYSTEM_PROMPT),
        HumanMessage(content=prompt_content),
    ]

    try:
        proposal: EventPlanProposal = structured_client.invoke(messages)
        return {
            "reasoning": proposal.reasoning,
            "raw_proposal": proposal.model_dump(),
        }
    except Exception as e:
        logger.exception("decompose_and_plan_node encountered an error")
        return {
            "errors": [str(e)],
            "raw_proposal": {
                "plan_summary": f"Automated planning error: {e}",
                "event_category": "General Event",
                "milestones": [],
                "tasks": [],
                "reasoning": "Failed to synthesize event roadmap due to an error.",
            },
        }


def generate_plan_proposal_node(state: AgentState) -> dict[str, Any]:
    """Node 3: Maps synthesized TaskBlueprints into Single Write Path
    'create' mutations ready for human review in the Agent Console.
    """
    raw_proposal = state.get("raw_proposal", {})
    tasks = raw_proposal.get("tasks", [])
    milestones = raw_proposal.get("milestones", [])

    mutations: list[dict[str, Any]] = []

    for task_bp in tasks:
        mutations.append(
            {
                "action": "create",
                "entity_type": "Task",
                "fields": {
                    "title": task_bp.get("title", "Untitled Task"),
                    "description": task_bp.get("description", ""),
                    "status": "todo",
                    "due_date": task_bp.get("due_date"),
                },
                "metadata": {
                    "milestone_name": task_bp.get("milestone_name", ""),
                    "suggested_role": task_bp.get("suggested_role", "planner"),
                    "priority": task_bp.get("priority", "medium"),
                },
            }
        )

    proposed_diff = {
        "mutations": mutations,
        "plan_summary": raw_proposal.get("plan_summary", ""),
        "event_category": raw_proposal.get("event_category", "General Event"),
        "milestones": milestones,
        "tasks": tasks,
        "total_tasks": len(tasks),
    }

    logger.info(
        "generate_plan_proposal_node: Formulated %d 'create' task mutations for event %s",
        len(mutations),
        state["event_id"],
    )

    return {"proposed_diff": proposed_diff}


# ==========================================================================
# GRAPH COMPILATION & RUNNER
# ==========================================================================


def build_event_planning_graph(llm: Any = None) -> Any:
    """Compiles the 3-node LangGraph StateGraph workflow for Event Planning."""
    workflow = StateGraph(AgentState)

    workflow.add_node("inspect_planning_context", inspect_planning_context_node)
    workflow.add_node(
        "decompose_and_plan",
        lambda state: decompose_and_plan_node(state, llm=llm),
    )
    workflow.add_node("generate_plan_proposal", generate_plan_proposal_node)

    workflow.add_edge(START, "inspect_planning_context")
    workflow.add_edge("inspect_planning_context", "decompose_and_plan")
    workflow.add_edge("decompose_and_plan", "generate_plan_proposal")
    workflow.add_edge("generate_plan_proposal", END)

    return workflow.compile()


def run_event_planning_agent(
    event_id: str,
    org_id: str,
    trigger: str = "Initial event roadmap creation",
    planning_options: dict[str, Any] | None = None,
    llm: Any = None,
) -> AgentState:
    """Convenience runner executing the compiled LangGraph planning workflow end-to-end."""
    app = build_event_planning_graph(llm=llm)

    initial_state: AgentState = {
        "event_id": event_id,
        "org_id": org_id,
        "trigger": trigger,
        "event_summary": {},
        "tasks_snapshot": [],
        "budget_snapshot": {},
        "vendors_snapshot": [],
        "team_snapshot": [],
        "planning_options": planning_options or {},
        "reasoning": "",
        "errors": [],
        "raw_proposal": {},
        "proposed_diff": {},
    }

    return app.invoke(initial_state)

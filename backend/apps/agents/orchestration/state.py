import operator
from typing import Annotated, Any

from typing_extensions import TypedDict


class AgentState(TypedDict):
    """
    Standard state schema passed through LangGraph workflow nodes.
    Guarantees consistent memory and proposal contract across all 5 specified agents.
    """

    # Event & Tenant Identity
    event_id: str
    org_id: str
    trigger: str

    #Agent Obsrvation Snapshot (populated by read tools)
    event_summary: dict[str, Any]
    tasks_snapshot: list[dict[str, Any]]
    budget_snapshot: dict[str, Any]
    vendors_snapshot: list[dict[str, Any]]

    #Reasoning and outputs
    reasoning: str
    errors: Annotated[list[str], operator.add]

    # Structured remediation proposal from LLM
    raw_proposal: dict[str, Any]
    
    #Proposed diff contract (matches single write path expectations)
    # E.g. {"mutations": [{"action": "update", "entity_type": "Task", "entity_id": "...", "fields": {...}}]}
    proposed_diff: dict[str, Any]
 
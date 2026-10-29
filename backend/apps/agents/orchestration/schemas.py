from typing import Literal

from pydantic import BaseModel, Field


class TaskAdjustment(BaseModel):
    """Represents a recommend deadline adjustment for a specific task."""

    task_id: str = Field(description="UUID of the task requiring schedule adjustment")
    title: str = Field(description="Current title of the task")
    proposed_due_date: str = Field(
        description="ISO 8601 formatted date/timestamp for the new proposed deadline"
    )
    suggested_action: Literal["shift_due_date", "escalate_bottleneck", "reassign", "none"] = Field(
        default="shift_due_date",
        description="Operational mitigation recommendation",
    )
    reason: str = Field(description="Brief explanation of why this adjustment is needed")


class BudgetAdjustment(BaseModel):
    """Represents a recommend buffer or reallocation for an event budget category."""

    category_id: str = Field(description="UUID of the affected budget category")
    category_name: str = Field(description="Name of the budget category (e.g., Catering, Venue)")
    recommended_buffer: str = Field(
        description="Recommend monetary buffer adjustment (e.g. '+500.00')"
    )
    reason: str = Field(description="Justification for the budget adjustment")


class RiskRemediationProposal(BaseModel):
    """
    Structured payload returned by the LangGraph Risk & Change Impact Agent.
    Guarantess strict schema compliance before converting into Single Write Path mutations.
    """

    risk_severity: Literal["low", "medium", "high", "critical"] = Field(
        description="Overall risk severity rating"
    )
    impact_summary: str = Field(
        description="Executive summary of the operational disruption and recommend mitigations"
    )
    reasoning: str = Field(
        description="Chain-of-thought analysis explaining why specific adjustments are recommended"
    )
    task_adjustments: list[TaskAdjustment] = Field(
        default_factory=list,
        description="List of task schedule shifts or bottlenecks",
    )
    budget_adjustments: list[BudgetAdjustment] = Field(
        default_factory=list,
        description="Optional list of budget buffers or reallocations",
    )

class MilestoneBlueprint(BaseModel):
    """Represents an operational phase in the event timeline (e.g., Venue & Permits)."""

    name: str = Field(description="Operational milestone name")
    target_date: str = Field(description="ISO 8601 formatted date/timestamp for this milestone deadline")
    description: str = Field(default="", description="Summary of key objectives for this milestone")

class TaskBlueprint(BaseModel):
    """Represents an actionable task item synthesized by the Event Planning Agent."""
    title: str = Field(description="Actionable task title")
    description: str = Field(default="", description="Detailed Instructions, checklist, or vendor guidance")
    due_date: str = Field(description="ISO 8601 formatted date/timestamp for that task due_date")
    suggested_role: Literal["planner", "coordinator", "freelancer", "volunteer", "unassigned"] = Field(
        default="planner",
        description="Recommend team persona for task execution",
    )
    priority: Literal["high", "medium", "low"] = Field(
        default="medium",
        description="Task Priority Level",
    )
    milestone_name: str = Field(
        default="",
        description="Name of the associated operational milestone phase",
    )

class EventPlanProposal(BaseModel):
    """
    Structured Payload returned by the LangGraph Event Planning Agent.
    Guarantees strict schema validation before mapping into Single Write Path CREATE mutations.
    """

    plan_summary: str = Field(
        description="Executive summary of the generated operational roadmap"
    )
    event_category: str = Field(
        default="General Event",
        description="Event category",
    )
    milestones: list[MilestoneBlueprint] = Field(
        default_factory=list,
        description="Ordered operational milestone phases",
    )
    tasks: list[TaskBlueprint] = Field(
        default_factory=list,
        description="Synthesized operational tasks with relative lead-time due dates",
    )
    reasoning: str = Field(
        description="Chain-of-thought explaining milestone breakdown and timeline offsets.",
    )

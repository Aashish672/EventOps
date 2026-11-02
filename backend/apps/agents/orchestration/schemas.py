from typing import Annotated, Literal

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

class LineItemFlag(BaseModel):
    """Flags a specific line item as overspent, anomalous, or at risk."""

    line_item_id: str = Field(description="UUID of the BudgetLineItem")
    description: str = Field(description="Human-readable description of the line item")
    category_name: str = Field(description="Parent category name")
    estimated_cost: str = Field(description="Original estimated cost (decimal string)")
    actual_cost: str = Field(description="Current actual cost (decimal string)")
    variance_pct: float = Field(
        description="Percentage varaince: (actual - estimated)/estimated * 100"
    )
    flag_type: Literal["overspend", "underspend", "anomaly", "at_risk"] = Field(
        description="Classification of the budget flag"
    )
    recommended_action: Literal[
        "increase_estimate", "reallocate_from_reserve", "investigate_vendor", "none"
    ] = Field(default="none", description="Recommended corrective action")
    reason: str = Field(description="Brief justification for the flag")


class CategoryHealthSummary(BaseModel):
    """Rolled-up health status for a budget category."""

    category_id: str = Field(description="UUID of the BudgetCategory")
    category_name: str = Field(description="Category name")
    allocated_amount: str = Field(description="Total allocated budget for this category")
    total_estimated: str = Field(description="Sum of estimated costs across line items")
    total_actual: str = Field(description="Sum of actual costs across line items")
    health_status: Literal["healthy", "warning", "critical"] = Field(
        description="Overall health: healthy (<90% used), warning (90-110%), critical (>110%)"
    )
    recommended_reallocation: str = Field(
        default="0.00",
        description="Suggested amount to reallocate TO this category (positive) or FROM it (negative)",
    )


class BudgetIntelligenceProposal(BaseModel):
    """
    Structured payload returned by the LangGraph Budget Intelligence Agent.
    Guarantees strict schema compliance before converting into Single Write Path mutations.
    """
    
    health_score: Annotated[int, Field(ge=0, le=100)] = Field(
        description="Overall budget health score 0-100 (100 = perfectly on budget)"
    )
    executive_summary: str = Field(
        description="2-3 sentence overview of overall budget health and top risks"
    )
    reasoning: str = Field(
        description="Chain-of-thought analysis explaining variance computations and recommendations"
    )
    projected_total_cost: str = Field(
        description="Forecasted final cost (sum of actual costs + remaining estimated costs)"
    )
    flagged_items: list[LineItemFlag] = Field(
        default_factory=list,
        description="Line items with significant variance (>100%) or anomalies",
    )
    category_summaries: list[CategoryHealthSummary] = Field(
        default_factory=list,
        description="Per-category rolled up health summaries"
    )
    reallocation_suggestions: list[BudgetAdjustment] = Field(
        default_factory=list,
        description="Category-level reallocation recommendations (reuses BudgetAdjustment schema)",
    )

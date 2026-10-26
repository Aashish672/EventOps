import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Literal

from events.models import Event, Task, VendorBooking

logger = logging.getLogger(__name__)


@dataclass
class TaskImpactAnalysis:
    """Represents the operational evaluation of a single task under event changes."""

    task_id: str
    title: str
    status: str
    current_due_date: datetime | None
    proposed_due_date: datetime | None
    late_margin_hours: float | None
    has_conflict: bool
    conflict_reason: str
    suggested_action: Literal["shift_due_date", "escalate_bottleneck", "reassign", "none"]


@dataclass
class EventRiskReport:
    """Comprehensive risk evaluation report containing task ripple effects and vendor fallouts."""

    event_id: str
    risk_severity: Literal["low", "medium", "high", "critical"]
    material_trigger: str
    delta_days: float
    impact_summary: str
    affected_tasks: list[TaskImpactAnalysis] = field(default_factory=list)
    vendor_fallouts: list[dict[str, Any]] = field(default_factory=list)

    def to_proposal_mutations(self) -> list[dict[str, Any]]:
        """Converts affected task recommendations into Single Write Path mutations."""
        mutations = []
        for impact in self.affected_tasks:
            if impact.suggested_action == "shift_due_date" and impact.proposed_due_date:
                mutations.append({
                    "action": "update",
                    "entity_type": "Task",
                    "entity_id": impact.task_id,
                    "fields": {
                        "due_date": impact.proposed_due_date.isoformat(),
                    },
                })
        return mutations


class TaskDependencyEngine:
    """
    In-memory dependency analysis engine.
    Calculates schedule cascades, late margins, and conflict points when events shift or vendors cancel.
    """

    @classmethod
    def evaluate_date_shift(
        cls,
        event: Event,
        old_start_date: datetime,
        new_start_date: datetime,
        old_end_date: datetime | None = None,
        new_end_date: datetime | None = None,
    ) -> EventRiskReport:
        """
        Analyzes the ripple effect of shifting an event's schedule.
        Calculates the delta, checks task due dates, and computes new proposed due dates.
        """
        delta = new_start_date - old_start_date
        delta_days = round(delta.total_seconds() / 86400, 2)
        tasks = Task.objects.filter(event=event, organization=event.organization).order_by("due_date")

        affected_tasks: list[TaskImpactAnalysis] = []
        has_critical_conflict = False
        has_tight_margin = False

        for task in tasks:
            # Completed tasks do not require schedule shifts
            if task.status == "done":
                continue

            current_due = task.due_date
            proposed_due: datetime | None = None
            late_margin_hours: float | None = None
            has_conflict = False
            conflict_reason = ""
            action: Literal["shift_due_date", "escalate_bottleneck", "reassign", "none"] = "none"

            if current_due:
                # Proportional schedule shift
                proposed_due = current_due + delta

                # Calculate late margin relative to the new event start date
                late_margin_seconds = (new_start_date - proposed_due).total_seconds()
                late_margin_hours = round(late_margin_seconds / 3600, 1)

                # Check if shifted task violates event boundaries
                if new_end_date and proposed_due > new_end_date:
                    has_conflict = True
                    has_critical_conflict = True
                    conflict_reason = f"Proposed due date ({proposed_due.strftime('%Y-%m-%d')}) exceeds new event end date."
                    action = "escalate_bottleneck"
                elif late_margin_hours < 0 and "teardown" not in task.title.lower() and "recap" not in task.title.lower():
                    # Task is scheduled after event start, but is not a post-event task
                    has_conflict = True
                    has_tight_margin = True
                    conflict_reason = f"Negative margin ({late_margin_hours}h): Task due after event start date."
                    action = "shift_due_date"
                elif 0 <= late_margin_hours < 24:
                    has_tight_margin = True
                    conflict_reason = f"Tight bottleneck: Due only {late_margin_hours}h before event start."
                    action = "shift_due_date"
                else:
                    action = "shift_due_date"
                    conflict_reason = f"Shifted due date by {delta_days:+.1f} days to match new event schedule."
            else:
                # Task has no due date set
                conflict_reason = "Task has no due date configured."
                action = "none"

            affected_tasks.append(
                TaskImpactAnalysis(
                    task_id=str(task.id),
                    title=task.title,
                    status=task.status,
                    current_due_date=current_due,
                    proposed_due_date=proposed_due,
                    late_margin_hours=late_margin_hours,
                    has_conflict=has_conflict,
                    conflict_reason=conflict_reason,
                    suggested_action=action,
                )
            )

        # Determine overall risk severity
        if abs(delta_days) >= 14 or has_critical_conflict:
            severity = "critical"
        elif abs(delta_days) >= 7 or has_tight_margin:
            severity = "high"
        elif abs(delta_days) >= 2:
            severity = "medium"
        else:
            severity = "low"

        direction = "forward" if delta_days > 0 else "backward"
        impact_summary = (
            f"Event schedule shifted {direction} by {abs(delta_days):.1f} days. "
            f"Evaluated {len(affected_tasks)} active task(s). "
            f"{'Found critical deadline conflicts requiring immediate planner review.' if has_critical_conflict else 'Calculated proportional deadline adjustments to maintain operational margins.'}"
        )

        logger.info(
            "TaskDependencyEngine evaluated date shift for Event %s: delta=%s days, severity=%s, affected_tasks=%d",
            event.id,
            delta_days,
            severity,
            len(affected_tasks),
        )

        return EventRiskReport(
            event_id=str(event.id),
            risk_severity=severity,
            material_trigger=f"event_date_shifted_{direction}_{abs(delta_days):.1f}d",
            delta_days=delta_days,
            impact_summary=impact_summary,
            affected_tasks=affected_tasks,
        )

    @classmethod
    def evaluate_vendor_cancellation(
        cls,
        event: Event,
        booking: VendorBooking,
    ) -> EventRiskReport:
        """
        Evaluates the fallout of a cancelled or rejected vendor contract.
        Identifies dependent tasks and assesses financial and operational risks.
        """
        vendor = booking.vendor
        vendor_name = vendor.name if vendor else "Unknown Vendor"
        vendor_category = vendor.category if vendor else "general"

        all_tasks = Task.objects.filter(event=event, organization=event.organization).exclude(status="done")
        related_tasks: list[TaskImpactAnalysis] = []

        search_terms = {vendor_name.lower(), vendor_category.lower()}
        if vendor_category == "catering":
            search_terms.update(["menu", "food", "dinner", "lunch", "dietary", "tasting"])
        elif vendor_category == "venue":
            search_terms.update(["ballroom", "stage", "seating", "hall", "security"])
        elif vendor_category in ("entertainment", "other"):
            search_terms.update(["sound", "audio", "lighting", "dj", "av", "music"])

        for task in all_tasks:
            title_lower = task.title.lower()
            desc_lower = task.description.lower()
            is_related = any(term in title_lower or term in desc_lower for term in search_terms)

            if is_related:
                related_tasks.append(
                    TaskImpactAnalysis(
                        task_id=str(task.id),
                        title=task.title,
                        status=task.status,
                        current_due_date=task.due_date,
                        proposed_due_date=task.due_date,
                        late_margin_hours=None,
                        has_conflict=True,
                        conflict_reason=f"Blocked by cancellation of {vendor_name} ({vendor_category}).",
                        suggested_action="escalate_bottleneck",
                    )
                )

        if vendor_category in ("venue", "catering"):
            severity = "critical"
        elif vendor_category in ("entertainment", "photography"):
            severity = "high"
        else:
            severity = "medium"

        fallout = {
            "booking_id": str(booking.id),
            "vendor_name": vendor_name,
            "vendor_category": vendor_category,
            "agreed_price": str(booking.agreed_price) if booking.agreed_price else None,
            "blocked_task_count": len(related_tasks),
        }

        impact_summary = (
            f"Vendor booking for '{vendor_name}' ({vendor_category}) was rejected/cancelled. "
            f"Identified {len(related_tasks)} dependent task(s) at risk of stall. Immediate vendor re-procurement recommended."
        )

        logger.warning(
            "TaskDependencyEngine evaluated vendor fallout for Event %s: vendor='%s', category='%s', blocked_tasks=%d",
            event.id,
            vendor_name,
            vendor_category,
            len(related_tasks),
        )

        return EventRiskReport(
            event_id=str(event.id),
            risk_severity=severity,
            material_trigger=f"vendor_cancelled_{vendor_category}_{booking.id}",
            delta_days=0.0,
            impact_summary=impact_summary,
            affected_tasks=related_tasks,
            vendor_fallouts=[fallout],
        )

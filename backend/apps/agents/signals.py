import logging
from typing import Any

from agents.models import AgentRun
from agents.orchestration.engine import EventRiskReport, TaskDependencyEngine
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from events.models import Event, VendorBooking

logger = logging.getLogger(__name__)

def _create_agent_run_proposal_from_report(
    event: Event,
    report: EventRiskReport,
    trigger: str,
    snapshot: dict[str, Any],
) -> AgentRun:
    """
    Persists an in-memory EventRiskReport as an auditable, pending AgentRun
    complying with the Sprint 4.0 Single Write Path.
    """
    mutations = report.to_proposal_mutations()
    proposed_diff = {
        "mutations": mutations,
        "risk_severity": report.risk_severity,
        "delta_days": report.delta_days,
        "impact_summary": report.impact_summary,
        "affected_tasks_count": len(report.affected_tasks),
        "vendor_fallouts": report.vendor_fallouts,
    }

    agent_run = AgentRun.objects.create(
        organization=event.organization,
        event=event,
        agent_type=AgentRun.AgentType.RISK_CHANGE_IMPACT,
        trigger=trigger,
        input_snapshot=snapshot,
        reasoning=report.impact_summary,
        proposed_diff=proposed_diff,
        state=AgentRun.State.PENDING,
    )

    logger.info(
        "Created pending AgentRun %s (%s) for Event %s with %d proposed mutation(s)",
        agent_run.id,
        report.risk_severity,
        event.id,
        len(mutations),
    )
    return agent_run


# ====================================================
# EVENT DATE SHIFT SIGNALS
# ====================================================

@receiver(pre_save, sender=Event)
def capture_event_pre_save_state(sender, instance: Event, **kwargs):
    """Capture original dates before the Event record is committed to the database."""
    if instance.pk:
        old_instance = (
            Event.objects.filter(pk=instance.pk)
            .only("start_date","end_date")
            .first()
        )
        if old_instance:
            instance._old_start_date = old_instance.start_date
            instance._old_end_date = old_instance.end_date
            return
    instance._old_start_date = None
    instance._old_end_date = None

@receiver(post_save, sender=Event)
def handle_event_date_shift_signal(
    sender, instance: Event, created: bool, **kwargs
    ):
    """
    Detects if an event's schedule changed, analyzes downstream impacts via TaskDependencyEngine,
    and automatically registers a pending AgentRun proposal.
    """
    # Brand new events do not constitute a date shift
    if created:
        return

    old_start = getattr(instance, "_old_start_date", None)
    old_end = getattr(instance, "_old_end_date", None)

    # If start_date hasn't changed no cascade calculation is needed
    if not old_start or old_start == instance.start_date:
        return
    
    try:
        report = TaskDependencyEngine.evaluate_date_shift(
            event=instance,
            old_start_date=old_start,
            new_start_date=instance.start_date,
            old_end_date=old_end,
            new_end_date=instance.end_date,
        )

        snapshot = {
            "old_start_date": old_start.isoformat(),
            "new_start_date": instance.start_date.isoformat(),
            "old_end_date": old_end.isoformat() if old_end else None,
            "new_end_date": instance.end_date.isoformat() if instance.end_date else None,
        }

        _create_agent_run_proposal_from_report(
            event=instance,
            report=report,
            trigger=report.material_trigger,
            snapshot=snapshot,
        )

    except Exception:
        # Agent execution failure should never crash the core event save transaction 
        logger.exception("Falied to evaluate date shift impact for Event %s", instance.id)

# =================================================
# VENDOR BOOKING CANCELLATION SIGNALS
# =================================================

@receiver(pre_save, sender=VendorBooking)
def capture_vendor_booking_pre_save_state(
    sender, instance: VendorBooking, **kwargs
):
    """ Captures the previous booking status before database update. """
    if instance.pk:
        old_instance = (
            VendorBooking.objects.filter(pk=instance.pk).only("status").first()
        )
        if old_instance:
            instance._old_status = old_instance.status
            return
    instance._old_status = None

@receiver(post_save, sender=VendorBooking)
def handle_vendor_booking_cancellation_signal(
    sender, instance: VendorBooking, created: bool, **kwargs
):
    """
    Detects if a vendor contract was rejected/cancelled and evaluates task ripple effects.
    """

    if created:
        return

    old_status = getattr(instance, "_old_status", None)

    # Check if booking just transitioned into a cancelled or rejected state
    if (
        old_status and old_status != instance.status
        and instance.status in ("rejected", "cancelled")
    ):
        try:
            report = TaskDependencyEngine.evaluate_vendor_cancellation(
                event=instance.event,
                booking=instance,
            )

            snapshot = {
                "booking_id": str(instance.id),
                "vendor_id": str(instance.vendor_id),
                "vendor_category": (
                    instance.vendor.category if instance.vendor else "unknown"
                ),
                "old_status": old_status,
                "new_status": instance.status,
            }

            _create_agent_run_proposal_from_report(
                event=instance.event,
                report=report,
                trigger=report.material_trigger,
                snapshot=snapshot,
            )
        except Exception:
            logger.exception(
                "Failed to evaluate vendor cancellation impact for Booking %s",
                instance.id,
            )

import logging
from typing import Any

from django.contrib.auth import get_user_model
from django.core.exceptions import PermissionDenied, ValidationError
from django.db import transaction
from django.utils import timezone
from events.models import BudgetCategory, BudgetLineItem, Task, VendorBooking
from organizations.models import Membership

from .models import AgentRun, ChangeLogEntry

logger = logging.getLogger(__name__)
User = get_user_model()

@transaction.atomic
def apply_agent_proposal(
    agent_run_id: str,
    user: Any,
    modified_diff: dict[str, Any] | None = None,
) -> AgentRun:
    """
    The Single Write Path for agent proposals.
    Executes inside an atomic transaction with row-level locking.
    Applies proposed mutations to business models and logs every change to ChangeLogEntry.
    """
    #1. Lock the AgentRun row to prevent race conditions
    try:
        agent_run = (
            AgentRun.objects.select_for_update()
            .select_related("event","organization")
            .get(id=agent_run_id)
        )
    except AgentRun.DoesNotExist:
        raise ValidationError(f"AgentRun with id '{agent_run_id}' does not exist.")
    
    #2. State validation: Only pending proposals can be applied
    if agent_run.state != AgentRun.State.PENDING:
        raise ValidationError(f"Cannot apply AgentRun with state '{agent_run.state}'.It must be '{AgentRun.State.PENDING}'.")

    #3. RBAC & Tenant validation: User must be an owner or planner in this organization
    is_authorized = Membership.objects.filter(
        organization=agent_run.organization,
        user=user,
        role__in=["owner","planner"],
    ).exists()

    if not is_authorized:
        raise PermissionDenied(
            "You do not have permission to apply this agent proposal. "
            "Only owners and planners can apply proposals."
        )
    
    #4. Determine diff to apply (use human-edited diff if provided)
    diff_to_apply = modified_diff if modified_diff is not None else agent_run.proposed_diff
    is_edited = modified_diff is not None

    mutations = diff_to_apply.get("mutations",[])
    if not isinstance(mutations,list):
        raise ValidationError("Proposal diff must contain a 'mutations' list.")

    #5. Apply each mutation to business records and log to ChangeLogEntry
    for item in mutations:
        action = item.get("action")
        entity_type = item.get("entity_type")
        entity_id = item.get("entity_id")
        fields = item.get("fields", {}) or {}

        if entity_type == "Task":
            _apply_task_mutation(agent_run, action, entity_id, fields)
        elif entity_type == "BudgetCategory":
            _apply_budget_category_mutation(agent_run, action, entity_id, fields)
        elif entity_type == "BudgetLineItem":
            _apply_budget_line_item_mutation(agent_run, action, entity_id, fields)
        elif entity_type == "VendorBooking":
            _apply_vendor_booking_mutation(agent_run, action, entity_id, fields)
        else:
            logger.warning(
                "Skipping unknown entity_type '%s' in AgentRun id=%s",
                entity_type,
                agent_run.id,
            )
    
    #6. Finalize AgentRun state
    agent_run.state = AgentRun.State.EDITED_APPROVED if is_edited else AgentRun.State.APPROVED
    agent_run.final_diff = diff_to_apply
    agent_run.reviewed_by = user
    agent_run.reviewed_at = timezone.now()
    agent_run.save()

    logger.info(
        "Applied AgentRun id=%s (type=%s, state=%s) by user_id=%s for event_id=%s",
        agent_run.id,
        agent_run.agent_type,
        agent_run.state,
        user.id,
        agent_run.event.id,
    )
    return agent_run

@transaction.atomic
def reject_agent_proposal(
    agent_run_id: str,
    user: Any,
    rejection_reason: str = "",
) -> AgentRun:
    """
    Rejects an agent proposal.
    Guarantees ZERO modifications to any business records.
    """
    try:
        agent_run = (
            AgentRun.objects.select_for_update()
            .select_related("organization")
            .get(id=agent_run_id)
        )
    except AgentRun.DoesNotExist:
        raise ValidationError(f"AgentRun with id '{agent_run_id}' does not exist.")
    
    if agent_run.state != AgentRun.State.PENDING:
        raise ValidationError(
            f"Cannot reject AgentRun with state '{agent_run.state}'. It must be '{AgentRun.State.PENDING}'."
        )
    
    is_authorized = Membership.objects.filter(
        organization=agent_run.organization,
        user=user,
        role__in=["owner","planner"],
    ).exists()

    if not is_authorized:
        raise PermissionDenied("Only organization owners and planners can reject agent proposals.")

    agent_run.state = AgentRun.State.REJECTED
    agent_run.reviewed_by = user
    agent_run.reviewed_at = timezone.now()
    if rejection_reason:
        agent_run.reasoning = f"{agent_run.reasoning}\n\n[Rejection Note by {user.username}]: {rejection_reason}"
    agent_run.save()

    logger.info(
        "Rejected AgentRun id=%s by user_id=%s",
        agent_run.id,
        user.id,
    )
    return agent_run

# ------------------ Mutation Helpers ------------------

@transaction.atomic
def _apply_task_mutation(agent_run: AgentRun, action: str, entity_id: Any, fields: dict[str, Any]) -> None:
    if action == "update" and entity_id:
        task = Task.objects.get(id=entity_id, organization=agent_run.organization)
        before = {k: str(getattr(task, k)) for k in fields if hasattr(task, k)}
        for k, v in fields.items():
            setattr(task, k, v)
        task.save()
        after = {k: str(getattr(task, k)) for k in fields}

        ChangeLogEntry.objects.create(
            organization=agent_run.organization,
            event=agent_run.event,
            actor_type=ChangeLogEntry.ActorType.AGENT,
            actor_id=agent_run.agent_type,
            entity_type="Task",
            entity_id=str(task.id),
            before=before,
            after=after,
            agent_run=agent_run,
        )

    elif action == "create":
        task = Task.objects.create(
            organization=agent_run.organization,
            event=agent_run.event,
            title=fields.get("title","Untitled Agent Task"),
            description=fields.get("description",""),
            status=fields.get("status","todo"),
            due_date=fields.get("due_date"),
        )
        ChangeLogEntry.objects.create(
            organization=agent_run.organization,
            event=agent_run.event,
            actor_type=ChangeLogEntry.ActorType.AGENT,
            actor_id=agent_run.agent_type,
            entity_type="Task",
            entity_id=str(task.id),
            before=None,
            after={"title": task.title, "status": task.status},
            agent_run=agent_run,
        )

def _apply_budget_category_mutation(agent_run: AgentRun, action: str, entity_id: Any, fields: dict):
    if action == "update" and entity_id:
        category = BudgetCategory.objects.get(id=entity_id, organization=agent_run.organization)
        before = {"allocated_amount": str(category.allocated_amount)}
        if "allocated_amount" in fields:
            category.allocated_amount = fields["allocated_amount"]
        category.save()
        after = {"allocated_amount": str(category.allocated_amount)}
        ChangeLogEntry.objects.create(
            organization=agent_run.organization,
            event=agent_run.event,
            actor_type=ChangeLogEntry.ActorType.AGENT,
            actor_id=agent_run.agent_type,
            entity_type="BudgetCategory",
            entity_id=str(category.id),
            before=before,
            after=after,
            agent_run=agent_run,
        )
def _apply_budget_line_item_mutation(agent_run: AgentRun, action: str, entity_id: Any, fields: dict):
    if action == "update" and entity_id:
        item = BudgetLineItem.objects.get(id=entity_id, organization=agent_run.organization)
        before = {k: str(getattr(item, k)) for k in fields if hasattr(item, k)}
        for k, v in fields.items():
            setattr(item, k, v)
        item.save()
        after = {k: str(getattr(item, k)) for k in fields}
        ChangeLogEntry.objects.create(
            organization=agent_run.organization,
            event=agent_run.event,
            actor_type=ChangeLogEntry.ActorType.AGENT,
            actor_id=agent_run.agent_type,
            entity_type="BudgetLineItem",
            entity_id=str(item.id),
            before=before,
            after=after,
            agent_run=agent_run,
        )
def _apply_vendor_booking_mutation(agent_run: AgentRun, action: str, entity_id: Any, fields: dict):
    if action == "update" and entity_id:
        booking = VendorBooking.objects.get(id=entity_id, organization=agent_run.organization)
        before = {k: str(getattr(booking, k)) for k in fields if hasattr(booking, k)}
        for k, v in fields.items():
            setattr(booking, k, v)
        booking.save()
        after = {k: str(getattr(booking, k)) for k in fields}
        ChangeLogEntry.objects.create(
            organization=agent_run.organization,
            event=agent_run.event,
            actor_type=ChangeLogEntry.ActorType.AGENT,
            actor_id=agent_run.agent_type,
            entity_type="VendorBooking",
            entity_id=str(booking.id),
            before=before,
            after=after,
            agent_run=agent_run,
        )
    
import logging
from typing import Any

from events.models import BudgetCategory, Event, Task, VendorBooking
from langchain_core.tools import tool
from organizations.models import Membership

logger = logging.getLogger(__name__)


@tool
def get_event_summary(event_id: str, org_id: str) -> dict[str, Any]:
    """
    Fetch basic summary details of an event.
    Requires event_id and org_id to enforce multi-tenant isolation.
    """
    try:
        event = Event.objects.get(id=event_id, organization_id=org_id)
        return {
            "id": str(event.id),
            "name": event.name,
            "description": event.description,
            "status": event.status,
            "start_date": str(event.start_date),
            "end_date": str(event.end_date),
        }
    except Event.DoesNotExist:
        logger.warning("Event %s not found in org %s", event_id, org_id)
        return {"error": f"Event {event_id} not found in this organization"}


@tool
def get_event_tasks(event_id: str, org_id: str) -> list[dict[str, Any]]:
    """
    Fetch all tasks associated with an event.
    Requires event_id and org_id to enforce multi-tenant isolation.
    """
    tasks = (
        Task.objects.filter(event_id=event_id, organization_id=org_id)
        .select_related("assigned_to")
        .order_by("due_date")
    )
    return [
        {
            "id": str(task.id),
            "title": task.title,
            "status": task.status,
            "due_date": str(task.due_date) if task.due_date else None,
            "assigned_to": task.assigned_to.email if task.assigned_to else None,
        }
        for task in tasks
    ]

@tool
def get_event_budget(event_id: str, org_id: str) -> dict[str, Any]:
    """
    Fetch budget categories and line items for an event.
    Requires event_id and org_id to enforce multi-tenant isolation.
    """
    categories = BudgetCategory.objects.filter(
        event_id=event_id, organization_id=org_id
    ).prefetch_related("line_items")

    results = []
    for cat in categories:
        items = [
            {
                "id": str(item.id),
                "description": item.description,
                "estimated_cost": str(item.estimated_cost),
                "actual_cost": str(item.actual_cost) if item.actual_cost else None,
                "is_paid": item.is_paid,
            }
            for item in cat.line_items.all()
        ]
        results.append({
            "id": str(cat.id),
            "name": cat.name,
            "allocated_amount": str(cat.allocated_amount),
            "line_items": items,
        })
    return {"categories": results}

@tool
def get_event_vendors(event_id: str, org_id: str) -> list[dict[str, Any]]:
    """
    Fetch all vendor bookings for an event.
    Requires event_id and org_id to enforce multi-tenant isolation.
    """
    bookings = VendorBooking.objects.filter(
        event_id=event_id, organization_id=org_id
    ).select_related("vendor")

    return [
        {
            "booking_id": str(b.id),
            "vendor_name": b.vendor.name,
            "vendor_category": b.vendor.category,
            "status": b.status,
            "agreed_price": str(b.agreed_price) if b.agreed_price else None,
        }
        for b in bookings
    ]

@tool
def get_organization_team(org_id:str) -> list[dict[str, Any]]:
    """
    Fetch active team members and roles for an organization.
    Requires org_id to enforce multi-tenant isolation.
    """
    memberships = (
        Membership.objects.filter(organization_id=org_id)
        .select_related("user")
        .order_by("role")
    )
    return [
        {
            "user_id": m.user_id,
            "email": m.user.email,
            "username": m.user.username,
            "role": m.role,
        }
        for m in memberships
    ]

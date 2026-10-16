import pytest
from agents.orchestration.tools import (
    get_event_budget,
    get_event_summary,
    get_event_tasks,
    get_event_vendors,
)
from django.utils import timezone
from events.models import BudgetCategory, BudgetLineItem, Event, Task, VendorBooking
from organizations.models import Organization
from vendors.models import Vendor


@pytest.fixture
def tool_data(db):
    org_a = Organization.objects.create(name="Org A", slug="org-a")
    org_b = Organization.objects.create(name="Org B", slug="org-b")

    now = timezone.now()
    event_a = Event.objects.create(
        organization=org_a,
        name="Event A",
        description="Flagship annual corporate summit",
        start_date=now,
        end_date=now + timezone.timedelta(days=1),
    )
    task_a = Task.objects.create(
        organization=org_a,
        event=event_a,
        title="Task in Org A",
        status="todo",
    )
    cat_a = BudgetCategory.objects.create(
        organization=org_a,
        event=event_a,
        name="Catering",
        allocated_amount="10000.00",
    )
    BudgetLineItem.objects.create(
        organization=org_a,
        event=event_a,
        category=cat_a,
        description="Appetizers",
        estimated_cost="3000.00",
    )
    vendor = Vendor.objects.create(
        organization=org_a,
        name="Gourmet Delights",
        category="catering",
    )
    VendorBooking.objects.create(
        organization=org_a,
        event=event_a,
        vendor=vendor,
        status="booked",
        agreed_price="2800.00",
    )

    return {
        "org_a": org_a,
        "org_b": org_b,
        "event_a": event_a,
        "task_a": task_a,
    }


@pytest.mark.django_db
def test_get_event_summary_tenant_isolation(tool_data):
    # Valid org A access
    summary = get_event_summary.invoke({
        "event_id": str(tool_data["event_a"].id),
        "org_id": str(tool_data["org_a"].id),
    })
    assert summary["name"] == "Event A"
    assert summary["description"] == "Flagship annual corporate summit"
    assert summary["status"] == "draft"

    # Out-of-tenant access from Org B returns error
    cross_org = get_event_summary.invoke({
        "event_id": str(tool_data["event_a"].id),
        "org_id": str(tool_data["org_b"].id),
    })
    assert "error" in cross_org


@pytest.mark.django_db
def test_get_event_tasks_tenant_isolation(tool_data):
    tasks_a = get_event_tasks.invoke({
        "event_id": str(tool_data["event_a"].id),
        "org_id": str(tool_data["org_a"].id),
    })
    assert len(tasks_a) == 1
    assert tasks_a[0]["title"] == "Task in Org A"

    # Out-of-tenant sees empty list
    tasks_b = get_event_tasks.invoke({
        "event_id": str(tool_data["event_a"].id),
        "org_id": str(tool_data["org_b"].id),
    })
    assert len(tasks_b) == 0


@pytest.mark.django_db
def test_get_event_budget_and_vendors(tool_data):
    budget = get_event_budget.invoke({
        "event_id": str(tool_data["event_a"].id),
        "org_id": str(tool_data["org_a"].id),
    })
    assert len(budget["categories"]) == 1
    assert budget["categories"][0]["name"] == "Catering"
    assert len(budget["categories"][0]["line_items"]) == 1
    assert budget["categories"][0]["line_items"][0]["description"] == "Appetizers"

    vendors = get_event_vendors.invoke({
        "event_id": str(tool_data["event_a"].id),
        "org_id": str(tool_data["org_a"].id),
    })
    assert len(vendors) == 1
    assert vendors[0]["vendor_name"] == "Gourmet Delights"

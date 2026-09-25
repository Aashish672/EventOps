from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from events.models import BudgetCategory, Event, Task
from organizations.models import Membership, Organization
from rest_framework import status
from rest_framework.test import APIClient

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_user():
    return User.objects.create_user(
        username="alice", email="alice@eventops.dev", password="testpassword123"
    )


@pytest.fixture
def other_user():
    return User.objects.create_user(
        username="bob", email="bob@eventops.dev", password="testpassword123"
    )


@pytest.fixture
def organization(auth_user):
    org = Organization.objects.create(name="Org One", slug="org-one")
    Membership.objects.create(organization=org, user=auth_user, role="owner")
    return org


@pytest.fixture
def event(organization):
    return Event.objects.create(
        organization=organization,
        name="Test Event",
        start_date=timezone.now(),
        end_date=timezone.now() + timedelta(days=1),
    )


@pytest.mark.django_db
def test_create_event_success(api_client, auth_user, organization):
    api_client.force_authenticate(user=auth_user)
    start_date = timezone.now()
    end_date = start_date + timedelta(days=2)
    payload = {
        "organization": str(organization.id),
        "name": "Summer Gala",
        "description": "Annual gala",
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
    }
    response = api_client.post("/api/events/", data=payload, format="json")
    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["name"] == "Summer Gala"
    assert Event.objects.count() == 1


@pytest.mark.django_db
def test_create_event_tenant_isolation(api_client, other_user, organization):
    api_client.force_authenticate(user=other_user)
    start_date = timezone.now()
    end_date = start_date + timedelta(days=2)
    payload = {
        "organization": str(organization.id),
        "name": "Hacker Gala",
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
    }
    response = api_client.post("/api/events/", data=payload, format="json")
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert Event.objects.count() == 0


@pytest.mark.django_db
def test_list_events_tenant_isolation(api_client, auth_user, other_user, organization):
    Event.objects.create(
        organization=organization,
        name="Org One Event",
        start_date=timezone.now(),
        end_date=timezone.now() + timedelta(days=1),
    )

    # auth_user should see it
    api_client.force_authenticate(user=auth_user)
    response = api_client.get("/api/events/")
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 1

    # other_user should NOT see it
    api_client.force_authenticate(user=other_user)
    response = api_client.get("/api/events/")
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 0


@pytest.mark.django_db
def test_create_task_success(api_client, auth_user, event):
    api_client.force_authenticate(user=auth_user)
    payload = {
        "event": str(event.id),
        "title": "Book Venue",
        "status": "todo",
    }
    response = api_client.post("/api/tasks/", data=payload, format="json")
    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["title"] == "Book Venue"
    assert Task.objects.count() == 1


@pytest.mark.django_db
def test_create_task_tenant_isolation(api_client, other_user, event):
    api_client.force_authenticate(user=other_user)
    payload = {
        "event": str(event.id),
        "title": "Book Venue",
        "status": "todo",
    }
    response = api_client.post("/api/tasks/", data=payload, format="json")
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_create_budget_category_success(api_client, auth_user, event):
    api_client.force_authenticate(user=auth_user)
    payload = {
        "event": str(event.id),
        "name": "Food & Beverage",
        "allocated_amount": "5000.00",
    }
    response = api_client.post("/api/budget-categories/", data=payload, format="json")
    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["name"] == "Food & Beverage"


@pytest.mark.django_db
def test_create_budget_line_item_success(api_client, auth_user, event):
    api_client.force_authenticate(user=auth_user)
    category = BudgetCategory.objects.create(
        organization=event.organization, event=event, name="Food", allocated_amount=1000
    )

    payload = {
        "category": str(category.id),
        "event": str(event.id),
        "description": "Appetizers",
        "estimated_cost": "500.00",
    }
    response = api_client.post("/api/budget-line-items/", data=payload, format="json")
    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["description"] == "Appetizers"


@pytest.mark.django_db
def test_budget_line_item_cross_tenant_validation(
    api_client, auth_user, event, other_user
):
    api_client.force_authenticate(user=auth_user)

    # Create another org and event
    other_org = Organization.objects.create(name="Other Org", slug="other-org")
    Membership.objects.create(organization=other_org, user=auth_user, role="owner")
    other_event = Event.objects.create(
        organization=other_org,
        name="Other Event",
        start_date=timezone.now(),
        end_date=timezone.now() + timedelta(days=1),
    )

    category = BudgetCategory.objects.create(
        organization=event.organization, event=event, name="Food", allocated_amount=1000
    )

    # Attempt to link category from event 1 to event 2
    payload = {
        "category": str(category.id),
        "event": str(other_event.id),
        "description": "Mismatched Appetizers",
        "estimated_cost": "500.00",
    }
    response = api_client.post("/api/budget-line-items/", data=payload, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "does not belong to the selected event" in str(response.data)

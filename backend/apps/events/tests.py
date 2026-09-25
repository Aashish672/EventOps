from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from events.models import Event
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

import pytest
from django.contrib.auth import get_user_model
from organizations.models import Membership, Organization
from rest_framework import status
from rest_framework.test import APIClient
from vendors.models import Vendor

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
def test_create_vendor_success(api_client, auth_user, organization):
    api_client.force_authenticate(user=auth_user)
    payload = {
        "organization": str(organization.id),
        "name": "Awesome Catering",
        "category": "catering",
    }
    response = api_client.post("/api/vendors/", data=payload, format="json")
    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["name"] == "Awesome Catering"
    assert Vendor.objects.count() == 1


@pytest.mark.django_db
def test_create_vendor_tenant_isolation(api_client, other_user, organization):
    # other_user is NOT a member of organization
    api_client.force_authenticate(user=other_user)
    payload = {
        "organization": str(organization.id),
        "name": "Hacker Catering",
        "category": "catering",
    }
    response = api_client.post("/api/vendors/", data=payload, format="json")
    # Should be rejected because other_user isn't an owner/planner of the org
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert Vendor.objects.count() == 0


@pytest.mark.django_db
def test_list_vendors_tenant_isolation(api_client, auth_user, other_user, organization):
    Vendor.objects.create(
        organization=organization, name="Org One Vendor", category="catering"
    )

    # auth_user should see it
    api_client.force_authenticate(user=auth_user)
    response = api_client.get("/api/vendors/")
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 1

    # other_user should NOT see it
    api_client.force_authenticate(user=other_user)
    response = api_client.get("/api/vendors/")
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 0

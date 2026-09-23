import pytest
from django.contrib.auth import get_user_model
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
        username="alice",
        email="alice@eventops.dev",
        password="testpassword123",
    )


@pytest.fixture
def other_user():
    return User.objects.create_user(
        username="bob",
        email="bob@eventops.dev",
        password="testpassword123",
    )


@pytest.mark.django_db
def test_unauthenticated_requests_rejected(api_client):
    """Verify that unauthenticated requests to org endpoints return 401 or 403."""
    response = api_client.get("/api/orgs/")
    assert response.status_code in (
        status.HTTP_401_UNAUTHORIZED,
        status.HTTP_403_FORBIDDEN,
    )

    response = api_client.post("/api/orgs/", data={"name": "Test"})
    assert response.status_code in (
        status.HTTP_401_UNAUTHORIZED,
        status.HTTP_403_FORBIDDEN,
    )


@pytest.mark.django_db
def test_list_organizations_tenant_isolation(api_client, auth_user, other_user):
    """Verify that a user only sees organizations where they are a member."""
    # Org 1: auth_user is member
    org1 = Organization.objects.create(name="Org One", slug="org-one")
    Membership.objects.create(organization=org1, user=auth_user, role="owner")
    # Org 2: other_user is member
    org2 = Organization.objects.create(name="Org Two", slug="org-two")
    Membership.objects.create(organization=org2, user=other_user, role="owner")
    api_client.force_authenticate(user=auth_user)
    response = api_client.get("/api/orgs/")
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 1
    assert response.data[0]["id"] == str(org1.id)
    assert response.data[0]["name"] == "Org One"


@pytest.mark.django_db
def test_create_organization_atomic_owner(api_client, auth_user):
    """Verify creating an org auto-assigns the creator as 'owner' in an atomic transaction."""
    api_client.force_authenticate(user=auth_user)
    response = api_client.post(
        "/api/orgs/",
        {"name": "Starlight Gala Events"},
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["name"] == "Starlight Gala Events"
    assert response.data["slug"] == "starlight-gala-events"
    # Verify membership was created
    org_id = response.data["id"]
    membership = Membership.objects.get(organization_id=org_id, user=auth_user)
    assert membership.role == "owner"


@pytest.mark.django_db
def test_retrieve_organization_detail(api_client, auth_user, other_user):
    """Verify member can view org details, non-member receives 404."""
    org1 = Organization.objects.create(name="Org One", slug="org-one")
    Membership.objects.create(organization=org1, user=auth_user, role="planner")
    org2 = Organization.objects.create(name="Org Two", slug="org-two")
    Membership.objects.create(organization=org2, user=other_user, role="owner")
    api_client.force_authenticate(user=auth_user)
    # Member can view
    res = api_client.get(f"/api/orgs/{org1.id}/")
    assert res.status_code == status.HTTP_200_OK
    assert res.data["name"] == "Org One"
    # Non-member receives 404 (due to queryset tenant filtering)
    res = api_client.get(f"/api/orgs/{org2.id}/")
    assert res.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_list_organization_members(api_client, auth_user, other_user):
    """Verify listing members of an organization."""
    org = Organization.objects.create(name="Starlight Events", slug="starlight-events")
    Membership.objects.create(organization=org, user=auth_user, role="owner")
    Membership.objects.create(organization=org, user=other_user, role="coordinator")
    api_client.force_authenticate(user=auth_user)
    response = api_client.get(f"/api/orgs/{org.id}/members/")
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 2
    roles = {item["role"] for item in response.data}
    assert roles == {"owner", "coordinator"}


@pytest.mark.django_db
def test_add_member_to_organization(api_client, auth_user, other_user):
    """Verify adding a new member to an organization."""
    org = Organization.objects.create(name="Starlight Events", slug="starlight-events")
    Membership.objects.create(organization=org, user=auth_user, role="owner")
    api_client.force_authenticate(user=auth_user)
    response = api_client.post(
        f"/api/orgs/{org.id}/members/",
        {"email": other_user.email, "role": "planner"},
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED
    assert response.data["role"] == "planner"
    assert response.data["user"]["email"] == other_user.email
    assert Membership.objects.filter(
        organization=org, user=other_user, role="planner"
    ).exists()


@pytest.mark.django_db
def test_add_duplicate_member_rejected(api_client, auth_user, other_user):
    """Verify attempting to add an already-existing member returns 400."""
    org = Organization.objects.create(name="Starlight Events", slug="starlight-events")
    Membership.objects.create(organization=org, user=auth_user, role="owner")
    Membership.objects.create(organization=org, user=other_user, role="planner")
    api_client.force_authenticate(user=auth_user)
    response = api_client.post(
        f"/api/orgs/{org.id}/members/",
        {"email": other_user.email, "role": "coordinator"},
        format="json",
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "already a member" in str(response.data)


@pytest.mark.django_db
def test_add_nonexistent_user_rejected(api_client, auth_user):
    """Verify attempting to add an email that does not exist returns 400."""
    org = Organization.objects.create(name="Starlight Events", slug="starlight-events")
    Membership.objects.create(organization=org, user=auth_user, role="owner")
    api_client.force_authenticate(user=auth_user)
    response = api_client.post(
        f"/api/orgs/{org.id}/members/",
        {"email": "unknown@example.com", "role": "planner"},
        format="json",
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "User with this email does not exist." in str(response.data)

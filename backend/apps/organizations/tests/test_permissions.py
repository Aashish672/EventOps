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
def setup_org_with_roles():
    """Sets up an organization with an Owner, Planner, Coordinator, and Viewer."""
    owner = User.objects.create_user(
        username="alice_owner",
        email="alice@eventops.dev",
        password="testpassword123",
    )
    planner = User.objects.create_user(
        username="bob_planner",
        email="bob@eventops.dev",
        password="testpassword123",
    )
    coordinator = User.objects.create_user(
        username="charlie_coordinator",
        email="charlie@eventops.dev",
        password="testpassword123",
    )
    viewer = User.objects.create_user(
        username="diana_viewer",
        email="diana@eventops.dev",
        password="testpassword123",
    )

    org = Organization.objects.create(
        name="Apex Galas",
        slug="apex-galas",
    )

    Membership.objects.create(organization=org, user=owner, role="owner")
    Membership.objects.create(organization=org, user=planner, role="planner")
    Membership.objects.create(organization=org, user=coordinator, role="coordinator")
    Membership.objects.create(organization=org, user=viewer, role="viewer")

    return {
        "org": org,
        "owner": owner,
        "planner": planner,
        "coordinator": coordinator,
        "viewer": viewer,
    }


@pytest.mark.django_db
def test_viewer_cannot_edit_organization(api_client, setup_org_with_roles):
    """Verify that a viewer receives 403 Forbidden when attempting to update org settings."""
    org = setup_org_with_roles["org"]
    viewer = setup_org_with_roles["viewer"]

    api_client.force_authenticate(user=viewer)
    response = api_client.patch(
        f"/api/orgs/{org.id}/",
        {"name": "Hacked Name"},
        format="json",
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_planner_cannot_delete_organization(api_client, setup_org_with_roles):
    """Verify that a planner receives 403 Forbidden when attempting to delete the organization."""
    org = setup_org_with_roles["org"]
    planner = setup_org_with_roles["planner"]

    api_client.force_authenticate(user=planner)
    response = api_client.delete(f"/api/orgs/{org.id}/")
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_coordinator_cannot_invite_member(api_client, setup_org_with_roles):
    """Verify that a coordinator receives 403 Forbidden when attempting to invite members."""
    org = setup_org_with_roles["org"]
    coordinator = setup_org_with_roles["coordinator"]
    new_user = User.objects.create_user(
        username="newbie",
        email="newbie@eventops.dev",
        password="testpassword123",
    )

    api_client.force_authenticate(user=coordinator)
    response = api_client.post(
        f"/api/orgs/{org.id}/members/",
        {"email": new_user.email, "role": "viewer"},
        format="json",
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "Only organization owners" in str(response.data)


@pytest.mark.django_db
def test_coordinator_cannot_remove_member(api_client, setup_org_with_roles):
    """Verify that a non-owner receives 403 Forbidden when attempting to delete a member."""
    org = setup_org_with_roles["org"]
    coordinator = setup_org_with_roles["coordinator"]
    viewer = setup_org_with_roles["viewer"]

    api_client.force_authenticate(user=coordinator)
    response = api_client.delete(f"/api/orgs/{org.id}/members/{viewer.id}/")
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_owner_can_edit_organization(api_client, setup_org_with_roles):
    """Verify that an owner receives 200 OK when updating organization details."""
    org = setup_org_with_roles["org"]
    owner = setup_org_with_roles["owner"]

    api_client.force_authenticate(user=owner)
    response = api_client.patch(
        f"/api/orgs/{org.id}/",
        {"name": "Apex Premier Galas"},
        format="json",
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.data["name"] == "Apex Premier Galas"


@pytest.mark.django_db
def test_owner_can_remove_member(api_client, setup_org_with_roles):
    """Verify that an owner can successfully remove a member from the organization."""
    org = setup_org_with_roles["org"]
    owner = setup_org_with_roles["owner"]
    viewer = setup_org_with_roles["viewer"]

    api_client.force_authenticate(user=owner)
    response = api_client.delete(f"/api/orgs/{org.id}/members/{viewer.id}/")
    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert not Membership.objects.filter(organization=org, user=viewer).exists()


@pytest.mark.django_db
def test_sole_owner_cannot_remove_self(api_client, setup_org_with_roles):
    """Verify defensive guard: sole owner cannot remove self, preventing orphaned orgs."""
    org = setup_org_with_roles["org"]
    owner = setup_org_with_roles["owner"]

    api_client.force_authenticate(user=owner)
    response = api_client.delete(f"/api/orgs/{org.id}/members/{owner.id}/")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Cannot remove the sole owner" in str(response.data)


@pytest.mark.django_db
def test_remove_nonexistent_member_returns_404(api_client, setup_org_with_roles):
    """Verify that attempting to remove an unknown user returns 404."""
    org = setup_org_with_roles["org"]
    owner = setup_org_with_roles["owner"]

    api_client.force_authenticate(user=owner)
    response = api_client.delete(f"/api/orgs/{org.id}/members/99999/")
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_owner_can_delete_organization(api_client, setup_org_with_roles):
    """Verify that an owner can delete an organization."""
    org = setup_org_with_roles["org"]
    owner = setup_org_with_roles["owner"]

    api_client.force_authenticate(user=owner)
    response = api_client.delete(f"/api/orgs/{org.id}/")
    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert not Organization.objects.filter(id=org.id).exists()

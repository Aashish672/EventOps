import uuid

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError

from apps.organizations.models import Membership, Organization

User = get_user_model()


@pytest.mark.django_db
def test_create_organization_with_uuid():
    """Verify that Organization is created with a valid UUIDv4 and default free plan."""
    org = Organization.objects.create(name="Acme Events", slug="acme-events")

    assert isinstance(org.id, uuid.UUID)
    assert org.name == "Acme Events"
    assert org.slug == "acme-events"
    assert org.plan == "free"
    assert org.created_at is not None
    assert org.updated_at is not None
    assert str(org) == "Acme Events"


@pytest.mark.django_db
def test_organization_slug_uniqueness():
    """Verify that duplicate slugs raise IntegrityError."""
    Organization.objects.create(name="First Agency", slug="unique-agency")

    with pytest.raises(IntegrityError):
        Organization.objects.create(name="Second Agency", slug="unique-agency")


@pytest.mark.django_db
def test_create_membership_with_role():
    """Verify that a User can be linked to an Organization with a role."""
    user = User.objects.create_user(username="sarah_planner", password="testpassword123")
    org = Organization.objects.create(name="Starlight Events", slug="starlight-events")

    membership = Membership.objects.create(
        organization=org,
        user=user,
        role="planner",
    )

    assert isinstance(membership.id, uuid.UUID)
    assert membership.organization == org
    assert membership.user == user
    assert membership.role == "planner"
    assert str(membership) == f"{user} - {org.name} (planner)"


@pytest.mark.django_db
def test_membership_unique_together_constraint():
    """Verify that a user cannot have multiple memberships in the same organization."""
    user = User.objects.create_user(username="david_owner", password="testpassword123")
    org = Organization.objects.create(name="Elite Galas", slug="elite-galas")

    Membership.objects.create(organization=org, user=user, role="owner")

    with pytest.raises(IntegrityError):
        Membership.objects.create(organization=org, user=user, role="planner")

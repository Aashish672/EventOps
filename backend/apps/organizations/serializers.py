from typing import ClassVar

from django.contrib.auth import get_user_model
from django.utils.text import slugify
from organizations.models import Membership, Organization
from rest_framework import serializers

User = get_user_model()


class UserSummarySerializer(serializers.ModelSerializer):
    """Minimal representation of a user for membership lists."""

    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name")
        read_only_fields = fields


class MembershipSerializer(serializers.ModelSerializer):
    """Serializes a membership with nested user details."""

    user = UserSummarySerializer(read_only=True)

    class Meta:
        model = Membership
        fields = ("id", "organization", "user", "role", "created_at")
        read_only_fields = ("id", "organization", "created_at")


class MembershipCreateSerializer(serializers.Serializer):
    """Validates adding or inviting a user to an organization."""

    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=Membership.ROLE_CHOICES, default="viewer")

    def validate(self, attrs):
        email = attrs.get("email")
        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise serializers.ValidationError(
                {"email": "User with this email does not exist."}
            )

        organization = self.context.get("organization")
        if (
            organization
            and Membership.objects.filter(organization=organization, user=user).exists()
        ):
            raise serializers.ValidationError(
                {"email": "User is already a member of this organization."}
            )

        attrs["user_instance"] = user
        return attrs


class OrganizationSerializer(serializers.ModelSerializer):
    """Serializes an organization and handles slug generation."""

    class Meta:
        model = Organization
        fields = ("id", "name", "slug", "plan", "created_at", "updated_at")
        read_only_fields = ("id", "plan", "created_at", "updated_at")
        extra_kwargs: ClassVar[dict] = {
            "slug": {"required": False},
        }

    def validate(self, attrs):
        # Auto generate slug from name if not provided
        if not attrs.get("slug") and attrs.get("name"):
            base_slug = slugify(attrs["name"])
            slug = base_slug
            counter = 1
            while Organization.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            attrs["slug"] = slug
        return attrs

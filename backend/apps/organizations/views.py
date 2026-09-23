"""Views for organizations app."""

import logging

from core.permissions import IsOrganizationMember, IsOrganizationOwner
from django.db import transaction
from organizations.models import Membership, Organization
from organizations.serializers import (
    MembershipCreateSerializer,
    MembershipSerializer,
    OrganizationSerializer,
)
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

logger = logging.getLogger(__name__)


class OrganizationViewSet(viewsets.ModelViewSet):
    """
    CRUD ViewSet for Organizations and nested Member management.
    Tenant boundary: Users can only see and access organizations they belong to.
    """

    serializer_class = OrganizationSerializer

    def get_permissions(self):
        """
        Dynamically assign permissions based on action:
        - Destructive / Org mutation actions (update, partial_update, destroy) require Owner role.
        - Retrieval / safe reads require Member role.
        - List / create require Authentication.
        """
        if self.action in ("update", "partial_update", "destroy"):
            return [permissions.IsAuthenticated(), IsOrganizationOwner()]
        if self.action == "retrieve":
            return [permissions.IsAuthenticated(), IsOrganizationMember()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        """Restrict queryset to organizations where the user is an active member."""
        return Organization.objects.filter(
            memberships__user=self.request.user
        ).distinct()

    def perform_create(self, serializer):
        """
        Atomically create the organization and assign the creator as the Owner.
        """
        with transaction.atomic():
            org = serializer.save()
            Membership.objects.create(
                organization=org,
                user=self.request.user,
                role="owner",
            )
            logger.info(
                "Created organization '%s' (id=%s) with owner user_id=%s",
                org.name,
                org.id,
                self.request.user.id,
            )

    @action(detail=True, methods=["get", "post"], url_path="members")
    def members(self, request, pk=None):
        """
        GET /api/orgs/{id}/members/ - List all members (available to all members).
        POST /api/orgs/{id}/members/ - Invite a member (Owner only).
        """
        org = self.get_object()

        if request.method == "GET":
            memberships = org.memberships.select_related("user").all()
            serializer = MembershipSerializer(memberships, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

        # RBAC check: Only owners can invite or add members
        is_owner = Membership.objects.filter(
            organization=org,
            user=request.user,
            role="owner",
        ).exists()
        if not is_owner:
            return Response(
                {"detail": "Only organization owners can invite or add members."},
                status=status.HTTP_403_FORBIDDEN,
            )

        serializer = MembershipCreateSerializer(
            data=request.data, context={"organization": org}
        )
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user_instance"]
        role = serializer.validated_data.get("role", "viewer")

        membership = Membership.objects.create(
            organization=org,
            user=user,
            role=role,
        )

        logger.info(
            "Added user_id=%s to org_id=%s with role='%s' by actor user_id=%s",
            user.id,
            org.id,
            role,
            request.user.id,
        )

        return Response(
            MembershipSerializer(membership).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["delete"],
        url_path="members/(?P<user_id>[^/.]+)",
    )
    def remove_member(self, request, pk=None, user_id=None):
        """
        DELETE /api/orgs/{id}/members/{user_id}/ - Remove a member (Owner only).
        Guards against removing the sole owner of an organization.
        """
        org = self.get_object()

        # RBAC check: Only owners can remove members
        is_owner = Membership.objects.filter(
            organization=org,
            user=request.user,
            role="owner",
        ).exists()
        if not is_owner:
            return Response(
                {"detail": "Only organization owners can remove members."},
                status=status.HTTP_403_FORBIDDEN,
            )

        membership = org.memberships.filter(user_id=user_id).first()
        if not membership:
            return Response(
                {"detail": "Member not found in this organization."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Defensive guard: Do not allow removing the sole owner
        if membership.role == "owner":
            owner_count = org.memberships.filter(role="owner").count()
            if owner_count <= 1:
                return Response(
                    {"detail": "Cannot remove the sole owner of an organization."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        membership.delete()
        logger.info(
            "Removed user_id=%s from org_id=%s by actor user_id=%s",
            user_id,
            org.id,
            request.user.id,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

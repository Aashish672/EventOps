"""Views for organizations app."""

import logging

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
    permission_classes = (permissions.IsAuthenticated,)

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
        GET /api/orgs/{id}/members/ - List all members in this organization.
        POST /api/orgs/{id}/members/ - Add or invite a member to this organization.
        """
        org = self.get_object()

        if request.method == "GET":
            memberships = org.memberships.select_related("user").all()
            serializer = MembershipSerializer(memberships, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)

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

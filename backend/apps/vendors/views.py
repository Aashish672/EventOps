from core.permissions import IsOrganizationPlannerOrOwner
from organizations.models import Membership
from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied

from .models import Vendor
from .serializers import VendorSerializer


class VendorViewSet(viewsets.ModelViewSet):
    serializer_class = VendorSerializer
    # Automatically blocks unauthenticated users and restricts PUT/DELETE to Planners/Owners
    permission_classes = [IsOrganizationPlannerOrOwner]

    def get_queryset(self):
        return Vendor.objects.filter(
            organization__memberships__user=self.request.user
        ).distinct()

    def perform_create(self, serializer):
        org = serializer.validated_data.get("organization")

        has_access = Membership.objects.filter(
            organization=org, user=self.request.user, role__in=["owner", "planner"]
        ).exists()

        if not has_access:
            raise PermissionDenied(
                "You must be an owner or planner of this organization to add vendors."
            )

        serializer.save()

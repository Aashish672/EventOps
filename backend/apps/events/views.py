from core.permissions import IsOrganizationPlannerOrOwner
from organizations.models import Membership
from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied

from .models import Event
from .serializers import EventSerializer


class EventViewSet(viewsets.ModelViewSet):
    serializer_class = EventSerializer
    permission_classes = [IsOrganizationPlannerOrOwner]

    def get_queryset(self):
        return Event.objects.filter(
            organization__memberships__user=self.request.user
        ).distinct()

    def perform_create(self, serializer):
        org = serializer.validated_data.get("organization")

        has_access = Membership.objects.filter(
            organization=org, user=self.request.user, role__in=["owner", "planner"]
        ).exists()

        if not has_access:
            raise PermissionDenied(
                "You must be an owner or planner of this organization to create events."
            )

        serializer.save()

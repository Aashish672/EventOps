from core.permissions import IsOrganizationPlannerOrOwner
from organizations.models import Membership
from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied

from .models import (
    BudgetCategory,
    BudgetLineItem,
    Document,
    Event,
    Guest,
    GuestHousehold,
    Task,
    VendorBooking,
)
from .serializers import (
    BudgetCategorySerializer,
    BudgetLineItemSerializer,
    DocumentSerializer,
    EventSerializer,
    GuestHouseholdSerializer,
    GuestSerializer,
    TaskSerializer,
    VendorBookingSerializer,
)


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


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer
    permission_classes = [IsOrganizationPlannerOrOwner]

    def get_queryset(self):
        qs = Task.objects.filter(
            event__organization__memberships__user=self.request.user
        ).distinct()
        event_id = self.request.query_params.get("event")
        if event_id:
            qs = qs.filter(event_id=event_id)
        return qs

    def perform_create(self, serializer):
        event = serializer.validated_data.get("event")
        has_access = Membership.objects.filter(
            organization=event.organization,
            user=self.request.user,
            role__in=["owner", "planner"],
        ).exists()

        if not has_access:
            raise PermissionDenied(
                "You must be an owner or planner of the organization to create tasks."
            )
        serializer.save(organization=event.organization)


class BudgetCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = BudgetCategorySerializer
    permission_classes = [IsOrganizationPlannerOrOwner]

    def get_queryset(self):
        qs = BudgetCategory.objects.filter(
            event__organization__memberships__user=self.request.user
        ).distinct()
        event_id = self.request.query_params.get("event")
        if event_id:
            qs = qs.filter(event_id=event_id)
        return qs

    def perform_create(self, serializer):
        event = serializer.validated_data.get("event")
        has_access = Membership.objects.filter(
            organization=event.organization,
            user=self.request.user,
            role__in=["owner", "planner"],
        ).exists()

        if not has_access:
            raise PermissionDenied(
                "You must be an owner or planner of the organization to create budget categories."
            )
        serializer.save(organization=event.organization)


class BudgetLineItemViewSet(viewsets.ModelViewSet):
    serializer_class = BudgetLineItemSerializer
    permission_classes = [IsOrganizationPlannerOrOwner]

    def get_queryset(self):
        qs = BudgetLineItem.objects.filter(
            event__organization__memberships__user=self.request.user
        ).distinct()
        event_id = self.request.query_params.get("event")
        if event_id:
            qs = qs.filter(event_id=event_id)
        return qs

    def perform_create(self, serializer):
        event = serializer.validated_data.get("event")
        has_access = Membership.objects.filter(
            organization=event.organization,
            user=self.request.user,
            role__in=["owner", "planner"],
        ).exists()

        if not has_access:
            raise PermissionDenied(
                "You must be an owner or planner of the organization to create budget items."
            )
        serializer.save(organization=event.organization)


class GuestHouseholdViewSet(viewsets.ModelViewSet):
    serializer_class = GuestHouseholdSerializer
    permission_classes = [IsOrganizationPlannerOrOwner]

    def get_queryset(self):
        qs = GuestHousehold.objects.filter(
            event__organization__memberships__user=self.request.user
        ).distinct()
        event_id = self.request.query_params.get("event")
        if event_id:
            qs = qs.filter(event_id=event_id)
        return qs

    def perform_create(self, serializer):
        event = serializer.validated_data.get("event")
        has_access = Membership.objects.filter(
            organization=event.organization,
            user=self.request.user,
            role__in=["owner", "planner"],
        ).exists()

        if not has_access:
            raise PermissionDenied(
                "You must be an owner or planner of the organization to create households."
            )
        serializer.save(organization=event.organization)


class GuestViewSet(viewsets.ModelViewSet):
    serializer_class = GuestSerializer
    permission_classes = [IsOrganizationPlannerOrOwner]

    def get_queryset(self):
        qs = Guest.objects.filter(
            event__organization__memberships__user=self.request.user
        ).distinct()
        event_id = self.request.query_params.get("event")
        if event_id:
            qs = qs.filter(event_id=event_id)
        return qs

    def perform_create(self, serializer):
        event = serializer.validated_data.get("event")
        has_access = Membership.objects.filter(
            organization=event.organization,
            user=self.request.user,
            role__in=["owner", "planner"],
        ).exists()

        if not has_access:
            raise PermissionDenied(
                "You must be an owner or planner of the organization to add guests."
            )
        serializer.save(organization=event.organization)


class VendorBookingViewSet(viewsets.ModelViewSet):
    serializer_class = VendorBookingSerializer
    permission_classes = [IsOrganizationPlannerOrOwner]

    def get_queryset(self):
        qs = VendorBooking.objects.filter(
            event__organization__memberships__user=self.request.user
        ).distinct()
        event_id = self.request.query_params.get("event")
        if event_id:
            qs = qs.filter(event_id=event_id)
        return qs

    def perform_create(self, serializer):
        event = serializer.validated_data.get("event")
        has_access = Membership.objects.filter(
            organization=event.organization,
            user=self.request.user,
            role__in=["owner", "planner"],
        ).exists()

        if not has_access:
            raise PermissionDenied(
                "You must be an owner or planner of the organization to book vendors."
            )
        serializer.save(organization=event.organization)


class DocumentViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentSerializer
    permission_classes = [IsOrganizationPlannerOrOwner]

    def get_queryset(self):
        qs = Document.objects.filter(
            event__organization__memberships__user=self.request.user
        ).distinct()
        event_id = self.request.query_params.get("event")
        if event_id:
            qs = qs.filter(event_id=event_id)
        return qs

    def perform_create(self, serializer):
        event = serializer.validated_data.get("event")
        has_access = Membership.objects.filter(
            organization=event.organization,
            user=self.request.user,
            role__in=["owner", "planner"],
        ).exists()

        if not has_access:
            raise PermissionDenied(
                "You must be an owner or planner of the organization to upload documents."
            )

        # We also want to record WHO uploaded the document
        serializer.save(organization=event.organization, uploaded_by=self.request.user)

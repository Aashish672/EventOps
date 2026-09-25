from core.permissions import IsOrganizationPlannerOrOwner
from organizations.models import Membership
from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied

from .models import BudgetCategory, BudgetLineItem, Event, Task
from .serializers import (
    BudgetCategorySerializer,
    BudgetLineItemSerializer,
    EventSerializer,
    TaskSerializer,
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

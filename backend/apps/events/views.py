import logging

from agents.models import AgentRun
from agents.orchestration.graph import run_risk_impact_agent
from agents.serializers import AgentRunSerializer
from core.permissions import IsOrganizationPlannerOrOwner
from organizations.models import Membership
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

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

logger = logging.getLogger(__name__)

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
    
    @action(detail=True, methods=["post"], url_path="analyze-risk")
    def analyze_risk(self, request, pk=None) -> Response:
        """
        Triggers the LangGraph Risk & Change Impact agent on-demand for this event.
        Assembles live context snapshots, executes LLM reasoning, and registers an 
        auditable pending AgentRun proposal.
        """
        event = self.get_object()
        trigger_reason = request.data.get(
            "trigger_reason", "Manual planner risk and change audit"
        )

        logger.info(
            "User %s initiated on-demand risk analysis for Event %s (Org %s)",
            request.user.id,
            event.id,
            event.organization_id,
        )

        try:
            # Execute the compiled 3-node LangGraph workflow
            result_state = run_risk_impact_agent(
                event_id=str(event.id),
                org_id=str(event.organization_id),
                trigger=trigger_reason
            )

            proposed_diff = result_state.get("proposed_diff", {})
            reasoning = result_state.get("reasoning", "")

            # Persist pending AgentRun following the Single Write Path contract
            agent_run = AgentRun.objects.create(
                organization=event.organization,
                event=event,
                agent_type=AgentRun.AgentType.RISK_CHANGE_IMPACT,
                trigger=trigger_reason,
                input_snapshot={
                    "trigger": trigger_reason,
                    "event_summary": result_state.get("event_summary", {}),
                    "task_count": len(result_state.get("tasks_snapshot", [])),
                    "budget_categories_count": len(result_state.get("budget_snapshot", {}).get("categories", [])),
                    "vendor_count": len(result_state.get("vendors_snapshot", []))
                },
                reasoning=reasoning,
                proposed_diff=proposed_diff,
                state=AgentRun.State.PENDING,
            )

            serializer = AgentRunSerializer(agent_run)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as exc:
            logger.exception("Error running risk analysis for Event %s", event.id)
            return Response(
                {"error": "Failed to run risk analysis: " + str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


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

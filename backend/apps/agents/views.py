import logging

from core.permissions import IsOrganizationPlannerOrOwner
from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from .models import AgentRun, ChangeLogEntry
from .serializers import (
    AgentRunSerializer,
    ChangeLogEntrySerializer,
    EditApproveProposalSerializer,
    RejectProposalSerializer,
)
from .services import apply_agent_proposal, reject_agent_proposal

logger = logging.getLogger(__name__)

class AgentRunViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Tenant-scoped ViewSet for inspecting and actioning Agent proposals.
    Provides custom POST actions for approve, reject, and edit-approve.
    """
    serializer_class = AgentRunSerializer
    permission_classes = [IsOrganizationPlannerOrOwner]

    def get_queryset(self):
        qs = AgentRun.objects.filter(
            organization__memberships__user=self.request.user
        ).select_related("event","reviewed_by").distinct()

        event_id = self.request.query_params.get("event")
        if event_id:
            qs = qs.filter(event_id=event_id)
        
        state = self.request.query_params.get("state")
        if state:
            qs = qs.filter(state=state)

        agent_type = self.request.query_params.get("agent_type")
        if agent_type:
            qs = qs.filter(agent_type=agent_type)

        return qs.order_by("-created_at")

    @action(detail=True, methods=["post"], url_path="approve")
    def approve(self, request, pk=None) -> Response:
        """ Approval and exceute an agent proposal via the single write path"""
        agent_run = self.get_object()
        logger.info(
            "User %s attempting to approve AgentRun %s (Event: %s)",
            request.user.id,
            agent_run.id,
            agent_run.event_id,
        )

        try:
            updated_run = apply_agent_proposal(
                agent_run_id=agent_run.id,
                user=request.user,
            )
            serializer = self.get_serializer(updated_run)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except DjangoValidationError as exc:
            logger.warning("Validation error approving AgentRun %s: %s", agent_run.id,exc.message)
            raise ValidationError(detail={"error": exc.message})
        except DjangoPermissionDenied as exc:
            logger.warning("Permission denied approving AgentRun %s: %s",agent_run.id, str(exc))
            raise PermissionDenied(detail=str(exc))
        
    @action(detail=True, methods=["post"], url_path="reject")
    def reject(self, request, pk=None) -> Response:
        """Reject and dismiss an agent proposal with feedback."""
        agent_run= self.get_object()
        input_serializer = RejectProposalSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        reason = input_serializer.validated_data.get("reason","")

        logger.info(
            "User %s rejecting AgentRun %s (Reason: %s)",
            request.user.id,
            agent_run.id,
            reason,
        )

        try:
            updated_run = reject_agent_proposal(
                agent_run_id=agent_run.id,
                user=request.user,
                rejection_reason=reason,
            )
            serializer = self.get_serializer(updated_run)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except DjangoValidationError as exc:
            logger.warning("Validation error rejecting AgentRun %s: %s", agent_run.id,exc.message)
            raise ValidationError(detail={"error":exc.message})
        except DjangoPermissionDenied as exc:
            logger.warning("Permission denied rejecting AgentRun %s: %s", agent_run.id, str(exc))
            raise PermissionDenied(detail=str(exc))

    @action(detail=True, methods=["post"], url_path="edit-approve")
    def edit_approve(self, request, pk=None) -> Response:
        """Apply an agent proposal with user-edited diff modifications."""
        agent_run = self.get_object()
        input_serializer = EditApproveProposalSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        modified_diff = input_serializer.validated_data["modified_diff"]

        logger.info(
            "User %s edit-approving AgentRun %s with modified diff: %s",
            request.user.id,
            agent_run.id,
            modified_diff,
        )

        try:
            updated_run = apply_agent_proposal(
                agent_run_id=agent_run.id,
                user=request.user,
                modified_diff=modified_diff,
            )
            serializer = self.get_serializer(updated_run)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except DjangoValidationError as exc:
            logger.warning("Validation error edit-approving AgentRun %s: %s", agent_run.id,exc.message)
            raise ValidationError(detail={"error":exc.message})
        except DjangoPermissionDenied as exc:
            logger.warning("Permission denied edit-approving AgentRun %s: %s", agent_run.id, str(exc))
            raise PermissionDenied(detail=str(exc))


class ChangeLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Immutable audit log endpoint. Strictly read-only to preserve audit integrity.
    """
    serializer_class = ChangeLogEntrySerializer
    permission_classes = [IsOrganizationPlannerOrOwner]

    def get_queryset(self):
        qs = ChangeLogEntry.objects.filter(
            organization__memberships__user=self.request.user
        ).select_related("event").distinct()

        event_id = self.request.query_params.get("event")
        if event_id:
            qs = qs.filter(event_id=event_id)

        actor_type = self.request.query_params.get("actor_type")
        if actor_type:
            qs = qs.filter(actor_type=actor_type)

        entity_type = self.request.query_params.get("entity_type")
        if entity_type:
            qs = qs.filter(entity_type=entity_type)

        return qs.order_by("-created_at")

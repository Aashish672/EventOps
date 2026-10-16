from rest_framework import serializers

from .models import AgentRun, ChangeLogEntry


class AgentRunSerializer(serializers.ModelSerializer):
    """
    Read-only serializer for AgentRun instances.
    State transitions occur only via explicit /approve, /reject, and /edit-approve actions.
    """
    reviewed_by_email = serializers.SerializerMethodField()

    class Meta:
        model = AgentRun
        fields = [
            "id",
            "organization",
            "event",
            "agent_type",
            "trigger",
            "input_snapshot",
            "reasoning",
            "proposed_diff",
            "final_diff",
            "state",
            "reviewed_by",
            "reviewed_by_email",
            "reviewed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_reviewed_by_email(self, obj: AgentRun) -> str | None:
        return obj.reviewed_by.email if obj.reviewed_by else None


class ChangeLogEntrySerializer(serializers.ModelSerializer):
    """
    Read-only audit log serializer.
    """

    class Meta:
        model = ChangeLogEntry
        fields = [
            "id",
            "organization",
            "event",
            "actor_type",
            "actor_id",
            "entity_type",
            "entity_id",
            "before",
            "after",
            "agent_run",
            "created_at",
        ]
        read_only_fields = fields

class RejectProposalSerializer(serializers.Serializer):
    """Payload for rejecting an agent proposal with optional explanation."""
    reason = serializers.CharField(required=False, allow_blank=True, default="")

class EditApproveProposalSerializer(serializers.Serializer):
    """Payload for approvinf an agent proposal with human-edited diff adjustments."""
    modified_diff = serializers.DictField(child=serializers.ListField(child=serializers.DictField()))

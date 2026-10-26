from core.models import TenantModel
from django.conf import settings
from django.db import models


class AgentRun(TenantModel):
    """
    Represents an execution of an AI agent.
    The output is a structured proposal that remains 'pending'
    until an authorized human planner reviews and approve it.
    """

    class AgentType(models.TextChoices):
        DOCUMENT_INTELLIGENCE = "document_intelligence", "Document Intelligence"
        EVENT_PLANNING = "event_planning", "Event Planning"
        BUDGET_INTELLIGENCE = "budget_intelligence", "Budget Intelligence"
        VENDOR_EVALUATION = "vendor_evaluation", "Vendor Evaluation"
        RISK_CHANGE_IMPACT = "risk_change_impact", "Risk & Change Impact"

    class State(models.TextChoices):
        PENDING = "pending", "Pending Review"
        APPROVED = "approved", "Approved"
        REJECTED = "rejected", "Rejected"
        EDITED_APPROVED = "edited_approved", "Edited & Approved"
    
    event = models.ForeignKey(
        "events.Event",
        on_delete=models.CASCADE,
        related_name="agent_runs",
    )
    agent_type = models.CharField(
        max_length=40,
        choices=AgentType.choices,
        db_index=True,
    )
    trigger = models.CharField(
        max_length=255,
        help_text="The event or condition that triggered this agent (e.g.'event_date_shifted')",
    )
    input_snapshot = models.JSONField(
        default=dict,
        help_text="Snapshot of relevant event state provided to the agent",
    )
    reasoning=models.TextField(
        blank=True,
        default="",
        help_text="The agent's chain-of-thought explanation for why these changes are proposed",
    )
    proposed_diff = models.JSONField(
        default=dict,
        help_text="Structured before/after diff of proposed changes",
    )
    final_diff = models.JSONField(
        null=True,
        blank=True,
        help_text="The actual diff that was applied, if modified by a human being review",
    )
    state = models.CharField(
        max_length=20,
        choices=State.choices,
        default=State.PENDING,
        db_index=True,
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reviewed_agent_runs",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.get_agent_type_display()} on {self.event.name}({self.get_state_display()})"

class ChangeLogEntry(TenantModel):
    """
    Immutable audit log recording every state mutation in an event.
    Tracks both human acctions and applied agent proposals.
    """

    class ActorType(models.TextChoices):
        USER = "user", "User"
        AGENT = "agent", "Agent"

    event = models.ForeignKey(
        "events.Event",
        on_delete=models.CASCADE,
        related_name="change_log",
    )
    actor_type = models.CharField(
        max_length=10,
        choices=ActorType.choices,
        default=ActorType.USER,
    )
    actor_id = models.CharField(
        max_length=255,
        help_text="User ID or Agent identifier that initiated the change",
    )
    entity_type = models.CharField(
        max_length=50,
        help_text="Type of entity being changed (e.g. 'task', 'budget_item', 'guest')"
    )
    entity_id = models.CharField(
        max_length=255,
        help_text="ID of the specific entity being changed",
    )
    before = models.JSONField(
        null=True,
        blank=True,
        help_text="Field state before mutation",
    )
    after = models.JSONField(
        null=True,
        blank=True,
        help_text="Field state after mutation",
    )
    agent_run = models.ForeignKey(
        AgentRun,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="change_logs",
    )

    class Meta:
        ordering = ["-created_at"]
    
    def __str__(self):
        return f"[{self.actor_type.upper()}] {self.entity_type} {self.entity_id} on {self.event.name}"
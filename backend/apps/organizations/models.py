from core.models import TimeStampedModel, UUIDModel
from django.conf import settings
from django.db import models

# Create your models here.


class Organization(UUIDModel, TimeStampedModel):
    """
    The Tenant Boundary. Every resource in EventOps belongs to an organization
    """

    PLAN_CHOICES = (
        ("free", "Free"),
        ("pro", "Pro"),
        ("agency", "Agency"),
    )

    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default="free")
    stripe_customer_id = models.CharField(max_length=255, blank=True, null=True)
    stripe_subscription_id = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return self.name


class Membership(UUIDModel):
    """
    Links a User to an organization with a specific role (RBAC).
    """

    ROLE_CHOICES = (
        ("owner", "Owner"),
        ("planner", "Planner"),
        ("coordinator", "Coordinator"),
        ("viewer", "Viewer"),
    )

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="memberships"
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("organization", "user")
        ordering = ("-created_at",)

    def __str__(self):
        return f"{self.user} - {self.organization.name} ({self.role})"

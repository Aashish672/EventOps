import uuid

from django.db import models


class UUIDModel(models.Model):
    """
    Abstract base model that provides a UUIDv4 primary key.
    Prevents sequential enumeration / IDOR attacks and allows client-side ID generation.
    """

    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False,
    )

    class Meta:
        abstract = True


class TimeStampedModel(models.Model):
    """
    Abstract base model that tracks creation and last modification timestamps.
    """

    created_at = models.DateTimeField(auto_now_add=True, editable=False)
    updated_at = models.DateTimeField(auto_now=True, editable=False)

    class Meta:
        abstract = True


class TenantModel(UUIDModel, TimeStampedModel):
    """
    Abstract base model for all tenant-scoped resources.
    Guarantess every child entity (events, tasks, vendors, budgets) has:
    1. A secure UUIDv4 primary key (`id`)
    2. Audit timestamps (`created_at`, `updated_at`)
    3. An indexed foreign key to its parent `Organization`.
    """

    organization = models.ForeignKey(
        "organizations.Organization",
        on_delete=models.CASCADE,
        related_name="%(app_label)s_%(class)ss",
        db_index=True,
    )

    class Meta:
        abstract = True

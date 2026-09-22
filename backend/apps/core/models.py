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
    created_at=models.DateTimeField(auto_now_add=True,editable=False)
    updated_at=models.DateTimeField(auto_now=True,editable=False)

    class Meta:
        abstract=True
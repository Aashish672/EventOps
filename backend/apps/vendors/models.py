from core.models import TenantModel
from django.db import models


class Vendor(TenantModel):
    """
    A directory of vendors (Caterers, Venues, Florists) owned by an Organization.
    Inherits 'id', 'created_at', 'updated_at', and 'organization' from TenantModel.
    """

    class VendorCategory(models.TextChoices):
        VENUE = "venue", "Venue"
        CATERING = "catering", "Catering"
        FLORIST = "florist", "Florist"
        PHOTOGRAPHY = "photography", "Photography"
        ENTERTAINMENT = "entertainment", "Entertainment"
        OTHER = "other", "Other"

    name = models.CharField(max_length=255)
    category = models.CharField(
        max_length=20,
        choices=VendorCategory.choices,
        default=VendorCategory.OTHER,
        db_index=True,
    )
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=50, blank=True)
    website = models.URLField(blank=True)
    point_of_contact = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ("name",)
        # Ensure we don't have duplicate vendor names within the same organization
        constraints = (
            models.UniqueConstraint(
                fields=("organization", "name"), name="unique_org_vendor_name"
            ),
        )

    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"

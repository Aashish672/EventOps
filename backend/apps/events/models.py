from core.models import TenantModel
from django.conf import settings
from django.db import models


class Event(TenantModel):
    class EventStatus(models.TextChoices):
        DRAFT = "draft", "Draft"
        PLANNING = "planning", "Planning"
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    start_date = models.DateTimeField()
    end_date = models.DateTimeField()
    status = models.CharField(
        max_length=20, choices=EventStatus.choices, default=EventStatus.DRAFT
    )
    # Planner can be nullable if unassigned
    assigned_planner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="planned_events",
    )

    def __str__(self):
        return self.name


class Task(TenantModel):
    class TaskStatus(models.TextChoices):
        TODO = "todo", "To Do"
        IN_PROGRESS = "in_progress", "In Progress"
        DONE = "done", "Done"

    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="tasks")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    due_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20, choices=TaskStatus.choices, default=TaskStatus.TODO
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_tasks",
    )

    def __str__(self):
        return self.title


class BudgetCategory(TenantModel):
    event = models.ForeignKey(
        Event, on_delete=models.CASCADE, related_name="budget_categories"
    )
    name = models.CharField(max_length=255)  # e.g. "Food", "Decor"
    allocated_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.name} ({self.event.name})"


class BudgetLineItem(TenantModel):
    category = models.ForeignKey(
        BudgetCategory, on_delete=models.CASCADE, related_name="line_items"
    )
    event = models.ForeignKey(
        Event, on_delete=models.CASCADE, related_name="budget_items"
    )
    description = models.CharField(max_length=255)
    estimated_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    actual_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_paid = models.BooleanField(default=False)

    def __str__(self):
        return self.description


class GuestHousehold(TenantModel):
    """Groups guests together (e.g. 'The Smith Family') for unified invitations"""

    event = models.ForeignKey(
        Event, on_delete=models.CASCADE, related_name="households"
    )
    name = models.CharField(max_length=255)
    address = models.TextField(blank=True)
    email = models.EmailField(blank=True)

    def __str__(self):
        return self.name


class Guest(TenantModel):
    class RSVPStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        ATTENDING = "attending", "Attending"
        DECLINED = "declined", "Declined"

    household = models.ForeignKey(
        GuestHousehold, on_delete=models.CASCADE, related_name="guests"
    )
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="guests")
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    rsvp_status = models.CharField(
        max_length=20, choices=RSVPStatus.choices, default=RSVPStatus.PENDING
    )
    dietary_restrictions = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class VendorBooking(TenantModel):
    """The bridge table linking an Event to a Vendor from the central directory"""

    class BookingStatus(models.TextChoices):
        INQUIRY = "inquiry", "Inquiry Sent"
        CONTRACT_SENT = "contract_sent", "Contract Sent"
        BOOKED = "booked", "Booked/Confirmed"
        REJECTED = "rejected", "Rejected"

    event = models.ForeignKey(
        Event, on_delete=models.CASCADE, related_name="vendor_bookings"
    )
    vendor = models.ForeignKey(
        "vendors.Vendor", on_delete=models.PROTECT, related_name="event_bookings"
    )
    status = models.CharField(
        max_length=20, choices=BookingStatus.choices, default=BookingStatus.INQUIRY
    )
    agreed_price = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    contract_notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.vendor.name} for {self.event.name}"


class Document(TenantModel):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name="documents")
    title = models.CharField(max_length=255)
    file_url = (
        models.URLField()
    )  # We'll store the actual files in Supabase Storage later
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )

    def __str__(self):
        return self.title

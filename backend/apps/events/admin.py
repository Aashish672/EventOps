from django.contrib import admin

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


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("name", "status", "start_date", "organization", "assigned_planner")
    list_filter = ("status", "organization")
    search_fields = ("name", "description")


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("title", "event", "status", "due_date", "assigned_to")
    list_filter = ("status", "event__organization")


@admin.register(BudgetLineItem)
class BudgetLineItemAdmin(admin.ModelAdmin):
    list_display = (
        "description",
        "category",
        "event",
        "estimated_cost",
        "actual_cost",
        "is_paid",
    )
    list_filter = ("is_paid", "event__organization")


# We can quickly register the rest without a custom ModelAdmin class for now!
admin.site.register(BudgetCategory)
admin.site.register(GuestHousehold)
admin.site.register(Guest)
admin.site.register(VendorBooking)
admin.site.register(Document)

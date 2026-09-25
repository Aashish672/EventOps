from rest_framework import serializers

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


class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = [
            "id",
            "organization",
            "name",
            "description",
            "start_date",
            "end_date",
            "status",
            "assigned_planner",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = [
            "id",
            "event",
            "title",
            "description",
            "due_date",
            "status",
            "assigned_to",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class BudgetLineItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = BudgetLineItem
        fields = [
            "id",
            "category",
            "event",
            "description",
            "estimated_cost",
            "actual_cost",
            "is_paid",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        # Enforce that the category and event belong to the same event
        # (Since the model has both category and event FKs)
        category = attrs.get("category")
        event = attrs.get("event")

        # When creating or updating, ensure category belongs to the given event
        if category and event and category.event_id != event.id:
            raise serializers.ValidationError(
                {
                    "category": "The selected category does not belong to the selected event."
                }
            )

        return super().validate(attrs)


class BudgetCategorySerializer(serializers.ModelSerializer):
    line_items = BudgetLineItemSerializer(many=True, read_only=True)

    class Meta:
        model = BudgetCategory
        fields = [
            "id",
            "event",
            "name",
            "allocated_amount",
            "line_items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class GuestHouseholdSerializer(serializers.ModelSerializer):
    class Meta:
        model = GuestHousehold
        fields = [
            "id",
            "event",
            "name",
            "address",
            "email",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class GuestSerializer(serializers.ModelSerializer):
    class Meta:
        model = Guest
        fields = [
            "id",
            "household",
            "event",
            "first_name",
            "last_name",
            "rsvp_status",
            "dietary_restrictions",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        household = attrs.get("household")
        event = attrs.get("event")

        # Cross-model boundary check: Household must belong to the Event
        if household and event and household.event_id != event.id:
            raise serializers.ValidationError(
                {
                    "household": "The selected household does not belong to the selected event."
                }
            )

        return super().validate(attrs)


class VendorBookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorBooking
        fields = [
            "id",
            "event",
            "vendor",
            "status",
            "agreed_price",
            "contract_notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate(self, attrs):
        vendor = attrs.get("vendor")
        event = attrs.get("event")

        # Cross-tenant boundary check: Vendor must belong to the same Organization as the Event
        if vendor and event and vendor.organization_id != event.organization_id:
            raise serializers.ValidationError(
                {"vendor": "The selected vendor does not belong to your organization."}
            )

        return super().validate(attrs)


class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = [
            "id",
            "event",
            "title",
            "file_url",
            "uploaded_by",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

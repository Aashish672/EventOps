from rest_framework import serializers

from .models import BudgetCategory, BudgetLineItem, Event, Task


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

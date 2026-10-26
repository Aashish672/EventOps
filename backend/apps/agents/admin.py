from django.contrib import admin

from .models import AgentRun, ChangeLogEntry


@admin.register(AgentRun)
class AgentRunAdmin(admin.ModelAdmin):
    list_display = ("event", "agent_type", "state", "reviewed_by","trigger")
    list_filter = ("state", "agent_type","created_at")
    search_fields = ("event__name", "trigger","reasoning")
    readonly_fields = ("created_at","updated_at")


@admin.register(ChangeLogEntry)
class ChangeLogEntryAdmin(admin.ModelAdmin):
    list_display = ("entity_type","entity_id","actor_type","actor_id","event","created_at")
    list_filter = ("actor_type","entity_type","created_at")
    search_fields = ("event__name","entity_id","actor_id")
    readonly_fields = ("created_at","updated_at")
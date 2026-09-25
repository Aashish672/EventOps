from django.contrib import admin

from .models import Membership, Organization


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "plan", "created_at")
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}  # noqa: RUF012


@admin.register(Membership)
class MembershipAdmin(admin.ModelAdmin):
    list_display = ("user", "organization", "role", "created_at")
    list_filter = ("role", "organization")
    search_fields = ("user__username", "user__email", "organization__name")

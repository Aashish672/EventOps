from django.contrib import admin

from .models import Vendor

# Register your models here.


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "organization", "phone", "email")
    list_filter = ("category", "organization")
    search_fields = ("name", "email", "point_of_contact")

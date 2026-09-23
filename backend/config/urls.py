"""
URL configuration for EventOps project.
"""

from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    # Core API endpoints (health checks, meta, etc.)
    path("api/", include("core.urls")),
    # Organization & Memberships
    path("api/", include("organizations.urls")),
]

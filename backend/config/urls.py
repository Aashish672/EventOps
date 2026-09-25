"""
URL configuration for EventOps project.
"""

from django.contrib import admin
from django.urls import include, path
from events.views import EventViewSet
from rest_framework.routers import DefaultRouter
from vendors.views import VendorViewSet

# We instantiate a DefaultRouter. This magic DRF class automatically generates
# the GET, POST, PUT, DELETE routes for us based on the ViewSets!
router = DefaultRouter()
router.register(r"events", EventViewSet, basename="event")
router.register(r"vendors", VendorViewSet, basename="vendor")

urlpatterns = [
    path("admin/", admin.site.urls),
    # Core API endpoints (health checks, meta, etc.)
    path("api/", include("core.urls")),
    # Organization & Memberships
    path("api/", include("organizations.urls")),
    # Our new Event and Vendor API Endpoints!
    # This exposes: /api/events/ and /api/vendors/
    path("api/", include(router.urls)),
]

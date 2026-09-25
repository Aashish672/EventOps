"""
URL configuration for EventOps project.
"""

from django.contrib import admin
from django.urls import include, path
from events.views import (
    BudgetCategoryViewSet,
    BudgetLineItemViewSet,
    EventViewSet,
    TaskViewSet,
    GuestHouseholdViewSet,
    GuestViewSet,
    VendorBookingViewSet,
    DocumentViewSet,
)

from rest_framework.routers import DefaultRouter
from vendors.views import VendorViewSet

# We instantiate a DefaultRouter. This magic DRF class automatically generates
# the GET, POST, PUT, DELETE routes for us based on the ViewSets!
router = DefaultRouter()
router.register(r"events", EventViewSet, basename="event")
router.register(r"tasks", TaskViewSet, basename="task")
router.register(r"budget-categories", BudgetCategoryViewSet, basename="budget-category")
router.register(
    r"budget-line-items", BudgetLineItemViewSet, basename="budget-line-item"
)
router.register(r"vendors", VendorViewSet, basename="vendor")

router.register(r"guest-households", GuestHouseholdViewSet, basename="guest-household")
router.register(r"guests", GuestViewSet, basename="guest")
router.register(r"vendor-bookings", VendorBookingViewSet, basename="vendor-booking")
router.register(r"documents", DocumentViewSet, basename="document")


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

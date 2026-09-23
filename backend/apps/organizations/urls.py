from organizations.views import OrganizationViewSet
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r"orgs", OrganizationViewSet, basename="organization")

urlpatterns = router.urls

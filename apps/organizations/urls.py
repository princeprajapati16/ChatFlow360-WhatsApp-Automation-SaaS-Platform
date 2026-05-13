from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.organizations.views import OrganizationViewSet

router = DefaultRouter()
router.register(r"", OrganizationViewSet, basename="organizations")

urlpatterns = [
    path("", include(router.urls)),
]

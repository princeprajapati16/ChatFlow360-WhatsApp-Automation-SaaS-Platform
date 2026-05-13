from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.leads.views import LeadViewSet

router = DefaultRouter()
router.register(r"", LeadViewSet, basename="leads")

urlpatterns = [path("", include(router.urls))]

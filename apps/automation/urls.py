from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.automation.views import AutomationRuleViewSet, AutomationFlowViewSet

router = DefaultRouter()
router.register(r"rules", AutomationRuleViewSet, basename="automation-rules")
router.register(r"flows", AutomationFlowViewSet, basename="automation-flows")

urlpatterns = [path("", include(router.urls))]

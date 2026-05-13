from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.whatsapp.views import (
    WebhookView,
    WhatsAppConfigView,
    WhatsAppConnectView,
    WhatsAppDemoConnectView,
    WhatsAppStatusView,
    WhatsAppTestConnectionView,
    WhatsAppGenerateTokenView,
    WhatsAppAnalyticsView,
    WhatsAppAccountViewSet,
    ContactViewSet,
    AutoReplyViewSet,
)

router = DefaultRouter()
router.register(r"accounts", WhatsAppAccountViewSet, basename="whatsapp-accounts")
router.register(r"contacts", ContactViewSet, basename="whatsapp-contacts")
router.register(r"auto-replies", AutoReplyViewSet, basename="auto-replies")

urlpatterns = [
    # Webhook (no auth — called by Meta)
    path("webhook/", WebhookView.as_view(), name="whatsapp-webhook"),

    # Config / connection lifecycle
    path("config/",          WhatsAppConfigView.as_view(),          name="whatsapp-config"),
    path("connect/",         WhatsAppConnectView.as_view(),         name="whatsapp-connect"),
    path("connect-demo/",    WhatsAppDemoConnectView.as_view(),     name="whatsapp-connect-demo"),
    path("disconnect/",      WhatsAppConfigView.as_view(),          name="whatsapp-disconnect"),   # DELETE
    path("status/",          WhatsAppStatusView.as_view(),          name="whatsapp-status"),
    path("test-connection/", WhatsAppTestConnectionView.as_view(),  name="whatsapp-test-connection"),
    path("generate-token/",  WhatsAppGenerateTokenView.as_view(),   name="whatsapp-generate-token"),
    path("analytics/",       WhatsAppAnalyticsView.as_view(),       name="whatsapp-analytics"),

    path("", include(router.urls)),
]

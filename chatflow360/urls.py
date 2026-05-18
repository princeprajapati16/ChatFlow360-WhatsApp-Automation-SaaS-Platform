"""
ChatFlow360 – Root URL Configuration
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse


def health_check(request):
    return JsonResponse({"status": "ok", "service": "ChatFlow360 API"}, status=200)


def root_view(request):
    return JsonResponse({
        "status": "success",
        "name": "ChatFlow360 API",
        "version": "2.0",
        "message": "WhatsApp Automation SaaS Platform",
        "admin_panel": "/admin/",
        "docs": {
            "auth": "/api/v1/auth/",
            "users": "/api/v1/users/",
            "organizations": "/api/v1/organizations/",
            "whatsapp": "/api/v1/whatsapp/",
            "conversations": "/api/v1/conversations/",
            "leads": "/api/v1/leads/",
            "campaigns": "/api/v1/campaigns/",
            "automation": "/api/v1/automation/",
            "analytics": "/api/v1/analytics/",
            "subscriptions": "/api/v1/subscriptions/",
            "payments": "/api/v1/payments/",
            "notifications": "/api/v1/notifications/",
        }
    })


urlpatterns = [
    path("", root_view),
    path("api/health/", health_check),
    path("admin/", admin.site.urls),

    # ── Authentication ───────────────────────────────────────
    path("api/v1/auth/",          include("authentication.urls")),
    path("api/auth/",             include("authentication.urls")),
    path("api/v1/users/",         include("users.urls")),

    # ── Core SaaS Modules ────────────────────────────────────
    path("api/v1/organizations/", include("apps.organizations.urls")),
    path("api/v1/whatsapp/",      include("apps.whatsapp.urls")),
    path("api/v1/conversations/", include("apps.conversations.urls")),
    path("api/v1/leads/",         include("apps.leads.urls")),
    path("api/v1/campaigns/",     include("apps.campaigns.urls")),
    path("api/v1/automation/",    include("apps.automation.urls")),
    path("api/v1/analytics/",     include("apps.analytics.urls")),

    # ── Billing / Notifications ──────────────────────────────
    path("api/v1/subscriptions/", include("subscriptions.urls")),
    path("api/v1/payments/",      include("payments.urls")),
    path("api/v1/notifications/", include("notifications.urls")),
    path("api/v1/dashboard/",     include("dashboard.urls")),
    path("api/v1/settings/",      include("settings_app.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

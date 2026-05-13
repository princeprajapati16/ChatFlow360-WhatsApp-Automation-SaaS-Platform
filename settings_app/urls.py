from django.urls import path
from .views import (
    ProfileView,
    UpdateProfileView,
    AvatarUploadView,
    ChangePasswordView,
    LogoutAllDevicesView,
    WhatsAppStatusView,
    WhatsAppConnectView,
    WhatsAppDisconnectView,
    NotificationPreferencesView,
    TeamListView,
    TeamMemberDetailView,
)

urlpatterns = [
    # Profile
    path("profile/",            ProfileView.as_view(),            name="settings-profile"),
    path("update-profile/",     UpdateProfileView.as_view(),      name="settings-update-profile"),
    path("profile/avatar/",     AvatarUploadView.as_view(),       name="settings-avatar"),

    # Security
    path("change-password/",    ChangePasswordView.as_view(),     name="settings-change-password"),
    path("logout-all/",         LogoutAllDevicesView.as_view(),   name="settings-logout-all"),

    # WhatsApp
    path("whatsapp/status/",                         WhatsAppStatusView.as_view(),   name="settings-wa-status"),
    path("whatsapp/connect/",                        WhatsAppConnectView.as_view(),  name="settings-wa-connect"),
    path("whatsapp/<uuid:account_id>/disconnect/",   WhatsAppDisconnectView.as_view(), name="settings-wa-disconnect"),

    # Notifications
    path("notifications/",      NotificationPreferencesView.as_view(), name="settings-notifications"),

    # Team
    path("team/",                    TeamListView.as_view(),          name="settings-team"),
    path("team/<uuid:member_id>/",   TeamMemberDetailView.as_view(),  name="settings-team-member"),
]

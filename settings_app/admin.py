from django.contrib import admin
from .models import UserProfile, NotificationPreferences


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "phone", "timezone", "created_at")
    search_fields = ("user__email", "phone")
    raw_id_fields = ("user",)


@admin.register(NotificationPreferences)
class NotificationPreferencesAdmin(admin.ModelAdmin):
    list_display = ("user", "email_notifications", "whatsapp_alerts", "campaign_updates")
    search_fields = ("user__email",)
    raw_id_fields = ("user",)

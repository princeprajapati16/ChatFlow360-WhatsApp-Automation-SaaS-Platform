"""
Settings App – Models
- UserProfile  : avatar / bio / phone
- NotificationPreferences : per-user toggles
Team management reuses apps.organizations (OrganizationMember).
"""
import uuid
from django.db import models
from django.conf import settings
from chatflow360.models import BaseModel


class UserProfile(BaseModel):
    """Extended profile fields for the default User."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="profile",
    )
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    bio = models.TextField(max_length=500, blank=True)
    timezone = models.CharField(max_length=60, default="UTC")

    class Meta:
        verbose_name = "User Profile"

    def __str__(self):
        return f"Profile({self.user.email})"

    @property
    def avatar_url(self):
        if self.avatar:
            return self.avatar.url
        return None


class NotificationPreferences(BaseModel):
    """Per-user notification toggle preferences."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notification_prefs",
    )
    email_notifications = models.BooleanField(default=True)
    whatsapp_alerts = models.BooleanField(default=True)
    campaign_updates = models.BooleanField(default=True)
    lead_alerts = models.BooleanField(default=True)
    system_announcements = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Notification Preferences"

    def __str__(self):
        return f"NotifPrefs({self.user.email})"

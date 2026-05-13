"""
WhatsApp app models.
WhatsAppAccount — per-org connected number.
Contact — a WhatsApp contact belonging to an org.
"""
import uuid
from django.db import models
from chatflow360.models import TenantModel


class WhatsAppAccount(TenantModel):
    """
    Represents one WhatsApp Business number connected to an org
    via the WhatsApp Cloud API.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    display_name = models.CharField(max_length=255, help_text="Friendly name e.g. 'Support Line'")
    phone_number_id = models.CharField(
        max_length=150, unique=True,
        help_text="WhatsApp Cloud API phone_number_id"
    )
    # Human-readable number shown in the dashboard e.g. "+1 415 555 2671"
    display_phone_number = models.CharField(max_length=30, blank=True)
    whatsapp_business_account_id = models.CharField(max_length=150, blank=True)
    # Encrypted at rest — store encrypted value, decrypt on use
    access_token = models.TextField(help_text="Graph API permanent access token")
    webhook_verify_token = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    # Timestamp of when this connection was first established
    connected_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["display_name"]
        indexes = [
            models.Index(fields=["phone_number_id"]),
            models.Index(fields=["organization", "is_active"]),
        ]

    def __str__(self):
        return f"{self.display_name} ({self.phone_number_id})"

    def save(self, *args, **kwargs):
        from django.utils import timezone
        if self.is_active and not self.connected_at:
            self.connected_at = timezone.now()
        super().save(*args, **kwargs)


class Contact(TenantModel):
    """A WhatsApp contact/customer inside an organization."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    phone_number = models.CharField(max_length=30, help_text="E.164 format: +1234567890")
    name = models.CharField(max_length=255, blank=True)
    email = models.EmailField(blank=True)
    tags = models.JSONField(default=list, blank=True)
    avatar = models.ImageField(upload_to="contact_avatars/", null=True, blank=True)
    is_blocked = models.BooleanField(default=False)
    last_seen = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("organization", "phone_number")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["organization", "phone_number"]),
            models.Index(fields=["organization", "is_blocked"]),
        ]

    def __str__(self):
        return f"{self.name or self.phone_number} [{self.organization.name}]"

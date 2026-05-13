"""
Campaigns module models.
Campaign — a broadcast marketing campaign.
CampaignContact — which contacts are in the campaign + delivery status.
"""
import uuid
from django.db import models
from chatflow360.models import TenantModel


class Campaign(TenantModel):
    """A WhatsApp broadcast marketing campaign."""

    class Status(models.TextChoices):
        DRAFT = "DRAFT", "Draft"
        SCHEDULED = "SCHEDULED", "Scheduled"
        RUNNING = "RUNNING", "Running"
        PAUSED = "PAUSED", "Paused"
        COMPLETED = "COMPLETED", "Completed"
        FAILED = "FAILED", "Failed"

    class MessageType(models.TextChoices):
        TEXT = "TEXT", "Text"
        TEMPLATE = "TEMPLATE", "Template (Approved)"
        IMAGE = "IMAGE", "Image"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    whatsapp_account = models.ForeignKey(
        "whatsapp.WhatsAppAccount",
        on_delete=models.CASCADE,
        related_name="campaigns",
    )
    message_type = models.CharField(
        max_length=20, choices=MessageType.choices, default=MessageType.TEXT
    )
    message_content = models.TextField(
        help_text="Message body (text) or template name"
    )
    # For template campaigns
    template_name = models.CharField(max_length=255, blank=True)
    template_language = models.CharField(max_length=20, default="en_US")
    # For image campaigns
    image_url = models.URLField(blank=True)
    image_caption = models.TextField(blank=True)

    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.DRAFT
    )
    scheduled_for = models.DateTimeField(null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    # Aggregate counters (updated by Celery tasks)
    total_recipients = models.PositiveIntegerField(default=0)
    sent_count = models.PositiveIntegerField(default=0)
    delivered_count = models.PositiveIntegerField(default=0)
    read_count = models.PositiveIntegerField(default=0)
    failed_count = models.PositiveIntegerField(default=0)
    replied_count = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["organization", "status"]),
            models.Index(fields=["scheduled_for"]),
        ]

    def __str__(self):
        return f"{self.name} [{self.status}]"

    @property
    def delivery_rate(self):
        if self.sent_count == 0:
            return 0
        return round(self.delivered_count / self.sent_count * 100, 1)

    @property
    def read_rate(self):
        if self.delivered_count == 0:
            return 0
        return round(self.read_count / self.delivered_count * 100, 1)


class CampaignContact(TenantModel):
    """Tracks a single contact's status within a campaign."""

    class DeliveryStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        SENT = "SENT", "Sent"
        DELIVERED = "DELIVERED", "Delivered"
        READ = "READ", "Read"
        REPLIED = "REPLIED", "Replied"
        FAILED = "FAILED", "Failed"
        SKIPPED = "SKIPPED", "Skipped (Blocked)"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    campaign = models.ForeignKey(
        Campaign, on_delete=models.CASCADE, related_name="campaign_contacts"
    )
    contact = models.ForeignKey(
        "whatsapp.Contact", on_delete=models.CASCADE, related_name="campaign_contacts"
    )
    status = models.CharField(
        max_length=20, choices=DeliveryStatus.choices, default=DeliveryStatus.PENDING
    )
    wa_message_id = models.CharField(max_length=255, blank=True, null=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)

    class Meta:
        unique_together = ("campaign", "contact")
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["campaign", "status"]),
        ]

    def __str__(self):
        return f"CampaignContact: {self.contact} in {self.campaign} [{self.status}]"

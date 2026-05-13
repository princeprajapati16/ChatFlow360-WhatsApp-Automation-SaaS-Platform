"""
Leads CRM models.
Lead — a contact converted to a sales lead.
LeadNote — internal notes on a lead.
LeadReminder — scheduled reminders for follow-up.
"""
import uuid
from django.db import models
from django.conf import settings
from chatflow360.models import TenantModel


class Lead(TenantModel):
    """Represents a prospect in the sales pipeline."""

    class Stage(models.TextChoices):
        NEW = "NEW", "New Lead"
        CONTACTED = "CONTACTED", "Contacted"
        INTERESTED = "INTERESTED", "Interested"
        NEGOTIATION = "NEGOTIATION", "Negotiation"
        CLOSED_WON = "CLOSED_WON", "Closed Won"
        CLOSED_LOST = "CLOSED_LOST", "Closed Lost"

    class Source(models.TextChoices):
        WHATSAPP = "WHATSAPP", "WhatsApp"
        MANUAL = "MANUAL", "Manual"
        IMPORT = "IMPORT", "Import"
        CAMPAIGN = "CAMPAIGN", "Campaign"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contact = models.ForeignKey(
        "whatsapp.Contact",
        on_delete=models.CASCADE,
        related_name="leads",
    )
    conversation = models.ForeignKey(
        "wa_conversations.Conversation",
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="leads",
    )
    title = models.CharField(max_length=255, blank=True)
    stage = models.CharField(
        max_length=20, choices=Stage.choices, default=Stage.NEW
    )
    source = models.CharField(
        max_length=20, choices=Source.choices, default=Source.WHATSAPP
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="leads",
    )
    estimated_value = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    closed_at = models.DateTimeField(null=True, blank=True)
    tags = models.JSONField(default=list)
    custom_fields = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["organization", "stage"]),
            models.Index(fields=["organization", "assigned_to"]),
            models.Index(fields=["organization", "source"]),
        ]

    def __str__(self):
        return f"Lead: {self.contact.name or self.contact.phone_number} [{self.stage}]"


class LeadNote(TenantModel):
    """Internal note on a lead."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name="notes")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="lead_notes",
    )
    content = models.TextField()

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Note on lead {self.lead_id} by {self.author.email}"


class LeadReminder(TenantModel):
    """Scheduled reminder for a lead follow-up."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name="reminders")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="lead_reminders",
    )
    remind_at = models.DateTimeField()
    message = models.TextField()
    is_sent = models.BooleanField(default=False)

    class Meta:
        ordering = ["remind_at"]
        indexes = [models.Index(fields=["remind_at", "is_sent"])]

    def __str__(self):
        return f"Reminder for lead {self.lead_id} at {self.remind_at}"

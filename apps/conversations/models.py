"""
Conversations module models.
Conversation — one WhatsApp thread between org and contact.
Message — individual messages within a conversation.
ConversationNote — internal notes by agents.
"""
import uuid
from django.db import models
from django.conf import settings
from chatflow360.models import TenantModel


class Conversation(TenantModel):
    """
    Represents an ongoing or closed WhatsApp chat session.
    """
    class Status(models.TextChoices):
        OPEN = "OPEN", "Open"
        ASSIGNED = "ASSIGNED", "Assigned"
        RESOLVED = "RESOLVED", "Resolved"
        SNOOZED = "SNOOZED", "Snoozed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contact = models.ForeignKey(
        "whatsapp.Contact",
        on_delete=models.CASCADE,
        related_name="conversations",
    )
    whatsapp_account = models.ForeignKey(
        "whatsapp.WhatsAppAccount",
        on_delete=models.CASCADE,
        related_name="conversations",
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="assigned_conversations",
    )
    status = models.CharField(
        max_length=20, choices=Status.choices, default=Status.OPEN
    )
    unread_count = models.PositiveIntegerField(default=0)
    last_message_at = models.DateTimeField(null=True, blank=True)
    tags = models.JSONField(default=list)
    snoozed_until = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-last_message_at"]
        indexes = [
            models.Index(fields=["organization", "status"]),
            models.Index(fields=["organization", "assigned_to"]),
            models.Index(fields=["organization", "last_message_at"]),
        ]

    def __str__(self):
        return f"Conversation #{self.id} [{self.status}]"

    def mark_read(self):
        self.unread_count = 0
        self.save(update_fields=["unread_count"])


class Message(TenantModel):
    """Individual message in a conversation."""

    class Direction(models.TextChoices):
        INBOUND = "INBOUND", "Inbound"
        OUTBOUND = "OUTBOUND", "Outbound"

    class MessageType(models.TextChoices):
        TEXT = "text", "Text"
        IMAGE = "image", "Image"
        AUDIO = "audio", "Audio"
        VIDEO = "video", "Video"
        DOCUMENT = "document", "Document"
        LOCATION = "location", "Location"
        STICKER = "sticker", "Sticker"
        TEMPLATE = "template", "Template"
        INTERACTIVE = "interactive", "Interactive"
        BUTTON = "button", "Button"

    class DeliveryStatus(models.TextChoices):
        SENT = "sent", "Sent"
        DELIVERED = "delivered", "Delivered"
        READ = "read", "Read"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name="messages"
    )
    direction = models.CharField(max_length=10, choices=Direction.choices)
    message_type = models.CharField(
        max_length=20, choices=MessageType.choices, default=MessageType.TEXT
    )
    content = models.TextField()
    wa_message_id = models.CharField(
        max_length=255, unique=True, null=True, blank=True,
        help_text="WhatsApp Cloud API message ID (wamid)",
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="sent_messages",
        help_text="Set for outbound messages sent by an agent",
    )
    delivery_status = models.CharField(
        max_length=20, choices=DeliveryStatus.choices, default=DeliveryStatus.SENT
    )
    metadata = models.JSONField(
        default=dict, blank=True,
        help_text="Raw WhatsApp payload data for media messages",
    )

    class Meta:
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=["conversation", "created_at"]),
            models.Index(fields=["wa_message_id"]),
        ]

    def __str__(self):
        return f"{self.direction} msg in conv {self.conversation_id}"


class ConversationNote(TenantModel):
    """Internal team note on a conversation — not sent to customer."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name="notes"
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="conversation_notes",
    )
    content = models.TextField()

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"Note by {self.author.email} on conv {self.conversation_id}"

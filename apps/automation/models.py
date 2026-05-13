"""
Automation module models.
AutomationRule — keyword-triggered auto-replies.
AutomationFlow — multi-step conversation flows (JSON-based).
AutomationFlowStep — individual steps within a flow.
"""
import uuid
from django.db import models
from chatflow360.models import TenantModel


class AutomationRule(TenantModel):
    """
    Simple keyword-trigger automation.
    IF incoming message CONTAINS keyword THEN send reply.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    keywords = models.JSONField(
        default=list,
        help_text="List of keywords/phrases that trigger this rule (case-insensitive)",
    )
    match_type = models.CharField(
        max_length=20,
        choices=[
            ("contains", "Contains"),
            ("exact", "Exact Match"),
            ("starts_with", "Starts With"),
        ],
        default="contains",
    )
    reply_text = models.TextField(help_text="Text message to send as reply")
    is_active = models.BooleanField(default=True)
    priority = models.PositiveIntegerField(
        default=0,
        help_text="Higher priority rules are checked first",
    )
    # Restrict to specific WhatsApp accounts (empty = all)
    whatsapp_accounts = models.ManyToManyField(
        "whatsapp.WhatsAppAccount",
        blank=True,
        related_name="automation_rules",
    )

    class Meta:
        ordering = ["-priority", "name"]
        indexes = [
            models.Index(fields=["organization", "is_active"]),
        ]

    def __str__(self):
        return f"{self.name} [{self.organization.name}]"

    def matches(self, text: str) -> bool:
        """Returns True if the given text triggers this rule."""
        text_lower = text.lower().strip()
        for kw in self.keywords:
            kw_lower = kw.lower().strip()
            if self.match_type == "contains" and kw_lower in text_lower:
                return True
            elif self.match_type == "exact" and kw_lower == text_lower:
                return True
            elif self.match_type == "starts_with" and text_lower.startswith(kw_lower):
                return True
        return False


class AutomationFlow(TenantModel):
    """
    Multi-step chatbot flow — stored as JSON.
    Each step can have a message and menu options.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    trigger_keyword = models.CharField(
        max_length=100,
        help_text="Keyword that starts this flow (e.g. 'hello', 'start')",
    )
    is_active = models.BooleanField(default=True)
    flow_data = models.JSONField(
        default=dict,
        help_text=(
            "Flow definition. Example: "
            '{"steps": [{"id": "welcome", "message": "Hello!", "options": '
            '[{"text": "1. Products", "next_step": "products"}, '
            '{"text": "2. Support", "next_step": "support"}]}]}'
        ),
    )
    # Track which WhatsApp account this flow is for (optional)
    whatsapp_account = models.ForeignKey(
        "whatsapp.WhatsAppAccount",
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="flows",
    )

    class Meta:
        ordering = ["name"]
        indexes = [
            models.Index(fields=["organization", "is_active"]),
            models.Index(fields=["trigger_keyword"]),
        ]

    def __str__(self):
        return f"Flow: {self.name} (trigger: {self.trigger_keyword})"


class ContactFlowSession(TenantModel):
    """Tracks which step of a flow a contact is currently in."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    contact = models.ForeignKey(
        "whatsapp.Contact",
        on_delete=models.CASCADE,
        related_name="flow_sessions",
    )
    flow = models.ForeignKey(
        AutomationFlow,
        on_delete=models.CASCADE,
        related_name="sessions",
    )
    current_step_id = models.CharField(max_length=100)
    is_complete = models.BooleanField(default=False)

    class Meta:
        unique_together = ("contact", "flow")
        indexes = [models.Index(fields=["contact", "is_complete"])]

    def __str__(self):
        return f"{self.contact} in flow {self.flow.name} @ step {self.current_step_id}"

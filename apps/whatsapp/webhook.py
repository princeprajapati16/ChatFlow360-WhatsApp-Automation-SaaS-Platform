"""
WhatsApp Cloud API Webhook processor.
Parses incoming webhook payloads and routes them to the right handlers.

Flow:
  Meta → POST /api/v1/whatsapp/webhook/ → WebhookView
       → _process_message() → creates Contact + Conversation + Message
       → triggers AutomationEngine
"""
import hashlib
import hmac
import logging

from django.conf import settings
from django.db import transaction

logger = logging.getLogger(__name__)


class WebhookProcessor:
    """
    Processes a single WhatsApp webhook event payload.
    Stateless — can be called from a view or a Celery task.
    """

    def process(self, payload: dict) -> None:
        """Entry point. Payload is the full JSON body from WhatsApp."""
        entry_list = payload.get("entry", [])
        for entry in entry_list:
            for change in entry.get("changes", []):
                value = change.get("value", {})
                self._handle_value(value)

    def _handle_value(self, value: dict) -> None:
        phone_number_id = value.get("metadata", {}).get("phone_number_id")
        if not phone_number_id:
            return

        from apps.whatsapp.models import WhatsAppAccount
        try:
            account = WhatsAppAccount.objects.select_related("organization").get(
                phone_number_id=phone_number_id, is_active=True
            )
        except WhatsAppAccount.DoesNotExist:
            logger.warning("Webhook for unknown phone_number_id: %s", phone_number_id)
            return

        messages = value.get("messages", [])
        for msg_data in messages:
            self._process_message(account, msg_data, value)

        # Handle status updates (delivered/read)
        statuses = value.get("statuses", [])
        for status_data in statuses:
            self._process_status_update(status_data)

    @transaction.atomic
    def _process_message(self, account, msg_data: dict, value: dict) -> None:
        from apps.whatsapp.models import Contact
        from apps.conversations.models import Conversation, Message
        from django.utils import timezone as tz

        wa_msg_id = msg_data.get("id")
        from_phone = msg_data.get("from")
        msg_type = msg_data.get("type", "text")

        # Extract sender name from contacts field if available
        contacts = value.get("contacts", [])
        contact_name = ""
        if contacts:
            contact_name = contacts[0].get("profile", {}).get("name", "")

        # 1. Upsert contact
        contact, _ = Contact.objects.get_or_create(
            organization=account.organization,
            phone_number=from_phone,
            defaults={"name": contact_name},
        )
        if contact_name and not contact.name:
            contact.name = contact_name
            contact.save(update_fields=["name"])

        # 2. Upsert conversation — one thread per (org, contact, whatsapp_account)
        conversation, created = Conversation.objects.get_or_create(
            organization=account.organization,
            contact=contact,
            whatsapp_account=account,
            defaults={"unread_count": 0, "status": Conversation.Status.OPEN},
        )

        # 3. Extract message content
        content = self._extract_content(msg_data, msg_type)

        # 4. Save message (dedup by wa_message_id)
        if not Message.objects.filter(wa_message_id=wa_msg_id).exists():
            message = Message.objects.create(
                organization=account.organization,
                conversation=conversation,
                direction=Message.Direction.INBOUND,
                message_type=msg_type,
                content=content,
                wa_message_id=wa_msg_id,
            )

            # Update conversation metadata
            now = tz.now()
            conversation.last_message_at = now
            conversation.unread_count = (conversation.unread_count or 0) + 1
            conversation.save(update_fields=["last_message_at", "unread_count"])

            # 5. Fire automation engine async (fall back to sync if Celery down)
            try:
                from apps.automation.tasks import process_automation
                process_automation.delay(str(message.id))
            except Exception:
                try:
                    from apps.automation.engine import AutomationEngine
                    AutomationEngine().process(message)
                except Exception as e:
                    logger.error("Automation sync fallback error: %s", e)

    def _extract_content(self, msg_data: dict, msg_type: str) -> str:
        """Extract text representation from different message types."""
        if msg_type == "text":
            return msg_data.get("text", {}).get("body", "")
        elif msg_type == "image":
            return f"[Image] {msg_data.get('image', {}).get('caption', '')}"
        elif msg_type == "audio":
            return "[Audio message]"
        elif msg_type == "video":
            return f"[Video] {msg_data.get('video', {}).get('caption', '')}"
        elif msg_type == "document":
            doc = msg_data.get("document", {})
            return f"[Document: {doc.get('filename', 'file')}]"
        elif msg_type == "location":
            loc = msg_data.get("location", {})
            return f"[Location: {loc.get('latitude')}, {loc.get('longitude')}]"
        elif msg_type == "button":
            return msg_data.get("button", {}).get("text", "[Button reply]")
        elif msg_type == "interactive":
            interactive = msg_data.get("interactive", {})
            if interactive.get("type") == "list_reply":
                return interactive.get("list_reply", {}).get("title", "[List reply]")
            return interactive.get("button_reply", {}).get("title", "[Interactive reply]")
        return f"[{msg_type}]"

    def _process_status_update(self, status_data: dict) -> None:
        """Update message delivery/read status."""
        wa_msg_id = status_data.get("id")
        new_status = status_data.get("status")
        if not wa_msg_id or not new_status:
            return

        from apps.conversations.models import Message
        Message.objects.filter(wa_message_id=wa_msg_id).update(
            delivery_status=new_status
        )


def verify_webhook_signature(payload: bytes, signature: str) -> bool:
    """
    Validates X-Hub-Signature-256 header from WhatsApp.
    payload: raw request body bytes
    signature: value of X-Hub-Signature-256 header
    """
    app_secret = settings.WHATSAPP_APP_SECRET if hasattr(settings, 'WHATSAPP_APP_SECRET') else ""
    if not app_secret:
        return True  # Skip validation in dev
    expected = hmac.new(
        app_secret.encode("utf-8"),
        payload,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected}", signature)

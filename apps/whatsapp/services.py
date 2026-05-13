"""
WhatsApp Cloud API service layer.
Handles sending messages (text, template, media) via Graph API.
"""
import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class WhatsAppService:
    """
    Thin wrapper around the WhatsApp Cloud API.
    Usage:
        svc = WhatsAppService(account)
        svc.send_text(to="+91...", body="Hello!")
    """

    def __init__(self, account):
        """
        :param account: WhatsAppAccount instance
        """
        self.account = account
        self.base_url = (
            f"{settings.WHATSAPP_BASE_URL}"
            f"/{account.phone_number_id}/messages"
        )
        self.headers = {
            "Authorization": f"Bearer {account.access_token}",
            "Content-Type": "application/json",
        }

    def _post(self, payload: dict) -> dict:
        """Makes the actual API request; returns parsed JSON or raises."""
        try:
            resp = requests.post(
                self.base_url,
                json=payload,
                headers=self.headers,
                timeout=15,
            )
            resp.raise_for_status()
            return resp.json()
        except requests.RequestException as exc:
            logger.error("WhatsApp API error: %s | payload=%s", exc, payload)
            raise

    def send_text(self, to: str, body: str) -> dict:
        """Send a plain text message."""
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "text",
            "text": {"preview_url": False, "body": body},
        }
        return self._post(payload)

    def send_template(self, to: str, template_name: str,
                      language_code: str = "en_US",
                      components: list | None = None) -> dict:
        """Send a pre-approved template message."""
        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language_code},
                "components": components or [],
            },
        }
        return self._post(payload)

    def send_image(self, to: str, image_url: str, caption: str = "") -> dict:
        """Send an image message."""
        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "image",
            "image": {"link": image_url, "caption": caption},
        }
        return self._post(payload)

    def mark_as_read(self, message_id: str) -> dict:
        """Mark a message as read (shows blue ticks)."""
        payload = {
            "messaging_product": "whatsapp",
            "status": "read",
            "message_id": message_id,
        }
        return self._post(payload)


def get_service_for_phone_number_id(phone_number_id: str):
    """
    Convenience factory: look up the WhatsAppAccount and return a service.
    Returns None if no matching active account found.
    """
    from apps.whatsapp.models import WhatsAppAccount
    try:
        account = WhatsAppAccount.objects.get(
            phone_number_id=phone_number_id, is_active=True
        )
        return WhatsAppService(account)
    except WhatsAppAccount.DoesNotExist:
        logger.warning("No active WhatsApp account for phone_number_id=%s", phone_number_id)
        return None

"""
Celery tasks for the WhatsApp module.
"""
from celery import shared_task
import logging

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=10)
def process_webhook_payload(self, payload: dict):
    """Process an incoming WhatsApp webhook payload asynchronously."""
    try:
        from apps.whatsapp.webhook import WebhookProcessor
        WebhookProcessor().process(payload)
    except Exception as exc:
        logger.exception("Error processing webhook payload: %s", exc)
        raise self.retry(exc=exc)

"""
Automation Celery tasks.
"""
import logging
from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def process_automation(self, message_id: str):
    """
    Process automation rules/flows for an inbound message.
    Called after webhook creates the Message record.
    """
    from apps.conversations.models import Message
    from apps.automation.engine import AutomationEngine

    try:
        message = Message.objects.select_related(
            "conversation__contact",
            "conversation__whatsapp_account",
            "organization",
        ).get(id=message_id)
    except Message.DoesNotExist:
        logger.warning("Message %s not found for automation processing", message_id)
        return

    if message.direction != Message.Direction.INBOUND:
        return

    try:
        engine = AutomationEngine()
        handled = engine.process(message)
        logger.info(
            "Automation for message %s: handled=%s", message_id, handled
        )
    except Exception as exc:
        logger.exception("Automation processing error for message %s: %s", message_id, exc)
        raise self.retry(exc=exc)

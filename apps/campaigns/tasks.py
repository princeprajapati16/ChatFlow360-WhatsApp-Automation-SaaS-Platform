"""
Celery tasks for campaign broadcast processing.
"""
import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)

BATCH_SIZE = 50  # Send in batches to avoid rate limits


@shared_task(bind=True, max_retries=3)
def send_campaign(self, campaign_id: str):
    """
    Main task: sends a campaign to all pending contacts.
    Processes in batches to respect WhatsApp rate limits.
    """
    from apps.campaigns.models import Campaign, CampaignContact
    from apps.whatsapp.services import WhatsAppService

    try:
        campaign = Campaign.objects.select_related(
            "whatsapp_account"
        ).get(id=campaign_id)
    except Campaign.DoesNotExist:
        logger.error("Campaign %s not found", campaign_id)
        return

    if campaign.status not in (Campaign.Status.SCHEDULED, Campaign.Status.RUNNING):
        logger.warning("Campaign %s is not in a sendable state: %s", campaign_id, campaign.status)
        return

    # Mark as running
    campaign.status = Campaign.Status.RUNNING
    campaign.started_at = timezone.now()
    campaign.save(update_fields=["status", "started_at"])

    svc = WhatsAppService(campaign.whatsapp_account)
    pending = CampaignContact.objects.filter(
        campaign=campaign, status=CampaignContact.DeliveryStatus.PENDING
    ).select_related("contact")

    total_sent = 0
    total_failed = 0

    for cc in pending.iterator(chunk_size=BATCH_SIZE):
        contact = cc.contact

        if contact.is_blocked:
            cc.status = CampaignContact.DeliveryStatus.SKIPPED
            cc.save(update_fields=["status"])
            continue

        try:
            if campaign.message_type == Campaign.MessageType.TEXT:
                result = svc.send_text(to=contact.phone_number, body=campaign.message_content)
            elif campaign.message_type == Campaign.MessageType.TEMPLATE:
                result = svc.send_template(
                    to=contact.phone_number,
                    template_name=campaign.template_name,
                    language_code=campaign.template_language,
                )
            elif campaign.message_type == Campaign.MessageType.IMAGE:
                result = svc.send_image(
                    to=contact.phone_number,
                    image_url=campaign.image_url,
                    caption=campaign.image_caption,
                )
            else:
                result = {}

            wa_msg_id = result.get("messages", [{}])[0].get("id", "")
            cc.status = CampaignContact.DeliveryStatus.SENT
            cc.wa_message_id = wa_msg_id
            cc.sent_at = timezone.now()
            cc.save(update_fields=["status", "wa_message_id", "sent_at"])
            total_sent += 1

        except Exception as exc:
            logger.error("Failed to send to %s: %s", contact.phone_number, exc)
            cc.status = CampaignContact.DeliveryStatus.FAILED
            cc.error_message = str(exc)[:500]
            cc.save(update_fields=["status", "error_message"])
            total_failed += 1

    # Update campaign counters
    campaign.sent_count += total_sent
    campaign.failed_count += total_failed
    remaining = CampaignContact.objects.filter(
        campaign=campaign, status=CampaignContact.DeliveryStatus.PENDING
    ).count()
    if remaining == 0:
        campaign.status = Campaign.Status.COMPLETED
        campaign.completed_at = timezone.now()
    campaign.save(update_fields=["sent_count", "failed_count", "status", "completed_at"])

    logger.info(
        "Campaign %s: sent=%d, failed=%d, remaining=%d",
        campaign_id, total_sent, total_failed, remaining
    )


@shared_task
def schedule_due_campaigns():
    """
    Beat task: runs every minute to kick off campaigns whose scheduled_for has passed.
    Add this to CELERY_BEAT_SCHEDULE in settings.
    """
    from apps.campaigns.models import Campaign
    now = timezone.now()
    due = Campaign.objects.filter(
        status=Campaign.Status.SCHEDULED,
        scheduled_for__lte=now,
    )
    for campaign in due:
        logger.info("Dispatching scheduled campaign: %s", campaign.id)
        send_campaign.delay(str(campaign.id))


@shared_task
def send_lead_reminders():
    """
    Beat task: fires due lead reminders and sends notifications.
    """
    from apps.leads.models import LeadReminder
    now = timezone.now()
    due = LeadReminder.objects.filter(is_sent=False, remind_at__lte=now)
    for reminder in due:
        # Create notification for assigned agent
        from notifications.models import Notification
        Notification.objects.create(
            user=reminder.created_by,
            title=f"Lead Reminder: {reminder.lead}",
            message=reminder.message,
            type=Notification.Type.ALERT,
        )
        reminder.is_sent = True
        reminder.save(update_fields=["is_sent"])

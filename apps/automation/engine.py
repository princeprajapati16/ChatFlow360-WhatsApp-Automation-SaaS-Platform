"""
Automation Engine — processes incoming messages and fires auto-replies.

Processing order:
1. Check if contact is mid-flow → continue flow
2. Check flow trigger keywords → start new flow
3. Check keyword rules → fire matching rule
4. No match → do nothing (conversation stays open for agent)
"""
import logging
from django.db import transaction

logger = logging.getLogger(__name__)


class AutomationEngine:
    """
    Stateless processor that acts on a single inbound message.
    """

    def process(self, message) -> bool:
        """
        Returns True if automation handled the message (sent a reply).
        message: apps.conversations.models.Message instance
        """
        contact = message.conversation.contact
        org = message.organization
        content = message.content.strip()

        # 1. Check active flow session
        if self._continue_flow(contact, org, content, message.conversation):
            return True

        # 2. Check flow trigger keywords
        if self._trigger_flow(contact, org, content, message.conversation):
            return True

        # 3. Check keyword automation rules
        if self._apply_keyword_rule(org, content, message.conversation):
            return True

        return False

    @transaction.atomic
    def _continue_flow(self, contact, org, content, conversation) -> bool:
        from apps.automation.models import ContactFlowSession
        session = ContactFlowSession.objects.filter(
            organization=org, contact=contact, is_complete=False
        ).select_related("flow").first()

        if not session:
            return False

        flow_data = session.flow.flow_data
        steps = {s["id"]: s for s in flow_data.get("steps", [])}
        current = steps.get(session.current_step_id)

        if not current:
            session.is_complete = True
            session.save()
            return False

        # Match user choice to an option
        options = current.get("options", [])
        matched_next = None
        for i, opt in enumerate(options):
            # Match by number or option text
            if content == str(i + 1) or content.lower() == opt.get("text", "").lower():
                matched_next = opt.get("next_step")
                break

        if matched_next and matched_next in steps:
            next_step = steps[matched_next]
            session.current_step_id = matched_next
            # Check if next step is terminal
            if not next_step.get("options"):
                session.is_complete = True
            session.save(update_fields=["current_step_id", "is_complete"])
            self._send_step(next_step, conversation)
        else:
            # Re-send current step prompt
            self._send_step(current, conversation)
        return True

    @transaction.atomic
    def _trigger_flow(self, contact, org, content, conversation) -> bool:
        from apps.automation.models import AutomationFlow, ContactFlowSession
        flow = AutomationFlow.objects.filter(
            organization=org,
            is_active=True,
            trigger_keyword__iexact=content.strip(),
        ).first()

        if not flow:
            return False

        # Start/restart flow session
        session, _ = ContactFlowSession.objects.update_or_create(
            organization=org,
            contact=contact,
            flow=flow,
            defaults={"is_complete": False},
        )
        steps = flow.flow_data.get("steps", [])
        if not steps:
            return False

        first_step = steps[0]
        session.current_step_id = first_step["id"]
        session.save(update_fields=["current_step_id"])
        self._send_step(first_step, conversation)
        return True

    def _apply_keyword_rule(self, org, content, conversation) -> bool:
        from apps.automation.models import AutomationRule
        rules = AutomationRule.objects.filter(
            organization=org, is_active=True
        ).order_by("-priority")

        for rule in rules:
            if rule.matches(content):
                self._send_reply(rule.reply_text, conversation)
                return True
        return False

    def _send_step(self, step: dict, conversation) -> None:
        """Format and send a flow step message."""
        message_parts = [step.get("message", "")]
        options = step.get("options", [])
        if options:
            message_parts.append("")
            for i, opt in enumerate(options):
                message_parts.append(f"{i + 1}. {opt.get('text', '')}")
        reply_text = "\n".join(message_parts)
        self._send_reply(reply_text, conversation)

    def _send_reply(self, text: str, conversation) -> None:
        """Actually sends the reply via WhatsApp API and saves the message."""
        from apps.conversations.models import Message
        from apps.whatsapp.services import WhatsAppService

        try:
            svc = WhatsAppService(conversation.whatsapp_account)
            result = svc.send_text(
                to=conversation.contact.phone_number, body=text
            )
            wa_msg_id = result.get("messages", [{}])[0].get("id")

            Message.objects.create(
                organization=conversation.organization,
                conversation=conversation,
                direction=Message.Direction.OUTBOUND,
                message_type=Message.MessageType.TEXT,
                content=text,
                wa_message_id=wa_msg_id,
            )
            from django.utils import timezone
            conversation.last_message_at = timezone.now()
            conversation.save(update_fields=["last_message_at"])
        except Exception as exc:
            logger.error("Failed to send automation reply: %s", exc)

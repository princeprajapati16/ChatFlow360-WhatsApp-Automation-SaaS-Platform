"""
Team Inbox Views.
"""
import logging

from django.utils import timezone
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.conversations.models import Conversation, Message, ConversationNote
from apps.conversations.serializers import (
    ConversationListSerializer,
    ConversationDetailSerializer,
    MessageSerializer,
    ConversationNoteSerializer,
)
from apps.organizations.permissions import IsOrganizationMember

logger = logging.getLogger(__name__)


class ConversationViewSet(viewsets.ModelViewSet):
    """
    Team inbox: List, filter, search, assign, tag, send messages.
    """
    permission_classes = [IsAuthenticated, IsOrganizationMember]
    filter_backends = [filters.SearchFilter]
    search_fields = [
        "contact__name", "contact__phone_number", "tags",
    ]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return ConversationDetailSerializer
        return ConversationListSerializer

    def get_queryset(self):
        org = getattr(self.request, "organization", None)
        if not org:
            return Conversation.objects.none()

        qs = Conversation.objects.filter(
            organization=org
        ).select_related("contact", "assigned_to", "whatsapp_account")

        # Filter by status
        status_param = self.request.query_params.get("status")
        if status_param:
            qs = qs.filter(status=status_param)

        # Filter by assigned_to
        assigned_param = self.request.query_params.get("assigned_to")
        if assigned_param == "me":
            qs = qs.filter(assigned_to=self.request.user)
        elif assigned_param == "unassigned":
            qs = qs.filter(assigned_to=None)

        return qs

    @action(detail=True, methods=["post"], url_path="assign")
    def assign(self, request, pk=None):
        """Assign or unassign conversation to an agent."""
        conv = self.get_object()
        agent_id = request.data.get("agent_id")
        if agent_id:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            try:
                agent = User.objects.get(id=agent_id)
                conv.assigned_to = agent
                conv.status = Conversation.Status.ASSIGNED
            except User.DoesNotExist:
                return Response({"error": "Agent not found"}, status=status.HTTP_404_NOT_FOUND)
        else:
            conv.assigned_to = None
            conv.status = Conversation.Status.OPEN
        conv.save(update_fields=["assigned_to", "status"])
        return Response(ConversationListSerializer(conv).data)

    @action(detail=True, methods=["post"], url_path="resolve")
    def resolve(self, request, pk=None):
        conv = self.get_object()
        conv.status = Conversation.Status.RESOLVED
        conv.save(update_fields=["status"])
        return Response({"status": conv.status})

    @action(detail=True, methods=["post"], url_path="reopen")
    def reopen(self, request, pk=None):
        conv = self.get_object()
        conv.status = Conversation.Status.OPEN
        conv.save(update_fields=["status"])
        return Response({"status": conv.status})

    @action(detail=True, methods=["post"], url_path="tag")
    def add_tag(self, request, pk=None):
        conv = self.get_object()
        tag = request.data.get("tag")
        if tag and tag not in conv.tags:
            conv.tags.append(tag)
            conv.save(update_fields=["tags"])
        return Response({"tags": conv.tags})

    @action(detail=True, methods=["post"], url_path="mark-read")
    def mark_read(self, request, pk=None):
        conv = self.get_object()
        conv.mark_read()
        return Response({"unread_count": 0})

    @action(detail=True, methods=["get", "post"], url_path="messages")
    def messages(self, request, pk=None):
        conv = self.get_object()
        org = self.request.organization

        if request.method == "GET":
            msgs = conv.messages.order_by("created_at")
            serializer = MessageSerializer(msgs, many=True)
            return Response(serializer.data)

        # POST — send a message
        content = request.data.get("content", "").strip()
        if not content:
            return Response({"error": "content is required"}, status=status.HTTP_400_BAD_REQUEST)

        # Save message
        msg = Message.objects.create(
            organization=org,
            conversation=conv,
            direction=Message.Direction.OUTBOUND,
            message_type=Message.MessageType.TEXT,
            content=content,
            sender=request.user,
        )

        # Actually send via WhatsApp
        from apps.whatsapp.services import WhatsAppService
        try:
            svc = WhatsAppService(conv.whatsapp_account)
            result = svc.send_text(to=conv.contact.phone_number, body=content)
            msg.wa_message_id = result.get("messages", [{}])[0].get("id")
            msg.save(update_fields=["wa_message_id"])
        except Exception as e:
            logger.error("Failed to send WhatsApp message: %s", e)
            msg.delivery_status = Message.DeliveryStatus.FAILED
            msg.save(update_fields=["delivery_status"])

        # Update conversation last_message_at
        conv.last_message_at = timezone.now()
        conv.save(update_fields=["last_message_at"])

        return Response(MessageSerializer(msg).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "post"], url_path="notes")
    def notes(self, request, pk=None):
        conv = self.get_object()
        if request.method == "GET":
            notes = conv.notes.all()
            return Response(ConversationNoteSerializer(notes, many=True).data)

        content = request.data.get("content", "").strip()
        if not content:
            return Response({"error": "content is required"}, status=status.HTTP_400_BAD_REQUEST)
        note = ConversationNote.objects.create(
            organization=self.request.organization,
            conversation=conv,
            author=request.user,
            content=content,
        )
        return Response(
            ConversationNoteSerializer(note).data, status=status.HTTP_201_CREATED
        )

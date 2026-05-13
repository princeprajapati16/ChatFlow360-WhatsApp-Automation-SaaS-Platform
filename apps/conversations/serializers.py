from rest_framework import serializers
from apps.conversations.models import Conversation, Message, ConversationNote
from apps.whatsapp.serializers import ContactSerializer


class MessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id", "conversation", "direction", "message_type",
            "content", "wa_message_id", "sender", "sender_name",
            "delivery_status", "metadata", "created_at",
        ]
        read_only_fields = [
            "id", "wa_message_id", "delivery_status", "created_at",
        ]

    def get_sender_name(self, obj):
        if obj.sender:
            return f"{obj.sender.first_name} {obj.sender.last_name}".strip()
        return None


class ConversationNoteSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = ConversationNote
        fields = ["id", "content", "author", "author_name", "created_at"]
        read_only_fields = ["id", "author", "author_name", "created_at"]

    def get_author_name(self, obj):
        return f"{obj.author.first_name} {obj.author.last_name}".strip()


class ConversationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for conversation list view."""
    contact_name = serializers.CharField(source="contact.name", read_only=True)
    contact_phone = serializers.CharField(source="contact.phone_number", read_only=True)
    assigned_to_name = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    whatsapp_account_name = serializers.CharField(source="whatsapp_account.display_name", read_only=True)
    whatsapp_account_phone = serializers.CharField(source="whatsapp_account.display_phone_number", read_only=True)

    class Meta:
        model = Conversation
        fields = [
            "id", "contact_name", "contact_phone", "status",
            "unread_count", "assigned_to", "assigned_to_name",
            "tags", "last_message", "last_message_at", "created_at",
            "whatsapp_account_name", "whatsapp_account_phone",
        ]

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return f"{obj.assigned_to.first_name} {obj.assigned_to.last_name}".strip()
        return None

    def get_last_message(self, obj):
        msg = obj.messages.order_by("-created_at").first()
        if msg:
            return {"content": msg.content[:100], "direction": msg.direction}
        return None


class ConversationDetailSerializer(ConversationListSerializer):
    """Full serializer including contact details."""
    contact = ContactSerializer(read_only=True)
    messages = MessageSerializer(many=True, read_only=True)
    notes = ConversationNoteSerializer(many=True, read_only=True)

    class Meta(ConversationListSerializer.Meta):
        fields = ConversationListSerializer.Meta.fields + [
            "contact", "messages", "notes", "snoozed_until"
        ]

from django.contrib import admin
from apps.conversations.models import Conversation, Message, ConversationNote


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ["id", "contact", "status", "assigned_to", "unread_count", "last_message_at"]
    list_filter = ["status", "organization"]
    search_fields = ["contact__name", "contact__phone_number"]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ["id", "conversation", "direction", "message_type", "delivery_status", "created_at"]
    list_filter = ["direction", "message_type", "delivery_status"]
    search_fields = ["content", "wa_message_id"]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(ConversationNote)
class ConversationNoteAdmin(admin.ModelAdmin):
    list_display = ["id", "conversation", "author", "created_at"]
    readonly_fields = ["id", "created_at", "updated_at"]

from django.contrib import admin
from conversations.models import Conversation, Message

class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ('role', 'content', 'tokens_used', 'created_at')

@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('id', 'chatbot', 'session_id', 'created_at')
    search_fields = ('session_id', 'chatbot__name')
    inlines = [MessageInline]

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'conversation', 'role', 'tokens_used', 'created_at')
    list_filter = ('role', 'created_at')

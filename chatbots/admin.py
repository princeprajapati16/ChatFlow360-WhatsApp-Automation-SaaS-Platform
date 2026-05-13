from django.contrib import admin
from chatbots.models import Chatbot

@admin.register(Chatbot)
class ChatbotAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'model_version', 'is_active', 'created_at')
    search_fields = ('name', 'user__email')
    list_filter = ('model_version', 'is_active')

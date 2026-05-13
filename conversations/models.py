import uuid
from django.db import models
from chatflow360.models import BaseModel
from chatbots.models import Chatbot

class Conversation(BaseModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    chatbot = models.ForeignKey(
        Chatbot, 
        on_delete=models.CASCADE, 
        related_name="conversations"
    )
    session_id = models.CharField(
        max_length=255, 
        blank=True, 
        help_text="Identifier for anonymous/frontend user session"
    )
    title = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"Conv {self.id} (Bot: {self.chatbot.name})"

class Message(BaseModel):
    class Role(models.TextChoices):
        USER = 'USER', 'User'
        ASSISTANT = 'ASSISTANT', 'Assistant'
        SYSTEM = 'SYSTEM', 'System'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation, 
        on_delete=models.CASCADE, 
        related_name="messages"
    )
    role = models.CharField(max_length=20, choices=Role.choices)
    content = models.TextField()
    
    # Simple token counting logic for analytics
    tokens_used = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Msg {self.id} [{self.role}]"

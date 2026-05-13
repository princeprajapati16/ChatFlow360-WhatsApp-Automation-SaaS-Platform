import uuid
from django.db import models
from django.conf import settings
from chatflow360.models import BaseModel

class Chatbot(BaseModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="chatbots"
    )
    name = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    system_prompt = models.TextField(blank=True, default="You are a helpful assistant.")
    model_version = models.CharField(max_length=50, default="gpt-3.5-turbo")
    
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.user.email})"

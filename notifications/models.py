import uuid
from django.db import models
from django.conf import settings
from chatflow360.models import BaseModel

class Notification(BaseModel):
    class Type(models.TextChoices):
        INFO = 'INFO', 'Info'
        ALERT = 'ALERT', 'Alert'
        SUCCESS = 'SUCCESS', 'Success'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications"
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    type = models.CharField(max_length=20, choices=Type.choices, default=Type.INFO)
    is_read = models.BooleanField(default=False)

    def __str__(self):
        return f"Notification for {self.user.email} - {self.title}"

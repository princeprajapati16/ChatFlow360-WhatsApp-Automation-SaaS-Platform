import uuid
from django.db import models
from django.conf import settings
from chatflow360.models import BaseModel

class PaymentTransaction(BaseModel):
    class Status(models.TextChoices):
        PENDING = 'PENDING', 'Pending'
        COMPLETED = 'COMPLETED', 'Completed'
        FAILED = 'FAILED', 'Failed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="payments"
    )
    stripe_charge_id = models.CharField(max_length=150, blank=True, null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default="USD")
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    
    # Store JSON representation of the stripe checkout for debugging/logs
    metadata = models.JSONField(blank=True, null=True)

    def __str__(self):
        return f"Payment {self.id} - {self.status} (${self.amount})"

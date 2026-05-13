import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from chatflow360.models import BaseModel


class SubscriptionPlan(BaseModel):
    class Type(models.TextChoices):
        FREE       = 'FREE',       'Free'
        STARTER    = 'STARTER',    'Starter'
        PRO        = 'PRO',        'Pro'
        BUSINESS   = 'BUSINESS',   'Business'
        ENTERPRISE = 'ENTERPRISE', 'Enterprise'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name         = models.CharField(max_length=80)
    plan_type    = models.CharField(max_length=20, choices=Type.choices, default=Type.FREE)
    description  = models.TextField(blank=True)

    # Pricing
    price_monthly = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    price_yearly  = models.DecimalField(max_digits=10, decimal_places=2, default=0.00,
                                        help_text="Annual price (total). 0 = not available.")
    stripe_monthly_price_id = models.CharField(max_length=100, blank=True)
    stripe_yearly_price_id  = models.CharField(max_length=100, blank=True)
    razorpay_plan_id        = models.CharField(max_length=100, blank=True)

    # Limits
    max_bots                = models.IntegerField(default=1)
    max_messages_per_month  = models.IntegerField(default=1000,
                                help_text="999999 = unlimited")
    max_team_members        = models.IntegerField(default=1)
    max_campaigns           = models.IntegerField(default=2)
    max_contacts            = models.IntegerField(default=500)

    # Feature flags (store as JSON list of strings)
    features = models.JSONField(default=list, blank=True)

    # Trial
    trial_days = models.IntegerField(default=0)

    # Meta
    is_active  = models.BooleanField(default=True)
    is_popular = models.BooleanField(default=False)
    sort_order = models.IntegerField(default=0)

    class Meta:
        ordering = ['sort_order', 'price_monthly']

    def __str__(self):
        return f"{self.name} (${self.price_monthly}/mo)"

    @property
    def yearly_discount_pct(self):
        if self.price_monthly > 0 and self.price_yearly > 0:
            annual_if_monthly = self.price_monthly * 12
            saved = annual_if_monthly - self.price_yearly
            return round((saved / annual_if_monthly) * 100)
        return 0

    @property
    def price_yearly_per_month(self):
        """Effective monthly cost if billed yearly."""
        if self.price_yearly > 0:
            return round(self.price_yearly / 12, 2)
        return None


class UserSubscription(BaseModel):
    class Status(models.TextChoices):
        ACTIVE    = 'ACTIVE',    'Active'
        TRIALING  = 'TRIALING',  'Trialing'
        CANCELLED = 'CANCELLED', 'Cancelled'
        PAST_DUE  = 'PAST_DUE',  'Past Due'
        EXPIRED   = 'EXPIRED',   'Expired'

    class BillingCycle(models.TextChoices):
        MONTHLY = 'MONTHLY', 'Monthly'
        YEARLY  = 'YEARLY',  'Yearly'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='subscription'
    )
    plan = models.ForeignKey(
        SubscriptionPlan,
        on_delete=models.RESTRICT,
        related_name='subscribers'
    )

    billing_cycle = models.CharField(
        max_length=10, choices=BillingCycle.choices, default=BillingCycle.MONTHLY
    )
    status        = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    auto_renew    = models.BooleanField(default=True)

    # Dates
    start_date       = models.DateTimeField(default=timezone.now)
    end_date         = models.DateTimeField(null=True, blank=True)
    trial_end_date   = models.DateTimeField(null=True, blank=True)
    cancelled_at     = models.DateTimeField(null=True, blank=True)
    next_billing_date = models.DateTimeField(null=True, blank=True)

    # Usage tracking
    bots_created             = models.IntegerField(default=0)
    messages_used_this_month = models.IntegerField(default=0)
    campaigns_created        = models.IntegerField(default=0)
    contacts_count           = models.IntegerField(default=0)

    # Payment gateway refs
    stripe_subscription_id  = models.CharField(max_length=150, blank=True)
    stripe_customer_id      = models.CharField(max_length=150, blank=True)
    razorpay_subscription_id = models.CharField(max_length=150, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} → {self.plan.name} ({self.status})"

    # ── Convenience helpers ─────────────────────────────────
    def can_create_bot(self):
        return self.bots_created < self.plan.max_bots

    def can_send_message(self):
        return self.messages_used_this_month < self.plan.max_messages_per_month

    def is_on_trial(self):
        if self.trial_end_date:
            return timezone.now() < self.trial_end_date
        return False

    def days_until_renewal(self):
        if self.next_billing_date:
            delta = self.next_billing_date - timezone.now()
            return max(delta.days, 0)
        return None

    def current_price(self):
        if self.billing_cycle == self.BillingCycle.YEARLY:
            return self.plan.price_yearly
        return self.plan.price_monthly

    def cancel(self):
        self.status = self.Status.CANCELLED
        self.auto_renew = False
        self.cancelled_at = timezone.now()
        self.save(update_fields=['status', 'auto_renew', 'cancelled_at'])

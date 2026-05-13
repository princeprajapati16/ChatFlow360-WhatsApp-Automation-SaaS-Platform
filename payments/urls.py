from django.urls import path
from payments.views import (
    CreateCheckoutSessionView,
    ConfirmDemoPaymentView,
    StripeWebhookView,
    PaymentHistoryView,
)

urlpatterns = [
    # ── Checkout / Demo ──────────────────────────────────────────────────
    path('checkout/',   CreateCheckoutSessionView.as_view(), name='checkout'),
    path('confirm/',    ConfirmDemoPaymentView.as_view(),    name='payment-confirm'),

    # ── History ──────────────────────────────────────────────────────────
    path('history/',    PaymentHistoryView.as_view(),        name='payment-history'),

    # ── Webhooks ─────────────────────────────────────────────────────────
    path('webhook/',    StripeWebhookView.as_view(),         name='stripe-webhook'),
]

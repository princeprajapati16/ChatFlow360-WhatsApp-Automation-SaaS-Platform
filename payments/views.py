"""
Payment Views — Demo Mode (no real Stripe/Razorpay keys needed)

  POST /api/v1/payments/checkout/    — create a pending transaction, returns payment link
  POST /api/v1/payments/confirm/     — simulate payment success / failure
  GET  /api/v1/payments/history/     — user's full payment history
  POST /api/v1/payments/webhook/     — stripe webhook receiver (stub)
"""
import uuid
import logging
from datetime import timedelta

from django.utils import timezone
from django.conf import settings

from rest_framework.views import APIView
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from subscriptions.models import SubscriptionPlan, UserSubscription
from subscriptions.serializers import UserSubscriptionSerializer
from payments.models import PaymentTransaction
from payments.serializers import PaymentTransactionSerializer

logger = logging.getLogger(__name__)

DEMO_MODE = True  # Set False when real Stripe keys are available


def _provision_subscription(user, plan, billing_cycle, tx):
    """Activate / upgrade the user's subscription after a successful payment."""
    now = timezone.now()

    if billing_cycle == UserSubscription.BillingCycle.YEARLY:
        next_billing = now + timedelta(days=365)
    else:
        next_billing = now + timedelta(days=30)

    trial_end = None
    if plan.trial_days > 0:
        trial_end = now + timedelta(days=plan.trial_days)
        sub_status = UserSubscription.Status.TRIALING
    else:
        sub_status = UserSubscription.Status.ACTIVE

    sub, created = UserSubscription.objects.get_or_create(
        user=user,
        defaults={
            'plan': plan,
            'billing_cycle': billing_cycle,
            'status': sub_status,
            'trial_end_date': trial_end,
            'next_billing_date': next_billing,
            'auto_renew': True,
        }
    )
    if not created:
        sub.plan = plan
        sub.billing_cycle = billing_cycle
        sub.status = sub_status
        sub.trial_end_date = trial_end
        sub.next_billing_date = next_billing
        sub.auto_renew = True
        sub.cancelled_at = None
        sub.save()

    logger.info("Provisioned plan '%s' for user %s (tx=%s)", plan.name, user.email, tx.id)
    return sub


# ── Checkout ─────────────────────────────────────────────────────────────────

class CreateCheckoutSessionView(APIView):
    """
    POST /api/v1/payments/checkout/
    Body: { plan_id, billing_cycle: "MONTHLY"|"YEARLY" }

    In demo mode:
      - Free plan → activate immediately, no payment needed.
      - Paid plan → create PENDING transaction, return a demo checkout_url.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        plan_id      = request.data.get('plan_id')
        billing_cycle = request.data.get('billing_cycle', 'MONTHLY').upper()

        if billing_cycle not in ('MONTHLY', 'YEARLY'):
            billing_cycle = 'MONTHLY'

        if not plan_id:
            return Response({'error': 'plan_id is required.'}, status=400)

        try:
            plan = SubscriptionPlan.objects.get(id=plan_id, is_active=True)
        except SubscriptionPlan.DoesNotExist:
            return Response({'error': 'Plan not found.'}, status=404)

        # FREE plan → instant switch, no payment
        if float(plan.price_monthly) == 0:
            sub, _ = UserSubscription.objects.get_or_create(
                user=request.user,
                defaults={'plan': plan, 'status': UserSubscription.Status.ACTIVE}
            )
            sub.plan = plan
            sub.status = UserSubscription.Status.ACTIVE
            sub.billing_cycle = UserSubscription.BillingCycle.MONTHLY
            sub.next_billing_date = None
            sub.save()
            return Response({
                'success': True,
                'demo': True,
                'plan': plan.name,
                'message': 'Free plan activated.',
            })

        # Determine price
        if billing_cycle == 'YEARLY' and plan.price_yearly > 0:
            amount = float(plan.price_yearly)
        else:
            billing_cycle = 'MONTHLY'
            amount = float(plan.price_monthly)

        # Create pending transaction
        tx = PaymentTransaction.objects.create(
            user=request.user,
            amount=amount,
            currency='USD',
            status=PaymentTransaction.Status.PENDING,
            metadata={
                'plan_id': str(plan.id),
                'plan_name': plan.name,
                'billing_cycle': billing_cycle,
            }
        )

        if DEMO_MODE:
            # Return a frontend-handled demo URL
            return Response({
                'demo': True,
                'transaction_id': str(tx.id),
                'plan_name': plan.name,
                'amount': amount,
                'billing_cycle': billing_cycle,
                'checkout_url': None,   # frontend handles demo modal
            })

        # Real Stripe flow (when keys available)
        try:
            import stripe
            stripe.api_key = settings.STRIPE_SECRET_KEY
            price_id = (plan.stripe_yearly_price_id if billing_cycle == 'YEARLY'
                        else plan.stripe_monthly_price_id)
            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{'price': price_id, 'quantity': 1}],
                mode='subscription',
                success_url=f"{settings.FRONTEND_URL}/billing?success=1&tx={tx.id}",
                cancel_url=f"{settings.FRONTEND_URL}/billing?cancelled=1",
                metadata={'transaction_id': str(tx.id)},
            )
            tx.stripe_charge_id = session.id
            tx.save(update_fields=['stripe_charge_id'])
            return Response({'checkout_url': session.url, 'transaction_id': str(tx.id)})
        except Exception as e:
            logger.error("Stripe error: %s", e)
            return Response({'error': 'Payment gateway error.'}, status=502)


# ── Confirm (Demo) ────────────────────────────────────────────────────────────

class ConfirmDemoPaymentView(APIView):
    """
    POST /api/v1/payments/confirm/
    Body: { transaction_id, action: "success"|"fail" }

    Simulates the payment gateway callback.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        tx_id  = request.data.get('transaction_id')
        action = request.data.get('action', 'success').lower()

        if not tx_id:
            return Response({'error': 'transaction_id required.'}, status=400)

        try:
            tx = PaymentTransaction.objects.get(id=tx_id, user=request.user)
        except PaymentTransaction.DoesNotExist:
            return Response({'error': 'Transaction not found.'}, status=404)

        if tx.status != PaymentTransaction.Status.PENDING:
            return Response({'error': 'Transaction already processed.'}, status=400)

        if action == 'success':
            tx.status = PaymentTransaction.Status.COMPLETED
            tx.stripe_charge_id = f"demo_ch_{uuid.uuid4().hex[:12]}"
            tx.save()

            # Provision the subscription
            plan_id      = tx.metadata.get('plan_id')
            billing_cycle = tx.metadata.get('billing_cycle', 'MONTHLY')
            try:
                plan = SubscriptionPlan.objects.get(id=plan_id)
                sub  = _provision_subscription(request.user, plan, billing_cycle, tx)
                return Response({
                    'success': True,
                    'message': f'Payment successful! {plan.name} plan activated.',
                    'subscription': UserSubscriptionSerializer(sub).data,
                })
            except SubscriptionPlan.DoesNotExist:
                return Response({'error': 'Plan not found for provisioning.'}, status=500)

        else:  # fail
            tx.status = PaymentTransaction.Status.FAILED
            tx.save(update_fields=['status'])
            return Response({
                'success': False,
                'message': 'Payment failed. Please try again.',
            })


# ── Payment History ────────────────────────────────────────────────────────────

class PaymentHistoryView(generics.ListAPIView):
    """GET /api/v1/payments/history/"""
    serializer_class   = PaymentTransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PaymentTransaction.objects.filter(
            user=self.request.user
        ).order_by('-created_at')


# ── Stripe Webhook (stub) ─────────────────────────────────────────────────────

class StripeWebhookView(APIView):
    """POST /api/v1/payments/webhook/ — real Stripe event receiver."""
    permission_classes = [AllowAny]

    def post(self, request):
        payload   = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE', '')
        webhook_secret = getattr(settings, 'STRIPE_WEBHOOK_SECRET', '')

        if webhook_secret:
            try:
                import stripe
                event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
            except Exception as e:
                logger.error("Webhook signature error: %s", e)
                return Response({'error': 'Invalid signature.'}, status=400)
        else:
            # Dev mode — trust event directly
            event = request.data

        event_type = event.get('type', '')

        if event_type == 'checkout.session.completed':
            session = event.get('data', {}).get('object', {})
            tx_id   = session.get('metadata', {}).get('transaction_id')
            if tx_id:
                try:
                    tx = PaymentTransaction.objects.get(id=tx_id, status=PaymentTransaction.Status.PENDING)
                    tx.status = PaymentTransaction.Status.COMPLETED
                    tx.stripe_charge_id = session.get('payment_intent', 'ch_dummy')
                    tx.save()
                    plan_id      = tx.metadata.get('plan_id')
                    billing_cycle = tx.metadata.get('billing_cycle', 'MONTHLY')
                    plan = SubscriptionPlan.objects.get(id=plan_id)
                    _provision_subscription(tx.user, plan, billing_cycle, tx)
                except Exception as e:
                    logger.error("Webhook provisioning error: %s", e)

        elif event_type == 'invoice.payment_failed':
            # Mark subscription as past_due
            customer_id = event.get('data', {}).get('object', {}).get('customer')
            if customer_id:
                UserSubscription.objects.filter(
                    stripe_customer_id=customer_id
                ).update(status=UserSubscription.Status.PAST_DUE)

        return Response(status=200)

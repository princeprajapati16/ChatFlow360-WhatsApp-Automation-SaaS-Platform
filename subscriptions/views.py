"""
Subscription & Payment Views
  POST /api/v1/payments/checkout/         — initiate demo checkout
  POST /api/v1/payments/confirm/          — confirm demo payment (simulate success/fail)
  GET  /api/v1/payments/history/          — user's payment history
  GET  /api/v1/subscriptions/plans/       — list all active plans
  GET  /api/v1/subscriptions/my/          — current subscription
  POST /api/v1/subscriptions/cancel/      — cancel subscription
  POST /api/v1/subscriptions/toggle-renew/ — toggle auto-renew
  POST /api/v1/subscriptions/activate-free/ — activate free plan directly
"""
import uuid
import logging
from datetime import timedelta

from django.utils import timezone
from django.conf import settings

from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from subscriptions.models import SubscriptionPlan, UserSubscription
from subscriptions.serializers import SubscriptionPlanSerializer, UserSubscriptionSerializer
from payments.models import PaymentTransaction
from payments.serializers import PaymentTransactionSerializer

logger = logging.getLogger(__name__)


# ── Plan Listing ──────────────────────────────────────────────────────────────

class SubscriptionPlanListView(generics.ListAPIView):
    """GET /api/v1/subscriptions/plans/ — public, no auth required."""
    serializer_class   = SubscriptionPlanSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        return SubscriptionPlan.objects.filter(is_active=True).order_by('sort_order', 'price_monthly')


# ── My Subscription ───────────────────────────────────────────────────────────

class MySubscriptionView(APIView):
    """GET /api/v1/subscriptions/my/ — retrieve or auto-create Free subscription."""
    permission_classes = [IsAuthenticated]

    def _get_or_create(self, user):
        try:
            return user.subscription
        except UserSubscription.DoesNotExist:
            free = SubscriptionPlan.objects.filter(plan_type='FREE').first()
            if not free:
                free, _ = SubscriptionPlan.objects.get_or_create(
                    plan_type='FREE',
                    defaults={
                        'name': 'Free',
                        'price_monthly': 0,
                        'price_yearly': 0,
                        'max_bots': 1,
                        'max_messages_per_month': 1000,
                        'sort_order': 0,
                        'features': ['1 WhatsApp Number', '1,000 msgs/month', 'Basic Inbox'],
                    }
                )
            return UserSubscription.objects.create(
                user=user,
                plan=free,
                status=UserSubscription.Status.ACTIVE,
                next_billing_date=None,
            )

    def get(self, request):
        sub = self._get_or_create(request.user)
        return Response(UserSubscriptionSerializer(sub).data)

    def delete(self, request):
        """Cancel subscription — downgrade to Free."""
        try:
            sub = request.user.subscription
        except UserSubscription.DoesNotExist:
            return Response({'error': 'No subscription found.'}, status=404)

        free = SubscriptionPlan.objects.filter(plan_type='FREE').first()
        if not free or sub.plan == free:
            return Response({'error': 'Already on Free plan.'}, status=400)

        sub.cancel()
        sub.plan = free
        sub.next_billing_date = None
        sub.save(update_fields=['plan', 'next_billing_date'])
        return Response({'success': True, 'message': 'Subscription cancelled. You are now on the Free plan.'})


# ── Cancel Subscription ───────────────────────────────────────────────────────

class CancelSubscriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            sub = request.user.subscription
        except UserSubscription.DoesNotExist:
            return Response({'error': 'No active subscription.'}, status=404)

        if sub.plan.plan_type == 'FREE':
            return Response({'error': 'Already on Free plan.'}, status=400)

        free = SubscriptionPlan.objects.filter(plan_type='FREE').first()
        sub.cancel()
        if free:
            sub.plan = free
            sub.save(update_fields=['plan'])

        logger.info("User %s cancelled subscription.", request.user.email)
        return Response({'success': True, 'message': 'Subscription cancelled successfully.'})


# ── Toggle Auto-Renew ─────────────────────────────────────────────────────────

class ToggleAutoRenewView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            sub = request.user.subscription
        except UserSubscription.DoesNotExist:
            return Response({'error': 'No subscription found.'}, status=404)

        sub.auto_renew = not sub.auto_renew
        sub.save(update_fields=['auto_renew'])
        state = 'enabled' if sub.auto_renew else 'disabled'
        return Response({'success': True, 'auto_renew': sub.auto_renew, 'message': f'Auto-renew {state}.'})


# ── Subscribe / Upgrade Plan (demo-safe) ─────────────────────────────────────

class SubscribePlanView(APIView):
    """
    POST /api/v1/subscriptions/subscribe/
    Body: { plan_id }
    Instantly provisions the plan — used in demo checkout confirm flow.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        plan_id = request.data.get('plan_id')
        if not plan_id:
            return Response({'error': 'plan_id required.'}, status=400)
        try:
            plan = SubscriptionPlan.objects.get(id=plan_id, is_active=True)
        except SubscriptionPlan.DoesNotExist:
            return Response({'error': 'Plan not found.'}, status=404)

        from datetime import timedelta
        from django.utils import timezone
        now = timezone.now()
        next_bill = now + timedelta(days=30)

        sub, _ = UserSubscription.objects.get_or_create(
            user=request.user,
            defaults={'plan': plan, 'status': UserSubscription.Status.ACTIVE, 'next_billing_date': next_bill}
        )
        sub.plan = plan
        sub.status = UserSubscription.Status.ACTIVE
        sub.auto_renew = True
        sub.next_billing_date = next_bill if plan.price_monthly > 0 else None
        sub.cancelled_at = None
        sub.save()
        return Response({'success': True, 'message': f'Subscribed to {plan.name}.',
                         'subscription': UserSubscriptionSerializer(sub).data})


# ── Activate Free Plan ────────────────────────────────────────────────────────

class ActivateFreePlanView(APIView):
    """POST /api/v1/subscriptions/activate-free/ — immediately switch to Free."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        free = SubscriptionPlan.objects.filter(plan_type='FREE', is_active=True).first()
        if not free:
            return Response({'error': 'Free plan not available.'}, status=404)

        sub, _ = UserSubscription.objects.get_or_create(
            user=request.user,
            defaults={'plan': free, 'status': UserSubscription.Status.ACTIVE}
        )
        sub.plan = free
        sub.status = UserSubscription.Status.ACTIVE
        sub.billing_cycle = UserSubscription.BillingCycle.MONTHLY
        sub.auto_renew = False
        sub.next_billing_date = None
        sub.save()
        return Response({'success': True, 'message': 'Switched to Free plan.'})

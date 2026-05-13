"""
Dashboard API Views
────────────────────
Provides aggregated stats, charts, and module summaries used by the
frontend dashboard. All views are scoped to the current user's
organization (injected by OrganizationMiddleware).

Endpoints
─────────
GET /api/v1/dashboard/stats/            → counts for all modules
GET /api/v1/dashboard/inbound-chart/    → last 7-day daily message counts
GET /api/v1/dashboard/leads/            → lead pipeline list
GET /api/v1/dashboard/conversations/    → recent conversations list
GET /api/v1/dashboard/campaigns/        → campaign summary list
"""

import logging
from datetime import timedelta, datetime

from django.utils import timezone
from django.db.models import Count, Sum, Q
from django.db.models.functions import TruncDate

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

# Legacy admin/user views kept for backward-compat
from users.permissions import IsAdminRole
from django.db.models import Sum
from users.models import User
from subscriptions.models import SubscriptionPlan, UserSubscription
from payments.models import PaymentTransaction

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
#  Legacy Views (kept for /api/v1/dashboard/admin/ and /api/v1/dashboard/user/)
# ─────────────────────────────────────────────────────────────────────────────

class AdminDashboardStatsView(APIView):
    """
    Overview statistics for Admin Panel.
    GET /api/v1/dashboard/admin/
    """
    permission_classes = [IsAuthenticated, IsAdminRole]

    def get(self, request, *args, **kwargs):
        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)

        total_users = User.objects.count()
        new_users_30d = User.objects.filter(created_at__gte=thirty_days_ago).count()

        revenue_30d = PaymentTransaction.objects.filter(
            status=PaymentTransaction.Status.COMPLETED,
            created_at__gte=thirty_days_ago,
        ).aggregate(total=Sum("amount"))["total"] or 0.00

        paid_subs_count = (
            UserSubscription.objects
            .exclude(plan__plan_type=SubscriptionPlan.Type.FREE)
            .filter(is_active=True)
            .count()
        )

        return Response({
            "total_users": total_users,
            "new_users_30_days": new_users_30d,
            "revenue_30_days": revenue_30d,
            "active_paid_subscriptions": paid_subs_count,
        })


class UserDashboardSummaryView(APIView):
    """
    Overview statistics for User Dashboard.
    GET /api/v1/dashboard/user/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        unread_notifications = user.notifications.filter(is_read=False).count()

        sub = getattr(user, "subscription", None)
        sub_info = None
        if sub:
            sub_info = {
                "plan_name": sub.plan.name,
                "plan_type": sub.plan.plan_type,
                "bots_used": sub.bots_created,
                "bots_allowed": sub.plan.max_bots,
                "messages_used": sub.messages_used_this_month,
                "messages_allowed": sub.plan.max_messages_per_month,
            }

        return Response({
            "unread_notifications": unread_notifications,
            "subscription": sub_info,
            "user_email": user.email,
            "user_role": user.role,
        })


# ─────────────────────────────────────────────────────────────────────────────
#  New Dashboard API Views
# ─────────────────────────────────────────────────────────────────────────────

def _get_org(request):
    """Helper: return the current organization or None."""
    return getattr(request, "organization", None)


class DashboardStatsView(APIView):
    """
    GET /api/v1/dashboard/stats/
    Returns aggregate counts for Messages, Conversations, Leads, and Campaigns
    for the authenticated user's organization.

    Sample response:
    {
        "messages": {
            "total": 1240,
            "inbound": 726,
            "outbound": 514,
            "last_30_days": 820
        },
        "conversations": {
            "total": 10,
            "open": 4,
            "resolved": 3,
            "assigned": 2,
            "snoozed": 1
        },
        "leads": {
            "total": 8,
            "new": 2,
            "contacted": 2,
            "interested": 1,
            "negotiation": 1,
            "closed_won": 1,
            "closed_lost": 1
        },
        "campaigns": {
            "total": 3,
            "draft": 1,
            "running": 1,
            "completed": 1
        }
    }
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        from apps.conversations.models import Conversation, Message
        from apps.leads.models import Lead
        from apps.campaigns.models import Campaign

        org = _get_org(request)
        if not org:
            return Response({"error": "Organization context required."}, status=400)

        now = timezone.now()
        thirty_days_ago = now - timedelta(days=30)

        # ── Messages ──────────────────────────────────────────────────────────
        msgs = Message.objects.filter(organization=org)
        total_messages = msgs.count()
        inbound = msgs.filter(direction=Message.Direction.INBOUND).count()
        outbound = msgs.filter(direction=Message.Direction.OUTBOUND).count()
        msgs_30d = msgs.filter(created_at__gte=thirty_days_ago).count()

        # ── Conversations ─────────────────────────────────────────────────────
        convs = Conversation.objects.filter(organization=org)
        conv_by_status = {
            s: convs.filter(status=s).count()
            for s in [
                Conversation.Status.OPEN,
                Conversation.Status.RESOLVED,
                Conversation.Status.ASSIGNED,
                Conversation.Status.SNOOZED,
            ]
        }

        # ── Leads ─────────────────────────────────────────────────────────────
        leads_qs = Lead.objects.filter(organization=org)
        lead_by_stage = {
            s: leads_qs.filter(stage=s).count()
            for s in [
                Lead.Stage.NEW,
                Lead.Stage.CONTACTED,
                Lead.Stage.INTERESTED,
                Lead.Stage.NEGOTIATION,
                Lead.Stage.CLOSED_WON,
                Lead.Stage.CLOSED_LOST,
            ]
        }

        # ── Campaigns ─────────────────────────────────────────────────────────
        camps = Campaign.objects.filter(organization=org)
        camp_by_status = {
            s: camps.filter(status=s).count()
            for s in [
                Campaign.Status.DRAFT,
                Campaign.Status.RUNNING,
                Campaign.Status.COMPLETED,
                Campaign.Status.SCHEDULED,
                Campaign.Status.PAUSED,
            ]
        }

        return Response({
            "messages": {
                "total": total_messages,
                "inbound": inbound,
                "outbound": outbound,
                "last_30_days": msgs_30d,
            },
            "conversations": {
                "total": convs.count(),
                "open": conv_by_status[Conversation.Status.OPEN],
                "resolved": conv_by_status[Conversation.Status.RESOLVED],
                "assigned": conv_by_status[Conversation.Status.ASSIGNED],
                "snoozed": conv_by_status[Conversation.Status.SNOOZED],
            },
            "leads": {
                "total": leads_qs.count(),
                "new": lead_by_stage[Lead.Stage.NEW],
                "contacted": lead_by_stage[Lead.Stage.CONTACTED],
                "interested": lead_by_stage[Lead.Stage.INTERESTED],
                "negotiation": lead_by_stage[Lead.Stage.NEGOTIATION],
                "closed_won": lead_by_stage[Lead.Stage.CLOSED_WON],
                "closed_lost": lead_by_stage[Lead.Stage.CLOSED_LOST],
            },
            "campaigns": {
                "total": camps.count(),
                "draft": camp_by_status[Campaign.Status.DRAFT],
                "running": camp_by_status[Campaign.Status.RUNNING],
                "completed": camp_by_status[Campaign.Status.COMPLETED],
                "scheduled": camp_by_status[Campaign.Status.SCHEDULED],
                "paused": camp_by_status[Campaign.Status.PAUSED],
            },
        })


class InboundChartView(APIView):
    """
    GET /api/v1/dashboard/inbound-chart/
    Returns daily message counts (inbound + outbound) for the last 7 days.

    Query params:
      - days (int, default=7): Number of days to include. Max 90.
      - direction (str, optional): 'INBOUND' | 'OUTBOUND'. Returns both if omitted.

    Sample response:
    {
        "labels": ["2026-04-15", "2026-04-16", ..., "2026-04-21"],
        "inbound":  [34, 28, 42, 37, 51, 19, 11],
        "outbound": [22, 18, 31, 24, 35, 12, 7],
        "total":    [56, 46, 73, 61, 86, 31, 18]
    }
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        from apps.conversations.models import Message

        org = _get_org(request)
        if not org:
            return Response({"error": "Organization context required."}, status=400)

        days = min(int(request.query_params.get("days", 7)), 90)
        now = timezone.now()
        start = now - timedelta(days=days - 1)
        start = start.replace(hour=0, minute=0, second=0, microsecond=0)

        msgs = Message.objects.filter(organization=org, created_at__gte=start)

        # Aggregate by date + direction
        agg = (
            msgs
            .annotate(date=TruncDate("created_at"))
            .values("date", "direction")
            .annotate(count=Count("id"))
            .order_by("date")
        )

        # Build a date-keyed dict for fast lookup
        inbound_map: dict = {}
        outbound_map: dict = {}
        for row in agg:
            d = row["date"].isoformat()
            if row["direction"] == Message.Direction.INBOUND:
                inbound_map[d] = row["count"]
            else:
                outbound_map[d] = row["count"]

        # Fill all days (even zeros)
        labels = []
        inbound_data = []
        outbound_data = []
        total_data = []

        for offset in range(days):
            day = (start + timedelta(days=offset)).date()
            d = day.isoformat()
            labels.append(d)
            i_count = inbound_map.get(d, 0)
            o_count = outbound_map.get(d, 0)
            inbound_data.append(i_count)
            outbound_data.append(o_count)
            total_data.append(i_count + o_count)

        return Response({
            "labels": labels,
            "inbound": inbound_data,
            "outbound": outbound_data,
            "total": total_data,
            "days": days,
        })


class DashboardLeadsView(APIView):
    """
    GET /api/v1/dashboard/leads/
    Returns the lead pipeline list for the current organization.

    Sample response:
    {
        "total": 8,
        "leads": [
            {
                "id": "uuid",
                "title": "Enterprise WhatsApp Integration",
                "contact_name": "Anjali Verma",
                "contact_phone": "+919876543210",
                "stage": "NEW",
                "source": "WHATSAPP",
                "estimated_value": "15000.00",
                "assigned_to_name": "Priya Sharma",
                "tags": ["hot-lead"],
                "created_at": "2026-04-12T09:31:00Z"
            },
            ...
        ]
    }
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        from apps.leads.models import Lead

        org = _get_org(request)
        if not org:
            return Response({"error": "Organization context required."}, status=400)

        stage_filter = request.query_params.get("stage")
        source_filter = request.query_params.get("source")

        leads_qs = Lead.objects.filter(organization=org).select_related(
            "contact", "assigned_to"
        )
        if stage_filter:
            leads_qs = leads_qs.filter(stage=stage_filter.upper())
        if source_filter:
            leads_qs = leads_qs.filter(source=source_filter.upper())

        leads_data = []
        for lead in leads_qs:
            assigned_name = None
            if lead.assigned_to:
                assigned_name = (
                    f"{lead.assigned_to.first_name} {lead.assigned_to.last_name}".strip()
                    or lead.assigned_to.email
                )
            leads_data.append({
                "id": str(lead.id),
                "title": lead.title,
                "contact_name": lead.contact.name or lead.contact.phone_number,
                "contact_phone": lead.contact.phone_number,
                "stage": lead.stage,
                "stage_label": lead.get_stage_display(),
                "source": lead.source,
                "estimated_value": str(lead.estimated_value) if lead.estimated_value else None,
                "assigned_to_name": assigned_name,
                "tags": lead.tags,
                "closed_at": lead.closed_at.isoformat() if lead.closed_at else None,
                "created_at": lead.created_at.isoformat(),
            })

        return Response({"total": len(leads_data), "leads": leads_data})


class DashboardConversationsView(APIView):
    """
    GET /api/v1/dashboard/conversations/
    Returns recent conversations for the current organization.

    Query params:
      - status: OPEN | RESOLVED | ASSIGNED | SNOOZED
      - limit (int, default=10)

    Sample response:
    {
        "total": 10,
        "conversations": [
            {
                "id": "uuid",
                "contact_name": "Ravi Kumar",
                "contact_phone": "+919876543211",
                "status": "OPEN",
                "unread_count": 3,
                "last_message": {"content": "Hi, I'm interested...", "direction": "INBOUND"},
                "last_message_at": "2026-04-21T14:32:00Z",
                "assigned_to_name": null,
                "tags": ["new-customer"],
                "created_at": "2026-04-20T09:10:00Z"
            },
            ...
        ]
    }
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        from apps.conversations.models import Conversation

        org = _get_org(request)
        if not org:
            return Response({"error": "Organization context required."}, status=400)

        status_filter = request.query_params.get("status")
        limit = min(int(request.query_params.get("limit", 10)), 50)

        convs_qs = Conversation.objects.filter(organization=org).select_related(
            "contact", "assigned_to"
        ).order_by("-last_message_at")

        if status_filter:
            convs_qs = convs_qs.filter(status=status_filter.upper())

        convs_qs = convs_qs[:limit]

        result = []
        for conv in convs_qs:
            assigned_name = None
            if conv.assigned_to:
                assigned_name = (
                    f"{conv.assigned_to.first_name} {conv.assigned_to.last_name}".strip()
                    or conv.assigned_to.email
                )

            last_msg = conv.messages.order_by("-created_at").first()
            result.append({
                "id": str(conv.id),
                "contact_name": conv.contact.name or conv.contact.phone_number,
                "contact_phone": conv.contact.phone_number,
                "status": conv.status,
                "unread_count": conv.unread_count,
                "last_message": (
                    {"content": last_msg.content[:120], "direction": last_msg.direction}
                    if last_msg
                    else None
                ),
                "last_message_at": (
                    conv.last_message_at.isoformat() if conv.last_message_at else None
                ),
                "assigned_to_name": assigned_name,
                "tags": conv.tags,
                "created_at": conv.created_at.isoformat(),
            })

        return Response({
            "total": Conversation.objects.filter(organization=org).count(),
            "conversations": result,
        })


class DashboardCampaignsView(APIView):
    """
    GET /api/v1/dashboard/campaigns/
    Returns a campaign summary list for the current organization.

    Sample response:
    {
        "total": 3,
        "campaigns": [
            {
                "id": "uuid",
                "name": "Summer Flash Sale 2026",
                "status": "COMPLETED",
                "total_recipients": 200,
                "sent_count": 200,
                "delivered_count": 191,
                "read_count": 124,
                "replied_count": 22,
                "failed_count": 9,
                "delivery_rate": 95.5,
                "read_rate": 64.9,
                "started_at": "2026-04-15T10:00:00Z",
                "completed_at": "2026-04-15T13:45:00Z"
            },
            ...
        ]
    }
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        from apps.campaigns.models import Campaign

        org = _get_org(request)
        if not org:
            return Response({"error": "Organization context required."}, status=400)

        status_filter = request.query_params.get("status")
        camps_qs = Campaign.objects.filter(organization=org).order_by("-created_at")

        if status_filter:
            camps_qs = camps_qs.filter(status=status_filter.upper())

        result = []
        for camp in camps_qs:
            result.append({
                "id": str(camp.id),
                "name": camp.name,
                "description": camp.description,
                "message_type": camp.message_type,
                "status": camp.status,
                "total_recipients": camp.total_recipients,
                "sent_count": camp.sent_count,
                "delivered_count": camp.delivered_count,
                "read_count": camp.read_count,
                "replied_count": camp.replied_count,
                "failed_count": camp.failed_count,
                "delivery_rate": camp.delivery_rate,
                "read_rate": camp.read_rate,
                "scheduled_for": camp.scheduled_for.isoformat() if camp.scheduled_for else None,
                "started_at": camp.started_at.isoformat() if camp.started_at else None,
                "completed_at": camp.completed_at.isoformat() if camp.completed_at else None,
                "created_at": camp.created_at.isoformat(),
            })

        return Response({"total": camps_qs.count(), "campaigns": result})

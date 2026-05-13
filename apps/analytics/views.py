"""
Analytics views.
All computed on-the-fly from existing data (no separate analytics models needed).
Use Redis caching for expensive queries.
"""
from datetime import timedelta

from django.utils import timezone
from django.db.models import Count, Q, Avg
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.conversations.models import Conversation, Message
from apps.leads.models import Lead
from apps.campaigns.models import Campaign
from apps.organizations.permissions import IsOrganizationMember


CACHE_TTL = 300  # 5 minutes


class DashboardAnalyticsView(APIView):
    """
    Main dashboard analytics: KPIs, trends, agent performance.
    """
    permission_classes = [IsAuthenticated, IsOrganizationMember]

    def get(self, request):
        org = request.organization
        cache_key = f"analytics:dashboard:{org.id}"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        now = timezone.now()
        last_30d = now - timedelta(days=30)
        last_7d = now - timedelta(days=7)

        # ── Messages ──────────────────────────────────────────
        total_messages = Message.objects.filter(organization=org).count()
        messages_30d = Message.objects.filter(
            organization=org, created_at__gte=last_30d
        ).count()
        inbound_30d = Message.objects.filter(
            organization=org, created_at__gte=last_30d,
            direction=Message.Direction.INBOUND
        ).count()
        outbound_30d = messages_30d - inbound_30d

        # ── Conversations ─────────────────────────────────────
        total_conversations = Conversation.objects.filter(organization=org).count()
        open_conversations = Conversation.objects.filter(
            organization=org, status=Conversation.Status.OPEN
        ).count()
        resolved_30d = Conversation.objects.filter(
            organization=org, status=Conversation.Status.RESOLVED,
            updated_at__gte=last_30d
        ).count()

        # ── Leads ─────────────────────────────────────────────
        total_leads = Lead.objects.filter(organization=org).count()
        leads_by_stage = list(
            Lead.objects.filter(organization=org)
            .values("stage")
            .annotate(count=Count("id"))
            .order_by("stage")
        )
        closed_won = Lead.objects.filter(
            organization=org, stage=Lead.Stage.CLOSED_WON
        ).count()
        conversion_rate = round(closed_won / total_leads * 100, 1) if total_leads else 0

        # ── Campaigns ─────────────────────────────────────────
        campaigns_30d = Campaign.objects.filter(
            organization=org, created_at__gte=last_30d
        ).count()
        completed_campaigns = Campaign.objects.filter(
            organization=org, status=Campaign.Status.COMPLETED
        ).count()

        # ── Agent Performance ─────────────────────────────────
        agent_stats = list(
            Conversation.objects.filter(
                organization=org,
                assigned_to__isnull=False,
                updated_at__gte=last_30d,
            )
            .values("assigned_to__email", "assigned_to__first_name", "assigned_to__last_name")
            .annotate(
                total_assigned=Count("id"),
                resolved=Count("id", filter=Q(status=Conversation.Status.RESOLVED)),
            )
            .order_by("-total_assigned")[:10]
        )

        # ── Daily message trend (last 7 days) ─────────────────
        daily_trend = []
        for i in range(7):
            day = (now - timedelta(days=6 - i)).date()
            count = Message.objects.filter(
                organization=org,
                created_at__date=day,
                direction=Message.Direction.INBOUND,
            ).count()
            daily_trend.append({"date": str(day), "messages": count})

        data = {
            "messages": {
                "total": total_messages,
                "last_30_days": messages_30d,
                "inbound_30d": inbound_30d,
                "outbound_30d": outbound_30d,
            },
            "conversations": {
                "total": total_conversations,
                "open": open_conversations,
                "resolved_30d": resolved_30d,
            },
            "leads": {
                "total": total_leads,
                "by_stage": leads_by_stage,
                "conversion_rate": conversion_rate,
            },
            "campaigns": {
                "total_30d": campaigns_30d,
                "completed": completed_campaigns,
            },
            "agent_performance": agent_stats,
            "daily_message_trend": daily_trend,
        }

        cache.set(cache_key, data, CACHE_TTL)
        return Response(data)


class CampaignAnalyticsView(APIView):
    """Per-campaign analytics."""
    permission_classes = [IsAuthenticated, IsOrganizationMember]

    def get(self, request, campaign_id):
        org = request.organization
        try:
            campaign = Campaign.objects.get(id=campaign_id, organization=org)
        except Campaign.DoesNotExist:
            return Response({"error": "Campaign not found"}, status=404)

        from apps.campaigns.models import CampaignContact
        status_breakdown = list(
            CampaignContact.objects.filter(campaign=campaign)
            .values("status")
            .annotate(count=Count("id"))
            .order_by("status")
        )

        return Response({
            "id": campaign.id,
            "name": campaign.name,
            "status": campaign.status,
            "total_recipients": campaign.total_recipients,
            "sent_count": campaign.sent_count,
            "delivered_count": campaign.delivered_count,
            "read_count": campaign.read_count,
            "failed_count": campaign.failed_count,
            "delivery_rate": campaign.delivery_rate,
            "read_rate": campaign.read_rate,
            "contact_status_breakdown": status_breakdown,
        })

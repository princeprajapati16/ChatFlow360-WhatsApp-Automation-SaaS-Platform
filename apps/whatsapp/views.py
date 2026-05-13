"""
WhatsApp Views:
  - WebhookView: receives WhatsApp Cloud API events (GET=verify, POST=messages)
  - WhatsAppConfigView: GET/DELETE for the org's WhatsApp connection
  - WhatsAppConnectView: saves credentials + tests connection via Meta API
  - WhatsAppDemoConnectView: creates a demo/test connection without calling Meta API
  - WhatsAppStatusView: GET connection status
  - WhatsAppTestConnectionView: POST to ping Meta API and verify token
  - WhatsAppAnalyticsView: GET per-account message + conversation stats
  - WhatsAppAccountViewSet: full CRUD (for admin)
  - ContactViewSet: manage contacts
  - AutoReplyViewSet: CRUD for simple keyword auto-reply rules
"""
import logging
import secrets
import requests

from django.conf import settings
from django.utils import timezone
from django.db.models import Count, Q

from rest_framework import viewsets, status, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.views import APIView

from apps.whatsapp.models import WhatsAppAccount, Contact
from apps.whatsapp.serializers import (
    WhatsAppAccountSerializer,
    WhatsAppAccountWriteSerializer,
    ContactSerializer,
)
from apps.whatsapp.webhook import WebhookProcessor, verify_webhook_signature
from apps.whatsapp.services import WhatsAppService
from apps.organizations.permissions import IsOrganizationMember, IsBusinessAdmin
from apps.automation.models import AutomationRule
from apps.automation.serializers import AutomationRuleSerializer

logger = logging.getLogger(__name__)


# ── Webhook ───────────────────────────────────────────────────────────────────

class WebhookView(APIView):
    """
    GET  — verification handshake from Meta
           Checks verify_token against WHATSAPP_VERIFY_TOKEN setting AND
           any connected WhatsAppAccount.webhook_verify_token.
    POST — incoming events from WhatsApp Cloud API
    """
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        mode = request.query_params.get("hub.mode")
        token = request.query_params.get("hub.verify_token")
        challenge = request.query_params.get("hub.challenge")

        # Check global verify token
        global_token = getattr(settings, "WHATSAPP_VERIFY_TOKEN", "")
        token_ok = (mode == "subscribe") and (
            token == global_token or
            WhatsAppAccount.objects.filter(
                webhook_verify_token=token, is_active=True
            ).exists()
        )

        if token_ok:
            logger.info("WhatsApp webhook verified (token=%s)", token)
            from django.http import HttpResponse
            return HttpResponse(challenge, content_type="text/plain", status=200)
        return Response({"error": "Verification failed"}, status=status.HTTP_403_FORBIDDEN)

    def post(self, request):
        sig = request.headers.get("X-Hub-Signature-256", "")
        if not verify_webhook_signature(request.body, sig):
            return Response({"error": "Invalid signature"}, status=status.HTTP_403_FORBIDDEN)

        payload = request.data
        if payload.get("object") != "whatsapp_business_account":
            return Response(status=status.HTTP_200_OK)

        # Try async via Celery; fall back to sync if Celery not available
        try:
            from apps.whatsapp.tasks import process_webhook_payload
            process_webhook_payload.delay(payload)
        except Exception:
            try:
                WebhookProcessor().process(payload)
            except Exception as e:
                logger.error("Webhook sync processing error: %s", e)

        return Response(status=status.HTTP_200_OK)


# ── WhatsApp Config (per-org, single connection) ──────────────────────────────

class WhatsAppConfigView(APIView):
    """
    GET /api/v1/whatsapp/config/
        Returns the org's connected WhatsApp account (masked token) or 404.
    DELETE /api/v1/whatsapp/disconnect/
        Deactivate the org's WhatsApp connection.
    """
    permission_classes = [IsAuthenticated, IsOrganizationMember]

    def _get_account(self, request):
        org = getattr(request, "organization", None)
        if not org:
            return None
        return WhatsAppAccount.objects.filter(
            organization=org, is_active=True
        ).first()

    def get(self, request):
        account = self._get_account(request)
        if not account:
            return Response({"connected": False, "account": None})
        data = WhatsAppAccountSerializer(account).data
        data["connected"] = True
        return Response(data)

    def delete(self, request):
        account = self._get_account(request)
        if not account:
            return Response({"message": "No connection to disconnect."})
        account.is_active = False
        account.connected_at = None
        account.save(update_fields=["is_active", "connected_at", "updated_at"])
        return Response({"message": "WhatsApp number disconnected successfully."})


# ── WhatsApp Status ───────────────────────────────────────────────────────────

class WhatsAppStatusView(APIView):
    """
    GET /api/v1/whatsapp/status/
    Returns brief connection status for the current org.
    """
    permission_classes = [IsAuthenticated, IsOrganizationMember]

    def get(self, request):
        org = getattr(request, "organization", None)
        if not org:
            return Response({"connected": False})
        account = WhatsAppAccount.objects.filter(
            organization=org, is_active=True
        ).first()
        if not account:
            return Response({"connected": False})
        return Response({
            "connected": True,
            "phone_number_id": account.phone_number_id,
            "display_phone_number": account.display_phone_number,
            "display_name": account.display_name,
            "connected_at": account.connected_at,
        })


# ── WhatsApp Connect ──────────────────────────────────────────────────────────

class WhatsAppConnectView(APIView):
    """
    POST /api/v1/whatsapp/connect/
    Body: {display_name, phone_number_id, whatsapp_business_account_id,
           access_token, webhook_verify_token, display_phone_number}
    - Deactivates any existing connection for the org
    - Creates new WhatsAppAccount
    - Tests connection against Meta Graph API
    """
    permission_classes = [IsAuthenticated, IsOrganizationMember]

    def post(self, request):
        org = getattr(request, "organization", None)
        if not org:
            return Response(
                {"error": "No organization context."},
                status=status.HTTP_400_BAD_REQUEST
            )

        phone_number_id = (request.data.get("phone_number_id") or "").strip()
        access_token = (request.data.get("access_token") or "").strip()
        waba_id = (request.data.get("whatsapp_business_account_id") or "").strip()
        display_name = (request.data.get("display_name") or "My WhatsApp").strip()
        webhook_verify_token = (request.data.get("webhook_verify_token") or "").strip()
        display_phone_number = (request.data.get("display_phone_number") or "").strip()

        if not phone_number_id or not access_token:
            return Response(
                {"error": "phone_number_id and access_token are required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ── Test connection via Meta Graph API ────────────────────────────────
        connection_status = "connected"
        meta_error = None
        phone_info = {}
        try:
            url = f"{settings.WHATSAPP_BASE_URL}/{phone_number_id}"
            resp = requests.get(
                url,
                headers={"Authorization": f"Bearer {access_token}"},
                timeout=10,
            )
            if resp.ok:
                phone_info = resp.json()
                connection_status = "connected"
                # Use verified display name / number from Meta if available
                if not display_phone_number and phone_info.get("display_phone_number"):
                    display_phone_number = phone_info["display_phone_number"]
                if phone_info.get("verified_name"):
                    display_name = phone_info["verified_name"]
            else:
                err_data = resp.json() if resp.content else {}
                meta_error = (
                    err_data.get("error", {}).get("message")
                    or f"Meta API error {resp.status_code}"
                )
                connection_status = "failed"
        except requests.RequestException as e:
            meta_error = f"Could not reach Meta API: {e}"
            connection_status = "failed"

        if connection_status == "failed":
            return Response({
                "connected": False,
                "error": meta_error or "Meta API verification failed. Check your credentials.",
            }, status=status.HTTP_400_BAD_REQUEST)

        # ── Deactivate existing connections for this org ───────────────────────
        WhatsAppAccount.objects.filter(organization=org).update(is_active=False)

        # ── Also deactivate if phone_number_id already used by another org ────
        WhatsAppAccount.objects.filter(
            phone_number_id=phone_number_id
        ).update(is_active=False)

        # ── Create new account ────────────────────────────────────────────────
        account = WhatsAppAccount.objects.create(
            organization=org,
            display_name=display_name,
            phone_number_id=phone_number_id,
            display_phone_number=display_phone_number,
            whatsapp_business_account_id=waba_id,
            access_token=access_token,
            webhook_verify_token=webhook_verify_token,
            is_active=True,
            connected_at=timezone.now(),
        )

        # ── Build webhook URL ─────────────────────────────────────────────────
        backend_url = getattr(settings, "BACKEND_URL", "http://localhost:8000")
        webhook_url = f"{backend_url}/api/v1/whatsapp/webhook/"

        serializer_data = WhatsAppAccountSerializer(account).data
        serializer_data["connected"] = True
        serializer_data["webhook_url"] = webhook_url

        return Response(serializer_data, status=status.HTTP_201_CREATED)


# ── WhatsApp Test Connection ──────────────────────────────────────────────────

class WhatsAppTestConnectionView(APIView):
    """
    POST /api/v1/whatsapp/test-connection/
    Pings Meta Graph API for the org's connected phone number and returns
    live status, quality rating, etc.
    """
    permission_classes = [IsAuthenticated, IsOrganizationMember]

    def post(self, request):
        org = getattr(request, "organization", None)
        if not org:
            return Response({"error": "No organization context."}, status=status.HTTP_400_BAD_REQUEST)

        account = WhatsAppAccount.objects.filter(organization=org, is_active=True).first()
        if not account:
            return Response({"error": "No WhatsApp number connected."}, status=status.HTTP_404_NOT_FOUND)

        try:
            url = f"{settings.WHATSAPP_BASE_URL}/{account.phone_number_id}"
            resp = requests.get(
                url,
                headers={"Authorization": f"Bearer {account.access_token}"},
                timeout=10,
            )
            if resp.ok:
                data = resp.json()
                return Response({
                    "success": True,
                    "phone_number_id": data.get("id"),
                    "display_phone_number": data.get("display_phone_number"),
                    "verified_name": data.get("verified_name"),
                    "quality_rating": data.get("quality_rating"),
                    "code_verification_status": data.get("code_verification_status"),
                    "platform_type": data.get("platform_type"),
                })
            else:
                err_data = resp.json() if resp.content else {}
                meta_error = err_data.get("error", {}).get("message", f"HTTP {resp.status_code}")
                return Response({
                    "success": False,
                    "error": meta_error,
                }, status=status.HTTP_400_BAD_REQUEST)
        except requests.RequestException as e:
            return Response({
                "success": False,
                "error": f"Could not reach Meta API: {e}",
            }, status=status.HTTP_503_SERVICE_UNAVAILABLE)


# ── Generate Verify Token ─────────────────────────────────────────────────────

class WhatsAppGenerateTokenView(APIView):
    """
    POST /api/v1/whatsapp/generate-token/
    Generates a random secure webhook verify token.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = f"cf360_{secrets.token_urlsafe(24)}"
        return Response({"verify_token": token})


# ── Demo / Test Connection ────────────────────────────────────────────────────

class WhatsAppDemoConnectView(APIView):
    """
    POST /api/v1/whatsapp/connect-demo/
    Creates a demo WhatsApp connection without calling the Meta API.
    Useful for local development and testing.
    Body (all optional): {display_name, display_phone_number}
    """
    permission_classes = [IsAuthenticated, IsOrganizationMember]

    def post(self, request):
        org = getattr(request, "organization", None)
        if not org:
            return Response(
                {"error": "No organization context."},
                status=status.HTTP_400_BAD_REQUEST
            )

        display_name = (request.data.get("display_name") or "Demo Business").strip()
        display_phone_number = (request.data.get("display_phone_number") or "+91 98765 43210").strip()

        # Generate realistic-looking demo credentials
        demo_phone_id = f"demo_{secrets.token_hex(8)}"
        demo_token = f"EAADemo{secrets.token_urlsafe(32)}"
        demo_waba_id = f"demo_waba_{secrets.token_hex(6)}"
        demo_verify_token = f"cf360_demo_{secrets.token_urlsafe(16)}"

        # Deactivate existing connections for this org
        WhatsAppAccount.objects.filter(organization=org).update(is_active=False)

        # Create the demo account
        account = WhatsAppAccount.objects.create(
            organization=org,
            display_name=display_name,
            phone_number_id=demo_phone_id,
            display_phone_number=display_phone_number,
            whatsapp_business_account_id=demo_waba_id,
            access_token=demo_token,
            webhook_verify_token=demo_verify_token,
            is_active=True,
            connected_at=timezone.now(),
        )

        backend_url = getattr(settings, "BACKEND_URL", "http://localhost:8000")
        webhook_url = f"{backend_url}/api/v1/whatsapp/webhook/"

        serializer_data = WhatsAppAccountSerializer(account).data
        serializer_data["connected"] = True
        serializer_data["webhook_url"] = webhook_url
        serializer_data["demo_mode"] = True

        logger.info("Demo WhatsApp connection created for org=%s", org.id)
        return Response(serializer_data, status=status.HTTP_201_CREATED)


# ── WhatsApp Analytics ────────────────────────────────────────────────────────

class WhatsAppAnalyticsView(APIView):
    """
    GET /api/v1/whatsapp/analytics/
    Returns per-account WhatsApp statistics for the dashboard.
    """
    permission_classes = [IsAuthenticated, IsOrganizationMember]

    def get(self, request):
        from datetime import timedelta
        from apps.conversations.models import Conversation, Message

        org = getattr(request, "organization", None)
        if not org:
            return Response({"error": "No organization context."}, status=status.HTTP_400_BAD_REQUEST)

        now = timezone.now()
        last_30d = now - timedelta(days=30)
        last_7d = now - timedelta(days=7)

        accounts = WhatsAppAccount.objects.filter(organization=org)
        active_account = accounts.filter(is_active=True).first()

        # Overall message stats
        total_inbound = Message.objects.filter(
            organization=org, direction="INBOUND"
        ).count()
        total_outbound = Message.objects.filter(
            organization=org, direction="OUTBOUND"
        ).count()
        inbound_30d = Message.objects.filter(
            organization=org, direction="INBOUND", created_at__gte=last_30d
        ).count()
        outbound_30d = Message.objects.filter(
            organization=org, direction="OUTBOUND", created_at__gte=last_30d
        ).count()

        # Conversation stats
        total_conversations = Conversation.objects.filter(organization=org).count()
        open_conversations = Conversation.objects.filter(
            organization=org, status=Conversation.Status.OPEN
        ).count()
        resolved_30d = Conversation.objects.filter(
            organization=org,
            status=Conversation.Status.RESOLVED,
            updated_at__gte=last_30d,
        ).count()

        # Contact stats
        total_contacts = Contact.objects.filter(organization=org).count()
        active_contacts_30d = Contact.objects.filter(
            organization=org,
            conversations__last_message_at__gte=last_30d,
        ).distinct().count()

        # Daily trend (last 7 days)
        daily_trend = []
        for i in range(7):
            day = (now - timedelta(days=6 - i)).date()
            inbound = Message.objects.filter(
                organization=org,
                created_at__date=day,
                direction="INBOUND",
            ).count()
            outbound = Message.objects.filter(
                organization=org,
                created_at__date=day,
                direction="OUTBOUND",
            ).count()
            daily_trend.append({
                "date": str(day),
                "inbound": inbound,
                "outbound": outbound,
            })

        return Response({
            "connection": {
                "connected": active_account is not None,
                "display_name": active_account.display_name if active_account else None,
                "display_phone_number": active_account.display_phone_number if active_account else None,
                "phone_number_id": active_account.phone_number_id if active_account else None,
                "connected_at": active_account.connected_at if active_account else None,
                "total_accounts": accounts.count(),
            },
            "messages": {
                "total_inbound": total_inbound,
                "total_outbound": total_outbound,
                "inbound_30d": inbound_30d,
                "outbound_30d": outbound_30d,
            },
            "conversations": {
                "total": total_conversations,
                "open": open_conversations,
                "resolved_30d": resolved_30d,
            },
            "contacts": {
                "total": total_contacts,
                "active_30d": active_contacts_30d,
            },
            "daily_trend": daily_trend,
        })


# ── Auto-Reply Rules (simplified interface on top of AutomationRule) ───────────

class AutoReplyViewSet(viewsets.ModelViewSet):
    """
    GET  /api/v1/whatsapp/auto-replies/           → list rules for org
    POST /api/v1/whatsapp/auto-replies/           → create rule
    PATCH /api/v1/whatsapp/auto-replies/<id>/     → update / toggle
    DELETE /api/v1/whatsapp/auto-replies/<id>/   → delete

    Maps directly to AutomationRule but with a simpler payload:
    {name, keyword, match_type, reply_text, is_active}
    """
    serializer_class = AutomationRuleSerializer
    permission_classes = [IsAuthenticated, IsOrganizationMember]
    filterset_fields = ["is_active"]

    def get_queryset(self):
        org = getattr(self.request, "organization", None)
        if not org:
            return AutomationRule.objects.none()
        return AutomationRule.objects.filter(organization=org).order_by("-priority", "name")

    def perform_create(self, serializer):
        # Single-keyword shortcut: accept 'keyword' field and wrap into list
        keyword = self.request.data.get("keyword")
        keywords = serializer.validated_data.get("keywords", [])
        if keyword and not keywords:
            keywords = [keyword]
        serializer.save(organization=self.request.organization, keywords=keywords)

    def perform_update(self, serializer):
        keyword = self.request.data.get("keyword")
        keywords = serializer.validated_data.get("keywords")
        if keyword and not keywords:
            keywords = [keyword]
        if keywords is not None:
            serializer.save(keywords=keywords)
        else:
            serializer.save()

    @action(detail=True, methods=["patch"], url_path="toggle")
    def toggle(self, request, pk=None):
        rule = self.get_object()
        rule.is_active = not rule.is_active
        rule.save(update_fields=["is_active", "updated_at"])
        return Response({"id": str(rule.id), "is_active": rule.is_active})


# ── WhatsApp Account ViewSet (admin CRUD) ─────────────────────────────────────

class WhatsAppAccountViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsOrganizationMember]

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return WhatsAppAccountWriteSerializer
        return WhatsAppAccountSerializer

    def get_queryset(self):
        if not getattr(self.request, "organization", None):
            return WhatsAppAccount.objects.none()
        return WhatsAppAccount.objects.filter(organization=self.request.organization)

    def perform_create(self, serializer):
        serializer.save(organization=self.request.organization)

    @action(detail=True, methods=["post"], url_path="send-test")
    def send_test_message(self, request, pk=None):
        account = self.get_object()
        to = request.data.get("to")
        if not to:
            return Response({"error": "to is required"}, status=status.HTTP_400_BAD_REQUEST)
        svc = WhatsAppService(account)
        result = svc.send_text(to=to, body="👋 WhatsApp connection test from ChatFlow360!")
        return Response(result)


# ── Contact ViewSet ───────────────────────────────────────────────────────────

class ContactViewSet(viewsets.ModelViewSet):
    serializer_class = ContactSerializer
    permission_classes = [IsAuthenticated, IsOrganizationMember]
    search_fields = ["name", "phone_number", "email"]
    filterset_fields = ["is_blocked"]

    def get_queryset(self):
        if not getattr(self.request, "organization", None):
            return Contact.objects.none()
        return Contact.objects.filter(organization=self.request.organization)

    def perform_create(self, serializer):
        serializer.save(organization=self.request.organization)

    @action(detail=True, methods=["post"], url_path="block")
    def block_contact(self, request, pk=None):
        contact = self.get_object()
        contact.is_blocked = not contact.is_blocked
        contact.save(update_fields=["is_blocked"])
        return Response({"is_blocked": contact.is_blocked})

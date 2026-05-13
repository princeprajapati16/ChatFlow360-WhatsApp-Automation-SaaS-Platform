"""
Automation views — CRUD + toggle + activity log.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone

from apps.automation.models import AutomationRule, AutomationFlow
from apps.automation.serializers import AutomationRuleSerializer, AutomationFlowSerializer
from apps.organizations.permissions import IsOrganizationMember


class AutomationRuleViewSet(viewsets.ModelViewSet):
    serializer_class = AutomationRuleSerializer
    permission_classes = [IsAuthenticated, IsOrganizationMember]
    filterset_fields = ["is_active"]
    search_fields = ["name"]

    def get_queryset(self):
        org = getattr(self.request, "organization", None)
        if not org:
            return AutomationRule.objects.none()
        return AutomationRule.objects.filter(organization=org).order_by("-priority", "name")

    def perform_create(self, serializer):
        serializer.save(organization=self.request.organization)

    @action(detail=True, methods=["patch"], url_path="toggle")
    def toggle(self, request, pk=None):
        """PATCH /automation/rules/<id>/toggle/ — flip is_active"""
        rule = self.get_object()
        rule.is_active = not rule.is_active
        rule.save(update_fields=["is_active", "updated_at"])
        return Response({"id": str(rule.id), "is_active": rule.is_active})

    @action(detail=False, methods=["get"], url_path="activity")
    def activity(self, request):
        """GET /automation/rules/activity/ — recent rule trigger log (mock)"""
        org = request.organization
        rules = AutomationRule.objects.filter(organization=org, is_active=True)[:5]
        from apps.conversations.models import Message
        import random, datetime as _dt
        now = timezone.now()
        log = []
        for rule in rules:
            # Generate realistic fake activity entries for demo
            for i in range(random.randint(2, 5)):
                delta_mins = random.randint(5, 2880)
                log.append({
                    "rule_id": str(rule.id),
                    "rule_name": rule.name,
                    "triggered_at": (now - _dt.timedelta(minutes=delta_mins)).isoformat(),
                    "keyword_matched": random.choice(rule.keywords) if rule.keywords else "—",
                    "status": "replied",
                })
        log.sort(key=lambda x: x["triggered_at"], reverse=True)
        return Response({"count": len(log), "results": log[:20]})


class AutomationFlowViewSet(viewsets.ModelViewSet):
    serializer_class = AutomationFlowSerializer
    permission_classes = [IsAuthenticated, IsOrganizationMember]
    filterset_fields = ["is_active"]
    search_fields = ["name", "trigger_keyword"]

    def get_queryset(self):
        org = getattr(self.request, "organization", None)
        if not org:
            return AutomationFlow.objects.none()
        return AutomationFlow.objects.filter(organization=org)

    def perform_create(self, serializer):
        serializer.save(organization=self.request.organization)

    @action(detail=True, methods=["patch"], url_path="toggle")
    def toggle(self, request, pk=None):
        """PATCH /automation/flows/<id>/toggle/ — flip is_active"""
        flow = self.get_object()
        flow.is_active = not flow.is_active
        flow.save(update_fields=["is_active", "updated_at"])
        return Response({"id": str(flow.id), "is_active": flow.is_active})

from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.leads.models import Lead, LeadNote, LeadReminder
from apps.leads.serializers import LeadSerializer, LeadNoteSerializer, LeadReminderSerializer
from apps.organizations.permissions import IsOrganizationMember


class LeadViewSet(viewsets.ModelViewSet):
    """Full CRM lead management."""
    serializer_class = LeadSerializer
    permission_classes = [IsAuthenticated, IsOrganizationMember]
    search_fields = ["contact__name", "contact__phone_number", "title", "tags"]
    filterset_fields = ["stage", "source", "assigned_to"]

    def get_queryset(self):
        org = getattr(self.request, "organization", None)
        if not org:
            return Lead.objects.none()
        return Lead.objects.filter(
            organization=org
        ).select_related("contact", "assigned_to", "conversation").prefetch_related("notes", "reminders")

    def perform_create(self, serializer):
        serializer.save(organization=self.request.organization)

    @action(detail=False, methods=["get"], url_path="kanban")
    def kanban(self, request):
        """Returns leads grouped by pipeline stage."""
        org = getattr(request, "organization", None)
        if not org:
            return Response({"error": "Organization context required"}, status=status.HTTP_400_BAD_REQUEST)

        board = []
        for stage_value, stage_label in Lead.Stage.choices:
            stage_leads = Lead.objects.filter(
                organization=org, stage=stage_value
            ).select_related("contact", "assigned_to")
            board.append({
                "stage": stage_value,
                "label": stage_label,
                "count": stage_leads.count(),
                "leads": LeadSerializer(stage_leads, many=True).data,
            })
        return Response(board)

    @action(detail=True, methods=["post"], url_path="move")
    def move_stage(self, request, pk=None):
        """Move lead to a new pipeline stage."""
        lead = self.get_object()
        new_stage = request.data.get("stage")
        if new_stage not in dict(Lead.Stage.choices):
            return Response({"error": "Invalid stage"}, status=status.HTTP_400_BAD_REQUEST)

        lead.stage = new_stage
        if new_stage in (Lead.Stage.CLOSED_WON, Lead.Stage.CLOSED_LOST):
            lead.closed_at = timezone.now()
        lead.save(update_fields=["stage", "closed_at"])
        return Response(LeadSerializer(lead).data)

    @action(detail=True, methods=["get", "post"], url_path="notes")
    def notes(self, request, pk=None):
        lead = self.get_object()
        if request.method == "GET":
            return Response(LeadNoteSerializer(lead.notes.all(), many=True).data)
        note = LeadNote.objects.create(
            organization=self.request.organization,
            lead=lead,
            author=request.user,
            content=request.data.get("content", ""),
        )
        return Response(LeadNoteSerializer(note).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get", "post"], url_path="reminders")
    def reminders(self, request, pk=None):
        lead = self.get_object()
        if request.method == "GET":
            return Response(LeadReminderSerializer(lead.reminders.all(), many=True).data)
        ser = LeadReminderSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        reminder = LeadReminder.objects.create(
            organization=self.request.organization,
            lead=lead,
            created_by=request.user,
            **ser.validated_data,
        )
        return Response(LeadReminderSerializer(reminder).data, status=status.HTTP_201_CREATED)

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.campaigns.models import Campaign, CampaignContact
from apps.campaigns.serializers import CampaignSerializer, CampaignContactSerializer
from apps.organizations.permissions import IsOrganizationMember, IsBusinessAdmin


class CampaignViewSet(viewsets.ModelViewSet):
    serializer_class = CampaignSerializer
    permission_classes = [IsAuthenticated, IsOrganizationMember]
    filterset_fields = ["status", "message_type"]
    search_fields = ["name"]

    def get_queryset(self):
        org = getattr(self.request, "organization", None)
        if not org:
            return Campaign.objects.none()
        return Campaign.objects.filter(organization=org)

    def perform_create(self, serializer):
        serializer.save(organization=self.request.organization)

    @action(detail=True, methods=["post"], url_path="launch")
    def launch(self, request, pk=None):
        """Immediately dispatch campaign to Celery."""
        campaign = self.get_object()
        if campaign.status != Campaign.Status.DRAFT:
            return Response(
                {"error": f"Cannot launch a campaign in '{campaign.status}' status."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        campaign.status = Campaign.Status.SCHEDULED
        campaign.save(update_fields=["status"])

        from apps.campaigns.tasks import send_campaign
        send_campaign.delay(str(campaign.id))
        return Response({"message": "Campaign launched successfully.", "status": campaign.status})

    @action(detail=True, methods=["post"], url_path="pause")
    def pause(self, request, pk=None):
        campaign = self.get_object()
        if campaign.status == Campaign.Status.RUNNING:
            campaign.status = Campaign.Status.PAUSED
            campaign.save(update_fields=["status"])
        return Response({"status": campaign.status})

    @action(detail=True, methods=["get"], url_path="contacts")
    def contacts(self, request, pk=None):
        campaign = self.get_object()
        ccs = campaign.campaign_contacts.select_related("contact")
        return Response(CampaignContactSerializer(ccs, many=True).data)

    @action(detail=True, methods=["post"], url_path="add-contacts")
    def add_contacts(self, request, pk=None):
        campaign = self.get_object()
        if campaign.status != Campaign.Status.DRAFT:
            return Response(
                {"error": "Can only add contacts to DRAFT campaigns"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        contact_ids = request.data.get("contact_ids", [])
        from apps.whatsapp.models import Contact
        contacts = Contact.objects.filter(
            id__in=contact_ids, organization=self.request.organization
        )
        created = 0
        for contact in contacts:
            _, was_created = CampaignContact.objects.get_or_create(
                organization=self.request.organization,
                campaign=campaign,
                contact=contact,
            )
            if was_created:
                created += 1
        campaign.total_recipients = campaign.campaign_contacts.count()
        campaign.save(update_fields=["total_recipients"])
        return Response({"added": created, "total_recipients": campaign.total_recipients})

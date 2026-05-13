from rest_framework import serializers
from apps.campaigns.models import Campaign, CampaignContact


class CampaignContactSerializer(serializers.ModelSerializer):
    contact_name = serializers.CharField(source="contact.name", read_only=True)
    contact_phone = serializers.CharField(source="contact.phone_number", read_only=True)

    class Meta:
        model = CampaignContact
        fields = [
            "id", "contact", "contact_name", "contact_phone",
            "status", "wa_message_id", "sent_at", "error_message",
        ]
        read_only_fields = ["id", "status", "wa_message_id", "sent_at", "error_message"]


class CampaignSerializer(serializers.ModelSerializer):
    delivery_rate = serializers.FloatField(read_only=True)
    read_rate = serializers.FloatField(read_only=True)
    contact_ids = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True,
        required=False,
        help_text="Contact IDs to add to this campaign",
    )

    class Meta:
        model = Campaign
        fields = [
            "id", "name", "description", "whatsapp_account",
            "message_type", "message_content",
            "template_name", "template_language",
            "image_url", "image_caption",
            "status", "scheduled_for", "started_at", "completed_at",
            "total_recipients", "sent_count", "delivered_count",
            "read_count", "failed_count", "replied_count",
            "delivery_rate", "read_rate",
            "contact_ids",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "status", "started_at", "completed_at",
            "sent_count", "delivered_count", "read_count",
            "failed_count", "replied_count", "created_at", "updated_at",
        ]

    def create(self, validated_data):
        contact_ids = validated_data.pop("contact_ids", [])
        campaign = Campaign.objects.create(**validated_data)

        # Add contacts
        if contact_ids:
            from apps.whatsapp.models import Contact
            contacts = Contact.objects.filter(
                id__in=contact_ids, organization=campaign.organization
            )
            campaign_contacts = [
                CampaignContact(
                    organization=campaign.organization,
                    campaign=campaign,
                    contact=contact,
                )
                for contact in contacts
            ]
            CampaignContact.objects.bulk_create(campaign_contacts, ignore_conflicts=True)
            campaign.total_recipients = len(campaign_contacts)
            campaign.save(update_fields=["total_recipients"])

        return campaign

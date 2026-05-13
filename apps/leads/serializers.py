from rest_framework import serializers
from apps.leads.models import Lead, LeadNote, LeadReminder
from apps.whatsapp.serializers import ContactSerializer


class LeadNoteSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = LeadNote
        fields = ["id", "content", "author", "author_name", "created_at"]
        read_only_fields = ["id", "author", "created_at"]

    def get_author_name(self, obj):
        return f"{obj.author.first_name} {obj.author.last_name}".strip()


class LeadReminderSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeadReminder
        fields = ["id", "remind_at", "message", "is_sent", "created_at"]
        read_only_fields = ["id", "is_sent", "created_at"]


class LeadSerializer(serializers.ModelSerializer):
    contact = ContactSerializer(read_only=True)
    contact_id = serializers.UUIDField(write_only=True)
    notes = LeadNoteSerializer(many=True, read_only=True)
    reminders = LeadReminderSerializer(many=True, read_only=True)
    assigned_to_name = serializers.SerializerMethodField()

    class Meta:
        model = Lead
        fields = [
            "id", "contact", "contact_id", "conversation",
            "title", "stage", "source", "assigned_to", "assigned_to_name",
            "estimated_value", "closed_at", "tags", "custom_fields",
            "notes", "reminders", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "closed_at"]

    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            return f"{obj.assigned_to.first_name} {obj.assigned_to.last_name}".strip()
        return None


class LeadKanbanSerializer(serializers.Serializer):
    """Returns leads grouped by stage for kanban board."""
    stage = serializers.CharField()
    count = serializers.IntegerField()
    leads = LeadSerializer(many=True)

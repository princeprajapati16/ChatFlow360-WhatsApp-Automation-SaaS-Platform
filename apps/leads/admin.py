from django.contrib import admin
from apps.leads.models import Lead, LeadNote, LeadReminder


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    list_display = ["contact", "stage", "source", "assigned_to", "estimated_value", "created_at"]
    list_filter = ["stage", "source", "organization"]
    search_fields = ["contact__name", "contact__phone_number", "title"]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(LeadNote)
class LeadNoteAdmin(admin.ModelAdmin):
    list_display = ["lead", "author", "created_at"]
    readonly_fields = ["id", "created_at"]


@admin.register(LeadReminder)
class LeadReminderAdmin(admin.ModelAdmin):
    list_display = ["lead", "remind_at", "is_sent", "created_at"]
    list_filter = ["is_sent"]
    readonly_fields = ["id", "created_at"]

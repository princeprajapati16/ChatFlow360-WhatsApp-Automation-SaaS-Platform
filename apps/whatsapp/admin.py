from django.contrib import admin
from apps.whatsapp.models import WhatsAppAccount, Contact


@admin.register(WhatsAppAccount)
class WhatsAppAccountAdmin(admin.ModelAdmin):
    list_display = ["display_name", "phone_number_id", "organization", "is_active"]
    list_filter = ["is_active", "organization"]
    search_fields = ["display_name", "phone_number_id"]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ["name", "phone_number", "organization", "is_blocked", "created_at"]
    list_filter = ["is_blocked", "organization"]
    search_fields = ["name", "phone_number", "email"]
    readonly_fields = ["id", "created_at", "updated_at"]

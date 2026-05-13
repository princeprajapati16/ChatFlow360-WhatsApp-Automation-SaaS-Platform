from django.contrib import admin
from apps.organizations.models import Organization, OrganizationMember


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "owner", "is_active", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["name", "slug", "owner__email"]
    readonly_fields = ["id", "created_at", "updated_at"]


@admin.register(OrganizationMember)
class OrganizationMemberAdmin(admin.ModelAdmin):
    list_display = ["user", "organization", "role", "is_active", "created_at"]
    list_filter = ["role", "is_active"]
    search_fields = ["user__email", "organization__name"]
    readonly_fields = ["id", "created_at"]

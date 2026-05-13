"""
Organizations app — concrete tenant models.
Organization and OrganizationMember live here (proper Django app).
BaseModel and TenantModel are re-exported for convenience.
"""
import uuid
from django.db import models
from django.conf import settings
from chatflow360.models import BaseModel, TenantModel   # abstract — safe to import


class Organization(BaseModel):
    """Top-level tenant. Every piece of data belongs to an org."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=100, unique=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_organizations",
    )
    logo = models.ImageField(upload_to="org_logos/", null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        app_label = "organizations"
        ordering = ["name"]
        indexes = [models.Index(fields=["slug"])]

    def __str__(self):
        return self.name


class OrganizationMember(BaseModel):
    """Maps users to organizations with a specific role."""

    class Role(models.TextChoices):
        SUPER_ADMIN = "SUPER_ADMIN", "Super Admin"
        BUSINESS_ADMIN = "BUSINESS_ADMIN", "Business Admin"
        AGENT = "AGENT", "Agent"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="members"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    role = models.CharField(
        max_length=20, choices=Role.choices, default=Role.AGENT
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        app_label = "organizations"
        unique_together = ("organization", "user")
        indexes = [
            models.Index(fields=["organization", "role"]),
            models.Index(fields=["user"]),
        ]

    def __str__(self):
        return f"{self.user.email} @ {self.organization.name} ({self.role})"

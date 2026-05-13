"""
ChatFlow360 – Core Base Models
Only abstract models live here to avoid app_label issues.
Concrete models (Organization, OrganizationMember) live in apps.organizations.models.
"""
from django.db import models
from django.conf import settings


class BaseModel(models.Model):
    """Abstract timestamp mixin used by all local models."""
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class TenantModel(BaseModel):
    """
    Abstract base class that provides organization isolation.
    Every tenant model must extend this.
    """
    organization = models.ForeignKey(
        "organizations.Organization",   # lazy string ref — avoids circular import
        on_delete=models.CASCADE,
        db_index=True,
    )

    class Meta:
        abstract = True


# ── Convenience re-exports so existing code doesn't break ──────────────────────
# Import lazily to avoid circular imports at module load time.
def _get_org():
    from apps.organizations.models import Organization
    return Organization


def _get_member():
    from apps.organizations.models import OrganizationMember
    return OrganizationMember

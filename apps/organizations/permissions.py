"""
RBAC Permission classes for ChatFlow360.
Hierarchy: SUPER_ADMIN > BUSINESS_ADMIN > AGENT
"""
from rest_framework.permissions import BasePermission
from apps.organizations.models import OrganizationMember


class IsOrganizationMember(BasePermission):
    """User must belong to the request.organization."""
    message = "You are not a member of this organization."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and getattr(request, "organization", None) is not None
        )


class IsBusinessAdmin(IsOrganizationMember):
    """Business Admin or higher."""
    message = "Business Admin access required."

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return getattr(request, "org_role", "") in (
            OrganizationMember.Role.BUSINESS_ADMIN,
            OrganizationMember.Role.SUPER_ADMIN,
        )


class IsSuperAdmin(IsOrganizationMember):
    """Super Admin only."""
    message = "Super Admin access required."

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return getattr(request, "org_role", "") == OrganizationMember.Role.SUPER_ADMIN


class IsAgentOrAbove(IsOrganizationMember):
    """Any org member (Agent, Business Admin, Super Admin)."""
    pass

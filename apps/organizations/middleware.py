"""
Tenant-context middleware.
Reads X-Organization-ID header (or query param ?org_id) and attaches
the resolved org to request.organization for use in views.

IMPORTANT: DRF's JWT authentication (JWTAuthentication) runs *inside* the
view, after all middleware. So request.user is AnonymousUser here. We store
the raw org_id and use a lazy descriptor so that the first time a DRF view
accesses request.organization (after auth has run), the lookup is performed.
"""
from apps.organizations.models import Organization, OrganizationMember


class _LazyOrg:
    """
    Descriptor that resolves the organization the first time it is accessed
    on the request object, after DRF has populated request.user.
    """
    __slots__ = ("_org_id", "_resolved", "_org", "_role")

    def __init__(self, org_id):
        self._org_id = org_id
        self._resolved = False
        self._org = None
        self._role = None

    def _resolve(self, user):
        if self._resolved:
            return
        self._resolved = True
        if not self._org_id or not user or not user.is_authenticated:
            return
        try:
            membership = OrganizationMember.objects.select_related(
                "organization"
            ).get(
                organization__id=self._org_id,
                user=user,
                is_active=True,
            )
            self._org = membership.organization
            self._role = membership.role
        except (OrganizationMember.DoesNotExist, Exception):
            pass

    def get(self, user):
        self._resolve(user)
        return self._org

    def get_role(self, user):
        self._resolve(user)
        return self._role


class _OrgAccessor:
    """
    Wraps the request so that request.organization triggers lazy resolution.
    Attached as a simple callable property on the request.
    """
    pass


class OrganizationMiddleware:
    """
    Injects `request.organization` on every request using lazy resolution.
    Works correctly with DRF JWT authentication which runs inside the view.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        org_id = (
            request.headers.get("X-Organization-ID")
            or request.GET.get("org_id")
        )

        if org_id:
            lazy = _LazyOrg(org_id)

            # Define a property-like accessor on the request instance
            class _Req(request.__class__):
                @property
                def organization(self):
                    return lazy.get(self.user)

                @organization.setter
                def organization(self, val):
                    pass  # allow None assignment from old code

                @property
                def org_role(self):
                    return lazy.get_role(self.user)

                @org_role.setter
                def org_role(self, val):
                    pass

            # Patch the class only for this request instance
            request.__class__ = _Req
        else:
            # No org header — set to None directly to keep compat
            request.organization = None
            request.org_role = None

        response = self.get_response(request)
        return response

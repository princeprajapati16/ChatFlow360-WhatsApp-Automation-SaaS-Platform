"""
Settings App – Views
All views require authentication (IsAuthenticated by default in REST_FRAMEWORK).
"""
from rest_framework import status, generics
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404

from .models import UserProfile, NotificationPreferences
from .models import UserProfile, NotificationPreferences
from .serializers import (
    ProfileSerializer,
    AvatarUploadSerializer,
    ChangePasswordSerializer,
    NotificationPreferencesSerializer,
    TeamMemberSerializer,
    InviteTeamMemberSerializer,
)
from apps.organizations.models import Organization, OrganizationMember
from apps.whatsapp.models import WhatsAppAccount

User = get_user_model()

class UpdateProfileView(APIView):
    """
    PATCH /api/settings/update-profile/ (or /api/v1/settings/update-profile/)
    Update user's first_name and last_name
    """
    permission_classes = [IsAuthenticated]

    def patch(self, request):
        first_name = request.data.get("first_name", "").strip()
        last_name = request.data.get("last_name", "").strip()
        
        if not first_name or not last_name:
            return Response(
                {"error": "first_name and last_name cannot be empty."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        user = request.user
        user.first_name = first_name
        user.last_name = last_name
        user.save()
        
        return Response({
            "success": True,
            "message": "Name updated successfully",
            "user": {
                "id": user.id,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
            }
        })


# ── Helpers ─────────────────────────────────────────────────────────────────

def _get_current_org(request):
    """Return the organization from X-Organization-ID header, or None."""
    org_id = request.headers.get("X-Organization-ID") or request.META.get("HTTP_X_ORGANIZATION_ID")
    if org_id:
        try:
            return Organization.objects.get(id=org_id)
        except Organization.DoesNotExist:
            pass
    return None


def _ensure_profile(user):
    profile, _ = UserProfile.objects.get_or_create(user=user)
    return profile


def _ensure_notif_prefs(user):
    prefs, _ = NotificationPreferences.objects.get_or_create(user=user)
    return prefs


# ── Profile ──────────────────────────────────────────────────────────────────

class ProfileView(APIView):
    """
    GET  /api/v1/settings/profile/   → return current user profile
    PUT  /api/v1/settings/profile/   → update first_name, last_name, profile fields
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        _ensure_profile(request.user)
        serializer = ProfileSerializer(request.user, context={"request": request})
        return Response(serializer.data)

    def put(self, request):
        _ensure_profile(request.user)
        serializer = ProfileSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"success": True, "message": "Profile updated successfully.", "data": serializer.data})

    def patch(self, request):
        return self.put(request)


class AvatarUploadView(APIView):
    """
    POST /api/v1/settings/profile/avatar/  → upload avatar image
    """
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        profile = _ensure_profile(request.user)
        serializer = AvatarUploadSerializer(profile, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        avatar_url = None
        if profile.avatar:
            avatar_url = request.build_absolute_uri(profile.avatar.url)
        return Response({
            "success": True,
            "message": "Avatar updated.",
            "avatar_url": avatar_url,
        })


# ── Account & Security ───────────────────────────────────────────────────────

class ChangePasswordView(APIView):
    """
    POST /api/v1/settings/change-password/
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["new_password"])
        request.user.save()
        return Response({"success": True, "message": "Password changed successfully."})


class LogoutAllDevicesView(APIView):
    """
    POST /api/v1/settings/logout-all/
    Blacklists every outstanding refresh token for the current user.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        tokens = OutstandingToken.objects.filter(user=request.user)
        for token in tokens:
            BlacklistedToken.objects.get_or_create(token=token)
        return Response({
            "success": True,
            "message": f"Logged out from {tokens.count()} device(s).",
        })


# ── WhatsApp Integration ─────────────────────────────────────────────────────

class WhatsAppStatusView(APIView):
    """
    GET /api/v1/settings/whatsapp/status/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        org = _get_current_org(request)
        if not org:
            return Response({"connected": False, "accounts": [], "message": "No organization selected."})
        accounts = WhatsAppAccount.objects.filter(organization=org)
        data = [
            {
                "id": str(acc.id),
                "display_name": acc.display_name,
                "phone_number_id": acc.phone_number_id,
                "whatsapp_business_account_id": acc.whatsapp_business_account_id,
                "is_active": acc.is_active,
                "webhook_verify_token": acc.webhook_verify_token,
            }
            for acc in accounts
        ]
        return Response({
            "connected": accounts.exists(),
            "accounts": data,
        })


class WhatsAppConnectView(APIView):
    """
    POST /api/v1/settings/whatsapp/connect/
    Body: { display_name, phone_number_id, whatsapp_business_account_id, access_token, webhook_verify_token }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        org = _get_current_org(request)
        if not org:
            return Response(
                {"error": "No organization selected. Set X-Organization-ID header."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        data = request.data
        required = ["display_name", "phone_number_id", "whatsapp_business_account_id", "access_token"]
        for field in required:
            if not data.get(field):
                return Response({"error": f"{field} is required."}, status=status.HTTP_400_BAD_REQUEST)

        account, created = WhatsAppAccount.objects.update_or_create(
            phone_number_id=data["phone_number_id"],
            defaults={
                "organization": org,
                "display_name": data["display_name"],
                "whatsapp_business_account_id": data["whatsapp_business_account_id"],
                "access_token": data["access_token"],
                "webhook_verify_token": data.get("webhook_verify_token", ""),
                "is_active": True,
            },
        )
        return Response({
            "success": True,
            "message": "WhatsApp account connected successfully." if created else "WhatsApp account updated.",
            "account": {
                "id": str(account.id),
                "display_name": account.display_name,
                "phone_number_id": account.phone_number_id,
                "is_active": account.is_active,
            },
        }, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class WhatsAppDisconnectView(APIView):
    """
    DELETE /api/v1/settings/whatsapp/<account_id>/disconnect/
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, account_id):
        org = _get_current_org(request)
        account = get_object_or_404(WhatsAppAccount, id=account_id, organization=org)
        account.delete()
        return Response({"success": True, "message": "WhatsApp account disconnected."})


# ── Notifications ─────────────────────────────────────────────────────────────

class NotificationPreferencesView(APIView):
    """
    GET /api/v1/settings/notifications/
    PUT /api/v1/settings/notifications/
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        prefs = _ensure_notif_prefs(request.user)
        serializer = NotificationPreferencesSerializer(prefs)
        return Response(serializer.data)

    def put(self, request):
        prefs = _ensure_notif_prefs(request.user)
        serializer = NotificationPreferencesSerializer(prefs, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"success": True, "message": "Notification preferences saved.", "data": serializer.data})

    def patch(self, request):
        return self.put(request)


# ── Team Management ───────────────────────────────────────────────────────────

class TeamListView(APIView):
    """
    GET  /api/v1/settings/team/   → list members of current org
    POST /api/v1/settings/team/   → invite / add a user to the org
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        org = _get_current_org(request)
        if not org:
            return Response({"results": [], "message": "No organization selected."})
        members = OrganizationMember.objects.filter(organization=org).select_related("user")
        serializer = TeamMemberSerializer(members, many=True)
        return Response({"count": members.count(), "results": serializer.data})

    def post(self, request):
        org = _get_current_org(request)
        if not org:
            return Response(
                {"error": "No organization selected."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = InviteTeamMemberSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vd = serializer.validated_data

        # Get or create the user
        user, created = User.objects.get_or_create(
            email=vd["email"],
            defaults={
                "first_name": vd.get("first_name", ""),
                "last_name": vd.get("last_name", ""),
            },
        )
        if created:
            user.set_unusable_password()
            user.save()

        # Add to org
        member, mem_created = OrganizationMember.objects.get_or_create(
            organization=org,
            user=user,
            defaults={"role": vd["role"]},
        )
        if not mem_created:
            member.role = vd["role"]
            member.save(update_fields=["role"])

        return Response({
            "success": True,
            "message": f"{'Invited' if created else 'Updated'} {vd['email']} as {vd['role']}.",
            "member": TeamMemberSerializer(member).data,
        }, status=status.HTTP_201_CREATED if mem_created else status.HTTP_200_OK)


class TeamMemberDetailView(APIView):
    """
    PATCH  /api/v1/settings/team/<member_id>/  → update role
    DELETE /api/v1/settings/team/<member_id>/  → remove member
    """
    permission_classes = [IsAuthenticated]

    def _get_member(self, request, member_id):
        org = _get_current_org(request)
        return get_object_or_404(OrganizationMember, id=member_id, organization=org)

    def patch(self, request, member_id):
        member = self._get_member(request, member_id)
        role = request.data.get("role")
        if role:
            member.role = role
            member.save(update_fields=["role"])
        return Response({"success": True, "member": TeamMemberSerializer(member).data})

    def delete(self, request, member_id):
        member = self._get_member(request, member_id)
        # Prevent removing self
        if member.user == request.user:
            return Response(
                {"error": "You cannot remove yourself from the organization."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        email = member.user.email
        member.delete()
        return Response({"success": True, "message": f"Removed {email} from the organization."})

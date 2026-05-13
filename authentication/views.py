"""
authentication/views.py — Complete Auth API
- Login: custom JWT view returning user + org + tokens
- Register: creates user + default org + free subscription
- Forgot Password: generates 15-min token, sends email with reset link
- Reset Password: validates token, updates password, invalidates token
- Logout: blacklists refresh token
"""
import secrets
import datetime as _dt

from django.contrib.auth import get_user_model, authenticate
from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import generics
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

from authentication.serializers import (
    RegisterSerializer,
    PasswordResetRequestSerializer,
    PasswordResetConfirmSerializer,
)
from authentication.models import PasswordResetToken

User = get_user_model()


# ── Helpers ───────────────────────────────────────────────────────────────────

def _user_payload(user):
    """Minimal user dict sent to frontend on login/register."""
    return {
        "id": str(user.id),
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "role": user.role,
        "is_active": user.is_active,
    }

def _org_payload(org):
    """Minimal org dict sent to frontend."""
    if not org:
        return None
    return {
        "id": str(org.id),
        "name": org.name,
        "slug": org.slug,
    }

def _send_welcome_email(user):
    try:
        send_mail(
            subject="Welcome to ChatFlow360! 🎉",
            message=(
                f"Hi {user.first_name or user.email},\n\n"
                "Welcome to ChatFlow360 — your WhatsApp Business automation platform.\n\n"
                "You can now:\n"
                "• Manage your team inbox\n"
                "• Set up automation rules\n"
                "• Run broadcast campaigns\n"
                "• Track leads in CRM\n\n"
                "Get started: http://localhost:3000/dashboard\n\n"
                "— The ChatFlow360 Team"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )
    except Exception:
        pass  # Don't fail registration if email fails


# ── Register ──────────────────────────────────────────────────────────────────

class RegisterView(generics.CreateAPIView):
    """
    POST /api/v1/auth/register/
    Body: {first_name, last_name, email, password, password_confirm, workspace_name?}
    Returns: {message, user, tokens, org}
    """
    permission_classes = (AllowAny,)
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # ── Auto-create workspace ──────────────────────────────────────
        workspace_name = (
            request.data.get("workspace_name")
            or f"{user.first_name or user.email.split('@')[0]}'s Workspace"
        )
        org = None
        try:
            from apps.organizations.models import Organization, OrganizationMember
            import re, uuid as _uuid
            base_slug = re.sub(r'[^a-z0-9]+', '-', workspace_name.lower()).strip('-') or 'workspace'
            slug = base_slug
            counter = 1
            while Organization.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            org = Organization.objects.create(
                name=workspace_name,
                slug=slug,
                owner=user,
            )
            OrganizationMember.objects.create(
                organization=org,
                user=user,
                role="BUSINESS_ADMIN",
            )
        except Exception as e:
            # Don't silently swallow — log it
            import logging
            logging.getLogger(__name__).warning(f"Could not create org for {user.email}: {e}")

        # ── Free subscription ──────────────────────────────────────────
        try:
            from subscriptions.models import SubscriptionPlan, UserSubscription
            free_plan = SubscriptionPlan.objects.filter(
                plan_type=SubscriptionPlan.Type.FREE
            ).first()
            if free_plan:
                UserSubscription.objects.get_or_create(user=user, defaults={"plan": free_plan})
        except Exception:
            pass

        # ── Welcome email ──────────────────────────────────────────────
        _send_welcome_email(user)

        # ── Issue tokens ───────────────────────────────────────────────
        refresh = RefreshToken.for_user(user)
        return Response({
            "message": "Account created successfully!",
            "user": _user_payload(user),
            "org": _org_payload(org),
            "tokens": {
                "access": str(refresh.access_token),
                "refresh": str(refresh),
            },
        }, status=status.HTTP_201_CREATED)


# ── Login ─────────────────────────────────────────────────────────────────────

class LoginView(APIView):
    """
    POST /api/v1/auth/login/
    Body: {email, password}
    Returns: {access, refresh, user, org}
    Errors: 400 with {field, message} for specific failures
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        password = request.data.get("password") or ""

        # ── Validate presence ──────────────────────────────────────────
        if not email:
            return Response(
                {"field": "email", "message": "Email address is required."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if not password:
            return Response(
                {"field": "password", "message": "Password is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ── Check email exists ─────────────────────────────────────────
        try:
            user_obj = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response(
                {"field": "email", "message": "No account found with this email address."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ── Check password ─────────────────────────────────────────────
        user = authenticate(request, email=email, password=password)
        if user is None:
            return Response(
                {"field": "password", "message": "Incorrect password. Please try again."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # ── Check active ───────────────────────────────────────────────
        if not user.is_active:
            return Response(
                {"field": "email", "message": "This account has been deactivated. Contact support."},
                status=status.HTTP_403_FORBIDDEN
            )

        # ── Get primary org ────────────────────────────────────────────
        org = None
        try:
            from apps.organizations.models import OrganizationMember
            membership = (
                OrganizationMember.objects
                .filter(user=user)
                .select_related("organization")
                .order_by("joined_at")
                .first()
            )
            if membership:
                org = membership.organization
        except Exception:
            pass

        # ── Check WhatsApp connection ──────────────────────────────────
        whatsapp_connected = False
        try:
            from apps.whatsapp.models import WhatsAppAccount
            if org:
                whatsapp_connected = WhatsAppAccount.objects.filter(
                    organization=org, is_active=True
                ).exists()
        except Exception:
            pass

        # ── Issue tokens ───────────────────────────────────────────────
        refresh = RefreshToken.for_user(user)
        return Response({
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": _user_payload(user),
            "org": _org_payload(org),
            "whatsapp_connected": whatsapp_connected,
        })


# ── Logout ────────────────────────────────────────────────────────────────────

class LogoutView(APIView):
    """POST /api/v1/auth/logout/ — blacklist refresh token."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"error": "refresh token required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"message": "Successfully logged out."})


# ── Forgot Password ───────────────────────────────────────────────────────────

class ForgotPasswordView(APIView):
    """
    POST /api/v1/auth/forgot-password/
    Body: {email}
    Generates a secure token (15-min expiry), sends reset email.
    Always returns 200 (security: don't reveal if email exists).
    """
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get("email") or "").strip().lower()
        if not email:
            return Response(
                {"field": "email", "message": "Email address is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email=email, is_active=True)
            # Invalidate old tokens for this user
            PasswordResetToken.objects.filter(user=user, is_used=False).update(is_used=True)

            # Create new token
            raw_token = secrets.token_urlsafe(32)
            prt = PasswordResetToken.objects.create(
                user=user,
                token=raw_token,
            )

            # Build reset link pointing to frontend
            reset_link = f"http://localhost:3000/reset-password?token={raw_token}"

            try:
                send_mail(
                    subject="Reset your ChatFlow360 password",
                    message=(
                        f"Hi {user.first_name or user.email},\n\n"
                        f"Reset link: {reset_link}\n"
                        f"This link expires in 15 minutes.\n"
                    ),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[email],
                    fail_silently=False,
                )
            except Exception as e:
                print("\n" + "="*60)
                print("⚠️ SMTP FAILED: Google rejected the credentials in settings.py")
                print(f"🔗 HERE IS YOUR RESET LINK: {reset_link}")
                print("="*60 + "\n")
                return Response(
                    {"message": "Email sending failed (Invalid SMTP). Check the server terminal to copy your reset link!"},
                    status=status.HTTP_200_OK
                )
                
        except User.DoesNotExist:
            pass  # Security: don't reveal if email exists

        return Response({
            "message": "If that email is registered, a reset link has been sent. Check your inbox."
        })


# ── Reset Password ────────────────────────────────────────────────────────────

class ResetPasswordView(APIView):
    """
    POST /api/v1/auth/reset-password/
    Body: {token, new_password, confirm_password}
    Validates token expiry, updates password, invalidates token.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        token_str = (request.data.get("token") or "").strip()
        new_password = request.data.get("new_password") or ""
        confirm = request.data.get("confirm_password") or ""

        if not token_str:
            return Response(
                {"field": "token", "message": "Reset token is missing. Please use the link from your email."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if len(new_password) < 8:
            return Response(
                {"field": "new_password", "message": "Password must be at least 8 characters."},
                status=status.HTTP_400_BAD_REQUEST
            )
        if new_password != confirm:
            return Response(
                {"field": "confirm_password", "message": "Passwords do not match."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Lookup token
        try:
            prt = PasswordResetToken.objects.select_related("user").get(
                token=token_str,
                is_used=False,
            )
        except PasswordResetToken.DoesNotExist:
            return Response(
                {"field": "token", "message": "This reset link is invalid or has already been used."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check expiry
        if prt.is_expired():
            prt.is_used = True
            prt.save(update_fields=["is_used"])
            return Response(
                {"field": "token", "message": "This reset link has expired (15 min limit). Please request a new one."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update password + invalidate token
        user = prt.user
        user.set_password(new_password)
        user.save(update_fields=["password"])
        prt.is_used = True
        prt.save(update_fields=["is_used"])

        # Optionally blacklist all active JWT tokens (best-effort)
        try:
            from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
            for tkn in OutstandingToken.objects.filter(user=user):
                BlacklistedToken.objects.get_or_create(token=tkn)
        except Exception:
            pass

        return Response({"message": "Password reset successfully. You can now sign in with your new password."})


# ── Legacy compat aliases ─────────────────────────────────────────────────────

class PasswordResetRequestView(ForgotPasswordView):
    """Alias for /password-reset/ → same as /forgot-password/."""
    pass


class PasswordResetConfirmView(APIView):
    """
    Legacy alias: POST /password-reset/confirm/ with {uid, token, new_password}
    Kept for backward compatibility with Django's default_token_generator flow.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        from authentication.serializers import PasswordResetConfirmSerializer
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            user = User.objects.get(pk=data["uid"])
        except (User.DoesNotExist, Exception):
            return Response({"error": "Invalid user."}, status=status.HTTP_400_BAD_REQUEST)
        from django.contrib.auth.tokens import default_token_generator
        if not default_token_generator.check_token(user, data["token"]):
            return Response({"error": "Invalid or expired token."}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(data["new_password"])
        user.save()
        return Response({"message": "Password reset successfully."})

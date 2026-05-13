"""
Settings App – Serializers
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.password_validation import validate_password
from .models import UserProfile, NotificationPreferences
from apps.organizations.models import Organization, OrganizationMember

User = get_user_model()


# ── User / Profile ──────────────────────────────────────────────────────────

class UserProfileSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = UserProfile
        fields = ("avatar", "avatar_url", "phone", "bio", "timezone")

    def get_avatar_url(self, obj):
        request = self.context.get("request")
        if obj.avatar and request:
            return request.build_absolute_uri(obj.avatar.url)
        return obj.avatar.url if obj.avatar else None


class ProfileSerializer(serializers.ModelSerializer):
    """Combined user + profile fields."""
    profile = UserProfileSerializer(required=False)
    avatar_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = User
        fields = (
            "id", "email", "first_name", "last_name",
            "role", "created_at", "profile", "avatar_url",
        )
        read_only_fields = ("id", "email", "role", "created_at")

    def get_avatar_url(self, obj):
        try:
            request = self.context.get("request")
            if obj.profile.avatar and request:
                return request.build_absolute_uri(obj.profile.avatar.url)
            return obj.profile.avatar.url if obj.profile.avatar else None
        except UserProfile.DoesNotExist:
            return None

    def update(self, instance, validated_data):
        profile_data = validated_data.pop("profile", {})
        # Update user fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        # Update or create profile
        profile, _ = UserProfile.objects.get_or_create(user=instance)
        for attr, value in profile_data.items():
            setattr(profile, attr, value)
        profile.save()
        return instance


class AvatarUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ("avatar",)


# ── Security ────────────────────────────────────────────────────────────────

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(required=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs.pop("new_password_confirm"):
            raise serializers.ValidationError({"new_password": "Passwords do not match."})
        return attrs

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value


# ── Notifications ───────────────────────────────────────────────────────────

class NotificationPreferencesSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationPreferences
        fields = (
            "email_notifications",
            "whatsapp_alerts",
            "campaign_updates",
            "lead_alerts",
            "system_announcements",
        )


# ── Team Management ─────────────────────────────────────────────────────────

class TeamMemberSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source="user.email", read_only=True)
    first_name = serializers.CharField(source="user.first_name", read_only=True)
    last_name = serializers.CharField(source="user.last_name", read_only=True)
    user_id = serializers.UUIDField(source="user.id", read_only=True)
    joined_at = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = OrganizationMember
        fields = ("id", "user_id", "email", "first_name", "last_name", "role", "joined_at")
        read_only_fields = ("id", "user_id", "email", "first_name", "last_name", "joined_at")


class InviteTeamMemberSerializer(serializers.Serializer):
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150, default="")
    last_name = serializers.CharField(max_length=150, default="")
    role = serializers.ChoiceField(
        choices=OrganizationMember.Role.choices,
        default=OrganizationMember.Role.AGENT,
    )

    def validate_email(self, value):
        return value.lower()

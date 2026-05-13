from rest_framework import serializers
from apps.organizations.models import Organization, OrganizationMember
from django.contrib.auth import get_user_model

User = get_user_model()


class OrganizationSerializer(serializers.ModelSerializer):
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Organization
        fields = [
            "id", "name", "slug", "logo", "is_active", "member_count",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "slug", "created_at", "updated_at"]

    def get_member_count(self, obj):
        return obj.members.filter(is_active=True).count()

    def create(self, validated_data):
        from django.utils.text import slugify
        import uuid
        name = validated_data["name"]
        slug_base = slugify(name)
        slug = slug_base
        counter = 1
        while Organization.objects.filter(slug=slug).exists():
            slug = f"{slug_base}-{counter}"
            counter += 1
        validated_data["slug"] = slug
        validated_data["owner"] = self.context["request"].user
        org = Organization.objects.create(**validated_data)
        # Auto-add owner as Super Admin
        OrganizationMember.objects.create(
            organization=org,
            user=org.owner,
            role=OrganizationMember.Role.SUPER_ADMIN,
        )
        return org


class OrganizationMemberSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = OrganizationMember
        fields = [
            "id", "user", "user_email", "user_name", "role",
            "is_active", "created_at",
        ]
        read_only_fields = ["id", "user_email", "user_name", "created_at"]

    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip()


class InviteMemberSerializer(serializers.Serializer):
    email = serializers.EmailField()
    role = serializers.ChoiceField(choices=OrganizationMember.Role.choices)

    def validate_email(self, value):
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "No user found with this email. User must register first."
            )
        return value

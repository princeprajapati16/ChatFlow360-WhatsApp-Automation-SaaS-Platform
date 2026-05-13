from rest_framework import serializers
from apps.whatsapp.models import WhatsAppAccount, Contact


class WhatsAppAccountSerializer(serializers.ModelSerializer):
    """Read serializer — access_token is masked."""
    token_masked = serializers.SerializerMethodField()
    connected_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = WhatsAppAccount
        fields = [
            "id", "display_name", "phone_number_id", "display_phone_number",
            "whatsapp_business_account_id", "webhook_verify_token",
            "is_active", "token_masked", "connected_at",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "token_masked", "connected_at"]

    def get_token_masked(self, obj):
        """Show only last 6 chars of token."""
        if obj.access_token and len(obj.access_token) > 8:
            return "••••••••" + obj.access_token[-6:]
        return "••••••••" if obj.access_token else ""


class WhatsAppAccountWriteSerializer(serializers.ModelSerializer):
    """Write serializer — accepts full access_token."""
    class Meta:
        model = WhatsAppAccount
        fields = [
            "id", "display_name", "phone_number_id", "display_phone_number",
            "whatsapp_business_account_id", "access_token",
            "webhook_verify_token", "is_active",
        ]
        read_only_fields = ["id"]
        extra_kwargs = {
            "access_token": {"write_only": True},
        }


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = [
            "id", "phone_number", "name", "email", "tags",
            "avatar", "is_blocked", "last_seen",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "last_seen"]

from rest_framework import serializers
from apps.automation.models import AutomationRule, AutomationFlow


class AutomationRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AutomationRule
        fields = [
            "id", "name", "keywords", "match_type",
            "reply_text", "is_active", "priority",
            "whatsapp_accounts", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class AutomationFlowSerializer(serializers.ModelSerializer):
    class Meta:
        model = AutomationFlow
        fields = [
            "id", "name", "trigger_keyword", "is_active",
            "flow_data", "whatsapp_account",
            "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_flow_data(self, value):
        """Ensure flow_data has the required 'steps' key."""
        if not isinstance(value, dict):
            raise serializers.ValidationError("flow_data must be a JSON object.")
        if "steps" not in value:
            raise serializers.ValidationError("flow_data must have a 'steps' key.")
        steps = value.get("steps", [])
        if not isinstance(steps, list) or len(steps) == 0:
            raise serializers.ValidationError("steps must be a non-empty list.")
        for step in steps:
            if "id" not in step or "message" not in step:
                raise serializers.ValidationError("Each step must have 'id' and 'message' keys.")
        return value

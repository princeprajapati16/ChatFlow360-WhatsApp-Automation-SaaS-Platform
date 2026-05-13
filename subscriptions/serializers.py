from rest_framework import serializers
from subscriptions.models import SubscriptionPlan, UserSubscription


class SubscriptionPlanSerializer(serializers.ModelSerializer):
    yearly_discount_pct   = serializers.ReadOnlyField()
    price_yearly_per_month = serializers.ReadOnlyField()

    class Meta:
        model  = SubscriptionPlan
        fields = [
            'id', 'name', 'plan_type', 'description',
            'price_monthly', 'price_yearly', 'price_yearly_per_month',
            'yearly_discount_pct',
            'max_bots', 'max_messages_per_month', 'max_team_members',
            'max_campaigns', 'max_contacts',
            'features', 'trial_days',
            'is_popular', 'sort_order',
        ]


class UserSubscriptionSerializer(serializers.ModelSerializer):
    plan           = SubscriptionPlanSerializer(read_only=True)
    days_until_renewal = serializers.ReadOnlyField()
    is_on_trial    = serializers.ReadOnlyField()
    current_price  = serializers.ReadOnlyField()

    class Meta:
        model  = UserSubscription
        fields = [
            'id', 'plan', 'billing_cycle', 'status', 'auto_renew',
            'start_date', 'end_date', 'trial_end_date', 'cancelled_at',
            'next_billing_date', 'days_until_renewal',
            'bots_created', 'messages_used_this_month',
            'campaigns_created', 'contacts_count',
            'is_on_trial', 'current_price',
        ]

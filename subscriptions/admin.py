from django.contrib import admin
from subscriptions.models import SubscriptionPlan, UserSubscription


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display  = ('name', 'plan_type', 'price_monthly', 'price_yearly',
                     'max_bots', 'max_messages_per_month', 'is_popular', 'is_active', 'sort_order')
    search_fields = ('name',)
    list_filter   = ('plan_type', 'is_active', 'is_popular')
    ordering      = ('sort_order', 'price_monthly')


@admin.register(UserSubscription)
class UserSubscriptionAdmin(admin.ModelAdmin):
    list_display  = ('user', 'plan', 'billing_cycle', 'status',
                     'auto_renew', 'next_billing_date', 'bots_created', 'messages_used_this_month')
    search_fields = ('user__email', 'plan__name')
    list_filter   = ('status', 'billing_cycle', 'auto_renew', 'plan__plan_type')
    autocomplete_fields = ('user', 'plan')

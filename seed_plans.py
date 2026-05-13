"""Seed clean subscription plans — deletes old ones first."""
from subscriptions.models import SubscriptionPlan

SubscriptionPlan.objects.all().delete()

PLANS = [
    dict(
        name='Free', plan_type='FREE',
        description='Perfect for exploring ChatFlow360.',
        price_monthly=0, price_yearly=0,
        max_bots=1, max_messages_per_month=1000,
        max_team_members=1, max_campaigns=2, max_contacts=100,
        features=[
            '1 WhatsApp Number',
            '1,000 messages/month',
            'Basic Team Inbox',
            'Analytics Dashboard',
            'Email Support',
        ],
        trial_days=0, is_popular=False, sort_order=0, is_active=True,
    ),
    dict(
        name='Starter', plan_type='STARTER',
        description='Great for small teams getting started.',
        price_monthly=19, price_yearly=182,
        max_bots=2, max_messages_per_month=5000,
        max_team_members=3, max_campaigns=10, max_contacts=1000,
        features=[
            '2 WhatsApp Numbers',
            '5,000 messages/month',
            'Team Inbox',
            'Analytics Dashboard',
            'Priority Email Support',
            'Basic Automation',
            'Contact Management',
        ],
        trial_days=7, is_popular=False, sort_order=1, is_active=True,
    ),
    dict(
        name='Pro', plan_type='PRO',
        description='Most popular for growing businesses.',
        price_monthly=49, price_yearly=470,
        max_bots=5, max_messages_per_month=25000,
        max_team_members=10, max_campaigns=50, max_contacts=10000,
        features=[
            '5 WhatsApp Numbers',
            '25,000 messages/month',
            'Team Inbox',
            'Advanced Analytics',
            'Priority Support',
            'Full Automation',
            'Campaign Manager',
            'Lead Pipeline',
            'API Access',
        ],
        trial_days=14, is_popular=True, sort_order=2, is_active=True,
    ),
    dict(
        name='Business', plan_type='BUSINESS',
        description='Built for scaling operations.',
        price_monthly=99, price_yearly=950,
        max_bots=15, max_messages_per_month=100000,
        max_team_members=25, max_campaigns=200, max_contacts=50000,
        features=[
            '15 WhatsApp Numbers',
            '100,000 messages/month',
            'Team Inbox',
            'Custom Analytics',
            'Dedicated Support',
            'Advanced Automation',
            'Campaign Manager',
            'Lead Pipeline',
            'API Access',
            'Custom Webhooks',
            'Role-based Access',
        ],
        trial_days=14, is_popular=False, sort_order=3, is_active=True,
    ),
    dict(
        name='Enterprise', plan_type='ENTERPRISE',
        description='Unlimited power for large teams.',
        price_monthly=249, price_yearly=2390,
        max_bots=999, max_messages_per_month=999999,
        max_team_members=999, max_campaigns=9999, max_contacts=999999,
        features=[
            'Unlimited WhatsApp Numbers',
            'Unlimited Messages',
            'Unlimited Team Members',
            'Custom Analytics',
            '24/7 Dedicated Support',
            'Advanced Automation',
            'Campaign Manager',
            'Lead Pipeline',
            'Full API Access',
            'Custom Integrations',
            'SLA Guarantee',
            'Onboarding Manager',
            'White-label Option',
        ],
        trial_days=0, is_popular=False, sort_order=4, is_active=True,
    ),
]

for p in PLANS:
    SubscriptionPlan.objects.create(**p)
    print(f"  ✓ {p['name']}")

print(f"\nSeeded {len(PLANS)} plans successfully.")

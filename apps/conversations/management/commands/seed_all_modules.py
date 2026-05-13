"""
seed_all_modules.py — Seeds all 4 modules:
  1. Automation: 5 rules + 2 flows
  2. Billing: 3 subscription plans + payment history
  3. Settings: user profiles + notification prefs
  4. Inbox: extra conversation messages (if needed)

Usage:
    python manage.py seed_all_modules
    python manage.py seed_all_modules --org-slug rush-pvt-ltd
"""
import random
import uuid
import datetime as _dt
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from faker import Faker

fake = Faker()

# ── Automation seed data ──────────────────────────────────────────────────────
RULES = [
    {
        "name": "Price Inquiry Auto-Reply",
        "keywords": ["price", "pricing", "cost", "how much", "rate", "tariff"],
        "match_type": "contains",
        "reply_text": "Hi! 👋 Our pricing starts at ₹999/month for the Starter plan. For a detailed quote tailored to your needs, reply with your team size!",
        "priority": 10,
        "is_active": True,
    },
    {
        "name": "Demo Request Handler",
        "keywords": ["demo", "trial", "free trial", "schedule demo", "book demo"],
        "match_type": "contains",
        "reply_text": "Great choice! 🎯 I'd love to show you ChatFlow360 in action. Please share a convenient time slot and I'll send you a calendar invite right away.",
        "priority": 9,
        "is_active": True,
    },
    {
        "name": "Support Ticket Router",
        "keywords": ["help", "support", "issue", "problem", "bug", "not working"],
        "match_type": "contains",
        "reply_text": "I'm sorry to hear that! 🛠️ Our support team has been notified. Expect a response within 2 hours. Your ticket ID is #CF-{random}. You can also email support@chatflow360.com.",
        "priority": 8,
        "is_active": True,
    },
    {
        "name": "Working Hours Responder",
        "keywords": ["working hours", "office hours", "when are you open", "timing", "open"],
        "match_type": "contains",
        "reply_text": "🕐 Our support hours are Monday–Friday, 9 AM to 6 PM IST. We're currently closed but will get back to you as soon as we're open. You can also browse our FAQ at help.chatflow360.com!",
        "priority": 7,
        "is_active": True,
    },
    {
        "name": "Greeting Auto-Reply",
        "keywords": ["hi", "hello", "hey", "good morning", "good evening", "hola"],
        "match_type": "starts_with",
        "reply_text": "Hello there! 👋 Welcome to ChatFlow360 — We help businesses grow using WhatsApp automation. How can I assist you today?\n\n1️⃣ Pricing\n2️⃣ Schedule a Demo\n3️⃣ Talk to Support",
        "priority": 5,
        "is_active": True,
    },
]

FLOWS = [
    {
        "name": "Main Menu Flow",
        "trigger_keyword": "menu",
        "is_active": True,
        "flow_data": {
            "steps": [
                {
                    "id": "welcome",
                    "message": "Welcome to ChatFlow360! 🚀 Choose an option below:",
                    "options": [
                        {"text": "1. Pricing plans", "next_step": "pricing"},
                        {"text": "2. Book a demo", "next_step": "demo"},
                        {"text": "3. Talk to support", "next_step": "support"},
                    ],
                },
                {
                    "id": "pricing",
                    "message": "💰 Our plans:\n• Starter – ₹999/mo (1K messages)\n• Pro – ₹2,499/mo (10K messages)\n• Enterprise – Custom\n\nReply DEMO to see it live!",
                    "options": [],
                },
                {
                    "id": "demo",
                    "message": "📅 Book a free 30-min demo! Click: https://cal.com/chatflow360/demo\nOr share your available slot.",
                    "options": [],
                },
                {
                    "id": "support",
                    "message": "🛠️ Connecting you to our support team. Expected wait: 5 min.\nFor urgent issues: support@chatflow360.com",
                    "options": [],
                },
            ]
        },
    },
    {
        "name": "Lead Qualification Flow",
        "trigger_keyword": "start",
        "is_active": True,
        "flow_data": {
            "steps": [
                {
                    "id": "intro",
                    "message": "Hi! Let me help you find the right plan. What's your team size?",
                    "options": [
                        {"text": "1–5 people", "next_step": "small_team"},
                        {"text": "6–20 people", "next_step": "mid_team"},
                        {"text": "20+ people", "next_step": "enterprise"},
                    ],
                },
                {
                    "id": "small_team",
                    "message": "Perfect! Our Starter plan is ideal for small teams. ₹999/month with 1,000 messages. Want to start a free trial?",
                    "options": [],
                },
                {
                    "id": "mid_team",
                    "message": "Great! Our Pro plan supports up to 10,000 messages/month at ₹2,499. I'll have a sales rep reach out shortly!",
                    "options": [],
                },
                {
                    "id": "enterprise",
                    "message": "Excellent! For teams of 20+, we offer custom Enterprise plans with dedicated support, SLA, and unlimited messages. I'm routing you to our enterprise team now.",
                    "options": [],
                },
            ]
        },
    },
]


class Command(BaseCommand):
    help = "Seed Automation, Billing, and Settings module demo data."

    def add_arguments(self, parser):
        parser.add_argument("--org-slug", default="rush-pvt-ltd",
                            help="Org slug to seed data for.")
        parser.add_argument("--flush", action="store_true",
                            help="Delete existing seeded data first.")

    @transaction.atomic
    def handle(self, *args, **options):
        import sys, io
        if sys.platform == "win32":
            sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

        from apps.organizations.models import Organization
        from apps.automation.models import AutomationRule, AutomationFlow
        from subscriptions.models import SubscriptionPlan, UserSubscription
        from payments.models import PaymentTransaction
        from settings_app.models import UserProfile, NotificationPreferences
        from users.models import User

        org_slug = options["org_slug"]
        now = timezone.now()

        try:
            org = Organization.objects.get(slug=org_slug)
        except Organization.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"Org '{org_slug}' not found. Run populate_demo_data first."))
            return

        owner = org.owner
        self.stdout.write(self.style.HTTP_INFO(f"Seeding modules for org: {org.name}"))

        # ── Flush ──────────────────────────────────────────────────────────────
        if options["flush"]:
            AutomationRule.objects.filter(organization=org).delete()
            AutomationFlow.objects.filter(organization=org).delete()
            self.stdout.write("  [flush] Cleared automation data")

        # ── 1. AUTOMATION RULES ────────────────────────────────────────────────
        self.stdout.write(self.style.HTTP_INFO("\n[1/4] Seeding automation rules..."))
        created_rules = 0
        for rule_data in RULES:
            _, created = AutomationRule.objects.get_or_create(
                organization=org,
                name=rule_data["name"],
                defaults={
                    "keywords": rule_data["keywords"],
                    "match_type": rule_data["match_type"],
                    "reply_text": rule_data["reply_text"],
                    "priority": rule_data["priority"],
                    "is_active": rule_data["is_active"],
                },
            )
            if created:
                created_rules += 1
        self.stdout.write(f"   + {created_rules} rules created ({len(RULES)} total)")

        # ── 2. AUTOMATION FLOWS ────────────────────────────────────────────────
        self.stdout.write(self.style.HTTP_INFO("\n[2/4] Seeding automation flows..."))
        created_flows = 0
        for flow_data in FLOWS:
            _, created = AutomationFlow.objects.get_or_create(
                organization=org,
                name=flow_data["name"],
                defaults={
                    "trigger_keyword": flow_data["trigger_keyword"],
                    "is_active": flow_data["is_active"],
                    "flow_data": flow_data["flow_data"],
                },
            )
            if created:
                created_flows += 1
        self.stdout.write(f"   + {created_flows} flows created")

        # ── 3. SUBSCRIPTION PLANS + USER SUBSCRIPTION ──────────────────────────
        self.stdout.write(self.style.HTTP_INFO("\n[3/4] Seeding billing plans & subscription..."))

        PLANS = [
            {
                "name": "Starter",
                "plan_type": "FREE",
                "max_bots": 1,
                "max_messages_per_month": 1000,
                "price_monthly": Decimal("0.00"),
                "is_active": True,
            },
            {
                "name": "Pro",
                "plan_type": "PRO",
                "max_bots": 5,
                "max_messages_per_month": 10000,
                "price_monthly": Decimal("49.00"),
                "is_active": True,
            },
            {
                "name": "Enterprise",
                "plan_type": "ENTERPRISE",
                "max_bots": 999,
                "max_messages_per_month": 999999,
                "price_monthly": Decimal("199.00"),
                "is_active": True,
            },
        ]

        plans = {}
        for p in PLANS:
            plan, _ = SubscriptionPlan.objects.update_or_create(
                name=p["name"],
                defaults=p,
            )
            plans[p["plan_type"]] = plan

        # Give owner a Pro subscription with realistic usage
        sub, _ = UserSubscription.objects.update_or_create(
            user=owner,
            defaults={
                "plan": plans["PRO"],
                "bots_created": 2,
                "messages_used_this_month": 7234,
                "is_active": True,
            },
        )
        self.stdout.write(f"   + Plans: {len(plans)} | Subscription: Pro (user: {owner.email})")

        # Payment history
        PAYMENT_DATA = [
            {"amount": Decimal("49.00"), "status": "COMPLETED", "days_ago": 1},
            {"amount": Decimal("49.00"), "status": "COMPLETED", "days_ago": 31},
            {"amount": Decimal("49.00"), "status": "COMPLETED", "days_ago": 61},
            {"amount": Decimal("49.00"), "status": "FAILED", "days_ago": 91},
            {"amount": Decimal("49.00"), "status": "COMPLETED", "days_ago": 121},
            {"amount": Decimal("49.00"), "status": "COMPLETED", "days_ago": 151},
        ]
        for pd in PAYMENT_DATA:
            tx = PaymentTransaction.objects.create(
                user=owner,
                amount=pd["amount"],
                currency="USD",
                status=pd["status"],
                stripe_charge_id=f"ch_demo_{uuid.uuid4().hex[:12]}",
                metadata={"plan": "Pro", "period": "monthly"},
            )
            PaymentTransaction.objects.filter(pk=tx.pk).update(
                created_at=now - _dt.timedelta(days=pd["days_ago"])
            )
        self.stdout.write(f"   + {len(PAYMENT_DATA)} payment history records")

        # ── 4. USER PROFILE + NOTIFICATION PREFS ──────────────────────────────
        self.stdout.write(self.style.HTTP_INFO("\n[4/4] Seeding user profiles & notification prefs..."))
        from apps.organizations.models import OrganizationMember
        members = OrganizationMember.objects.filter(organization=org).select_related("user")
        for member in members:
            profile, _ = UserProfile.objects.get_or_create(
                user=member.user,
                defaults={
                    "phone": fake.phone_number()[:30],
                    "bio": fake.sentence(nb_words=10),
                    "timezone": "Asia/Kolkata",
                },
            )
            NotificationPreferences.objects.get_or_create(
                user=member.user,
                defaults={
                    "email_notifications": True,
                    "whatsapp_alerts": True,
                    "campaign_updates": True,
                    "lead_alerts": True,
                    "system_announcements": True,
                },
            )
        self.stdout.write(f"   + Profiles & prefs for {members.count()} members")

        # ── Summary ────────────────────────────────────────────────────────────
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=" * 50))
        self.stdout.write(self.style.SUCCESS("  ALL MODULES SEEDED SUCCESSFULLY!"))
        self.stdout.write(self.style.SUCCESS("=" * 50))
        self.stdout.write(f"  Org            : {org.name}")
        self.stdout.write(f"  Automation    : {AutomationRule.objects.filter(organization=org).count()} rules, {AutomationFlow.objects.filter(organization=org).count()} flows")
        self.stdout.write(f"  Plans         : {SubscriptionPlan.objects.count()} plans")
        self.stdout.write(f"  Payments      : {PaymentTransaction.objects.filter(user=owner).count()} records")
        self.stdout.write("")

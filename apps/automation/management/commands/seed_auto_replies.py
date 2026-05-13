"""
Management command: seed_auto_replies
Seeds 5 demo AutoReply rules (AutomationRule) for the org.
Usage: python manage.py seed_auto_replies --org-slug rush-pvt-ltd
"""
from django.core.management.base import BaseCommand
from apps.organizations.models import Organization
from apps.automation.models import AutomationRule


DEMO_RULES = [
    {
        "name": "Greeting Auto-Reply",
        "keywords": ["hello", "hi", "hey", "hii", "namaste"],
        "match_type": "contains",
        "reply_text": "Hi! Welcome to our store. How can we help you? 😊\n\nReply with:\n1. Pricing\n2. Place Order\n3. Order Status\n4. Talk to Agent",
        "priority": 10,
    },
    {
        "name": "Pricing Inquiry",
        "keywords": ["price", "pricing", "cost", "rate", "charges", "how much"],
        "match_type": "contains",
        "reply_text": "Our pricing starts at ₹999/month. 💰\n\n✅ Starter — ₹999/mo (1 number, 1000 msgs)\n✅ Pro — ₹2499/mo (3 numbers, unlimited msgs)\n✅ Enterprise — Custom pricing\n\nVisit https://chatflow360.com/pricing for full details or reply DEMO to book a free demo!",
        "priority": 9,
    },
    {
        "name": "Order Status Inquiry",
        "keywords": ["order", "my order", "track", "tracking", "delivery", "status"],
        "match_type": "contains",
        "reply_text": "📦 We'd love to help with your order!\n\nPlease share your:\n• Order ID (e.g. #12345)\n• Registered phone number\n\nOur team will check the status and get back to you within 5 minutes. ⏱",
        "priority": 8,
    },
    {
        "name": "Demo Booking",
        "keywords": ["demo", "trial", "free trial", "try", "show me"],
        "match_type": "contains",
        "reply_text": "🎯 Great! Let's schedule your FREE demo.\n\nBook a 30-min slot here:\n📅 https://calendly.com/chatflow360\n\nOr reply with your preferred time and we'll set it up for you. Our demos usually run Mon-Fri, 10AM-6PM IST.",
        "priority": 7,
    },
    {
        "name": "Business Hours",
        "keywords": ["hours", "timing", "open", "when", "available", "working hours", "time"],
        "match_type": "contains",
        "reply_text": "🕐 Our Business Hours:\n\nMon – Sat: 10:00 AM to 7:00 PM IST\nSunday: Closed\n\nFor urgent queries outside hours, leave a message and we'll respond first thing! 📲",
        "priority": 6,
    },
]


class Command(BaseCommand):
    help = "Seed 5 demo auto-reply rules for a given organization"

    def add_arguments(self, parser):
        parser.add_argument("--org-slug", default="rush-pvt-ltd", help="Organization slug")
        parser.add_argument("--flush", action="store_true", help="Delete existing rules first")

    def handle(self, *args, **options):
        slug = options["org_slug"]
        try:
            org = Organization.objects.get(slug=slug)
        except Organization.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"Organization '{slug}' not found"))
            orgs = Organization.objects.values_list("slug", flat=True)
            self.stdout.write(f"Available: {list(orgs)}")
            return

        if options["flush"]:
            deleted, _ = AutomationRule.objects.filter(organization=org).delete()
            self.stdout.write(f"Deleted {deleted} existing rules.")

        created_count = 0
        for rule_data in DEMO_RULES:
            rule, created = AutomationRule.objects.get_or_create(
                organization=org,
                name=rule_data["name"],
                defaults={
                    "keywords": rule_data["keywords"],
                    "match_type": rule_data["match_type"],
                    "reply_text": rule_data["reply_text"],
                    "priority": rule_data["priority"],
                    "is_active": True,
                },
            )
            if created:
                created_count += 1
                self.stdout.write(f"  Created: {rule.name}")
            else:
                self.stdout.write(f"  Skipped (exists): {rule.name}")

        self.stdout.write(self.style.SUCCESS(
            f"\nDone! Created {created_count} auto-reply rules for '{org.name}'."
        ))

"""
seed_data management command
─────────────────────────────
Populates the database with realistic demo data so every module
(Dashboard, Inbox, Leads, Campaigns, Analytics) works end-to-end.

Usage:
    python manage.py seed_data          # create demo data
    python manage.py seed_data --flush  # wipe seeded data first, then re-seed
"""

import sys
import random
import uuid
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django.db import transaction

from faker import Faker

fake = Faker()

# ── Sample WhatsApp-style messages ──────────────────────────────────────
INBOUND_MESSAGES = [
    "Hi, I'm interested in your services. Can you tell me more?",
    "What's the pricing for the premium plan?",
    "I've been having issues with my current setup. Can you help?",
    "Could you send me the product brochure?",
    "I'd like to schedule a demo for next week.",
    "Thanks for the quick response! I'll discuss this with my team.",
    "We're comparing a few options. What makes you different?",
    "Can I get a trial before committing?",
    "Our team size is about 50 people. Do you have enterprise pricing?",
    "I saw your ad on Instagram. Very impressed!",
    "Do you offer integration with Salesforce?",
    "What's the onboarding process like?",
    "We need multi-language support. Is that available?",
    "Can you handle 10,000+ contacts?",
    "I'd like to speak with someone from your sales team.",
    "We're ready to move forward. What's the next step?",
    "Is there a setup fee?",
    "How does billing work — monthly or annual?",
    "Great, I'll share this with our CEO.",
    "Perfect, let's schedule a call for tomorrow.",
]

OUTBOUND_MESSAGES = [
    "Hello! Thanks for reaching out. I'd be happy to help you.",
    "Our premium plan starts at $49/month. Here's what's included:",
    "I understand your concern. Let me connect you with our technical team.",
    "Absolutely! I'm sending the brochure right now. 📎",
    "Great! I've booked a demo slot for you. Check your email.",
    "You're welcome! Take your time and let me know.",
    "We offer 99.9% uptime, 24/7 support, and native WhatsApp integration.",
    "Yes! We offer a 14-day free trial. Shall I set one up?",
    "For enterprise plans (50+ users), we offer custom pricing. Let me prepare a quote.",
    "Thank you! We'd love to help you grow your business.",
    "Yes, we have a native Salesforce integration. Here's the documentation.",
    "Onboarding typically takes 2-3 days. We assign a dedicated success manager.",
    "We support 28 languages out of the box! 🌍",
    "Absolutely. Our platform handles up to 100K contacts per account.",
    "I'm forwarding your request to our sales lead. They'll reach out shortly.",
    "Here's the agreement for your review. Feel free to ask questions!",
    "No setup fees at all. You only pay your monthly subscription.",
    "We offer both monthly and annual billing. Annual saves you 20%.",
    "That sounds great! Happy to jump on a call with your CEO as well.",
    "Confirmed! I'll send you a calendar invite. Looking forward to it.",
]

CAMPAIGN_TEMPLATES = [
    {
        "name": "Spring Sale 2026",
        "description": "Seasonal promotion for existing customers with 25% discount",
        "message_content": "🌸 Spring Sale! Get 25% off all plans this month. Use code SPRING25. Reply YES to claim!",
        "message_type": "TEXT",
    },
    {
        "name": "Product Launch – ChatBot Pro",
        "description": "Announce new AI chatbot features to all contacts",
        "message_content": "🚀 Exciting news! ChatBot Pro is live with AI-powered replies, smart routing, and analytics. Upgrade today!",
        "message_type": "TEXT",
    },
    {
        "name": "Webinar Invite – Growth Hacking",
        "description": "Invite contacts to upcoming webinar on business growth strategies",
        "message_content": "📢 Free Webinar: 10x Your Leads with WhatsApp Automation. Register now: https://chatflow360.com/webinar",
        "message_type": "TEXT",
    },
    {
        "name": "Customer Feedback Survey",
        "description": "Collect NPS feedback from active customers",
        "message_content": "Hi {{name}}! We value your opinion. How likely are you to recommend us? Reply 1-10.",
        "message_type": "TEMPLATE",
    },
    {
        "name": "Re-engagement Campaign",
        "description": "Win back dormant users who haven't been active in 30+ days",
        "message_content": "We miss you! 🥺 Come back and enjoy a free month on us. Reply COMEBACK to activate.",
        "message_type": "TEXT",
    },
]

LEAD_TITLES = [
    "Enterprise WhatsApp Integration",
    "Retail Chain Automation Setup",
    "Healthcare Appointment Bot",
    "E-commerce Order Tracking",
    "Real Estate Lead Nurturing",
    "Education Institute Onboarding",
    "Restaurant Reservation System",
    "Travel Agency Booking Bot",
    "Insurance Claims Assistant",
    "Banking Customer Support",
    "SaaS Product Demo Request",
    "Logistics Tracking Solution",
]

TAGS_POOL = [
    ["vip", "enterprise"],
    ["new-customer"],
    ["follow-up", "interested"],
    ["priority", "hot-lead"],
    ["returning", "loyal"],
    ["referral"],
    ["support"],
    ["demo-requested"],
]


class Command(BaseCommand):
    help = "Seed the database with realistic demo data for all modules."

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Delete all seeded data before re-seeding.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        # Fix Windows console encoding for emoji-free output
        if sys.platform == 'win32':
            import io
            sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

        from users.models import User
        from apps.organizations.models import Organization, OrganizationMember
        from apps.whatsapp.models import WhatsAppAccount, Contact
        from apps.conversations.models import Conversation, Message, ConversationNote
        from apps.leads.models import Lead, LeadNote
        from apps.campaigns.models import Campaign, CampaignContact
        from subscriptions.models import SubscriptionPlan, UserSubscription
        from payments.models import PaymentTransaction
        from notifications.models import Notification

        if options["flush"]:
            self.stdout.write(self.style.WARNING("[FLUSH] Flushing existing seed data..."))
            CampaignContact.objects.all().delete()
            Campaign.objects.all().delete()
            LeadNote.objects.all().delete()
            Lead.objects.all().delete()
            ConversationNote.objects.all().delete()
            Message.objects.all().delete()
            Conversation.objects.all().delete()
            Contact.objects.all().delete()
            WhatsAppAccount.objects.all().delete()
            # Keep superusers / manually-created users
            User.objects.filter(email__endswith="@demo.chatflow360.com").delete()
            Organization.objects.filter(slug="demo-org").delete()
            SubscriptionPlan.objects.all().delete()
            # UserSubscription is onetoone so it's handled by cascade or just delete all
            UserSubscription.objects.all().delete()
            PaymentTransaction.objects.all().delete()
            Notification.objects.all().delete()
            self.stdout.write(self.style.SUCCESS("   Done.\n"))

        now = timezone.now()

        # ────────────────────────────────────────────────────────────
        #  1. USERS  (1 Admin + 2 Agents)
        # ────────────────────────────────────────────────────────────
        self.stdout.write(self.style.HTTP_INFO("[1/9] Creating users..."))

        admin_user, _ = User.objects.get_or_create(
            email="admin@demo.chatflow360.com",
            defaults={
                "first_name": "Arjun",
                "last_name": "Mehta",
                "role": User.Role.ADMIN,
                "is_staff": True,
                "is_active": True,
            },
        )
        admin_user.set_password("Demo@12345")
        admin_user.save()

        agent1, _ = User.objects.get_or_create(
            email="priya@demo.chatflow360.com",
            defaults={
                "first_name": "Priya",
                "last_name": "Sharma",
                "role": User.Role.USER,
                "is_active": True,
            },
        )
        agent1.set_password("Demo@12345")
        agent1.save()

        agent2, _ = User.objects.get_or_create(
            email="rahul@demo.chatflow360.com",
            defaults={
                "first_name": "Rahul",
                "last_name": "Patel",
                "role": User.Role.USER,
                "is_active": True,
            },
        )
        agent2.set_password("Demo@12345")
        agent2.save()

        agents = [admin_user, agent1, agent2]
        self.stdout.write(f"   + Admin: {admin_user.email}")
        self.stdout.write(f"   + Agent: {agent1.email}")
        self.stdout.write(f"   + Agent: {agent2.email}")

        # ────────────────────────────────────────────────────────────
        #  2. ORGANIZATION + MEMBERS
        # ────────────────────────────────────────────────────────────
        self.stdout.write(self.style.HTTP_INFO("\n[2/9] Creating organization..."))

        org, _ = Organization.objects.get_or_create(
            slug="demo-org",
            defaults={
                "name": "ChatFlow360 Demo",
                "owner": admin_user,
                "is_active": True,
            },
        )
        for idx, user in enumerate(agents):
            role = OrganizationMember.Role.SUPER_ADMIN if idx == 0 else OrganizationMember.Role.AGENT
            OrganizationMember.objects.get_or_create(
                organization=org,
                user=user,
                defaults={"role": role, "is_active": True},
            )

        self.stdout.write(f"   + Organization: {org.name} ({org.slug})")

        # ────────────────────────────────────────────────────────────
        #  3. WHATSAPP ACCOUNT
        # ────────────────────────────────────────────────────────────
        self.stdout.write(self.style.HTTP_INFO("\n[3/9] Creating WhatsApp account..."))

        wa_account, _ = WhatsAppAccount.objects.get_or_create(
            organization=org,
            phone_number_id="100000000000001",
            defaults={
                "display_name": "ChatFlow360 Support",
                "whatsapp_business_account_id": "WABA_DEMO_001",
                "access_token": "DEMO_ACCESS_TOKEN_DO_NOT_USE",
                "webhook_verify_token": "demo_verify_token",
                "is_active": True,
            },
        )
        self.stdout.write(f"   + WhatsApp Account: {wa_account.display_name}")

        # ────────────────────────────────────────────────────────────
        #  4. CONTACTS (15 realistic contacts)
        # ────────────────────────────────────────────────────────────
        self.stdout.write(self.style.HTTP_INFO("\n[4/9] Creating contacts..."))

        contacts = []
        for i in range(15):
            phone = f"+91{fake.unique.random_number(digits=10, fix_len=True)}"
            name = fake.name()
            contact, _ = Contact.objects.get_or_create(
                organization=org,
                phone_number=phone,
                defaults={
                    "name": name,
                    "email": fake.email(),
                    "tags": random.choice(TAGS_POOL),
                    "is_blocked": False,
                    "last_seen": now - timedelta(hours=random.randint(0, 48)),
                },
            )
            contacts.append(contact)
        self.stdout.write(f"   + {len(contacts)} contacts created")

        # ────────────────────────────────────────────────────────────
        #  5. CONVERSATIONS  (12 conversations, mixed statuses)
        # ────────────────────────────────────────────────────────────
        self.stdout.write(self.style.HTTP_INFO("\n[5/9] Creating conversations..."))

        status_distribution = (
            [Conversation.Status.OPEN] * 5
            + [Conversation.Status.ASSIGNED] * 3
            + [Conversation.Status.RESOLVED] * 3
            + [Conversation.Status.SNOOZED] * 1
        )
        conversations = []
        for i, contact in enumerate(contacts[:12]):
            conv_status = status_distribution[i]
            assigned = random.choice(agents) if conv_status != Conversation.Status.OPEN else (
                random.choice(agents) if random.random() > 0.5 else None
            )
            conv = Conversation.objects.create(
                organization=org,
                contact=contact,
                whatsapp_account=wa_account,
                status=conv_status,
                assigned_to=assigned,
                unread_count=random.randint(0, 5) if conv_status == Conversation.Status.OPEN else 0,
                tags=random.choice(TAGS_POOL),
            )
            conversations.append(conv)
        self.stdout.write(f"   + {len(conversations)} conversations created")

        # ────────────────────────────────────────────────────────────
        #  6. MESSAGES  (5–10 per conversation, spread over last 7 days)
        # ────────────────────────────────────────────────────────────
        self.stdout.write(self.style.HTTP_INFO("\n[6/9] Creating messages..."))

        total_msg_count = 0
        delivery_statuses = [
            Message.DeliveryStatus.SENT,
            Message.DeliveryStatus.DELIVERED,
            Message.DeliveryStatus.DELIVERED,
            Message.DeliveryStatus.READ,
            Message.DeliveryStatus.READ,
        ]

        for conv in conversations:
            num_messages = random.randint(5, 10)
            # Start of conversation: random point in last 7 days
            conv_start = now - timedelta(
                days=random.randint(1, 6),
                hours=random.randint(0, 23),
                minutes=random.randint(0, 59),
            )
            last_ts = conv_start

            for j in range(num_messages):
                # Alternate directions with some randomness
                if j == 0:
                    direction = Message.Direction.INBOUND
                elif j == num_messages - 1 and conv.status == Conversation.Status.RESOLVED:
                    direction = Message.Direction.OUTBOUND
                else:
                    direction = random.choice(
                        [Message.Direction.INBOUND, Message.Direction.OUTBOUND]
                    )

                msg_ts = last_ts + timedelta(
                    minutes=random.randint(2, 120),
                    seconds=random.randint(0, 59),
                )
                # Don't go past now
                if msg_ts > now:
                    msg_ts = now - timedelta(minutes=random.randint(1, 30))

                content = (
                    random.choice(INBOUND_MESSAGES)
                    if direction == Message.Direction.INBOUND
                    else random.choice(OUTBOUND_MESSAGES)
                )

                sender = (
                    random.choice(agents)
                    if direction == Message.Direction.OUTBOUND
                    else None
                )

                msg = Message(
                    organization=org,
                    conversation=conv,
                    direction=direction,
                    message_type=Message.MessageType.TEXT,
                    content=content,
                    wa_message_id=f"wamid.demo.{uuid.uuid4().hex[:16]}",
                    sender=sender,
                    delivery_status=random.choice(delivery_statuses),
                )
                msg.save()
                # Override auto_now_add timestamp
                Message.objects.filter(pk=msg.pk).update(created_at=msg_ts)

                last_ts = msg_ts
                total_msg_count += 1

            # Update conversation last_message_at
            conv.last_message_at = last_ts
            conv.save(update_fields=["last_message_at"])

        self.stdout.write(f"   + {total_msg_count} messages created across {len(conversations)} conversations")

        # ────────────────────────────────────────────────────────────
        #  7. CONVERSATION NOTES  (a few internal notes)
        # ────────────────────────────────────────────────────────────
        self.stdout.write(self.style.HTTP_INFO("\n[7/9] Creating conversation notes..."))

        note_texts = [
            "Customer seems very interested. Follow up tomorrow.",
            "Passed to technical team for integration questions.",
            "Pricing objection — offered 15% discount.",
            "Demo scheduled for next Tuesday.",
            "Waiting on customer response to proposal.",
            "Escalated to manager for enterprise pricing approval.",
        ]
        note_count = 0
        for conv in random.sample(conversations, min(6, len(conversations))):
            ConversationNote.objects.create(
                organization=org,
                conversation=conv,
                author=random.choice(agents),
                content=random.choice(note_texts),
            )
            note_count += 1
        self.stdout.write(f"   + {note_count} conversation notes created")

        # ────────────────────────────────────────────────────────────
        #  8. LEADS  (10 leads, mixed stages)
        # ────────────────────────────────────────────────────────────
        self.stdout.write(self.style.HTTP_INFO("\n[8/9] Creating leads..."))

        stages = [
            Lead.Stage.NEW,
            Lead.Stage.NEW,
            Lead.Stage.CONTACTED,
            Lead.Stage.CONTACTED,
            Lead.Stage.INTERESTED,
            Lead.Stage.INTERESTED,
            Lead.Stage.NEGOTIATION,
            Lead.Stage.NEGOTIATION,
            Lead.Stage.CLOSED_WON,
            Lead.Stage.CLOSED_LOST,
        ]
        sources = list(Lead.Source.values)
        leads = []

        for i in range(10):
            contact = contacts[i]
            conv = conversations[i] if i < len(conversations) else None
            stage = stages[i]

            lead = Lead.objects.create(
                organization=org,
                contact=contact,
                conversation=conv,
                title=LEAD_TITLES[i],
                stage=stage,
                source=random.choice(sources),
                assigned_to=random.choice(agents),
                estimated_value=Decimal(random.randint(500, 25000)),
                closed_at=now - timedelta(days=random.randint(1, 5)) if stage in (
                    Lead.Stage.CLOSED_WON, Lead.Stage.CLOSED_LOST
                ) else None,
                tags=random.choice(TAGS_POOL),
                custom_fields={"company": fake.company(), "industry": fake.bs()},
            )
            leads.append(lead)

        self.stdout.write(f"   + {len(leads)} leads created")

        # ── Lead Notes ─────────────────────────────────────────────
        lead_note_texts = [
            "Initial call went well. Sending proposal.",
            "Needs custom integration — checking feasibility.",
            "Budget approved. Moving to contract stage.",
            "Competitor comparison requested.",
            "Follow-up call scheduled for Friday.",
        ]
        lead_note_count = 0
        for lead in random.sample(leads, min(5, len(leads))):
            LeadNote.objects.create(
                organization=org,
                lead=lead,
                author=random.choice(agents),
                content=random.choice(lead_note_texts),
            )
            lead_note_count += 1
        self.stdout.write(f"   + {lead_note_count} lead notes created")

        # ────────────────────────────────────────────────────────────
        #  9. CAMPAIGNS  (5 campaigns with realistic stats)
        # ────────────────────────────────────────────────────────────
        self.stdout.write(self.style.HTTP_INFO("\n[9/9] Creating campaigns..."))

        campaign_statuses = [
            Campaign.Status.COMPLETED,
            Campaign.Status.COMPLETED,
            Campaign.Status.RUNNING,
            Campaign.Status.SCHEDULED,
            Campaign.Status.DRAFT,
        ]

        campaigns = []
        for i, tpl in enumerate(CAMPAIGN_TEMPLATES):
            c_status = campaign_statuses[i]
            total = random.randint(80, 200)
            sent = total if c_status in (Campaign.Status.COMPLETED, Campaign.Status.RUNNING) else 0
            delivered = int(sent * random.uniform(0.88, 0.97)) if sent else 0
            read = int(delivered * random.uniform(0.45, 0.72)) if delivered else 0
            failed = sent - delivered if sent else 0
            replied = int(read * random.uniform(0.10, 0.30)) if read else 0

            started = now - timedelta(days=random.randint(1, 6)) if c_status != Campaign.Status.DRAFT else None
            completed = started + timedelta(hours=random.randint(1, 4)) if c_status == Campaign.Status.COMPLETED else None

            campaign = Campaign.objects.create(
                organization=org,
                name=tpl["name"],
                description=tpl["description"],
                whatsapp_account=wa_account,
                message_type=tpl["message_type"],
                message_content=tpl["message_content"],
                template_name=tpl["name"].replace(" ", "_").lower() if tpl["message_type"] == "TEMPLATE" else "",
                status=c_status,
                scheduled_for=now + timedelta(days=2) if c_status == Campaign.Status.SCHEDULED else started,
                started_at=started,
                completed_at=completed,
                total_recipients=total,
                sent_count=sent,
                delivered_count=delivered,
                read_count=read,
                failed_count=failed,
                replied_count=replied,
            )
            campaigns.append(campaign)

            # Create CampaignContact entries for completed/running campaigns
            if c_status in (Campaign.Status.COMPLETED, Campaign.Status.RUNNING):
                contact_pool = random.sample(contacts, min(total, len(contacts)))
                cc_statuses = [
                    CampaignContact.DeliveryStatus.DELIVERED,
                    CampaignContact.DeliveryStatus.READ,
                    CampaignContact.DeliveryStatus.SENT,
                    CampaignContact.DeliveryStatus.REPLIED,
                    CampaignContact.DeliveryStatus.FAILED,
                ]
                for contact in contact_pool:
                    CampaignContact.objects.create(
                        organization=org,
                        campaign=campaign,
                        contact=contact,
                        status=random.choice(cc_statuses),
                        wa_message_id=f"wamid.campaign.{uuid.uuid4().hex[:12]}",
                        sent_at=started + timedelta(seconds=random.randint(0, 3600)) if started else None,
                    )

        self.stdout.write(f"   + {len(campaigns)} campaigns created")

        # ────────────────────────────────────────────────────────────
        #  10. SUBSCRIPTIONS & PAYMENTS
        # ────────────────────────────────────────────────────────────
        self.stdout.write(self.style.HTTP_INFO("\n[10/11] Creating subscriptions & payments..."))

        free_plan, _ = SubscriptionPlan.objects.get_or_create(
            name="Trial Plan",
            defaults={"plan_type": SubscriptionPlan.Type.FREE, "price_monthly": 0.00, "max_bots": 1, "max_messages_per_month": 100}
        )
        pro_plan, _ = SubscriptionPlan.objects.get_or_create(
            name="Pro Growth",
            defaults={"plan_type": SubscriptionPlan.Type.PRO, "price_monthly": 49.00, "max_bots": 5, "max_messages_per_month": 5000}
        )
        ent_plan, _ = SubscriptionPlan.objects.get_or_create(
            name="Enterprise Elite",
            defaults={"plan_type": SubscriptionPlan.Type.ENTERPRISE, "price_monthly": 199.00, "max_bots": 50, "max_messages_per_month": 100000}
        )

        # Assign plans
        UserSubscription.objects.get_or_create(user=admin_user, defaults={"plan": ent_plan, "bots_created": 3, "messages_used_this_month": 450})
        UserSubscription.objects.get_or_create(user=agent1, defaults={"plan": pro_plan, "bots_created": 1, "messages_used_this_month": 120})
        UserSubscription.objects.get_or_create(user=agent2, defaults={"plan": pro_plan, "bots_created": 1, "messages_used_this_month": 90})

        # Create some payments
        for agent in agents:
            for _ in range(random.randint(2, 4)):
                PaymentTransaction.objects.create(
                    user=agent,
                    amount=random.choice([Decimal("49.00"), Decimal("199.00")]),
                    status=PaymentTransaction.Status.COMPLETED,
                    created_at=now - timedelta(days=random.randint(1, 45))
                )
        self.stdout.write("   + Subscription plans and transactions created")

        # ────────────────────────────────────────────────────────────
        #  11. NOTIFICATIONS
        # ────────────────────────────────────────────────────────────
        self.stdout.write(self.style.HTTP_INFO("\n[11/11] Creating notifications..."))
        notif_titles = [
            ("New Lead Assigned", "You have been assigned a new lead: Green Valley Retail.", Notification.Type.SUCCESS),
            ("Low Credits Warning", "Your message credits are below 10%. Please top up.", Notification.Type.ALERT),
            ("Campaign Completed", "Your 'Spring Sale' campaign has finished sending.", Notification.Type.INFO),
            ("Payment Successful", "Your monthly subscription has been renewed.", Notification.Type.SUCCESS),
        ]
        
        for agent in agents:
            for title, msg, n_type in notif_titles:
                Notification.objects.create(
                    user=agent,
                    title=title,
                    message=msg,
                    type=n_type,
                    is_read=random.choice([True, False])
                )
        self.stdout.write("   + Notifications created")

        # ────────────────────────────────────────────────────────────
        #  SUMMARY
        # ────────────────────────────────────────────────────────────
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=" * 56))
        self.stdout.write(self.style.SUCCESS("  SEED DATA CREATED SUCCESSFULLY!"))
        self.stdout.write(self.style.SUCCESS("=" * 56))
        self.stdout.write("")
        self.stdout.write(f"  Users:          3  (1 Admin, 2 Agents)")
        self.stdout.write(f"  Organization:   {org.name}")
        self.stdout.write(f"  Contacts:       {len(contacts)}")
        self.stdout.write(f"  Conversations:  {len(conversations)}")
        self.stdout.write(f"  Messages:       {total_msg_count}")
        self.stdout.write(f"  Leads:          {len(leads)}")
        self.stdout.write(f"  Campaigns:      {len(campaigns)}")
        self.stdout.write("")
        self.stdout.write(self.style.HTTP_INFO("  Login credentials:"))
        self.stdout.write(f"  Admin  ->  admin@demo.chatflow360.com / Demo@12345")
        self.stdout.write(f"  Agent  ->  priya@demo.chatflow360.com / Demo@12345")
        self.stdout.write(f"  Agent  ->  rahul@demo.chatflow360.com / Demo@12345")
        self.stdout.write("")

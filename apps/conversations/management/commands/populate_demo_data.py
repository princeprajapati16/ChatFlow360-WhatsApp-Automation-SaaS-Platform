"""
populate_demo_data management command
──────────────────────────────────────
Creates realistic demo data for the ChatFlow360 dashboard:
  • 30 days of Message data with daily peaks and dips
  • 10 demo Conversations (mix of open and resolved)
  • 8 demo Leads with different statuses and sources
  • 3 demo Campaigns with realistic delivery/read stats

Usage:
    python manage.py populate_demo_data
    python manage.py populate_demo_data --flush   # wipe first, then re-seed
    python manage.py populate_demo_data --org-slug demo-org
"""

import sys
import random
import uuid
from datetime import timedelta, time as dt_time
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

from faker import Faker

fake = Faker()

# ── Message content pools ────────────────────────────────────────────────────
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
]

OUTBOUND_MESSAGES = [
    "Hello! Thanks for reaching out. I'd be happy to help you.",
    "Our premium plan starts at $49/month. Here's what's included:",
    "I understand your concern. Let me connect you with our technical team.",
    "Absolutely! I'm sending the brochure right now.",
    "Great! I've booked a demo slot for you. Check your email.",
    "You're welcome! Take your time and let me know.",
    "We offer 99.9% uptime, 24/7 support, and native WhatsApp integration.",
    "Yes! We offer a 14-day free trial. Shall I set one up?",
    "For enterprise plans (50+ users), we offer custom pricing. Let me prepare a quote.",
    "Thank you! We'd love to help you grow your business.",
    "Yes, we have a native Salesforce integration. Here's the documentation.",
    "Onboarding typically takes 2-3 days. We assign a dedicated success manager.",
    "We support 28 languages out of the box!",
    "Absolutely. Our platform handles up to 100K contacts per account.",
    "I'm forwarding your request to our sales lead. They'll reach out shortly.",
    "Here's the agreement for your review. Feel free to ask questions!",
    "No setup fees at all. You only pay your monthly subscription.",
]

# ── Campaign templates ────────────────────────────────────────────────────────
CAMPAIGN_TEMPLATES = [
    {
        "name": "Summer Flash Sale 2026",
        "description": "Seasonal promotion for existing customers – 30% discount",
        "message_content": "Summer Flash Sale! Get 30% off all plans. Use code SUMMER30. Reply YES to claim!",
        "message_type": "TEXT",
        "status": "COMPLETED",
    },
    {
        "name": "Product Launch – AI Inbox",
        "description": "Announce new AI inbox feature to all active contacts",
        "message_content": "Exciting news! AI Inbox is live: smart routing, auto-replies, and real-time analytics. Upgrade today!",
        "message_type": "TEXT",
        "status": "RUNNING",
    },
    {
        "name": "Webinar Invite – WhatsApp Growth",
        "description": "Invite contacts to upcoming webinar on WhatsApp automation",
        "message_content": "Free Webinar: 10x Your Leads with WhatsApp Automation. Register: https://chatflow360.com/webinar",
        "message_type": "TEXT",
        "status": "DRAFT",
    },
]

# ── Lead data ─────────────────────────────────────────────────────────────────
LEAD_DATA = [
    {"title": "Enterprise WhatsApp Integration",   "stage": "NEW",         "source": "WHATSAPP"},
    {"title": "Retail Chain Automation Setup",     "stage": "NEW",         "source": "CAMPAIGN"},
    {"title": "Healthcare Appointment Bot",        "stage": "CONTACTED",   "source": "MANUAL"},
    {"title": "E-commerce Order Tracking",         "stage": "CONTACTED",   "source": "IMPORT"},
    {"title": "Real Estate Lead Nurturing",        "stage": "INTERESTED",  "source": "WHATSAPP"},
    {"title": "Education Institute Onboarding",   "stage": "NEGOTIATION", "source": "CAMPAIGN"},
    {"title": "Restaurant Reservation System",    "stage": "CLOSED_WON",  "source": "MANUAL"},
    {"title": "Travel Agency Booking Bot",        "stage": "CLOSED_LOST", "source": "IMPORT"},
]

# ── Daily traffic multipliers (0=Mon … 6=Sun) ─────────────────────────────────
WEEKDAY_MULTIPLIER = {0: 1.0, 1: 1.1, 2: 1.2, 3: 1.15, 4: 1.05, 5: 0.65, 6: 0.45}

# Peak hours for message bursts (24h)
PEAK_HOURS = [9, 10, 11, 14, 15, 16, 17]


def _random_ts_in_day(base_date, hour_weights=None):
    """Return a timezone-aware datetime within a given date."""
    if hour_weights and random.random() < 0.7:
        hour = random.choice(PEAK_HOURS)
    else:
        hour = random.randint(8, 22)
    minute = random.randint(0, 59)
    second = random.randint(0, 59)
    naive = base_date.replace(hour=hour, minute=minute, second=second, microsecond=0)
    return timezone.make_aware(naive) if timezone.is_naive(naive) else naive


class Command(BaseCommand):
    help = "Populate the database with realistic 30-day demo data for the dashboard."

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Delete all previously seeded data before repopulating.",
        )
        parser.add_argument(
            "--org-slug",
            default="demo-org",
            help="Slug of the Organization to attach demo data to (default: demo-org).",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        # Fix Windows console encoding
        if sys.platform == "win32":
            import io
            sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

        from users.models import User
        from apps.organizations.models import Organization, OrganizationMember
        from apps.whatsapp.models import WhatsAppAccount, Contact
        from apps.conversations.models import Conversation, Message, ConversationNote
        from apps.leads.models import Lead, LeadNote
        from apps.campaigns.models import Campaign, CampaignContact

        org_slug = options["org_slug"]
        now = timezone.now()

        # ── Optional flush ────────────────────────────────────────────────────
        if options["flush"]:
            self.stdout.write(self.style.WARNING("[FLUSH] Removing previous demo data..."))
            try:
                org = Organization.objects.get(slug=org_slug)
                CampaignContact.objects.filter(organization=org).delete()
                Campaign.objects.filter(organization=org).delete()
                LeadNote.objects.filter(organization=org).delete()
                Lead.objects.filter(organization=org).delete()
                ConversationNote.objects.filter(organization=org).delete()
                Message.objects.filter(organization=org).delete()
                Conversation.objects.filter(organization=org).delete()
                Contact.objects.filter(organization=org).delete()
                WhatsAppAccount.objects.filter(organization=org).delete()
                self.stdout.write(self.style.SUCCESS("   Done.\n"))
            except Organization.DoesNotExist:
                self.stdout.write("   No existing org found – skipping flush.\n")

        # ── 1. Ensure demo user + org exist ──────────────────────────────────
        self.stdout.write(self.style.HTTP_INFO("[1/6] Ensuring demo user and organization..."))

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

        org, _ = Organization.objects.get_or_create(
            slug=org_slug,
            defaults={"name": "ChatFlow360 Demo", "owner": admin_user, "is_active": True},
        )

        for idx, user in enumerate(agents):
            role = (
                OrganizationMember.Role.SUPER_ADMIN
                if idx == 0
                else OrganizationMember.Role.AGENT
            )
            OrganizationMember.objects.get_or_create(
                organization=org,
                user=user,
                defaults={"role": role, "is_active": True},
            )

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
        self.stdout.write(f"   Org: {org.name}  |  WA: {wa_account.display_name}")

        # ── 2. Indian Contacts + Scripted Hinglish Conversations ─────────────
        self.stdout.write(self.style.HTTP_INFO("\n[2/6] Creating Indian contacts and conversations..."))

        import datetime

        INDIAN_CONVOS = [
            {
                "name": "Rahul Sharma", "phone": "+919876543210",
                "status": "OPEN", "unread": 3,
                "tags": ["new-customer"],
                "messages": [
                    (0, "INBOUND",  "Bhai mera order kab aayega? 3 din ho gaye hain"),
                    (0, "OUTBOUND", "Hello Rahul ji! Aapka order check karta hoon abhi."),
                    (0, "INBOUND",  "Haan please jaldi batao, urgent hai"),
                    (0, "OUTBOUND", "Aapka order dispatch ho gaya hai. Kal tak deliver ho jayega."),
                    (1, "INBOUND",  "Kitna time lagega delivery mein exactly?"),
                    (1, "OUTBOUND", "Standard delivery 2-3 working days. Aapke area mein kal 5 baje tak."),
                    (1, "INBOUND",  "COD available hai kya? Maine online payment nahi ki thi."),
                    (1, "OUTBOUND", "Haan COD available hai. Delivery boy cash lega aapke paas se."),
                    (2, "INBOUND",  "Ek aur item add kar sakta hoon order mein?"),
                    (2, "OUTBOUND", "Iss order mein nahi, lekin aap naya order place kar sakte ho. Link bhej raha hoon."),
                ],
            },
            {
                "name": "Priya Patel", "phone": "+918765432109",
                "status": "OPEN", "unread": 2,
                "tags": ["interested"],
                "messages": [
                    (2, "INBOUND",  "Hello, aapka pricing kya hai? Website pe nahi dikh raha."),
                    (2, "OUTBOUND", "Hi Priya ji! Hamare plans ₹999/month se start hote hain. Details bhejta hoon."),
                    (2, "INBOUND",  "Starter plan mein kitne WhatsApp numbers add kar sakte hain?"),
                    (2, "OUTBOUND", "Starter plan mein 2 numbers, Pro mein 5 numbers allowed hain."),
                    (3, "INBOUND",  "Demo de sakte ho? Live dekhna chahti hoon features."),
                    (3, "OUTBOUND", "Bilkul! Kab free hain aap? Kal 3-4 PM kaisa rahega?"),
                    (3, "INBOUND",  "Kal 3 PM theek hai. Zoom call pe karein?"),
                    (3, "OUTBOUND", "Perfect! Zoom link bhej rahi hoon email pe. Confirm karein please."),
                    (4, "INBOUND",  "WhatsApp pe baat kar sakte hain? Zoom nahi open ho raha."),
                    (4, "OUTBOUND", "Haan bilkul! Is number pe call kar sakte ho ya video call bhi chal sakti hai."),
                ],
            },
            {
                "name": "Amit Verma", "phone": "+917654321098",
                "status": "ASSIGNED", "unread": 0,
                "tags": ["enterprise", "hot-lead"],
                "messages": [
                    (3, "INBOUND",  "Mujhe enterprise plan chahiye. 50+ team members hain hamare."),
                    (3, "OUTBOUND", "Namaste Amit ji! Enterprise plan ke liye alag pricing hai. Details discuss karein?"),
                    (3, "INBOUND",  "Haan jaroor. Custom pricing available hai kya?"),
                    (3, "OUTBOUND", "Haan, 50+ users ke liye custom quote bana sakte hain. Company name bataiye?"),
                    (4, "INBOUND",  "TechSoft Solutions Pvt Ltd. Team ke liye kitne agents add kar sakte hain?"),
                    (4, "OUTBOUND", "Enterprise plan mein unlimited agents hain. Aapki full team set kar sakte hain."),
                    (4, "INBOUND",  "Trial available hai? Pehle test karna chahte hain."),
                    (4, "OUTBOUND", "14 din ka free trial dete hain enterprise clients ko. Aaj se shuru kar sakte hain."),
                    (5, "INBOUND",  "Data security kaisi hai? Client data secure rehta hai?"),
                    (5, "OUTBOUND", "Haan, end-to-end encryption hai. SOC 2 certified hain hum. Documents bhejta hoon."),
                    (5, "INBOUND",  "Good. Proposal send karo please with full pricing."),
                    (5, "OUTBOUND", "Aaj shaam tak detailed proposal email pe bhej deta hoon Amit ji."),
                ],
            },
            {
                "name": "Sneha Joshi", "phone": "+919543210987",
                "status": "OPEN", "unread": 4,
                "tags": ["support"],
                "messages": [
                    (4, "INBOUND",  "Mera account login nahi ho raha. Please help karo."),
                    (4, "OUTBOUND", "Hi Sneha ji, koi baat nahi! Error message kya aa raha hai?"),
                    (4, "INBOUND",  "Incorrect password likh raha hai but password sahi hai mera."),
                    (4, "OUTBOUND", "Aapka account temporarily lock ho gaya hai. 5 min baad try karein."),
                    (5, "INBOUND",  "5 min baad bhi same issue aa raha hai."),
                    (5, "OUTBOUND", "Ok, password reset karte hain. Email id confirm karein please."),
                    (5, "INBOUND",  "sneha.joshi@gmail.com hai mera email."),
                    (5, "OUTBOUND", "Reset link bhej diya hai. 10 min mein expire ho jayega."),
                    (6, "INBOUND",  "Password reset kaise karu? Link nahi mila."),
                    (6, "OUTBOUND", "Spam folder check karein. Fir bhi nahi mila? Support se baat karein."),
                    (6, "INBOUND",  "Support se baat karni hai live. Koi number hai?"),
                    (6, "OUTBOUND", "Haan! +91-9876500000 pe call karein 9AM-6PM mein. Ya is chat pe continue karein."),
                ],
            },
            {
                "name": "Ravi Mehta", "phone": "+919123456789",
                "status": "ASSIGNED", "unread": 1,
                "tags": ["campaign"],
                "messages": [
                    (1, "INBOUND",  "Campaign bhejne ka feature hai aapke platform mein?"),
                    (1, "OUTBOUND", "Haan Ravi ji! Bulk WhatsApp campaigns bhej sakte ho. Kitne contacts hain aapke?"),
                    (1, "INBOUND",  "Abhi 500 contacts hain, badhenge 2000 tak."),
                    (1, "OUTBOUND", "Pro plan perfect rahega aapke liye — 10,000 contacts support karta hai."),
                    (2, "INBOUND",  "Bulk message kaise bhejein? Tutorial hai kya?"),
                    (2, "OUTBOUND", "Haan! Campaign section mein jao, contacts upload karo CSV se, message likho, send!"),
                    (2, "INBOUND",  "Template approval lagta hai WhatsApp ka?"),
                    (2, "OUTBOUND", "Marketing messages ke liye haan, lekin conversational messages direct bhej sakte ho."),
                    (3, "INBOUND",  "1000 contacts ko ek saath message kar sakte hain?"),
                    (3, "OUTBOUND", "Bilkul! Ek campaign mein 1000+ contacts ko ek saath message bhej sakte hain."),
                ],
            },
            {
                "name": "Kavita Singh", "phone": "+918234567890",
                "status": "RESOLVED", "unread": 0,
                "tags": ["salon", "automation"],
                "messages": [
                    (5, "INBOUND",  "Hello! Salon ke liye kaam karega aapka platform?"),
                    (5, "OUTBOUND", "Namaste Kavita ji! Haan, bahut accha kaam karta hai salons ke liye!"),
                    (5, "INBOUND",  "Appointment reminder bhej sakte ho customers ko automatically?"),
                    (5, "OUTBOUND", "Bilkul! Automation se 24h pehle reminder, aur no-show ke baad follow-up bhi."),
                    (6, "INBOUND",  "Auto reply set karna hai 'BOOK' keyword ke liye."),
                    (6, "OUTBOUND", "Automation section mein keyword rule bana sakte ho. Step-by-step guide bhejta hoon."),
                    (6, "INBOUND",  "Guide mil gayi, bahut helpful hai. Ek aur cheez — multiple services add ho sakti hain?"),
                    (6, "OUTBOUND", "Haan! Unlimited services add kar sakte ho. Alag alag auto-reply rules bhi bana sakte ho."),
                    (7, "INBOUND",  "Perfect! Trial start karna hai. Free trial hai kya?"),
                    (7, "OUTBOUND", "7 din ka free trial hai Starter plan mein! Abhi sign up karein."),
                    (7, "INBOUND",  "Done! Sign up kar liya. Thank you itni help ke liye! 🙏"),
                    (7, "OUTBOUND", "Welcome Kavita ji! Koi bhi problem ho toh yahan message karein. 😊"),
                ],
            },
        ]

        # Extra 14 random contacts for leads/campaigns
        extra_contacts = []
        for _ in range(14):
            phone = f"+91{fake.unique.random_number(digits=10, fix_len=True)}"
            contact, _ = Contact.objects.get_or_create(
                organization=org,
                phone_number=phone,
                defaults={"name": fake.name(), "email": fake.email(), "is_blocked": False},
            )
            extra_contacts.append(contact)

        # Build conversations
        contacts = []  # main contacts list for later use
        conversations = []
        total_msg_count = 0

        status_map = {
            "OPEN":     Conversation.Status.OPEN,
            "ASSIGNED": Conversation.Status.ASSIGNED,
            "RESOLVED": Conversation.Status.RESOLVED,
        }
        assigned_agents = [agent1, agent2]

        for idx, cdata in enumerate(INDIAN_CONVOS):
            contact, _ = Contact.objects.get_or_create(
                organization=org,
                phone_number=cdata["phone"],
                defaults={
                    "name": cdata["name"],
                    "email": f"{cdata['name'].split()[0].lower()}@example.com",
                    "is_blocked": False,
                    "last_seen": now - timedelta(hours=random.randint(0, 48)),
                },
            )
            contacts.append(contact)

            assigned = assigned_agents[idx % 2] if cdata["status"] in ("ASSIGNED", "RESOLVED") else None

            conv = Conversation.objects.create(
                organization=org,
                contact=contact,
                whatsapp_account=wa_account,
                status=status_map[cdata["status"]],
                assigned_to=assigned,
                unread_count=cdata["unread"],
                tags=cdata["tags"],
            )
            conversations.append(conv)

            # Create scripted messages
            msg_objs = []
            for (day_back, direction, content) in cdata["messages"]:
                base_dt = datetime.datetime(
                    (now - timedelta(days=day_back)).year,
                    (now - timedelta(days=day_back)).month,
                    (now - timedelta(days=day_back)).day,
                    random.randint(9, 21),
                    random.randint(0, 59),
                    random.randint(0, 59),
                    tzinfo=datetime.timezone.utc,
                )
                sender_obj = random.choice(assigned_agents) if direction == "OUTBOUND" else None
                msg = Message(
                    organization=org,
                    conversation=conv,
                    direction=direction,
                    message_type=Message.MessageType.TEXT,
                    content=content,
                    wa_message_id=f"wamid.demo.{uuid.uuid4().hex[:16]}",
                    sender=sender_obj,
                    delivery_status=(
                        Message.DeliveryStatus.READ
                        if direction == "OUTBOUND"
                        else Message.DeliveryStatus.DELIVERED
                    ),
                )
                msg_objs.append((msg, base_dt))

            created_msgs = Message.objects.bulk_create([m for m, _ in msg_objs], batch_size=200)
            for i, created_msg in enumerate(created_msgs):
                _, ts = msg_objs[i]
                Message.objects.filter(pk=created_msg.pk).update(created_at=ts)

            total_msg_count += len(msg_objs)

            # Update conversation last_message_at
            last_msg = conv.messages.order_by("-created_at").first()
            if last_msg:
                conv.last_message_at = last_msg.created_at
                conv.save(update_fields=["last_message_at"])

        # Add extra contacts to pool
        contacts.extend(extra_contacts)
        self.stdout.write(f"   + {len(INDIAN_CONVOS)} conversations with {total_msg_count} Hinglish messages")


        # ── 5. Leads (8 leads, varied statuses + sources) ────────────────────
        self.stdout.write(self.style.HTTP_INFO("\n[5/6] Creating leads..."))

        leads = []
        for i, lead_info in enumerate(LEAD_DATA):
            contact = contacts[i + 6]  # use extra contacts (indices 6-19)
            conv = conversations[i] if i < len(conversations) else None
            stage = lead_info["stage"]

            lead = Lead.objects.create(
                organization=org,
                contact=contact,
                conversation=conv,
                title=lead_info["title"],
                stage=stage,
                source=lead_info["source"],
                assigned_to=random.choice([admin_user, agent1, agent2]),
                estimated_value=Decimal(random.randint(500, 30000)),
                closed_at=(
                    now - timedelta(days=random.randint(1, 10))
                    if stage in ("CLOSED_WON", "CLOSED_LOST")
                    else None
                ),
                tags=random.choice([["hot-lead"], ["referral"], ["vip"], ["follow-up"]]),
                custom_fields={"company": fake.company(), "industry": fake.bs()},
            )
            leads.append(lead)

            # Add a note to some leads
            if random.random() > 0.4:
                LeadNote.objects.create(
                    organization=org,
                    lead=lead,
                    author=random.choice(agents),
                    content=random.choice([
                        "Initial call went well. Sending proposal.",
                        "Budget approved. Moving to contract stage.",
                        "Needs custom integration — checking feasibility.",
                        "Follow-up call scheduled for Friday.",
                        "Competitor comparison requested.",
                    ]),
                )

        self.stdout.write(f"   + {len(leads)} leads")

        # ── 6. Campaigns (3 with realistic stats) ────────────────────────────
        self.stdout.write(self.style.HTTP_INFO("\n[6/6] Creating campaigns..."))

        campaigns = []
        for tpl in CAMPAIGN_TEMPLATES:
            c_status = tpl["status"]
            total = random.randint(80, 250)
            is_active = c_status in ("COMPLETED", "RUNNING")
            sent = total if is_active else 0
            delivered = int(sent * random.uniform(0.88, 0.97)) if sent else 0
            read = int(delivered * random.uniform(0.45, 0.72)) if delivered else 0
            failed = sent - delivered if sent else 0
            replied = int(read * random.uniform(0.10, 0.25)) if read else 0

            started = now - timedelta(days=random.randint(2, 10)) if is_active else None
            completed = (
                started + timedelta(hours=random.randint(1, 5))
                if c_status == "COMPLETED"
                else None
            )

            campaign = Campaign.objects.create(
                organization=org,
                name=tpl["name"],
                description=tpl["description"],
                whatsapp_account=wa_account,
                message_type=tpl["message_type"],
                message_content=tpl["message_content"],
                status=c_status,
                scheduled_for=now + timedelta(days=3) if c_status == "DRAFT" else started,
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

            # CampaignContact rows for active campaigns
            if is_active:
                cc_statuses = [
                    CampaignContact.DeliveryStatus.DELIVERED,
                    CampaignContact.DeliveryStatus.READ,
                    CampaignContact.DeliveryStatus.SENT,
                    CampaignContact.DeliveryStatus.REPLIED,
                    CampaignContact.DeliveryStatus.FAILED,
                ]
                for contact in random.sample(contacts, min(total, len(contacts))):
                    CampaignContact.objects.create(
                        organization=org,
                        campaign=campaign,
                        contact=contact,
                        status=random.choice(cc_statuses),
                        wa_message_id=f"wamid.camp.{uuid.uuid4().hex[:12]}",
                        sent_at=started + timedelta(seconds=random.randint(0, 3600))
                        if started
                        else None,
                    )

        self.stdout.write(f"   + {len(campaigns)} campaigns")

        # ── Summary ───────────────────────────────────────────────────────────
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=" * 54))
        self.stdout.write(self.style.SUCCESS("  DEMO DATA POPULATED SUCCESSFULLY!"))
        self.stdout.write(self.style.SUCCESS("=" * 54))
        self.stdout.write(f"  Organization : {org.name}")
        self.stdout.write(f"  Contacts     : {len(contacts)}")
        self.stdout.write(f"  Conversations: {len(conversations)} (mix of open/resolved)")
        self.stdout.write(f"  Messages     : {total_msg_count} across 30 days")
        self.stdout.write(f"  Leads        : {len(leads)}")
        self.stdout.write(f"  Campaigns    : {len(campaigns)}")
        self.stdout.write("")
        self.stdout.write(self.style.HTTP_INFO("  Login credentials:"))
        self.stdout.write("  Admin -> admin@demo.chatflow360.com / Demo@12345")
        self.stdout.write("  Agent -> priya@demo.chatflow360.com  / Demo@12345")
        self.stdout.write("  Agent -> rahul@demo.chatflow360.com  / Demo@12345")
        self.stdout.write("")

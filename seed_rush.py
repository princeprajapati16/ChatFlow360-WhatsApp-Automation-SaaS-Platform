import random
import uuid
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone
from users.models import User
from apps.organizations.models import Organization, OrganizationMember
from apps.whatsapp.models import WhatsAppAccount, Contact
from apps.conversations.models import Conversation, Message
from apps.leads.models import Lead
from apps.campaigns.models import Campaign, CampaignContact
from subscriptions.models import SubscriptionPlan, UserSubscription
from payments.models import PaymentTransaction
from notifications.models import Notification
from faker import Faker

fake = Faker()
now = timezone.now()

def seed_org(org):
    print(f"Seeding for {org.name}...")
    
    # 1. WhatsApp Account
    wa_account, _ = WhatsAppAccount.objects.get_or_create(
        organization=org,
        phone_number_id="100000000000002",
        defaults={
            "display_name": "Rush Support Line",
            "whatsapp_business_account_id": "WABA_RUSH_001",
            "access_token": "RUSH_ACCESS_TOKEN",
            "is_active": True,
        },
    )

    # 2. Contacts
    contacts = []
    for i in range(15):
        phone = f"+91{fake.unique.random_number(digits=10, fix_len=True)}"
        contact, _ = Contact.objects.get_or_create(
            organization=org,
            phone_number=phone,
            defaults={
                "name": fake.name(),
                "email": fake.email(),
                "last_seen": now - timedelta(hours=random.randint(0, 48)),
            },
        )
        contacts.append(contact)

    # 3. Conversations & Messages
    for i, contact in enumerate(contacts[:10]):
        conv = Conversation.objects.create(
            organization=org,
            contact=contact,
            whatsapp_account=wa_account,
            status=random.choice([Conversation.Status.OPEN, Conversation.Status.ASSIGNED, Conversation.Status.RESOLVED]),
            assigned_to=org.owner,
            last_message_at=now,
        )
        
        for j in range(random.randint(5, 10)):
            msg_ts = now - timedelta(days=random.randint(0, 6), hours=random.randint(0, 23))
            direction = random.choice([Message.Direction.INBOUND, Message.Direction.OUTBOUND])
            msg = Message.objects.create(
                organization=org,
                conversation=conv,
                direction=direction,
                content=fake.sentence(),
                sender=org.owner if direction == Message.Direction.OUTBOUND else None,
            )
            # Override created_at
            Message.objects.filter(pk=msg.pk).update(created_at=msg_ts)

    # 4. Leads
    stages = [s[0] for s in Lead.Stage.choices]
    for i in range(10):
        Lead.objects.create(
            organization=org,
            contact=contacts[i],
            title=f"Rush Deal #{i+1}",
            stage=random.choice(stages),
            source=Lead.Source.WHATSAPP,
            assigned_to=org.owner,
            estimated_value=Decimal(random.randint(1000, 50000)),
        )

    # 5. Campaigns
    for i in range(3):
        Campaign.objects.create(
            organization=org,
            name=f"Rush Promo {i+1}",
            whatsapp_account=wa_account,
            status=Campaign.Status.COMPLETED,
            total_recipients=100,
            sent_count=95,
            delivered_count=90,
            read_count=60,
            replied_count=15,
        )

    print(f"Done for {org.name}")

# Run
org = Organization.objects.get(name='Rush PVT L.T.D.')
seed_org(org)

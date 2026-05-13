import random
import uuid
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.organizations.models import Organization, OrganizationMember
from apps.whatsapp.models import WhatsAppAccount, Contact
from apps.conversations.models import Conversation, Message
from apps.leads.models import Lead
from apps.campaigns.models import Campaign
from faker import Faker

fake = Faker()
User = get_user_model()

class Command(BaseCommand):
    help = "Generate demo data for ChatFlow360"

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Starting demo data generation..."))

        # 1. Admin and Users
        self.stdout.write("Creating users...")
        admin_email = "admin@chatflow360.com"
        user1_email = "user1@chatflow360.com"
        user2_email = "user2@chatflow360.com"

        admin, created = User.objects.get_or_create(
            email=admin_email,
            defaults={
                "first_name": "Admin",
                "last_name": "User",
                "role": User.Role.ADMIN,
                "is_staff": True,
                "is_superuser": True,
            },
        )
        if created:
            admin.set_password("admin123")
            admin.save()

        u1, created = User.objects.get_or_create(
            email=user1_email,
            defaults={
                "first_name": "John",
                "last_name": "Doe",
                "role": User.Role.USER,
            },
        )
        if created:
            u1.set_password("user123")
            u1.save()

        u2, created = User.objects.get_or_create(
            email=user2_email,
            defaults={
                "first_name": "Jane",
                "last_name": "Smith",
                "role": User.Role.USER,
            },
        )
        if created:
            u2.set_password("user223")
            u2.save()

        # 2. Organization
        org, created = Organization.objects.get_or_create(
            slug="demo-org",
            defaults={
                "name": "Demo Corporation",
                "owner": admin,
                "is_active": True,
            },
        )

        # Ensure membership
        OrganizationMember.objects.get_or_create(
            organization=org, user=admin, defaults={"role": OrganizationMember.Role.SUPER_ADMIN}
        )
        OrganizationMember.objects.get_or_create(
            organization=org, user=u1, defaults={"role": OrganizationMember.Role.AGENT}
        )
        OrganizationMember.objects.get_or_create(
            organization=org, user=u2, defaults={"role": OrganizationMember.Role.AGENT}
        )

        # 3. WhatsApp Account
        wa_account, created = WhatsAppAccount.objects.get_or_create(
            organization=org,
            phone_number_id="109283746554321",
            defaults={
                "display_name": "Main Support Line",
                "whatsapp_business_account_id": "987654321012345",
                "access_token": "EAAG...",
                "is_active": True,
            },
        )

        # 4. Contacts (for leads and conversations)
        self.stdout.write("Creating contacts...")
        contacts = []
        for _ in range(15):
            phone = fake.phone_number()[:30]
            contact = Contact.objects.create(
                organization=org,
                phone_number=phone,
                name=fake.name(),
                email=fake.email(),
                last_seen=timezone.now() - timedelta(days=random.randint(0, 5)),
            )
            contacts.append(contact)

        # 5. Leads (10 with different statuses)
        self.stdout.write("Creating leads...")
        stages = [s[0] for s in Lead.Stage.choices]
        for i in range(10):
            Lead.objects.create(
                organization=org,
                contact=contacts[i],
                title=f"Interested in {fake.word().capitalize()} Solution",
                stage=random.choice(stages),
                source=random.choice([s[0] for s in Lead.Source.choices]),
                assigned_to=random.choice([admin, u1, u2]),
                estimated_value=random.randint(1000, 10000),
            )

        # 6. Conversations (10 with messages, last 7 days)
        self.stdout.write("Creating conversations and messages...")
        for i in range(10):
            conv = Conversation.objects.create(
                organization=org,
                contact=contacts[i+2], # Use different contacts
                whatsapp_account=wa_account,
                assigned_to=random.choice([u1, u2]),
                status=random.choice([s[0] for s in Conversation.Status.choices]),
                last_message_at=timezone.now(),
            )
            
            # Create messages for the last 7 days
            num_messages = random.randint(5, 12)
            for j in range(num_messages):
                days_ago = random.randint(0, 6)
                hours_ago = random.randint(0, 23)
                msg_time = timezone.now() - timedelta(days=days_ago, hours=hours_ago)
                
                direction = random.choice([Message.Direction.INBOUND, Message.Direction.OUTBOUND])
                sender = None
                if direction == Message.Direction.OUTBOUND:
                    sender = conv.assigned_to

                msg = Message.objects.create(
                    organization=org,
                    conversation=conv,
                    direction=direction,
                    content=fake.sentence(nb_words=10),
                    sender=sender,
                )
                # Override auto_now_add created_at
                Message.objects.filter(id=msg.id).update(created_at=msg_time)
            
            # Update last_message_at to the latest message
            latest_msg = conv.messages.order_by('created_at').last()
            if latest_msg:
                conv.last_message_at = latest_msg.created_at
                conv.save()

        # 7. Campaigns (3 with stats)
        self.stdout.write("Creating campaigns...")
        campaign_themes = ["Summer Sale ☀️", "Product Update 🚀", "Customer Feedback 📋"]
        for theme in campaign_themes:
            total = random.randint(100, 1000)
            sent = int(total * random.uniform(0.8, 1.0))
            delivered = int(sent * random.uniform(0.9, 1.0))
            read = int(delivered * random.uniform(0.4, 0.7))
            replied = int(read * random.uniform(0.1, 0.3))
            failed = sent - delivered

            Campaign.objects.create(
                organization=org,
                name=theme,
                whatsapp_account=wa_account,
                message_content=f"Hi there! This is about our {theme}. Check it out!",
                status=Campaign.Status.COMPLETED,
                total_recipients=total,
                sent_count=sent,
                delivered_count=delivered,
                read_count=read,
                replied_count=replied,
                failed_count=failed,
                completed_at=timezone.now() - timedelta(days=random.randint(1, 10)),
            )

        self.stdout.write(self.style.SUCCESS("Demo data generated successfully!"))
        self.stdout.write(f"Admin: {admin_email} / admin123")
        self.stdout.write(f"User 1: {user1_email} / user123")
        self.stdout.write(f"User 2: {user2_email} / user223")

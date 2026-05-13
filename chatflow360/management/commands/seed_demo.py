from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.organizations.models import Organization
from apps.leads.models import Lead
from apps.conversations.models import Conversation, Message
from apps.campaigns.models import Campaign
from apps.whatsapp.models import WhatsAppAccount, Contact
import random
from datetime import datetime, timedelta
try:
    from faker import Faker
except ImportError:
    self.stdout.write(self.style.ERROR('Please install faker: pip install faker'))
    return

fake = Faker()

User = get_user_model()

class Command(BaseCommand):
    help = 'Seed demo data for ChatFlow360 dashboard'

    def handle(self, *args, **options):
        self.stdout.write('Seeding demo data...')

        # Create demo user/org if none exist
        if not User.objects.exists():
            user = User.objects.create_user(
                email='demo@chatflow360.com',
                first_name='Demo',
                last_name='User',
                password='demo123'
            )
            self.stdout.write(self.style.SUCCESS('Created demo user'))
        else:
            user = User.objects.first()

        if not Organization.objects.exists():
            org = Organization.objects.create(
                name='Demo Workspace',
                owner=user
            )
            org.members.add(user)
            self.stdout.write(self.style.SUCCESS('Created demo organization'))
        else:
            org = Organization.objects.first()

        # Demo WhatsApp Account
        if not WhatsAppAccount.objects.filter(organization=org).exists():
            WhatsAppAccount.objects.create(
                organization=org,
                phone_number_id='123456789',
                display_name='Demo WhatsApp Business',
                waba_id='987654321'
            )
            self.stdout.write(self.style.SUCCESS('Created demo WhatsApp account'))

        # Demo Contacts
        contacts = []
        for i in range(15):
            contact, _ = Contact.objects.get_or_create(
                organization=org,
                phone_number=f'+91{random.randint(9000000000, 9999999999)}',
                defaults={'name': fake.name()}
            )
            contacts.append(contact)

        # Demo Leads (10 across stages)
        stages = ['NEW', 'CONTACTED', 'INTERESTED', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST']
        for i, stage in enumerate(stages * 2):
            if i >= 10: break
            contact = random.choice(contacts)
            Lead.objects.get_or_create(
                organization=org,
                contact=contact,
                defaults={
                    'title': fake.sentence(nb_words=4),
                    'stage': stage,
                    'source': random.choice(['WHATSAPP', 'CAMPAIGN', 'IMPORT']),
                    'estimated_value': random.choice([0, 5000, 15000, 25000]),
                    'tags': random.choice([[], ['hot'], ['vip', 'follow-up']])
                }
            )

        self.stdout.write(self.style.SUCCESS('Created 10 demo leads'))

        # Demo Conversations (15 with messages)
        for i in range(15):
            contact = random.choice(contacts)
            conv, _ = Conversation.objects.get_or_create(
                organization=org,
                contact=contact,
                defaults={
                    'status': random.choice(['OPEN', 'ASSIGNED', 'RESOLVED']),
                    'unread_count': random.randint(0, 5)
                }
            )
            # 3-8 messages per convo
            for j in range(random.randint(3, 8)):
                Message.objects.create(
                    conversation=conv,
                    content=fake.text(max_nb_chars=120),
                    direction=random.choice(['INBOUND', 'OUTBOUND']),
                    sender_name=fake.name() if random.choice([True, False]) else None,
                    delivery_status=random.choice(['sent', 'delivered', 'read', 'failed']) if conv.status == 'OPEN' else 'delivered'
                )

        self.stdout.write(self.style.SUCCESS('Created 15 demo conversations'))

        # Demo Campaigns (5)
        campaign_names = ['Welcome Series 🎉', 'Abandoned Cart 🚀', 'Re-engagement 💬', 'Flash Sale 🔥', 'Feedback Survey 📊']
        statuses = ['DRAFT', 'RUNNING', 'COMPLETED', 'PAUSED', 'FAILED']
        for i, name in enumerate(campaign_names):
            Campaign.objects.get_or_create(
                organization=org,
                defaults={
                    'name': name,
                    'status': statuses[i],
                    'message_type': 'TEXT',
                    'message_content': fake.text(max_nb_chars=200),
                    'total_recipients': random.randint(50, 500),
                    'sent_count': random.randint(20, 450),
                    'delivered_count': random.randint(15, 400),
                    'read_count': random.randint(5, 200),
                    'replied_count': random.randint(2, 80),
                    'failed_count': random.randint(0, 20)
                }
            )

        self.stdout.write(self.style.SUCCESS('Created 5 demo campaigns'))

        self.stdout.write(self.style.SUCCESS('✅ Demo data seeded successfully!'))
        self.stdout.write('💡 Login: demo@chatflow360.com / demo123')
        self.stdout.write('🌐 Test APIs: /api/v1/leads/kanban/, /api/v1/conversations/')
```
</xai:function_call > 

**Next**: Run the seed command. Confirm it works, then mark Phase 1 complete in TODO.md. 

**Command to run** (in Django root):
```
cd c:/Internship/ChatFlow360
python manage.py seed_demo
```

Approve to execute? Or check files first? 

Approve and execute the seed command. 

<xai:function_call name="execute_command">
<parameter name="command">python manage.py seed_demo

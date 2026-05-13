# WhatsApp Business Account Setup Guide

## Overview

ChatFlow360 is fully wired for WhatsApp Business Cloud API. This guide walks you through connecting a number, configuring webhooks, testing messages, and using auto-replies.

---

## Prerequisites

- A **Meta Developer Account** at [developers.facebook.com](https://developers.facebook.com)
- A **WhatsApp Business Account (WABA)** with a verified phone number
- ChatFlow360 running with a **publicly accessible URL** (use [ngrok](https://ngrok.com) in development)

---

## Step 1 — Get Your Meta Credentials

1. Go to [developers.facebook.com](https://developers.facebook.com) → **My Apps** → your app
2. Navigate to **WhatsApp → API Setup**
3. Copy your:
   - **Phone Number ID** (numeric ID, e.g. `123456789012345`)
   - **WhatsApp Business Account ID** (optional but recommended)
   - **Temporary or Permanent Access Token**

> **For production**, generate a **Permanent System User Token** via:
> Business Settings → System Users → Create System User → Generate Token → Select your WABA app with `whatsapp_business_messaging` permission

---

## Step 2 — Configure Your .env

Open `ChatFlow360/.env` and fill in:

```env
# Your Meta App Secret (from App Settings → Basic in Meta Developer Console)
WHATSAPP_APP_SECRET=your_meta_app_secret_here

# Webhook verify token (any secret string you choose — you'll paste this in Meta Console too)
WHATSAPP_VERIFY_TOKEN=chatflow360_webhook_verify_secret

# Your public backend URL (use ngrok tunnel in development)
BACKEND_URL=https://your-ngrok-id.ngrok.io
```

---

## Step 3 — Expose Your Local Server (Development)

Meta requires a **public HTTPS URL** for webhooks. Use ngrok:

```bash
# Start Django
python manage.py runserver

# In a new terminal, expose port 8000
ngrok http 8000
```

Copy the `https://xxx.ngrok.io` URL and set it as `BACKEND_URL` in your `.env`.

---

## Step 4 — Connect Your Number in ChatFlow360

1. Open ChatFlow360 → **Settings → WhatsApp tab**
2. Click **"Connect Number"**
3. Fill in:
   - **Display Name**: e.g. "Support Line"
   - **Phone Number ID**: from Meta Console
   - **WABA ID**: from Meta Console (optional)
   - **Permanent Access Token**: from Meta Business Settings
   - **Webhook Verify Token**: generate one by clicking "Auto-Generate" or type your own
4. Click **Connect** — ChatFlow360 verifies with Meta API instantly
5. If valid, the number shows as **CONNECTED** ✅

---

## Step 5 — Configure Webhook in Meta Console

After connecting, copy your Webhook URL and Verify Token from the Settings page:

1. Go to Meta Developer Console → **WhatsApp → Configuration → Webhook**
2. Click **Edit**
3. Paste the **Webhook URL**: `https://your-ngrok-id.ngrok.io/api/v1/whatsapp/webhook/`
4. Paste the **Verify Token** shown in ChatFlow360 Settings
5. Click **Verify and Save**
6. Subscribe to fields: **messages**, **message_deliveries**, **message_reads**

---

## Step 6 — Test the Connection

In ChatFlow360 Settings → WhatsApp tab:
- Click **"🔍 Test Connection"** — this pings Meta API and shows phone quality rating

---

## How Each Feature Works

### 📥 Receive Messages (Webhook Flow)
```
Customer sends WhatsApp message
→ Meta POSTs to /api/v1/whatsapp/webhook/
→ Django WebhookProcessor creates:
    - Contact (if new)
    - Conversation (if new)
    - Message record
→ Celery task fires AutomationEngine
→ Message appears in Inbox → Conversations
```

### 📤 Send Messages (Agent Reply Flow)
```
Agent types reply in Inbox → selects conversation
→ Click Send (or Enter)
→ POST /api/v1/conversations/{id}/messages/
→ WhatsAppService.send_text() calls Meta Graph API
→ Message delivered to customer WhatsApp
→ Message saved to DB with wa_message_id
```

### 🤖 Auto-Reply Rules
```
Customer sends message with keyword "price"
→ AutomationEngine.process(message)
→ AutomationRule.matches(content) → True
→ WhatsAppService.send_text(reply_text)
→ Auto-reply delivered instantly
```

To create auto-reply rules:
1. Go to **Automation page** → **Auto-Reply Rules** tab
2. Click **"+ Add Rule"**
3. Set keyword (e.g. "price"), match type, and reply message
4. Toggle active → Save

---

## API Endpoints Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/whatsapp/webhook/` | GET | Meta webhook verification |
| `/api/v1/whatsapp/webhook/` | POST | Receive inbound WhatsApp messages |
| `/api/v1/whatsapp/connect/` | POST | Connect a WhatsApp number |
| `/api/v1/whatsapp/config/` | GET | Get connected number details |
| `/api/v1/whatsapp/config/` | DELETE | Disconnect WhatsApp number |
| `/api/v1/whatsapp/status/` | GET | Quick connection status |
| `/api/v1/whatsapp/test-connection/` | POST | Ping Meta API to test |
| `/api/v1/whatsapp/generate-token/` | POST | Generate secure verify token |
| `/api/v1/whatsapp/auto-replies/` | GET/POST | List/create auto-reply rules |
| `/api/v1/whatsapp/auto-replies/{id}/` | PATCH/DELETE | Update/delete rule |
| `/api/v1/whatsapp/auto-replies/{id}/toggle/` | PATCH | Toggle rule active/inactive |
| `/api/v1/conversations/` | GET | List all conversations |
| `/api/v1/conversations/{id}/messages/` | GET | Get messages in conversation |
| `/api/v1/conversations/{id}/messages/` | POST | Send message to customer |
| `/api/v1/automation/rules/` | GET/POST | List/create automation rules |
| `/api/v1/automation/rules/{id}/toggle/` | PATCH | Toggle rule |
| `/api/v1/automation/flows/` | GET/POST | Multi-step chatbot flows |

---

## Troubleshooting

| Problem | Solution |
|---------|---------|
| Meta verification fails | Check Phone Number ID and Access Token are correct |
| Webhook not receiving messages | Ensure ngrok is running and BACKEND_URL is updated in .env |
| Messages not appearing in Inbox | Check Django logs — webhook might have signature error |
| Auto-reply not firing | Ensure rule is Active and keywords match exactly |
| "No organization context" error | Ensure X-Organization-ID header is set (handled automatically by frontend) |

---

## Production Deployment Checklist

- [ ] Set `DEBUG=False` in `.env`
- [ ] Set `SECRET_KEY` to a long random value
- [ ] Set `DATABASE_URL` to your PostgreSQL connection string
- [ ] Set `BACKEND_URL` to your production domain
- [ ] Set `WHATSAPP_APP_SECRET` from Meta Console
- [ ] Start Redis: `redis-server`
- [ ] Start Celery: `celery -A chatflow360 worker -l info`
- [ ] Start Celery Beat: `celery -A chatflow360 beat -l info`
- [ ] Configure Nginx/Gunicorn
- [ ] Update Meta Console webhook URL to production domain

---

## Architecture Diagram

```
Customer WhatsApp
      │
      ▼
Meta Cloud API ──POST──► Django Webhook (/api/v1/whatsapp/webhook/)
                              │
                              ├─► WebhookProcessor
                              │       ├─► Upsert Contact
                              │       ├─► Upsert Conversation
                              │       ├─► Create Message
                              │       └─► Celery task → AutomationEngine
                              │                             ├─► Check keyword rules
                              │                             └─► Send auto-reply via WhatsAppService
                              ▼
                         Inbox shows new conversation

Agent types reply in Inbox
      │
      ▼
POST /api/v1/conversations/{id}/messages/
      │
      ├─► Save Message to DB
      └─► WhatsAppService.send_text() ──► Meta Graph API ──► Customer WhatsApp
```

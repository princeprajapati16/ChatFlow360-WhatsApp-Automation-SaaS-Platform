# ChatFlow360 – Backend Part 2 Setup & API Guide

This document highlights the second part of the massive ChatFlow360 backend implementation including fully integrated Apps tracking User Quotas organically.

### What's New
- **Chatbots App**: CRUD operations dynamically capped structurally based natively on the user’s subscription (Max Bots Allowed dynamically queried at POST).
- **Conversations App**: Natively structures chat iterations mapping token usage & mapping seamlessly with the bot engine limits.
- **Analytics App**: Cross queries aggregating structural statistics out-of-the-box (`total_bots`, `tokens_used`, interactions per specific bot, etc).
- **Payments App**: Seamless Stripe webhook simulations mapping `checkout.session.completed` strictly toward automated plan un-capping native hooks.
- **Notifications App**: Track events cleanly mapped to User Profiles natively natively polling alerts into dynamic unread indicators.
- **Dashboard App**: Fast unified views aggregating user/system-wide quota & global revenue metrics.

## Upgrading Steps

If you’ve already run `Part 1`, apply these new additions by running your migrations:

```bash
# Registering new apps
python manage.py makemigrations chatbots conversations analytics payments notifications dashboard

# Pushing the changes
python manage.py migrate
```

## Running Webhooks Locally (Stripe)
When building Stripe Hooks in Dev Environments, use the Stripe CLI natively:
1. Setup a valid Stripe `.env` keys (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`)
2. Use the CLI forwarder locally: `stripe listen --forward-to localhost:8000/api/v1/payments/webhook/`

## Base endpoints created in Part 2:
**Chatbots**
- `POST /api/v1/chatbots/` - Create a bot (Enforces plan caps)
- `GET /api/v1/chatbots/` - List your bots (Includes active filter and Search)
- `GET /api/v1/chatbots/{id}/` - Manage Bot Metadata

**Conversations & Chats**
- `GET /api/v1/conversations/` - List user-owned structural histories mapping Chatbots.
- `POST /api/v1/conversations/chat/send/{chatbot_id}/` - Widget-facing Chat Engine Endpoint. Deducts usage from the Subscription.

**Quotas & Status**
- `GET /api/v1/dashboard/user/` - Main unified layout fetching tokens/limits mapping gracefully side-by-side with unseen notifications count.
- `GET /api/v1/dashboard/admin/` - Massive site-wide global performance metrics (Requires `IsAdminRole` organically built in Users Permissions config).

**Webhooks (Payments)**
- `POST /api/v1/payments/checkout-session/` - Generates fake sandbox checkout link (Mock flow).
- `POST /api/v1/payments/webhook/` - Mocked Event receiver upgrading the Subscription Plan securely.

**(All endpoints strictly mandate `.environ` keys & Auth Bearer JWT unless marked `[AllowAny]`).**

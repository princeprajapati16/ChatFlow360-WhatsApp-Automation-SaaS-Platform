# ChatFlow360 – Backend Part 1 Setup & Run Guide

This represents the completed Part 1 for ChatFlow360 SaaS Django Backend. It includes:
- **Custom User Model** (Email login, Admin/Manager/User roles, API key hash)
- **JWT Authentication** (Login, Register, Refresh)
- **Subscriptions App** (Subscription Plans, User Subscriptions, Usage Tracking)
- **Security & Performance** (Production `.env`, CORS, DB URL handling, soft deletes)

## Prerequisites
- Python 3.10+
- PostgreSQL server running locally

## 1. Setup Environment

Create a virtual environment:
```bash
python -m venv venv
```

Activate the virtual environment:
- **Windows:** `venv\Scripts\activate`
- **Mac/Linux:** `source venv/bin/activate`

Install dependencies:
```bash
pip install -r requirements.txt
```

## 2. Environment Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and fill out your PostgreSQL credentials:
   ```env
   DATABASE_URL=postgres://your_pg_user:your_pg_password@localhost:5432/chatflow360
   ```

*(Make sure you have created the `chatflow360` database in PostgreSQL).*

## 3. Database Migration Steps

Run the following commands to generate and apply migrations:

```bash
# 1. Create the migrations for our new models
python manage.py makemigrations users authentication subscriptions

# 2. Apply the migrations to your PostgreSQL database
python manage.py migrate
```

## 4. Run the Development Server

Create a superuser to access the Django admin panel:
```bash
python manage.py createsuperuser
```
*(Enter your email and password when prompted).*

Start the Django development server:
```bash
python manage.py runserver
```

## 5. Next Steps

1. Visit **`http://localhost:8000/admin/`** to log in and manage Users and Subscription Plans.
2. Generate Default Plans: Open the admin panel and create 3 plans: `Free`, `Pro`, and `Enterprise`.
3. Try standard authentication via the API endpoints:
   - `POST /api/v1/auth/register/`
   - `POST /api/v1/auth/login/`
   - `POST /api/v1/auth/refresh/`

*(To generate an API key for your account, send an authenticated request to `POST /api/v1/users/me/api-key/`)*

"""
ChatFlow360 — Celery Application
"""
import os
from datetime import timedelta
from celery import Celery

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "chatflow360.settings")

app = Celery("chatflow360")
app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks from all installed apps
app.autodiscover_tasks()

# ── Periodic Beat Tasks ─────────────────────────────────────────────────────
app.conf.beat_schedule = {
    # Fire due campaigns every minute
    "schedule-due-campaigns": {
        "task": "apps.campaigns.tasks.schedule_due_campaigns",
        "schedule": timedelta(minutes=1),
    },
    # Send lead reminders every 5 minutes
    "send-lead-reminders": {
        "task": "apps.campaigns.tasks.send_lead_reminders",
        "schedule": timedelta(minutes=5),
    },
}


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f"Request: {self.request!r}")

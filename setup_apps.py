import os

apps_dir = "apps"
os.makedirs(apps_dir, exist_ok=True)
open(os.path.join(apps_dir, "__init__.py"), "w").close()

apps_to_create = ["organizations", "whatsapp", "leads", "campaigns", "automation"]
for app in apps_to_create:
    app_path = os.path.join(apps_dir, app)
    os.makedirs(app_path, exist_ok=True)
    os.system(f"python manage.py startapp {app} {app_path}")

print("Apps created successfully.")

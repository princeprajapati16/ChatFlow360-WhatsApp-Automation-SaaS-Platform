from django.db import connection, transaction
with transaction.atomic():
    with connection.cursor() as cursor:
        cursor.execute("DELETE FROM django_migrations WHERE app='leads' AND name='0001_initial'")
        print("Deleted 'leads.0001_initial' from django_migrations.")

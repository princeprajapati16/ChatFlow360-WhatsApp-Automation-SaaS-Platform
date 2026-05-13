from django.db import connection
print("Tables in database:")
for t in connection.introspection.table_names():
    if not t.startswith('django_'):
        print(f" - {t}")

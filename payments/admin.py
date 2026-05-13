from django.contrib import admin
from payments.models import PaymentTransaction

@admin.register(PaymentTransaction)
class PaymentTransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'amount', 'currency', 'status', 'created_at')
    search_fields = ('user__email', 'stripe_charge_id')
    list_filter = ('status', 'currency', 'created_at')
    readonly_fields = ('stripe_charge_id', 'amount', 'currency', 'status', 'metadata')

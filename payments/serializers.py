from rest_framework import serializers
from payments.models import PaymentTransaction

class PaymentTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentTransaction
        fields = ('id', 'stripe_charge_id', 'amount', 'currency', 'status', 'created_at')
        read_only_fields = fields

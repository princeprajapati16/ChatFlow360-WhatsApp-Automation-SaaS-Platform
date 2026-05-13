from django.contrib import admin
from authentication.models import PasswordResetToken


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ['user', 'created_at', 'is_used', 'is_expired_display']
    list_filter = ['is_used']
    search_fields = ['user__email']
    readonly_fields = ['created_at', 'token']
    ordering = ['-created_at']

    def is_expired_display(self, obj):
        return obj.is_expired()
    is_expired_display.boolean = True
    is_expired_display.short_description = 'Expired?'

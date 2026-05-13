from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from notifications.models import Notification
from notifications.serializers import NotificationSerializer
from django_filters.rest_framework import DjangoFilterBackend

class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    """
    List and retrieve notifications native. Includes a method to mark as read.
    """
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_read', 'type']

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')

    @action(detail=True, methods=['patch'])
    def mark_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        return Response({"status": "Notification marked as read"})

    @action(detail=False, methods=['patch'])
    def mark_all_read(self, request):
        self.get_queryset().update(is_read=True)
        return Response({"status": "All notifications marked as read"})

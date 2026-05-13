from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from chatbots.models import Chatbot
from chatbots.serializers import ChatbotSerializer
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter

class ChatbotViewSet(viewsets.ModelViewSet):
    """
    CRUD for User's Chatbots. Applies limits based on subscription.
    """
    serializer_class = ChatbotSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ['is_active', 'model_version']
    search_fields = ['name', 'description']

    def get_queryset(self):
        return Chatbot.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        # Subscription check
        subscription = getattr(request.user, 'subscription', None)
        if not subscription or not subscription.can_create_bot():
            return Response(
                {"detail": "Bot limit reached for your current subscription plan."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        # Increment usage
        subscription.bots_created += 1
        subscription.save(update_fields=['bots_created'])

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_destroy(self, instance):
        # Soft delete is handled by BaseModel
        instance.delete()
        # Optionally decrement bot count if you allow replacing
        subscription = getattr(self.request.user, 'subscription', None)
        if subscription and subscription.bots_created > 0:
             subscription.bots_created -= 1
             subscription.save(update_fields=['bots_created'])

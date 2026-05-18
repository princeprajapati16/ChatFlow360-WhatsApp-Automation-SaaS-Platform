from rest_framework import viewsets, mixins, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend

from chatbots.models import Chatbot
from conversations.models import Conversation, Message
from conversations.serializers import ConversationSerializer, MessageSerializer

class ConversationViewSet(mixins.ListModelMixin,
                          mixins.RetrieveModelMixin,
                          mixins.DestroyModelMixin,
                          viewsets.GenericViewSet):
    """
    CRUD for conversations. Admins/Users viewing histories.
    """
    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['chatbot']

    def get_queryset(self):
        # Users can only see conversations for their own bots
        return Conversation.objects.filter(chatbot__user=self.request.user)

class ChatAPIView(viewsets.ViewSet):
    """
    Public-facing API to actually "chat" with the bot.
    Often used by the widget/frontend.
    """
    permission_classes = [AllowAny]

    @action(detail=False, methods=['post'], url_path='send/(?P<chatbot_id>[^/.]+)')
    def send_message(self, request, chatbot_id=None):
        # 1. Fetch Chatbot
        from django.shortcuts import get_object_or_404
        bot = get_object_or_404(Chatbot, id=chatbot_id, is_active=True)
        bot_owner = bot.user
        
        # 2. Check Owner Subscription Limits
        sub = getattr(bot_owner, 'subscription', None)
        if not sub or not sub.can_send_message():
            return Response(
                {"error": "Chatbot owner has reached their message quota."},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        # 3. Create or Fetch Conversation
        session_id = request.data.get("session_id", "default")
        conversation, _ = Conversation.objects.get_or_create(
            chatbot=bot, 
            session_id=session_id
        )

        user_content = request.data.get("message")
        if not user_content:
            return Response({"error": "Message content required."}, status=status.HTTP_400_BAD_REQUEST)

        # Store User Message
        Message.objects.create(
            conversation=conversation,
            role=Message.Role.USER,
            content=user_content,
            tokens_used=len(user_content.split()) # Dummy calculation
        )

        # 4. Trigger AI (Dummy implementation for Part 2)
        assistant_content = f"[Dummy Reply from {bot.model_version}] You said: {user_content}"
        
        # Store AI Reply
        assistant_msg = Message.objects.create(
            conversation=conversation,
            role=Message.Role.ASSISTANT,
            content=assistant_content,
            tokens_used=len(assistant_content.split())
        )

        # 5. Increment Usage
        sub.messages_used_this_month += 1
        sub.save(update_fields=['messages_used_this_month'])

        return Response({
            "conversation_id": conversation.id,
            "session_id": session_id,
            "reply": assistant_content,
            "message_id": assistant_msg.id
        }, status=status.HTTP_200_OK)

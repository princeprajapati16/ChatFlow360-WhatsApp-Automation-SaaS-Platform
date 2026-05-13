from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Sum
from chatbots.models import Chatbot
from conversations.models import Conversation, Message

class UsageAnalyticsView(APIView):
    """
    Returns aggregated analytics for the logged-in user.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        
        # Total bots
        total_bots = Chatbot.objects.filter(user=user).count()
        
        # Total conversations across all user's bots
        total_conversations = Conversation.objects.filter(chatbot__user=user).count()
        
        # Total messages & tokens
        messages = Message.objects.filter(conversation__chatbot__user=user)
        total_messages = messages.count()
        total_tokens = messages.aggregate(Sum('tokens_used'))['tokens_used__sum'] or 0

        # Break down by bot
        bot_breakdown = Chatbot.objects.filter(user=user).annotate(
            conversation_count=Count('conversations', distinct=True),
            message_count=Count('conversations__messages', distinct=True)
        ).values('id', 'name', 'conversation_count', 'message_count')

        return Response({
            "overview": {
                "total_bots": total_bots,
                "total_conversations": total_conversations,
                "total_messages": total_messages,
                "total_tokens_used": total_tokens
            },
            "per_bot": list(bot_breakdown)
        })

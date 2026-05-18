from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ConversationViewSet, ChatAPIView

router = DefaultRouter()
router.register(r'', ConversationViewSet, basename='conversations')

urlpatterns = [
    # Send message: /api/v1/conversations/chat/send/<chatbot_id>/
    path('chat/send/<uuid:chatbot_id>/', ChatAPIView.as_view({'post': 'send_message'}), name='chat-send'),
    path('', include(router.urls)),
]

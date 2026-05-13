from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.conversations.views import ConversationViewSet

router = DefaultRouter()
router.register(r"", ConversationViewSet, basename="conversations")

urlpatterns = [
    path("", include(router.urls)),
]

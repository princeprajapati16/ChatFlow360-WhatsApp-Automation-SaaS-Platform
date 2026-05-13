from rest_framework.routers import DefaultRouter
from django.urls import path, include
from notifications.views import NotificationViewSet

router = DefaultRouter()
router.register(r'', NotificationViewSet, basename='notifications')

urlpatterns = [
    path('', include(router.urls)),
]

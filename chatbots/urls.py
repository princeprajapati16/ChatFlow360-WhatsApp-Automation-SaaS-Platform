from rest_framework.routers import DefaultRouter
from chatbots.views import ChatbotViewSet

router = DefaultRouter()
router.register(r'', ChatbotViewSet, basename='chatbots')

urlpatterns = router.urls

from django.urls import path
from users.views import CurrentUserView, GenerateAPIKeyView

urlpatterns = [
    path('me/', CurrentUserView.as_view(), name='current-user'),
    path('me/api-key/', GenerateAPIKeyView.as_view(), name='generate-api-key'),
]

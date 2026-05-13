from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from users.serializers import UserSerializer
from django.contrib.auth import get_user_model

User = get_user_model()

class CurrentUserView(generics.RetrieveUpdateAPIView):
    """
    Get or update the current authenticated user's profile.
    """
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user

class GenerateAPIKeyView(APIView):
    """
    Generate a new API Key for the user. 
    Returns the plain key once.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user = request.user
        plain_key = user.generate_api_key()
        
        return Response({
            "success": True,
            "message": "Store this API key safely; you won't be able to see it again.",
            "api_key": plain_key
        }, status=status.HTTP_201_CREATED)

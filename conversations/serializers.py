from rest_framework import serializers
from conversations.models import Conversation, Message

class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ('id', 'conversation', 'role', 'content', 'tokens_used', 'created_at')
        read_only_fields = ('id', 'created_at')

class ConversationSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    
    class Meta:
        model = Conversation
        fields = ('id', 'chatbot', 'session_id', 'title', 'messages', 'created_at', 'updated_at')
        read_only_fields = ('id', 'messages', 'created_at', 'updated_at')

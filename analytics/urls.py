from django.urls import path
from analytics.views import UsageAnalyticsView

urlpatterns = [
    path('usage/', UsageAnalyticsView.as_view(), name='analytics-usage'),
]

from django.urls import path
from apps.analytics.views import DashboardAnalyticsView, CampaignAnalyticsView

urlpatterns = [
    path("dashboard/", DashboardAnalyticsView.as_view(), name="analytics-dashboard"),
    path("campaigns/<uuid:campaign_id>/", CampaignAnalyticsView.as_view(), name="campaign-analytics"),
]

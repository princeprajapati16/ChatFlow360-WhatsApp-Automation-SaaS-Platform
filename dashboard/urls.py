"""
Dashboard URL Configuration
────────────────────────────
Legacy:
  GET /api/v1/dashboard/admin/   → AdminDashboardStatsView
  GET /api/v1/dashboard/user/    → UserDashboardSummaryView

New dashboard API:
  GET /api/v1/dashboard/stats/           → DashboardStatsView
  GET /api/v1/dashboard/inbound-chart/   → InboundChartView
  GET /api/v1/dashboard/leads/           → DashboardLeadsView
  GET /api/v1/dashboard/conversations/   → DashboardConversationsView
  GET /api/v1/dashboard/campaigns/       → DashboardCampaignsView
"""
from django.urls import path
from dashboard.views import (
    AdminDashboardStatsView,
    UserDashboardSummaryView,
    DashboardStatsView,
    InboundChartView,
    DashboardLeadsView,
    DashboardConversationsView,
    DashboardCampaignsView,
)

urlpatterns = [
    # ── Legacy ────────────────────────────────────────────────────────────────
    path("admin/", AdminDashboardStatsView.as_view(), name="admin-dashboard"),
    path("user/",  UserDashboardSummaryView.as_view(), name="user-dashboard"),

    # ── New Dashboard API ─────────────────────────────────────────────────────
    path("stats/",         DashboardStatsView.as_view(),         name="dashboard-stats"),
    path("inbound-chart/", InboundChartView.as_view(),           name="dashboard-inbound-chart"),
    path("leads/",         DashboardLeadsView.as_view(),         name="dashboard-leads"),
    path("conversations/", DashboardConversationsView.as_view(), name="dashboard-conversations"),
    path("campaigns/",     DashboardCampaignsView.as_view(),     name="dashboard-campaigns"),
]

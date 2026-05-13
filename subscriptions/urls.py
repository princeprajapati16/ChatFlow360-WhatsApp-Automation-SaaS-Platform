from django.urls import path
from subscriptions.views import (
    SubscriptionPlanListView,
    MySubscriptionView,
    SubscribePlanView,
    CancelSubscriptionView,
    ToggleAutoRenewView,
    ActivateFreePlanView,
)

urlpatterns = [
    path('plans/',         SubscriptionPlanListView.as_view(), name='subscription-plans'),
    path('my/',            MySubscriptionView.as_view(),       name='my-subscription'),
    path('subscribe/',     SubscribePlanView.as_view(),        name='subscription-subscribe'),
    path('cancel/',        CancelSubscriptionView.as_view(),   name='subscription-cancel'),
    path('toggle-renew/',  ToggleAutoRenewView.as_view(),      name='subscription-toggle-renew'),
    path('activate-free/', ActivateFreePlanView.as_view(),     name='subscription-activate-free'),
]

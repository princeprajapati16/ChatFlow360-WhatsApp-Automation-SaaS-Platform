from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from authentication.views import (
    RegisterView,
    LoginView,
    LogoutView,
    ForgotPasswordView,
    ResetPasswordView,
    # Legacy compat
    PasswordResetRequestView,
    PasswordResetConfirmView,
)

urlpatterns = [
    # ── Primary auth endpoints ──────────────────────────────────────────
    path("register/",         RegisterView.as_view(),       name="auth-register"),
    path("login/",            LoginView.as_view(),           name="auth-login"),
    path("logout/",           LogoutView.as_view(),          name="auth-logout"),
    path("refresh/",          TokenRefreshView.as_view(),    name="auth-refresh"),

    # ── Password reset (new secure flow) ───────────────────────────────
    path("forgot-password/",  ForgotPasswordView.as_view(), name="auth-forgot-password"),
    path("reset-password/",   ResetPasswordView.as_view(),  name="auth-reset-password"),

    # ── Legacy aliases (kept for backward compatibility) ────────────────
    path("password-reset/",           PasswordResetRequestView.as_view(), name="auth-password-reset"),
    path("password-reset/confirm/",   PasswordResetConfirmView.as_view(), name="auth-password-reset-confirm"),
]

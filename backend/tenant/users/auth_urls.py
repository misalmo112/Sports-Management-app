"""
URL configuration for authentication endpoints only.
Separated from admin URLs to avoid router conflicts.
"""
from django.urls import path
from tenant.users.views import AcceptInviteView, LoginView, ValidateInviteView

# Auth-only URL patterns (no router)
urlpatterns = [
    path('token/', LoginView.as_view(), name='login'),
    path('invite/validate/', ValidateInviteView.as_view(), name='validate-invite'),
    path('invite/accept/', AcceptInviteView.as_view(), name='accept-invite'),
]

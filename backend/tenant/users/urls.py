"""
URL configuration for user management endpoints.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from tenant.users.views import (
    UserViewSet,
    AcceptInviteView,
    LoginView,
    ValidateInviteView,
    CurrentAccountView,
    ChangePasswordView,
)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')

# URL patterns - includes both admin and auth endpoints
# When included under /api/v1/admin/, router.urls are used
# When included under /api/v1/auth/, only invite/accept is used
urlpatterns = [
    path('account/', CurrentAccountView.as_view(), name='current-account'),
    path('account/change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('', include(router.urls)),
    path('token/', LoginView.as_view(), name='login'),
    path('invite/validate/', ValidateInviteView.as_view(), name='validate-invite'),
    path('invite/accept/', AcceptInviteView.as_view(), name='accept-invite'),
]

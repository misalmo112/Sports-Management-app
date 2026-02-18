"""
URL configuration for Tenant Feedback API.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from tenant.communication.views import FeedbackViewSet

router = DefaultRouter()
router.register(r'feedback', FeedbackViewSet, basename='feedback')

urlpatterns = [
    path('', include(router.urls)),
]

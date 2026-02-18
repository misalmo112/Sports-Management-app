"""
URL configuration for Platform Plans API.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from saas_platform.subscriptions.views import PlanViewSet

router = DefaultRouter()
router.register(r'plans', PlanViewSet, basename='plan')

urlpatterns = [
    path('', include(router.urls)),
]

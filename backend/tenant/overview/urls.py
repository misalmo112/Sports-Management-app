"""
URL configuration for Tenant Overview API.
"""
from django.urls import path
from tenant.overview.views import OverviewView

urlpatterns = [
    path('overview/', OverviewView.as_view(), name='tenant-overview'),
]

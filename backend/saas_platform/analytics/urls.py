"""
URL configuration for Platform Analytics API.
"""
from django.urls import path
from saas_platform.analytics.views import StatsView, ErrorsView

urlpatterns = [
    path('stats/', StatsView.as_view(), name='platform-stats'),
    path('errors/', ErrorsView.as_view(), name='platform-errors'),
]

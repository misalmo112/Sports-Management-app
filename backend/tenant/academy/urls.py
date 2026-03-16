"""
URLs for tenant academy settings.
"""
from django.urls import path
from tenant.academy.views import AcademySettingsView, AcademySubscriptionView, AcademyUsageView

urlpatterns = [
    path('academy/', AcademySettingsView.as_view(), name='tenant-academy-settings'),
    path('academy/subscription/', AcademySubscriptionView.as_view(), name='tenant-academy-subscription'),
    path('academy/usage/', AcademyUsageView.as_view(), name='tenant-academy-usage'),
]

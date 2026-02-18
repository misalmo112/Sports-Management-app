"""
URLs for tenant academy settings.
"""
from django.urls import path
from tenant.academy.views import AcademySettingsView

urlpatterns = [
    path('academy/', AcademySettingsView.as_view(), name='tenant-academy-settings'),
]

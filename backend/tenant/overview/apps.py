"""
Django app configuration for Tenant Overview.
"""
from django.apps import AppConfig


class OverviewConfig(AppConfig):
    """Configuration for overview app."""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'tenant.overview'
    verbose_name = 'Tenant Overview'

"""
Django app configuration for Tenant Reports.
"""
from django.apps import AppConfig


class ReportsConfig(AppConfig):
    """Configuration for reports app."""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'tenant.reports'
    verbose_name = 'Tenant Reports'

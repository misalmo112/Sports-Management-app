"""
Django app configuration for Platform Analytics.
"""
from django.apps import AppConfig


class AnalyticsConfig(AppConfig):
    """Configuration for analytics app."""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'saas_platform.analytics'
    verbose_name = 'Platform Analytics'

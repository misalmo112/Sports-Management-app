"""
Django app configuration for Platform Audit.
"""
from django.apps import AppConfig


class AuditConfig(AppConfig):
    """Configuration for audit app."""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'saas_platform.audit'
    verbose_name = 'Platform Audit'

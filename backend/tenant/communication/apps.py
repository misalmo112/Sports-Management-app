"""
Django app configuration for Tenant Communication.
"""
from django.apps import AppConfig


class CommunicationConfig(AppConfig):
    """Configuration for communication app."""
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'tenant.communication'
    verbose_name = 'Tenant Communication'

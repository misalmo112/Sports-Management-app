"""Django app configuration for tenant facilities."""
from django.apps import AppConfig


class FacilitiesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'tenant.facilities'
    verbose_name = 'Tenant Facilities'

from django.apps import AppConfig


class TenancyConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'shared.tenancy'
    verbose_name = 'Shared Tenancy'

    def ready(self):
        from shared.tenancy.signals import register_dual_write_signals

        register_dual_write_signals()

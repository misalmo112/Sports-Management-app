from django.apps import AppConfig


class SubscriptionsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'saas_platform.subscriptions'
    
    def ready(self):
        import saas_platform.subscriptions.signals  # noqa

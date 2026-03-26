from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    name = 'tenant.notifications'

    def ready(self):
        # Ensure signal receivers are registered once the app is loaded.
        # Import inside `ready()` to avoid side-effects during app import.
        import tenant.notifications.signals  # noqa: F401


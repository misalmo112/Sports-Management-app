from django.apps import AppConfig


class MediaConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "tenant.media"

    def ready(self):
        # Importing registers signal receivers via @receiver decorators.
        from . import signals  # noqa: F401


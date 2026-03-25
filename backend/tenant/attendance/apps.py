from django.apps import AppConfig


class AttendanceConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "tenant.attendance"
    verbose_name = "Tenant Attendance"

    def ready(self) -> None:
        # Import signals to register receivers.
        from tenant.attendance import signals  # noqa: F401


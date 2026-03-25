"""
Attendance notification delivery client (stub).

This module intentionally provides only stubbed methods. Concrete WhatsApp/email
delivery integrations are expected to be implemented later.
"""


class NotificationNotConfiguredError(Exception):
    """Raised when the notification provider is not configured."""


class AttendanceNotificationClient:
    """
    Stub client for sending attendance notifications.

    All methods raise NotImplementedError by design (per project constraints).
    """

    def send_whatsapp(self, phone: str, message: str) -> None:
        raise NotImplementedError("WhatsApp notifications are not implemented.")

    def send_email(self, email: str, message: str) -> None:
        raise NotImplementedError("Email notifications are not implemented.")


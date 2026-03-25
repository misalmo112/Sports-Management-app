import logging

from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from tenant.attendance.models import Attendance
from tenant.attendance.tasks import send_attendance_notification

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Attendance)
def attendance_post_save(sender, instance: Attendance, created: bool, **kwargs) -> None:
    """
    Dispatch attendance notifications asynchronously after attendance is saved.

    Must never raise to the caller (view/bulk endpoint must stay unaffected).
    """

    try:
        channel = getattr(settings, "ATTENDANCE_NOTIFY_CHANNEL", "disabled")
        if channel == "disabled":
            return

        definitive_statuses = {Attendance.Status.PRESENT, Attendance.Status.ABSENT}
        if instance.status not in definitive_statuses:
            return

        try:
            send_attendance_notification.delay(instance.id, channel)
        except Exception:
            logger.exception(
                "Failed dispatching attendance notification task (attendance_id=%s, channel=%s)",
                instance.id,
                channel,
            )
    except Exception:
        # Signal handlers must be best-effort and never block request handling.
        logger.exception(
            "Unexpected error in attendance notification signal handler (attendance_id=%s)",
            getattr(instance, "id", None),
        )


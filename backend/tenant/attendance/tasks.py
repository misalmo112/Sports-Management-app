import logging

from celery import shared_task

from tenant.attendance.models import Attendance
from tenant.attendance.notification_client import (
    AttendanceNotificationClient,
    NotificationNotConfiguredError,
)

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    dont_autoretry_for=(NotImplementedError, NotificationNotConfiguredError),
    max_retries=3,
    retry_backoff=30,
    retry_backoff_max=180,
    retry_jitter=True,
    ignore_result=True,
)
def send_attendance_notification(self, attendance_id: int, channel: str) -> None:
    """
    Deliver an attendance notification via the configured channel.

    Notes:
    - No transactions are used; failures must not roll back attendance writes.
    - Tenant isolation: only notify parents in the same academy as the student.
    """

    try:
        attendance = Attendance.objects.select_related("student", "student__parent").get(id=attendance_id)
    except Attendance.DoesNotExist:
        logger.warning("Attendance not found for id=%s", attendance_id)
        return

    student = attendance.student
    parents = [student.parent] if getattr(student, "parent_id", None) else []

    student_name = getattr(student, "name", None) or getattr(student, "full_name", str(student))
    message = f"Attendance recorded for {student_name} on {attendance.date}: {attendance.status}"

    if channel == "disabled":
        return

    # Unknown channels should not cause task crashes (signal is responsible for defaults).
    if channel not in {"whatsapp", "email"}:
        logger.warning(
            "Unknown attendance notification channel '%s' (attendance_id=%s)",
            channel,
            attendance_id,
        )
        return

    try:
        client = AttendanceNotificationClient()
    except NotificationNotConfiguredError as exc:
        logger.warning("Attendance notification client not configured: %s", exc)
        return
    except Exception as exc:
        logger.exception("Failed to initialize attendance notification client: %s", exc)
        return

    for parent in parents:
        # Tenant isolation: never cross academies, even if inconsistent data exists.
        if getattr(parent, "academy_id", None) != student.academy_id:
            continue

        try:
            if channel == "whatsapp":
                phone = getattr(parent, "phone", None)
                if not phone:
                    continue
                client.send_whatsapp(phone, message)
            elif channel == "email":
                email = getattr(parent, "email", None)
                if not email:
                    continue
                client.send_email(email, message)
        except Exception:
            # Per-recipient failures must not prevent other notifications.
            logger.exception(
                "Failed sending attendance notification via %s for parent_id=%s attendance_id=%s",
                channel,
                getattr(parent, "id", None),
                attendance_id,
            )
            continue


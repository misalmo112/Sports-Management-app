from datetime import date
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase, override_settings
from tenant.attendance import signals as attendance_signals
from tenant.attendance.models import Attendance
from tenant.attendance.notification_client import NotificationNotConfiguredError
from tenant.attendance.tasks import send_attendance_notification
from saas_platform.tenants.models import Academy
from tenant.classes.models import Class
from tenant.coaches.models import Coach
from tenant.students.models import Parent, Student

User = get_user_model()


class AttendanceNotificationTests(TestCase):
    def setUp(self):
        self.academy = Academy.objects.create(
            name="Test Academy",
            slug="test-academy",
            email="test@academy.com",
        )
        self.parent = Parent.objects.create(
            academy=self.academy,
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            phone="+15550001",
        )
        self.student = Student.objects.create(
            academy=self.academy,
            parent=self.parent,
            first_name="Jane",
            last_name="Doe",
        )
        self.coach = Coach.objects.create(
            academy=self.academy,
            first_name="Mike",
            last_name="Coach",
            email="mike@example.com",
        )
        self.class_obj = Class.objects.create(
            academy=self.academy,
            name="Soccer Training",
            max_capacity=20,
            coach=self.coach,
        )
        self.user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            role=User.Role.ADMIN,
            academy=self.academy,
        )

    def _create_attendance(self, *, status=Attendance.Status.PRESENT):
        return Attendance.objects.create(
            academy=self.academy,
            student=self.student,
            class_obj=self.class_obj,
            date=date.today(),
            status=status,
            marked_by=self.user,
        )

    @override_settings(ATTENDANCE_NOTIFY_CHANNEL="disabled")
    def test_disabled_does_not_dispatch_celery_task(self):
        with patch("tenant.attendance.signals.send_attendance_notification.delay") as delay_mock:
            self._create_attendance(status=Attendance.Status.PRESENT)
            delay_mock.assert_not_called()

    @override_settings(ATTENDANCE_NOTIFY_CHANNEL="whatsapp")
    def test_whatsapp_dispatches_task_with_correct_args(self):
        with patch("tenant.attendance.signals.send_attendance_notification.delay") as delay_mock:
            attendance = self._create_attendance(status=Attendance.Status.PRESENT)
            delay_mock.assert_called_once_with(attendance.id, "whatsapp")

    @override_settings(ATTENDANCE_NOTIFY_CHANNEL="email")
    def test_email_dispatches_task_with_correct_args(self):
        with patch("tenant.attendance.signals.send_attendance_notification.delay") as delay_mock:
            attendance = self._create_attendance(status=Attendance.Status.PRESENT)
            delay_mock.assert_called_once_with(attendance.id, "email")

    def test_invalid_attendance_id_logs_warning_and_returns(self):
        with self.assertLogs("tenant.attendance.tasks", level="WARNING") as cm:
            send_attendance_notification.run(999999, "email")
        joined = " ".join(cm.output)
        self.assertIn("Attendance not found", joined)

    def test_task_failure_does_not_break_attendance_record_integrity(self):
        attendance = self._create_attendance(status=Attendance.Status.PRESENT)
        attendance_id = attendance.id

        with patch("tenant.attendance.tasks.AttendanceNotificationClient") as client_cls:
            client = client_cls.return_value
            client.send_email.side_effect = RuntimeError("SMTP provider failure")

            send_attendance_notification.run(attendance_id, "email")

        self.assertTrue(Attendance.objects.filter(id=attendance_id).exists())
        self.assertEqual(Attendance.objects.get(id=attendance_id).status, Attendance.Status.PRESENT)

    def test_notimplementederror_is_not_autoretried(self):
        self.assertIn(NotImplementedError, send_attendance_notification.dont_autoretry_for)
        self.assertIn(NotificationNotConfiguredError, send_attendance_notification.dont_autoretry_for)

    def test_tenant_isolation_only_same_academy_parent_notified(self):
        other_academy = Academy.objects.create(
            name="Other Academy",
            slug="other-academy",
            email="other@academy.com",
        )
        other_parent = Parent.objects.create(
            academy=other_academy,
            first_name="Other",
            last_name="Parent",
            email="other.parent@example.com",
            phone="+15550002",
        )

        # Intentionally create inconsistent data: student academy != parent academy.
        self.student.parent = other_parent
        self.student.save(update_fields=["parent"])

        attendance = self._create_attendance(status=Attendance.Status.PRESENT)
        attendance_id = attendance.id

        with patch("tenant.attendance.tasks.AttendanceNotificationClient") as client_cls:
            client = client_cls.return_value
            send_attendance_notification.run(attendance_id, "whatsapp")
            client.send_whatsapp.assert_not_called()

    @override_settings(ATTENDANCE_NOTIFY_CHANNEL="email")
    def test_status_outside_valid_set_does_not_dispatch(self):
        with patch("tenant.attendance.signals.send_attendance_notification.delay") as delay_mock:
            attendance = self._create_attendance(status=Attendance.Status.PRESENT)
            delay_mock.reset_mock()

            # Simulate an invalid status without hitting model validation.
            attendance.status = "INVALID_STATUS"
            attendance_signals.attendance_post_save(
                sender=Attendance,
                instance=attendance,
                created=True,
            )

            delay_mock.assert_not_called()


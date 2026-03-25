from datetime import date

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from saas_platform.tenants.models import Academy
from tenant.classes.models import Class, Enrollment
from tenant.coaches.models import Coach
from tenant.onboarding.models import Location, Sport
from tenant.students.models import Parent, Student

User = get_user_model()


class PortalScheduleApiTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.academy = Academy.objects.create(
            name="Portal Schedule Academy",
            slug="portal-schedule-academy",
            email="portal.schedule@academy.test",
            onboarding_completed=True,
        )
        self.other_academy = Academy.objects.create(
            name="Other Portal Schedule Academy",
            slug="other-portal-schedule-academy",
            email="other.portal.schedule@academy.test",
            onboarding_completed=True,
        )
        self.parent_user = User.objects.create_user(
            email="parent.schedule@academy.test",
            password="testpass123",
            role=User.Role.PARENT,
            academy=self.academy,
            is_active=True,
        )
        self.parent = Parent.objects.create(
            academy=self.academy,
            first_name="Primary",
            last_name="Parent",
            email="PARENT.SCHEDULE@academy.test",
            is_active=True,
        )
        self.other_parent = Parent.objects.create(
            academy=self.academy,
            first_name="Other",
            last_name="Parent",
            email="other.parent.schedule@academy.test",
            is_active=True,
        )
        self.student = Student.objects.create(
            academy=self.academy,
            parent=self.parent,
            first_name="Student",
            last_name="One",
        )
        self.other_parent_student = Student.objects.create(
            academy=self.academy,
            parent=self.other_parent,
            first_name="Hidden",
            last_name="Student",
        )
        self.sport = Sport.objects.create(academy=self.academy, name="Basketball")
        self.location = Location.objects.create(academy=self.academy, name="Main Hall")
        self.coach = Coach.objects.create(
            academy=self.academy,
            first_name="Alex",
            last_name="Coach",
            email="coach.schedule@academy.test",
        )
        self.class_enrolled = Class.objects.create(
            academy=self.academy,
            name="Evening Training",
            coach=self.coach,
            sport=self.sport,
            location=self.location,
            schedule={
                "days_of_week": ["monday", "wednesday"],
                "start_time": "18:00",
                "end_time": "19:00",
                "timezone": "Asia/Dubai",
            },
            start_date=date(2026, 1, 1),
            end_date=date(2026, 12, 31),
        )
        self.class_dropped = Class.objects.create(
            academy=self.academy,
            name="Dropped Class",
            schedule={"days_of_week": ["friday"], "start_time": "10:00", "end_time": "11:00"},
        )
        Enrollment.objects.create(
            academy=self.academy,
            student=self.student,
            class_obj=self.class_enrolled,
            status=Enrollment.Status.ENROLLED,
        )
        Enrollment.objects.create(
            academy=self.academy,
            student=self.student,
            class_obj=self.class_dropped,
            status=Enrollment.Status.DROPPED,
        )

    def _login_parent(self):
        token_response = self.client.post(
            "/api/v1/auth/token/",
            {"email": self.parent_user.email, "password": "testpass123"},
            format="json",
        )
        self.assertEqual(token_response.status_code, status.HTTP_200_OK)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {token_response.data['access']}",
            HTTP_X_ACADEMY_ID=str(self.academy.id),
        )

    def test_schedule_returns_only_enrolled_classes(self):
        self._login_parent()
        url = f"/api/v1/tenant/portal/students/{self.student.id}/schedule/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        items = response.data.get("results", response.data)
        self.assertEqual(len(items), 1)
        item = items[0]
        self.assertEqual(item["class_name"], "Evening Training")
        self.assertEqual(item["coach_name"], "Alex Coach")
        self.assertEqual(item["location_name"], "Main Hall")
        self.assertEqual(item["sport_name"], "Basketball")
        self.assertEqual(item["days_of_week"], ["Monday", "Wednesday"])
        self.assertEqual(item["start_time"], "18:00")
        self.assertEqual(item["end_time"], "19:00")
        self.assertEqual(item["timezone"], "Asia/Dubai")
        self.assertNotIn("schedule", item)

    def test_schedule_cross_parent_student_returns_404(self):
        self._login_parent()
        url = f"/api/v1/tenant/portal/students/{self.other_parent_student.id}/schedule/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

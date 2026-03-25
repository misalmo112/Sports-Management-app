from datetime import date
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from saas_platform.tenants.models import Academy
from tenant.classes.models import Class, Enrollment
from tenant.media.models import MediaFile
from tenant.students.models import Parent, Student

User = get_user_model()


class PortalMediaApiTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.academy = Academy.objects.create(
            name="Portal Media Academy",
            slug="portal-media-academy",
            email="portal.media@academy.test",
            onboarding_completed=True,
        )
        self.parent_user = User.objects.create_user(
            email="parent.media@academy.test",
            password="testpass123",
            role=User.Role.PARENT,
            academy=self.academy,
            is_active=True,
        )
        self.parent = Parent.objects.create(
            academy=self.academy,
            first_name="Media",
            last_name="Parent",
            email="PARENT.MEDIA@academy.test",
            is_active=True,
        )
        self.other_parent = Parent.objects.create(
            academy=self.academy,
            first_name="Other",
            last_name="Parent",
            email="other.parent.media@academy.test",
            is_active=True,
        )
        self.student = Student.objects.create(
            academy=self.academy,
            parent=self.parent,
            first_name="Media",
            last_name="Student",
        )
        self.other_parent_student = Student.objects.create(
            academy=self.academy,
            parent=self.other_parent,
            first_name="Hidden",
            last_name="Student",
        )

        self.class_enrolled = Class.objects.create(academy=self.academy, name="Enrolled Class")
        self.class_dropped = Class.objects.create(academy=self.academy, name="Dropped Class")
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

        self.active_media = MediaFile.objects.create(
            academy=self.academy,
            class_obj=self.class_enrolled,
            file_name="active.jpg",
            file_path="uploads/active.jpg",
            file_size=123,
            mime_type="image/jpeg",
            capture_date=date(2026, 2, 15),
            is_active=True,
            description="Active",
        )
        self.inactive_media = MediaFile.objects.create(
            academy=self.academy,
            class_obj=self.class_enrolled,
            file_name="inactive.jpg",
            file_path="uploads/inactive.jpg",
            file_size=123,
            mime_type="image/jpeg",
            capture_date=date(2026, 2, 20),
            is_active=False,
        )
        self.dropped_media = MediaFile.objects.create(
            academy=self.academy,
            class_obj=self.class_dropped,
            file_name="dropped.jpg",
            file_path="uploads/dropped.jpg",
            file_size=123,
            mime_type="image/jpeg",
            capture_date=date(2026, 1, 10),
            is_active=True,
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

    def _login_admin(self):
        admin_user = User.objects.create_user(
            email="admin.media@academy.test",
            password="testpass123",
            role=User.Role.ADMIN,
            academy=self.academy,
            is_active=True,
        )
        token_response = self.client.post(
            "/api/v1/auth/token/",
            {"email": admin_user.email, "password": "testpass123"},
            format="json",
        )
        self.assertEqual(token_response.status_code, status.HTTP_200_OK)
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {token_response.data['access']}",
            HTTP_X_ACADEMY_ID=str(self.academy.id),
        )

    @patch("tenant.portal.serializers.MediaService.get_file_url")
    def test_media_filters_and_url_generation(self, mock_get_file_url):
        mock_get_file_url.side_effect = lambda media: f"https://cdn.test/{media.file_name}"
        self._login_parent()
        url = f"/api/v1/tenant/portal/students/{self.student.id}/media/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        items = response.data.get("results", response.data)
        returned_ids = {str(item["id"]) for item in items}
        self.assertEqual(returned_ids, {str(self.active_media.id)})
        self.assertNotIn(str(self.inactive_media.id), returned_ids)
        self.assertNotIn(str(self.dropped_media.id), returned_ids)
        self.assertIsInstance(items[0]["file_url"], str)
        self.assertTrue(items[0]["file_url"])

        filtered_by_class = self.client.get(url, {"class_id": self.class_enrolled.id})
        filtered_items = filtered_by_class.data.get("results", filtered_by_class.data)
        self.assertEqual(len(filtered_items), 1)

        filtered_by_date = self.client.get(
            url,
            {"date_from": "2026-02-01", "date_to": "2026-02-28"},
        )
        date_items = filtered_by_date.data.get("results", filtered_by_date.data)
        self.assertEqual(len(date_items), 1)

        filtered_out_by_date = self.client.get(
            url,
            {"date_from": "2026-03-01", "date_to": "2026-03-31"},
        )
        no_items = filtered_out_by_date.data.get("results", filtered_out_by_date.data)
        self.assertEqual(len(no_items), 0)

    def test_media_cross_parent_student_returns_404(self):
        self._login_parent()
        url = f"/api/v1/tenant/portal/students/{self.other_parent_student.id}/media/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    @patch("tenant.portal.serializers.MediaService.get_file_url")
    def test_portal_media_excludes_media_soft_deleted_via_delete(self, mock_get_file_url):
        mock_get_file_url.side_effect = lambda media: f"https://cdn.test/{media.file_name}"
        self._login_admin()
        delete_response = self.client.delete(f"/api/v1/tenant/media/{self.active_media.id}/")
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)

        self._login_parent()
        url = f"/api/v1/tenant/portal/students/{self.student.id}/media/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        items = response.data.get("results", response.data)
        returned_ids = {str(item["id"]) for item in items}
        self.assertNotIn(str(self.active_media.id), returned_ids)
        self.assertNotIn(str(self.inactive_media.id), returned_ids)
        self.assertNotIn(str(self.dropped_media.id), returned_ids)

    @patch("tenant.portal.serializers.MediaService.get_file_url")
    def test_portal_media_excludes_media_soft_deleted_via_bulk_deactivate(self, mock_get_file_url):
        mock_get_file_url.side_effect = lambda media: f"https://cdn.test/{media.file_name}"
        self._login_admin()
        bulk_response = self.client.patch(
            "/api/v1/tenant/media/bulk-deactivate/",
            {"ids": [str(self.active_media.id)]},
            format="json",
        )
        self.assertEqual(bulk_response.status_code, status.HTTP_200_OK)
        self.assertEqual(bulk_response.data["deactivated"], 1)

        self._login_parent()
        url = f"/api/v1/tenant/portal/students/{self.student.id}/media/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        items = response.data.get("results", response.data)
        returned_ids = {str(item["id"]) for item in items}
        self.assertNotIn(str(self.active_media.id), returned_ids)
        self.assertNotIn(str(self.inactive_media.id), returned_ids)
        self.assertNotIn(str(self.dropped_media.id), returned_ids)

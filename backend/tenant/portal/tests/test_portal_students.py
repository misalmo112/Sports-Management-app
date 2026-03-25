from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from saas_platform.tenants.models import Academy
from tenant.students.models import Parent, Student

User = get_user_model()


class PortalStudentsApiTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.academy = Academy.objects.create(
            name="Portal Students Academy",
            slug="portal-students-academy",
            email="portal.students@academy.test",
            onboarding_completed=True,
        )
        self.other_academy = Academy.objects.create(
            name="Other Portal Students Academy",
            slug="other-portal-students-academy",
            email="other.portal.students@academy.test",
            onboarding_completed=True,
        )

        self.parent_user = User.objects.create_user(
            email="parent.students@academy.test",
            password="testpass123",
            role=User.Role.PARENT,
            academy=self.academy,
            is_active=True,
        )
        self.parent = Parent.objects.create(
            academy=self.academy,
            first_name="Primary",
            last_name="Parent",
            email="PARENT.STUDENTS@academy.test",
            is_active=True,
        )

        self.other_parent_user = User.objects.create_user(
            email="other.parent.students@academy.test",
            password="testpass123",
            role=User.Role.PARENT,
            academy=self.academy,
            is_active=True,
        )
        self.other_parent = Parent.objects.create(
            academy=self.academy,
            first_name="Other",
            last_name="Parent",
            email="other.parent.students@academy.test",
            is_active=True,
        )

        self.child_1 = Student.objects.create(
            academy=self.academy,
            parent=self.parent,
            first_name="Child",
            last_name="One",
            emergency_contact_name="Before One",
        )
        self.child_2 = Student.objects.create(
            academy=self.academy,
            parent=self.parent,
            first_name="Child",
            last_name="Two",
            emergency_contact_name="Before Two",
        )
        self.other_parent_child = Student.objects.create(
            academy=self.academy,
            parent=self.other_parent,
            first_name="Hidden",
            last_name="Student",
        )
        self.other_academy_parent = Parent.objects.create(
            academy=self.other_academy,
            first_name="External",
            last_name="Parent",
            email="external.parent@academy.test",
            is_active=True,
        )
        self.other_academy_child = Student.objects.create(
            academy=self.other_academy,
            parent=self.other_academy_parent,
            first_name="External",
            last_name="Child",
        )

        self.list_url = "/api/v1/tenant/portal/students/"

    def _login_parent(self):
        token_response = self.client.post(
            "/api/v1/auth/token/",
            {"email": self.parent_user.email, "password": "testpass123"},
            format="json",
        )
        self.assertEqual(token_response.status_code, status.HTTP_200_OK)
        access = token_response.data["access"]
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {access}",
            HTTP_X_ACADEMY_ID=str(self.academy.id),
        )

    def test_list_returns_only_authenticated_parents_children(self):
        self._login_parent()
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        items = response.data.get("results", response.data)
        returned_ids = {item["id"] for item in items}
        self.assertEqual(returned_ids, {self.child_1.id, self.child_2.id})
        self.assertNotIn(self.other_parent_child.id, returned_ids)
        self.assertNotIn(self.other_academy_child.id, returned_ids)

    def test_patch_allowed_fields_works(self):
        self._login_parent()
        detail_url = f"/api/v1/tenant/portal/students/{self.child_1.id}/"

        payload = {
            "emergency_contact_name": "Updated Contact",
            "emergency_contact_phone": "+971555000111",
            "emergency_contact_relationship": "Uncle",
            "medical_notes": "Asthma inhaler required",
            "allergies": "Peanuts",
        }
        response = self.client.patch(detail_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.child_1.refresh_from_db()
        self.assertEqual(self.child_1.emergency_contact_name, payload["emergency_contact_name"])
        self.assertEqual(self.child_1.emergency_contact_phone, payload["emergency_contact_phone"])
        self.assertEqual(
            self.child_1.emergency_contact_relationship,
            payload["emergency_contact_relationship"],
        )
        self.assertEqual(self.child_1.medical_notes, payload["medical_notes"])
        self.assertEqual(self.child_1.allergies, payload["allergies"])

    def test_patch_with_is_active_included_leaves_field_unchanged(self):
        self._login_parent()
        detail_url = f"/api/v1/tenant/portal/students/{self.child_1.id}/"
        original_is_active = self.child_1.is_active

        response = self.client.patch(
            detail_url,
            {"is_active": not original_is_active, "medical_notes": "Updated notes"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.child_1.refresh_from_db()
        self.assertEqual(self.child_1.is_active, original_is_active)
        self.assertEqual(self.child_1.medical_notes, "Updated notes")

    def test_direct_access_to_another_parents_student_returns_404(self):
        self._login_parent()
        detail_url = f"/api/v1/tenant/portal/students/{self.other_parent_child.id}/"

        response = self.client.get(detail_url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

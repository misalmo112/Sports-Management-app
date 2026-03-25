from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from saas_platform.tenants.models import Academy
from tenant.students.models import Parent

User = get_user_model()


class PortalAuthTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.academy = Academy.objects.create(
            name="Portal Academy",
            slug="portal-academy",
            email="portal@academy.test",
            onboarding_completed=True,
        )
        self.other_academy = Academy.objects.create(
            name="Other Portal Academy",
            slug="other-portal-academy",
            email="other.portal@academy.test",
            onboarding_completed=True,
        )
        self.url = "/api/v1/tenant/portal/ping/"

    def _login_and_set_auth(self, email: str, password: str, academy_id):
        token_response = self.client.post(
            "/api/v1/auth/token/",
            {"email": email, "password": password},
            format="json",
        )
        self.assertEqual(token_response.status_code, status.HTTP_200_OK)
        access = token_response.data["access"]
        self.client.credentials(
            HTTP_AUTHORIZATION=f"Bearer {access}",
            HTTP_X_ACADEMY_ID=str(academy_id),
        )

    def test_parent_gets_200_and_parent_id(self):
        user = User.objects.create_user(
            email="parent.user@academy.test",
            password="testpass123",
            role=User.Role.PARENT,
            academy=self.academy,
            is_active=True,
        )
        parent = Parent.objects.create(
            academy=self.academy,
            first_name="Parent",
            last_name="User",
            email="PARENT.USER@academy.test",
            is_active=True,
        )

        self._login_and_set_auth(user.email, "testpass123", self.academy.id)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "ok")
        self.assertEqual(response.data["parent_id"], parent.id)

    def test_admin_gets_403(self):
        admin = User.objects.create_user(
            email="admin.portal@academy.test",
            password="testpass123",
            role=User.Role.ADMIN,
            academy=self.academy,
            is_active=True,
        )

        self._login_and_set_auth(admin.email, "testpass123", self.academy.id)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_unauthenticated_gets_401(self):
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_parent_without_matching_parent_row_gets_403(self):
        user = User.objects.create_user(
            email="parent.nomatch@academy.test",
            password="testpass123",
            role=User.Role.PARENT,
            academy=self.academy,
            is_active=True,
        )
        Parent.objects.create(
            academy=self.other_academy,
            first_name="Other",
            last_name="Parent",
            email="parent.nomatch@academy.test",
            is_active=True,
        )

        self._login_and_set_auth(user.email, "testpass123", self.academy.id)
        response = self.client.get(self.url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

"""
API tests for tenant audit log endpoint.
"""
from django.test import TestCase
from rest_framework.test import APIClient
from saas_platform.audit.models import AuditLog, AuditAction, ResourceType


class TenantAuditLogAPITests(TestCase):
    """Tests for GET /api/v1/tenant/audit-logs/"""

    def setUp(self):
        from django.contrib.auth import get_user_model
        from saas_platform.tenants.models import Academy
        User = get_user_model()

        self.academy1 = Academy.objects.create(name='Academy One', slug='academy-one')
        self.academy2 = Academy.objects.create(name='Academy Two', slug='academy-two')

        self.admin_user = User.objects.create_user(
            email='admin@academy1.com',
            password='testpass',
        )
        self.admin_user.role = 'ADMIN'
        self.admin_user.save()

        self.coach_user = User.objects.create_user(
            email='coach@academy1.com',
            password='testpass',
        )
        self.coach_user.role = 'COACH'
        self.coach_user.save()

        self.parent_user = User.objects.create_user(
            email='parent@academy1.com',
            password='testpass',
        )
        self.parent_user.role = 'PARENT'
        self.parent_user.save()

        self.tenant_entry_a1 = AuditLog.objects.create(
            user=self.admin_user,
            action=AuditAction.CREATE,
            resource_type=ResourceType.STUDENT,
            resource_id='1',
            academy=self.academy1,
            scope='TENANT',
        )
        self.tenant_entry_a2 = AuditLog.objects.create(
            user=self.admin_user,
            action=AuditAction.UPDATE,
            resource_type=ResourceType.COACH,
            resource_id='2',
            academy=self.academy2,
            scope='TENANT',
        )
        self.platform_entry = AuditLog.objects.create(
            user=self.admin_user,
            action=AuditAction.CREATE,
            resource_type=ResourceType.ACADEMY,
            resource_id='3',
            academy=self.academy1,
            scope='PLATFORM',
        )

        self.client = APIClient()

    def _get_with_academy(self, user, academy, url):
        self.client.force_authenticate(user=user)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(academy.id))
        return self.client.get(url)

    def test_admin_can_access_audit_logs(self):
        """ADMIN role returns 200."""
        response = self._get_with_academy(
            self.admin_user, self.academy1,
            '/api/v1/tenant/audit-logs/'
        )
        self.assertEqual(response.status_code, 200)

    def test_coach_gets_403(self):
        """COACH role returns 403."""
        response = self._get_with_academy(
            self.coach_user, self.academy1,
            '/api/v1/tenant/audit-logs/'
        )
        self.assertEqual(response.status_code, 403)

    def test_parent_gets_403(self):
        """PARENT role returns 403."""
        response = self._get_with_academy(
            self.parent_user, self.academy1,
            '/api/v1/tenant/audit-logs/'
        )
        self.assertEqual(response.status_code, 403)

    def test_only_academy_entries_returned(self):
        """Response only includes entries for the requesting academy."""
        response = self._get_with_academy(
            self.admin_user, self.academy1,
            '/api/v1/tenant/audit-logs/'
        )
        self.assertEqual(response.status_code, 200)
        ids = [r['id'] for r in response.data['results']]
        self.assertIn(self.tenant_entry_a1.id, ids)
        self.assertNotIn(self.tenant_entry_a2.id, ids)

    def test_action_filter(self):
        """?action=CREATE returns only CREATE entries."""
        response = self._get_with_academy(
            self.admin_user, self.academy1,
            '/api/v1/tenant/audit-logs/?action=CREATE'
        )
        self.assertEqual(response.status_code, 200)
        for entry in response.data['results']:
            self.assertEqual(entry['action'], 'CREATE')

    def test_resource_type_filter(self):
        """?resource_type=STUDENT returns only STUDENT entries."""
        response = self._get_with_academy(
            self.admin_user, self.academy1,
            '/api/v1/tenant/audit-logs/?resource_type=STUDENT'
        )
        self.assertEqual(response.status_code, 200)
        for entry in response.data['results']:
            self.assertEqual(entry['resource_type'], 'STUDENT')

    def test_date_filters(self):
        """date_from and date_to filters are accepted without error."""
        from django.utils import timezone
        now = timezone.now()
        date_from = now.replace(hour=0, minute=0, second=0).isoformat()
        date_to = now.replace(hour=23, minute=59, second=59).isoformat()
        response = self._get_with_academy(
            self.admin_user, self.academy1,
            f'/api/v1/tenant/audit-logs/?date_from={date_from}&date_to={date_to}'
        )
        self.assertEqual(response.status_code, 200)

    def test_platform_entries_excluded(self):
        """PLATFORM scope entries are not returned in the tenant view."""
        response = self._get_with_academy(
            self.admin_user, self.academy1,
            '/api/v1/tenant/audit-logs/'
        )
        self.assertEqual(response.status_code, 200)
        ids = [r['id'] for r in response.data['results']]
        self.assertNotIn(self.platform_entry.id, ids)

    def test_scope_field_in_response(self):
        """Response entries include the scope field."""
        response = self._get_with_academy(
            self.admin_user, self.academy1,
            '/api/v1/tenant/audit-logs/'
        )
        self.assertEqual(response.status_code, 200)
        if response.data['results']:
            self.assertIn('scope', response.data['results'][0])

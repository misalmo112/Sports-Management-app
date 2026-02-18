from django.test import TestCase
from saas_platform.quotas.models import TenantQuota, TenantUsage
from saas_platform.tenants.models import Academy


class TenantQuotaModelTest(TestCase):
    """Test TenantQuota model."""
    
    def setUp(self):
        self.academy = Academy.objects.create(
            name='Test Academy',
            slug='test-academy',
            email='test@example.com'
        )
    
    def test_create_tenant_quota(self):
        """Test creating a TenantQuota."""
        quota = TenantQuota.objects.create(
            academy=self.academy,
            storage_bytes_limit=10737418240,  # 10GB
            max_students=100,
            max_coaches=10,
            max_admins=5,
            max_classes=50
        )
        self.assertEqual(quota.academy, self.academy)
        self.assertEqual(quota.storage_bytes_limit, 10737418240)
        self.assertEqual(quota.max_students, 100)
    
    def test_tenant_quota_str(self):
        """Test TenantQuota string representation."""
        quota = TenantQuota.objects.create(
            academy=self.academy,
            storage_bytes_limit=10737418240
        )
        self.assertEqual(str(quota), f"Quota for {self.academy.name}")
    
    def test_one_to_one_relationship(self):
        """Test that TenantQuota has OneToOne relationship with Academy."""
        quota = TenantQuota.objects.create(
            academy=self.academy,
            storage_bytes_limit=10737418240
        )
        self.assertEqual(self.academy.quota, quota)


class TenantUsageModelTest(TestCase):
    """Test TenantUsage model."""
    
    def setUp(self):
        self.academy = Academy.objects.create(
            name='Test Academy',
            slug='test-academy',
            email='test@example.com'
        )
    
    def test_create_tenant_usage(self):
        """Test creating a TenantUsage."""
        usage = TenantUsage.objects.create(
            academy=self.academy,
            storage_used_bytes=5368709120,  # 5GB
            students_count=50,
            coaches_count=5,
            admins_count=2,
            classes_count=25
        )
        self.assertEqual(usage.academy, self.academy)
        self.assertEqual(usage.storage_used_bytes, 5368709120)
        self.assertEqual(usage.students_count, 50)
    
    def test_tenant_usage_str(self):
        """Test TenantUsage string representation."""
        usage = TenantUsage.objects.create(
            academy=self.academy,
            storage_used_bytes=5368709120
        )
        self.assertEqual(str(usage), f"Usage for {self.academy.name}")
    
    def test_one_to_one_relationship(self):
        """Test that TenantUsage has OneToOne relationship with Academy."""
        usage = TenantUsage.objects.create(
            academy=self.academy,
            storage_used_bytes=5368709120
        )
        self.assertEqual(self.academy.usage, usage)

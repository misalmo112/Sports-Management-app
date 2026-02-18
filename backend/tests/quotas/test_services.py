from django.test import TestCase
from django.utils import timezone
from saas_platform.quotas.services import QuotaService
from saas_platform.quotas.models import TenantQuota
from saas_platform.subscriptions.models import Plan, Subscription, SubscriptionStatus
from saas_platform.tenants.models import Academy


class QuotaServiceTest(TestCase):
    """Test QuotaService."""
    
    def setUp(self):
        self.academy = Academy.objects.create(
            name='Test Academy',
            slug='test-academy',
            email='test@example.com'
        )
        
        self.plan = Plan.objects.create(
            name='Basic Plan',
            slug='basic-plan',
            limits_json={
                'storage_bytes': 10737418240,  # 10GB
                'max_students': 100,
                'max_coaches': 10,
                'max_admins': 5,
                'max_classes': 50
            }
        )
    
    def test_calculate_effective_quota_no_subscription(self):
        """Test effective quota calculation when no subscription exists."""
        effective = QuotaService.calculate_effective_quota(self.academy)
        self.assertIsNone(effective)
    
    def test_calculate_effective_quota_with_subscription(self):
        """Test effective quota calculation with subscription."""
        subscription = Subscription.objects.create(
            academy=self.academy,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            is_current=True,
            start_at=timezone.now()
        )
        
        effective = QuotaService.calculate_effective_quota(self.academy)
        self.assertIsNotNone(effective)
        self.assertEqual(effective['storage_bytes'], 10737418240)
        self.assertEqual(effective['max_students'], 100)
    
    def test_calculate_effective_quota_with_overrides(self):
        """Test effective quota calculation with subscription overrides."""
        subscription = Subscription.objects.create(
            academy=self.academy,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            is_current=True,
            start_at=timezone.now(),
            overrides_json={
                'storage_bytes': 21474836480,  # 20GB (override)
                'max_students': 200  # 200 (override)
            }
        )
        
        effective = QuotaService.calculate_effective_quota(self.academy)
        self.assertEqual(effective['storage_bytes'], 21474836480)  # From override
        self.assertEqual(effective['max_students'], 200)  # From override
        self.assertEqual(effective['max_coaches'], 10)  # From plan default
    
    def test_update_tenant_quota_no_subscription(self):
        """Test updating TenantQuota when no subscription exists."""
        QuotaService.update_tenant_quota(self.academy)
        
        quota = TenantQuota.objects.get(academy=self.academy)
        self.assertEqual(quota.storage_bytes_limit, 0)
        self.assertEqual(quota.max_students, 0)
    
    def test_update_tenant_quota_with_subscription(self):
        """Test updating TenantQuota with subscription."""
        Subscription.objects.create(
            academy=self.academy,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            is_current=True,
            start_at=timezone.now()
        )
        
        QuotaService.update_tenant_quota(self.academy)
        
        quota = TenantQuota.objects.get(academy=self.academy)
        self.assertEqual(quota.storage_bytes_limit, 10737418240)
        self.assertEqual(quota.max_students, 100)
    
    def test_update_tenant_quota_with_overrides(self):
        """Test updating TenantQuota with subscription overrides."""
        Subscription.objects.create(
            academy=self.academy,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            is_current=True,
            start_at=timezone.now(),
            overrides_json={
                'max_students': 200
            }
        )
        
        QuotaService.update_tenant_quota(self.academy)
        
        quota = TenantQuota.objects.get(academy=self.academy)
        self.assertEqual(quota.max_students, 200)  # From override
        self.assertEqual(quota.max_coaches, 10)  # From plan default

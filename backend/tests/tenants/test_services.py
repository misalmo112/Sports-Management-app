from django.test import TestCase
from django.utils import timezone
from saas_platform.tenants.models import Academy
from saas_platform.tenants.services import AcademyService
from saas_platform.subscriptions.models import Plan, Subscription, SubscriptionStatus
from saas_platform.quotas.models import TenantQuota, TenantUsage


class AcademyServiceTest(TestCase):
    """Test AcademyService."""
    
    def setUp(self):
        self.academy_data = {
            'name': 'Test Academy',
            'slug': 'test-academy',
            'email': 'test@example.com',
            'timezone': 'UTC'
        }
        
        self.plan = Plan.objects.create(
            name='Basic Plan',
            slug='basic-plan',
            limits_json={
                'storage_bytes': 10737418240,
                'max_students': 100,
                'max_coaches': 10,
                'max_admins': 5,
                'max_classes': 50
            }
        )
    
    def test_create_academy(self):
        """Test creating an academy with TenantQuota and TenantUsage."""
        academy = AcademyService.create_academy(self.academy_data)
        
        self.assertIsNotNone(academy.id)
        self.assertEqual(academy.name, 'Test Academy')
        
        # Check TenantQuota was created
        quota = TenantQuota.objects.get(academy=academy)
        self.assertIsNotNone(quota)
        
        # Check TenantUsage was created
        usage = TenantUsage.objects.get(academy=academy)
        self.assertIsNotNone(usage)
    
    def test_update_academy_plan(self):
        """Test updating academy's subscription plan."""
        academy = AcademyService.create_academy(self.academy_data)
        
        subscription = AcademyService.update_academy_plan(
            academy=academy,
            plan_id=self.plan.id,
            start_at=timezone.now()
        )
        
        self.assertEqual(subscription.academy, academy)
        self.assertEqual(subscription.plan, self.plan)
        self.assertTrue(subscription.is_current)
        
        # Check TenantQuota was updated
        quota = TenantQuota.objects.get(academy=academy)
        self.assertEqual(quota.storage_bytes_limit, 10737418240)
        self.assertEqual(quota.max_students, 100)
    
    def test_update_academy_plan_with_overrides(self):
        """Test updating academy plan with quota overrides."""
        academy = AcademyService.create_academy(self.academy_data)
        
        subscription = AcademyService.update_academy_plan(
            academy=academy,
            plan_id=self.plan.id,
            start_at=timezone.now(),
            overrides_json={'max_students': 200}
        )
        
        self.assertEqual(subscription.overrides_json['max_students'], 200)
        
        # Check TenantQuota was updated with overrides
        quota = TenantQuota.objects.get(academy=academy)
        self.assertEqual(quota.max_students, 200)
    
    def test_update_academy_quota(self):
        """Test updating academy quota overrides."""
        academy = AcademyService.create_academy(self.academy_data)
        
        # Create subscription first
        subscription = AcademyService.update_academy_plan(
            academy=academy,
            plan_id=self.plan.id,
            start_at=timezone.now()
        )
        
        # Update quota
        updated_subscription = AcademyService.update_academy_quota(
            academy=academy,
            overrides_json={'max_students': 250}
        )
        
        self.assertEqual(updated_subscription.overrides_json['max_students'], 250)
        
        # Check TenantQuota was updated
        quota = TenantQuota.objects.get(academy=academy)
        self.assertEqual(quota.max_students, 250)
    
    def test_update_academy_quota_no_subscription(self):
        """Test updating quota when no subscription exists."""
        academy = AcademyService.create_academy(self.academy_data)
        
        with self.assertRaises(ValueError):
            AcademyService.update_academy_quota(
                academy=academy,
                overrides_json={'max_students': 250}
            )

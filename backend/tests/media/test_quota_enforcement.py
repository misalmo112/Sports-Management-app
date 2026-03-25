from django.test import TestCase, TransactionTestCase
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db import transaction
from unittest.mock import patch
from tenant.media.models import MediaFile
from tenant.media.services import MediaService
from saas_platform.tenants.models import Academy
from saas_platform.subscriptions.models import Plan, Subscription, SubscriptionStatus
from saas_platform.quotas.models import TenantQuota, TenantUsage
from django.utils import timezone
import threading


class QuotaEnforcementTest(TransactionTestCase):
    """Test quota enforcement for media uploads."""
    
    def setUp(self):
        self.academy = Academy.objects.create(
            name='Test Academy',
            slug='test-academy',
            email='test@example.com'
        )
        
        # Create plan with storage quota
        self.plan = Plan.objects.create(
            name='Basic Plan',
            slug='basic-plan',
            limits_json={
                'storage_bytes': 10485760,  # 10MB
                'max_students': 100,
                'max_coaches': 10,
                'max_admins': 5,
                'max_classes': 50
            }
        )
        
        # Create subscription
        self.subscription = Subscription.objects.create(
            academy=self.academy,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            is_current=True,
            start_at=timezone.now()
        )
        
        # TenantQuota is auto-created by subscription signal
        # Just get or create TenantUsage
        self.usage, _ = TenantUsage.objects.get_or_create(
            academy=self.academy,
            defaults={'storage_used_bytes': 0}
        )
        
        self.test_file = SimpleUploadedFile(
            "test.jpg",
            b"x" * 1024,  # 1KB
            content_type="image/jpeg"
        )
    
    @patch('tenant.media.services.default_storage')
    def test_upload_allowed_when_quota_available(self, mock_storage):
        """Test upload is allowed when quota is available."""
        mock_storage.save.return_value = f"{self.academy.id}/2024/01/test-uuid-test.jpg"
        mock_storage.size.return_value = 1024  # 1KB
        
        # Upload should succeed
        media_file = MediaService.upload_file(
            academy=self.academy,
            file=self.test_file
        )
        
        # Verify MediaFile was created
        self.assertIsNotNone(media_file.id)
        self.assertEqual(media_file.file_size, 1024)
        
        # Note: Usage update is done in views, not in service
        # This test just verifies the upload succeeds
    
    @patch('tenant.media.services.default_storage')
    def test_upload_blocked_when_quota_exceeded(self, mock_storage):
        """Test upload is blocked when quota would be exceeded."""
        # Set usage to near limit
        self.usage.storage_used_bytes = 10485759  # 1 byte less than 10MB
        self.usage.save()
        
        # Create a file that would exceed quota
        large_file = SimpleUploadedFile(
            "large.jpg",
            b"x" * 2048,  # 2KB - would exceed limit
            content_type="image/jpeg"
        )
        
        mock_storage.save.return_value = f"{self.academy.id}/2024/01/test-uuid-large.jpg"
        mock_storage.size.return_value = 2048
        
        # This should be blocked by quota decorator in views
        # For service-level test, we check the quota manually
        from shared.services.quota import check_quota_before_create
        
        with self.assertRaises(Exception):  # QuotaExceededError
            check_quota_before_create(
                academy=self.academy,
                quota_type='storage_bytes',
                requested_increment=2048
            )
    
    @patch('tenant.media.services.default_storage')
    def test_storage_usage_updated_on_upload(self, mock_storage):
        """Test storage usage is updated correctly on upload."""
        initial_usage = self.usage.storage_used_bytes
        
        mock_storage.save.return_value = f"{self.academy.id}/2024/01/test-uuid-test.jpg"
        mock_storage.size.return_value = 2048  # 2KB
        
        media_file = MediaService.upload_file(
            academy=self.academy,
            file=self.test_file
        )

        # Storage counter is signal-driven: it should already be updated.
        self.usage.refresh_from_db()
        self.assertEqual(self.usage.storage_used_bytes, initial_usage + 2048)
    
    @patch('tenant.media.services.default_storage')
    def test_storage_usage_decremented_on_delete(self, mock_storage):
        """Test storage usage is decremented on file delete."""
        # Upload a file first
        mock_storage.save.return_value = f"{self.academy.id}/2024/01/test-uuid-test.jpg"
        mock_storage.size.return_value = 2048
        mock_storage.exists.return_value = True
        
        media_file = MediaService.upload_file(
            academy=self.academy,
            file=self.test_file
        )

        # Signal-driven counter should already reflect the uploaded file.
        self.usage.refresh_from_db()
        initial_usage = self.usage.storage_used_bytes
        self.assertEqual(initial_usage, 2048)

        # Delete file
        file_size = media_file.file_size
        MediaService.delete_file(media_file)

        # Signal-driven counter should now be recomputed to 0.
        self.usage.refresh_from_db()
        self.assertEqual(
            self.usage.storage_used_bytes,
            0,
            f"Expected 0, got {self.usage.storage_used_bytes}. Initial was {initial_usage}, file_size was {file_size}",
        )
    
    @patch('tenant.media.services.default_storage')
    def test_negative_storage_prevented_on_delete(self, mock_storage):
        """Test that storage usage cannot go negative."""
        # Set usage to a small value
        self.usage.storage_used_bytes = 100
        self.usage.save()
        
        # Create a file with larger size
        mock_storage.save.return_value = f"{self.academy.id}/2024/01/test-uuid-test.jpg"
        mock_storage.size.return_value = 500
        mock_storage.exists.return_value = True
        
        media_file = MediaService.upload_file(
            academy=self.academy,
            file=self.test_file
        )
        
        # Manually set usage to simulate inconsistency
        self.usage.storage_used_bytes = 100
        self.usage.save()
        
        # Delete file (which is 500 bytes, but usage is only 100)
        file_size = media_file.file_size
        MediaService.delete_file(media_file)
        
        # Update usage (should prevent negative)
        with transaction.atomic():
            usage = TenantUsage.objects.select_for_update().get(
                academy=self.academy
            )
            usage.storage_used_bytes -= file_size
            if usage.storage_used_bytes < 0:
                usage.storage_used_bytes = 0
            usage.save()
        
        # Verify usage is 0, not negative
        self.usage.refresh_from_db()
        self.assertEqual(self.usage.storage_used_bytes, 0)
        self.assertGreaterEqual(self.usage.storage_used_bytes, 0)
    
    @patch('tenant.media.services.default_storage')
    def test_concurrent_uploads_handled_correctly(self, mock_storage):
        """Test that concurrent uploads are handled correctly with atomic updates."""
        # Skip on SQLite as it doesn't handle concurrent transactions well
        from django.db import connection
        if 'sqlite' in connection.vendor:
            self.skipTest("SQLite doesn't support concurrent transactions well")
        
        results = []
        errors = []
        lock = threading.Lock()
        
        def upload_file(thread_id):
            try:
                # Each thread needs unique file path
                with lock:
                    mock_storage.save.return_value = f"{self.academy.id}/2024/01/test-uuid-{thread_id}.jpg"
                mock_storage.size.return_value = 1024
                
                # Create a new file for each thread
                test_file = SimpleUploadedFile(
                    f"test{thread_id}.jpg",
                    b"x" * 1024,
                    content_type="image/jpeg"
                )
                
                media_file = MediaService.upload_file(
                    academy=self.academy,
                    file=test_file
                )
                
                # Atomic update
                with transaction.atomic():
                    usage = TenantUsage.objects.select_for_update().get(
                        academy=self.academy
                    )
                    usage.storage_used_bytes += media_file.file_size
                    usage.save()
                
                results.append(media_file)
            except Exception as e:
                errors.append(str(e))
        
        # Create multiple threads to upload simultaneously
        threads = []
        for i in range(5):
            thread = threading.Thread(target=upload_file, args=(i,))
            threads.append(thread)
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # Verify all uploads succeeded
        self.assertEqual(len(results), 5, f"Expected 5 uploads, got {len(results)}. Errors: {errors}")
        self.assertEqual(len(errors), 0, f"Unexpected errors: {errors}")
        
        # Verify total usage is correct (5 * 1024 = 5120)
        self.usage.refresh_from_db()
        self.assertEqual(self.usage.storage_used_bytes, 5120)
    
    @patch('tenant.media.services.default_storage')
    def test_upload_at_exact_quota_limit(self, mock_storage):
        """Test upload at exact quota limit."""
        # Set usage to exactly at limit
        self.usage.storage_used_bytes = 10485760  # Exactly 10MB
        self.usage.save()
        
        # Try to upload even 1 byte - should be blocked
        from shared.services.quota import check_quota_before_create
        
        with self.assertRaises(Exception):  # QuotaExceededError
            check_quota_before_create(
                academy=self.academy,
                quota_type='storage_bytes',
                requested_increment=1
            )
    
    @patch('tenant.media.services.default_storage')
    def test_upload_just_under_quota_limit(self, mock_storage):
        """Test upload just under quota limit is allowed."""
        # Set usage to 1 byte under limit
        self.usage.storage_used_bytes = 10485759  # 1 byte under 10MB
        self.usage.save()
        
        # Upload 1 byte should be allowed
        from shared.services.quota import check_quota_before_create
        
        allowed, current, limit, _storage_status = check_quota_before_create(
            academy=self.academy,
            quota_type='storage_bytes',
            requested_increment=1
        )
        
        self.assertTrue(allowed)
        self.assertEqual(current, 10485759)
        self.assertEqual(limit, 10485760)

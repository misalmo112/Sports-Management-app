"""
Tests for media API views.
"""
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from datetime import date
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch
from tenant.media.models import MediaFile
from tenant.classes.models import Class
from saas_platform.tenants.models import Academy
from saas_platform.subscriptions.models import Plan, Subscription, SubscriptionStatus
from saas_platform.quotas.models import TenantQuota, TenantUsage
from django.utils import timezone
from config.settings import base

User = get_user_model()


class MediaFileViewsTest(TestCase):
    """Test media API endpoints."""
    
    def setUp(self):
        self.client = APIClient()
        
        # Create academy
        self.academy = Academy.objects.create(
            name='Test Academy',
            slug='test-academy',
            email='test@example.com',
            timezone='UTC'
        )
        
        # Create plan and subscription
        self.plan = Plan.objects.create(
            name='Basic Plan',
            slug='basic-plan',
            limits_json={
                'storage_bytes': 10485760,  # 10MB
                'max_students': 100,
                'allowed_mime_types': ['image/jpeg', 'image/png'],
                'max_file_size_mb': 1,
            }
        )
        
        self.subscription = Subscription.objects.create(
            academy=self.academy,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            is_current=True,
            start_at=timezone.now()
        )
        
        # Mark onboarding as completed (required for tenant APIs)
        self.academy.onboarding_completed = True
        self.academy.save()
        
        # TenantQuota is auto-created by subscription signal
        # Just get or create TenantUsage
        TenantUsage.objects.get_or_create(
            academy=self.academy,
            defaults={'storage_used_bytes': 0}
        )
        
        # Create admin user (role and academy are required)
        self.admin = User.objects.create_user(
            email='admin@example.com',
            password='testpass123',
            role=User.Role.ADMIN,
            academy=self.academy,
            is_active=True  # Activate for testing
        )
        
        # Create a test class for media uploads
        self.test_class = Class.objects.create(
            academy=self.academy,
            name='Test Class',
            max_capacity=20
        )
        
        # Authenticate and set academy context
        self.client.force_authenticate(user=self.admin)
        # Set academy header for middleware
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))
        
        self.test_file = SimpleUploadedFile(
            "test.jpg",
            b"file_content",
            content_type="image/jpeg"
        )

    @staticmethod
    def _extract_error_list(response, field_name):
        details = response.data.get('details', response.data)
        return details.get(field_name, [])
    
    @patch('tenant.media.services.default_storage')
    def test_list_media_files(self, mock_storage):
        """Test GET /api/v1/tenant/media/"""
        # Create some media files
        MediaFile.objects.create(
            academy=self.academy,
            file_name='test1.jpg',
            file_path='test-path/test1.jpg',
            file_size=1024,
            mime_type='image/jpeg'
        )
        MediaFile.objects.create(
            academy=self.academy,
            file_name='test2.jpg',
            file_path='test-path/test2.jpg',
            file_size=2048,
            mime_type='image/jpeg'
        )
        
        response = self.client.get('/api/v1/tenant/media/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
        self.assertEqual(response.data['results'][0]['file_name'], 'test2.jpg')  # Newest first
    
    @patch('tenant.media.services.default_storage')
    def test_list_media_files_tenant_isolation(self, mock_storage):
        """Test that media files are isolated by academy."""
        # Create another academy
        other_academy = Academy.objects.create(
            name='Other Academy',
            slug='other-academy',
            email='other@example.com'
        )
        
        # Create files for both academies
        MediaFile.objects.create(
            academy=self.academy,
            file_name='test1.jpg',
            file_path='test-path/test1.jpg',
            file_size=1024
        )
        MediaFile.objects.create(
            academy=other_academy,
            file_name='test2.jpg',
            file_path='test-path/test2.jpg',
            file_size=2048
        )
        
        response = self.client.get('/api/v1/tenant/media/')
        
        # Should only see files for self.academy
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['file_name'], 'test1.jpg')
    
    @patch('tenant.media.services.default_storage')
    def test_retrieve_media_file(self, mock_storage):
        """Test GET /api/v1/tenant/media/{id}/"""
        media_file = MediaFile.objects.create(
            academy=self.academy,
            file_name='test.jpg',
            file_path='test-path/test.jpg',
            file_size=1024,
            mime_type='image/jpeg',
            description='Test image'
        )
        
        response = self.client.get(f'/api/v1/tenant/media/{media_file.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['file_name'], 'test.jpg')
        self.assertEqual(response.data['file_size'], 1024)
        self.assertEqual(response.data['description'], 'Test image')
    
    @patch('tenant.media.services.default_storage')
    def test_upload_file(self, mock_storage):
        """Test POST /api/v1/tenant/media/"""
        mock_storage.save.return_value = f"{self.academy.id}/2024/01/test-uuid-test.jpg"
        mock_storage.size.return_value = 1024
        
        data = {
            'file': self.test_file,
            'class_id': self.test_class.id,
            'description': 'Test image upload'
        }
        
        response = self.client.post('/api/v1/tenant/media/', data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['file_name'], 'test.jpg')
        self.assertEqual(response.data['file_size'], 1024)
        self.assertEqual(response.data['description'], 'Test image upload')
        self.assertIn('file_url', response.data)
        
        # Verify MediaFile was created
        self.assertTrue(MediaFile.objects.filter(file_name='test.jpg').exists())
        
        # Verify storage usage was updated
        usage = TenantUsage.objects.get(academy=self.academy)
        self.assertEqual(usage.storage_used_bytes, 1024)

    def test_upload_file_requires_class_id(self):
        """Test upload without class_id returns 400."""
        data = {'file': self.test_file}
        response = self.client.post('/api/v1/tenant/media/', data, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(self._extract_error_list(response, 'class_id'))

    def test_upload_file_rejects_other_academy_class_id(self):
        """Test class_id from another academy returns 400."""
        other_academy = Academy.objects.create(
            name='Other Academy',
            slug='other-academy-2',
            email='other2@example.com',
            onboarding_completed=True,
        )
        other_class = Class.objects.create(
            academy=other_academy,
            name='Other Class',
            max_capacity=20,
        )
        data = {
            'file': self.test_file,
            'class_id': other_class.id,
        }

        response = self.client.post('/api/v1/tenant/media/', data, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(self._extract_error_list(response, 'class_id'))

    def test_upload_file_rejects_disallowed_mime(self):
        """Test disallowed MIME type returns 400 with allowed types in message."""
        bad_file = SimpleUploadedFile(
            "doc.txt",
            b"not allowed",
            content_type="text/plain"
        )
        data = {
            'file': bad_file,
            'class_id': self.test_class.id
        }

        response = self.client.post('/api/v1/tenant/media/', data, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        file_errors = self._extract_error_list(response, 'file')
        self.assertTrue(file_errors)
        self.assertIn('allowed types', str(file_errors[0]).lower())
        self.assertIn('image/jpeg', str(file_errors[0]))
        self.assertIn('image/png', str(file_errors[0]))
    
    @patch('tenant.media.services.default_storage')
    def test_upload_file_quota_exceeded(self, mock_storage):
        """Test upload blocked when quota exceeded."""
        # Set usage to near limit
        usage = TenantUsage.objects.get(academy=self.academy)
        usage.storage_used_bytes = 10485759  # 1 byte under 10MB
        usage.save()
        
        # Create large file
        large_file = SimpleUploadedFile(
            "large.jpg",
            b"x" * 2048,  # 2KB - would exceed
            content_type="image/jpeg"
        )
        
        data = {
            'file': large_file,
            'class_id': self.test_class.id
        }
        
        response = self.client.post('/api/v1/tenant/media/', data, format='multipart')
        
        # Should be blocked by quota decorator
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIn('quota exceeded', response.data['detail'].lower())
    
    @patch('tenant.media.services.default_storage')
    def test_delete_file(self, mock_storage):
        """Test DELETE /api/v1/tenant/media/{id}/"""
        # Create a file first
        media_file = MediaFile.objects.create(
            academy=self.academy,
            file_name='test.jpg',
            file_path='test-path/test.jpg',
            file_size=1024
        )

        response = self.client.delete(f'/api/v1/tenant/media/{media_file.id}/')

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        # Verify file was soft-deleted (not removed from DB)
        media_file.refresh_from_db()
        self.assertFalse(media_file.is_active)
    
    @patch('tenant.media.services.default_storage')
    def test_delete_file_not_found(self, mock_storage):
        """Test DELETE on non-existent file."""
        fake_id = '00000000-0000-0000-0000-000000000000'
        
        response = self.client.delete(f'/api/v1/tenant/media/{fake_id}/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    @patch('tenant.media.services.default_storage')
    def test_upload_multiple_files(self, mock_storage):
        """Test POST /api/v1/tenant/media/upload-multiple/"""
        mock_storage.save.return_value = f"{self.academy.id}/2024/01/test-uuid-test.jpg"
        mock_storage.size.return_value = 1024
        
        file1 = SimpleUploadedFile("test1.jpg", b"content1", content_type="image/jpeg")
        file2 = SimpleUploadedFile("test2.jpg", b"content2", content_type="image/jpeg")
        
        data = {
            'files': [file1, file2],
            'class_id': self.test_class.id,
            'description': 'Multiple files'
        }
        
        response = self.client.post(
            '/api/v1/tenant/media/upload-multiple/',
            data,
            format='multipart'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data['uploaded']), 2)
        self.assertEqual(len(response.data['errors']), 0)
        
        # Verify storage usage updated
        usage = TenantUsage.objects.get(academy=self.academy)
        self.assertEqual(usage.storage_used_bytes, 2048)  # 2 * 1024
    
    @patch('tenant.media.services.default_storage')
    def test_upload_multiple_files_partial_failure(self, mock_storage):
        """Test bulk upload with some failures."""
        mock_storage.save.side_effect = [
            f"{self.academy.id}/2024/01/test-uuid-test1.jpg",  # Success
            Exception("Storage error")  # Failure
        ]
        mock_storage.size.return_value = 1024
        
        file1 = SimpleUploadedFile("test1.jpg", b"content1", content_type="image/jpeg")
        file2 = SimpleUploadedFile("test2.jpg", b"content2", content_type="image/jpeg")
        
        data = {
            'files': [file1, file2],
            'class_id': self.test_class.id
        }
        
        response = self.client.post(
            '/api/v1/tenant/media/upload-multiple/',
            data,
            format='multipart'
        )
        
        # Should return multi-status
        self.assertEqual(response.status_code, status.HTTP_207_MULTI_STATUS)
        self.assertEqual(len(response.data['uploaded']), 1)
        self.assertEqual(len(response.data['errors']), 1)
    
    def test_upload_file_no_file(self):
        """Test upload without file."""
        data = {'description': 'No file'}
        
        response = self.client.post('/api/v1/tenant/media/', data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_upload_file_too_large(self):
        """Test upload with file exceeding plan max_file_size_mb limit."""
        large_file = SimpleUploadedFile(
            "large.jpg",
            b"x" * (2 * 1024 * 1024),  # 2MB > 1MB limit
            content_type="image/jpeg"
        )
        
        data = {
            'file': large_file,
            'class_id': self.test_class.id
        }
        
        response = self.client.post('/api/v1/tenant/media/', data, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        file_errors = self._extract_error_list(response, 'file')
        self.assertTrue(file_errors)
        self.assertIn('maximum allowed limit of 1 mb', str(file_errors[0]).lower())

    @patch('tenant.media.services.default_storage')
    def test_upload_alias_returns_201_with_file_url(self, mock_storage):
        """Test POST /api/v1/tenant/media/upload/ returns file_url."""
        mock_storage.save.return_value = f"{self.academy.id}/2024/01/test-uuid-test.jpg"
        mock_storage.size.return_value = 1024

        data = {
            'file': SimpleUploadedFile("alias.jpg", b"abc", content_type="image/jpeg"),
            'class_id': self.test_class.id,
        }
        response = self.client.post('/api/v1/tenant/media/upload/', data, format='multipart')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('file_url', response.data)

    @patch('tenant.media.services.default_storage')
    def test_upload_file_stores_capture_date(self, mock_storage):
        """Test capture_date is persisted from upload payload."""
        mock_storage.save.return_value = f"{self.academy.id}/2024/01/test-uuid-date.jpg"
        mock_storage.size.return_value = 1024

        data = {
            'file': SimpleUploadedFile("dated.jpg", b"abc", content_type="image/jpeg"),
            'class_id': self.test_class.id,
            'capture_date': '2026-03-24',
        }
        response = self.client.post('/api/v1/tenant/media/', data, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        media = MediaFile.objects.get(id=response.data['id'])
        self.assertEqual(media.capture_date, date(2026, 3, 24))
    
    @patch('tenant.media.services.default_storage')
    def test_list_filters_by_is_active(self, mock_storage):
        """Test filtering by is_active."""
        MediaFile.objects.create(
            academy=self.academy,
            file_name='active.jpg',
            file_path='test-path/active.jpg',
            file_size=1024,
            is_active=True
        )
        MediaFile.objects.create(
            academy=self.academy,
            file_name='inactive.jpg',
            file_path='test-path/inactive.jpg',
            file_size=2048,
            is_active=False
        )
        
        # Filter active only
        response = self.client.get('/api/v1/tenant/media/?is_active=true')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['file_name'], 'active.jpg')

    @patch('tenant.media.services.default_storage')
    def test_list_defaults_to_active_only(self, mock_storage):
        """Test list defaults to only active media when is_active omitted."""
        MediaFile.objects.create(
            academy=self.academy,
            class_obj=self.test_class,
            file_name='active.jpg',
            file_path='test-path/active.jpg',
            file_size=1024,
            is_active=True,
        )
        MediaFile.objects.create(
            academy=self.academy,
            class_obj=self.test_class,
            file_name='inactive.jpg',
            file_path='test-path/inactive.jpg',
            file_size=2048,
            is_active=False,
        )

        response = self.client.get('/api/v1/tenant/media/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['file_name'], 'active.jpg')

    @patch('tenant.media.services.default_storage')
    def test_list_filters_by_class_id(self, mock_storage):
        """Test filtering by class_id query param."""
        other_class = Class.objects.create(
            academy=self.academy,
            name='Other Class',
            max_capacity=15,
        )
        MediaFile.objects.create(
            academy=self.academy,
            class_obj=self.test_class,
            file_name='class1.jpg',
            file_path='test-path/class1.jpg',
            file_size=100,
            is_active=True,
        )
        MediaFile.objects.create(
            academy=self.academy,
            class_obj=other_class,
            file_name='class2.jpg',
            file_path='test-path/class2.jpg',
            file_size=200,
            is_active=True,
        )

        response = self.client.get(f'/api/v1/tenant/media/?class_id={self.test_class.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['file_name'], 'class1.jpg')

    def test_bulk_deactivate_soft_deletes_with_academy_scope(self):
        """PATCH /bulk-deactivate deactivates matching academy media only."""
        target_one = MediaFile.objects.create(
            academy=self.academy,
            class_obj=self.test_class,
            file_name='target1.jpg',
            file_path='test-path/target1.jpg',
            file_size=100,
            is_active=True,
        )
        target_two = MediaFile.objects.create(
            academy=self.academy,
            class_obj=self.test_class,
            file_name='target2.jpg',
            file_path='test-path/target2.jpg',
            file_size=100,
            is_active=True,
        )

        other_academy = Academy.objects.create(
            name='External Academy',
            slug='external-academy',
            email='external@example.com',
            onboarding_completed=True,
        )
        external_class = Class.objects.create(
            academy=other_academy,
            name='External Class',
            max_capacity=10,
        )
        external_media = MediaFile.objects.create(
            academy=other_academy,
            class_obj=external_class,
            file_name='external.jpg',
            file_path='test-path/external.jpg',
            file_size=100,
            is_active=True,
        )

        response = self.client.patch(
            '/api/v1/tenant/media/bulk-deactivate/',
            {'ids': [str(target_one.id), str(target_two.id), str(external_media.id)]},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['deactivated'], 2)

        target_one.refresh_from_db()
        target_two.refresh_from_db()
        external_media.refresh_from_db()
        self.assertFalse(target_one.is_active)
        self.assertFalse(target_two.is_active)
        self.assertTrue(external_media.is_active)
        self.assertTrue(MediaFile.objects.filter(id=target_one.id).exists())
        self.assertTrue(MediaFile.objects.filter(id=target_two.id).exists())
    
    @patch('tenant.media.services.default_storage')
    def test_list_search_by_file_name(self, mock_storage):
        """Test searching by file name."""
        MediaFile.objects.create(
            academy=self.academy,
            file_name='photo1.jpg',
            file_path='test-path/photo1.jpg',
            file_size=1024
        )
        MediaFile.objects.create(
            academy=self.academy,
            file_name='document.pdf',
            file_path='test-path/document.pdf',
            file_size=2048
        )
        
        response = self.client.get('/api/v1/tenant/media/?search=photo')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['file_name'], 'photo1.jpg')

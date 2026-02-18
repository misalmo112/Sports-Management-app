"""
Tests for media API views.
"""
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
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
        
        # Verify MediaFile was created
        self.assertTrue(MediaFile.objects.filter(file_name='test.jpg').exists())
        
        # Verify storage usage was updated
        usage = TenantUsage.objects.get(academy=self.academy)
        self.assertEqual(usage.storage_used_bytes, 1024)
    
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
        # Create and upload a file first
        mock_storage.save.return_value = f"{self.academy.id}/2024/01/test-uuid-test.jpg"
        mock_storage.size.return_value = 1024
        mock_storage.exists.return_value = True
        
        media_file = MediaFile.objects.create(
            academy=self.academy,
            file_name='test.jpg',
            file_path='test-path/test.jpg',
            file_size=1024
        )
        
        # Update usage
        usage = TenantUsage.objects.get(academy=self.academy)
        usage.storage_used_bytes = 1024
        usage.save()
        
        response = self.client.delete(f'/api/v1/tenant/media/{media_file.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        
        # Verify file was deleted
        self.assertFalse(MediaFile.objects.filter(id=media_file.id).exists())
        
        # Verify storage usage was decremented
        usage.refresh_from_db()
        self.assertEqual(usage.storage_used_bytes, 0)
    
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
        """Test upload with file exceeding size limit."""
        # Create a file larger than 100MB
        large_file = SimpleUploadedFile(
            "large.jpg",
            b"x" * (101 * 1024 * 1024),  # 101MB
            content_type="image/jpeg"
        )
        
        data = {
            'file': large_file,
            'class_id': self.test_class.id
        }
        
        response = self.client.post('/api/v1/tenant/media/', data, format='multipart')
        
        # Should be rejected by serializer validation (400) or quota check (403)
        # The quota decorator runs first, so if file is huge it might hit quota first
        self.assertIn(response.status_code, [status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN])
        if response.status_code == status.HTTP_400_BAD_REQUEST:
            self.assertIn('exceeds maximum', response.data.get('file', [''])[0].lower())
        else:
            # Quota exceeded due to large file
            self.assertIn('quota', response.data.get('detail', '').lower())
    
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

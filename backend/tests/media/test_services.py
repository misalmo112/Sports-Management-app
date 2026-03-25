from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from unittest.mock import patch, MagicMock
from tenant.media.models import MediaFile
from tenant.media.services import MediaService
from saas_platform.tenants.models import Academy


class MediaServiceTest(TestCase):
    """Test MediaService."""
    
    def setUp(self):
        self.academy = Academy.objects.create(
            name='Test Academy',
            slug='test-academy',
            email='test@example.com'
        )
        self.test_file = SimpleUploadedFile(
            "test.jpg",
            b"file_content",
            content_type="image/jpeg"
        )
    
    @patch('tenant.media.services.default_storage')
    def test_upload_file(self, mock_storage):
        """Test file upload."""
        # Mock storage
        mock_storage.save.return_value = f"{self.academy.id}/2024/01/test-uuid-test.jpg"
        mock_storage.size.return_value = 1024
        
        media_file = MediaService.upload_file(
            academy=self.academy,
            file=self.test_file,
            description='Test image'
        )
        
        # Verify MediaFile was created
        self.assertIsNotNone(media_file.id)
        self.assertEqual(media_file.academy, self.academy)
        self.assertEqual(media_file.file_name, 'test.jpg')
        self.assertEqual(media_file.file_size, 1024)
        self.assertEqual(media_file.mime_type, 'image/jpeg')
        self.assertEqual(media_file.description, 'Test image')
        
        # Verify storage.save was called
        mock_storage.save.assert_called_once()
    
    @patch('tenant.media.services.default_storage')
    def test_upload_file_without_description(self, mock_storage):
        """Test file upload without description."""
        mock_storage.save.return_value = f"{self.academy.id}/2024/01/test-uuid-test.jpg"
        mock_storage.size.return_value = 1024
        
        media_file = MediaService.upload_file(
            academy=self.academy,
            file=self.test_file
        )
        
        self.assertEqual(media_file.description, '')
    
    @patch('tenant.media.services.default_storage')
    def test_delete_file(self, mock_storage):
        """Test file deletion."""
        # Create a media file
        media_file = MediaFile.objects.create(
            academy=self.academy,
            file_name='test.jpg',
            file_path='test-path/test.jpg',
            file_size=1024
        )
        
        # Mock storage
        mock_storage.exists.return_value = True
        
        MediaService.delete_file(media_file)
        
        # Verify file was deleted from storage
        mock_storage.delete.assert_called_once_with('test-path/test.jpg')
        
        # Verify MediaFile was deleted from database
        self.assertFalse(MediaFile.objects.filter(id=media_file.id).exists())
    
    @patch('tenant.media.services.default_storage')
    def test_delete_file_not_exists(self, mock_storage):
        """Test file deletion when file doesn't exist in storage."""
        media_file = MediaFile.objects.create(
            academy=self.academy,
            file_name='test.jpg',
            file_path='test-path/test.jpg',
            file_size=1024
        )
        
        # Mock storage - file doesn't exist
        mock_storage.exists.return_value = False
        
        # Should still delete DB record
        MediaService.delete_file(media_file)
        
        self.assertFalse(MediaFile.objects.filter(id=media_file.id).exists())
    
    @patch('tenant.media.services.default_storage')
    def test_get_file_url_with_storage_url(self, mock_storage):
        """Test URL generation using storage.url()."""
        media_file = MediaFile.objects.create(
            academy=self.academy,
            file_name='test.jpg',
            file_path='test-path/test.jpg',
            file_size=1024
        )
        
        # Mock storage.url()
        mock_storage.url.return_value = 'http://storage.example.com/test-path/test.jpg'
        
        url = MediaService.get_file_url(media_file)
        
        self.assertEqual(url, 'http://storage.example.com/test-path/test.jpg')
        mock_storage.url.assert_called_once_with('test-path/test.jpg')
    
    @override_settings(
        AWS_STORAGE_BUCKET_NAME='test-bucket',
        AWS_S3_ENDPOINT_URL='http://localhost:9000',
        AWS_ACCESS_KEY_ID='test-key',
        AWS_SECRET_ACCESS_KEY='test-secret'
    )
    @patch('tenant.media.services.default_storage')
    def test_get_file_url_with_signed_url(self, mock_storage):
        """Test URL generation using signed URL."""
        # Skip if boto3 not available
        try:
            import boto3
        except ImportError:
            self.skipTest("boto3 not available")
        
        media_file = MediaFile.objects.create(
            academy=self.academy,
            file_name='test.jpg',
            file_path='test-path/test.jpg',
            file_size=1024
        )
        
        # Mock storage to not have url method (so it falls through to boto3)
        del mock_storage.url
        
        # Mock boto3.client at the module level
        with patch('boto3.client') as mock_boto3_client:
            # Mock boto3 client
            mock_client = MagicMock()
            mock_client.generate_presigned_url.return_value = 'http://signed-url.com/test.jpg'
            mock_boto3_client.return_value = mock_client
            
            # Mock storage.bucket_name attribute
            mock_storage.bucket_name = 'test-bucket'
            
            url = MediaService.get_file_url(media_file)
            
            self.assertEqual(url, 'http://signed-url.com/test.jpg')
            mock_client.generate_presigned_url.assert_called_once()

    @override_settings(
        AWS_STORAGE_BUCKET_NAME='test-bucket',
        AWS_S3_ENDPOINT_URL='http://minio:9000',
        AWS_S3_PUBLIC_ENDPOINT_URL='http://localhost:9000',
        AWS_ACCESS_KEY_ID='test-key',
        AWS_SECRET_ACCESS_KEY='test-secret',
    )
    @patch('tenant.media.services.default_storage')
    def test_get_file_url_presign_uses_public_endpoint(self, mock_storage):
        """Presigned URLs must use the browser-reachable endpoint when set."""
        try:
            import boto3  # noqa: F401
        except ImportError:
            self.skipTest('boto3 not available')

        media_file = MediaFile.objects.create(
            academy=self.academy,
            file_name='test.jpg',
            file_path='test-path/test.jpg',
            file_size=1024,
        )

        with patch('boto3.client') as mock_boto3_client:
            mock_client = MagicMock()
            mock_client.generate_presigned_url.return_value = 'http://localhost:9000/signed.jpg'
            mock_boto3_client.return_value = mock_client
            mock_storage.bucket_name = 'test-bucket'

            url = MediaService.get_file_url(media_file)

            self.assertEqual(url, 'http://localhost:9000/signed.jpg')
            mock_boto3_client.assert_called_once()
            _, call_kwargs = mock_boto3_client.call_args
            self.assertEqual(call_kwargs['endpoint_url'], 'http://localhost:9000')
            mock_storage.url.assert_not_called()
    
    @override_settings(
        AWS_STORAGE_BUCKET_NAME='test-bucket',
        AWS_S3_ENDPOINT_URL='http://localhost:9000'
    )
    def test_get_file_url_fallback(self):
        """Test URL generation fallback."""
        media_file = MediaFile.objects.create(
            academy=self.academy,
            file_name='test.jpg',
            file_path='test-path/test.jpg',
            file_size=1024
        )
        
        with patch('tenant.media.services.default_storage') as mock_storage:
            # Mock storage doesn't have url method
            del mock_storage.url
            
            url = MediaService.get_file_url(media_file)
            
            # Should construct URL manually
            self.assertIn('test-bucket', url)
            self.assertIn('test-path/test.jpg', url)
    
    @override_settings(
        AWS_STORAGE_BUCKET_NAME='test-bucket',
        AWS_S3_ENDPOINT_URL='http://localhost:9000'
    )
    def test_ensure_bucket_exists_creates_bucket(self):
        """Test bucket creation when it doesn't exist."""
        # Skip if boto3 not available
        if not MediaService._get_storage.__module__ or 'boto3' not in str(MediaService):
            try:
                import boto3
            except ImportError:
                self.skipTest("boto3 not available")
        
        # Mock boto3.client at the module level
        with patch('boto3.client') as mock_boto3_client:
            # Mock S3 client
            mock_client = MagicMock()
            mock_boto3_client.return_value = mock_client
            
            # Mock head_bucket to raise 404 error
            try:
                from botocore.exceptions import ClientError
                error_response = {'Error': {'Code': '404'}}
                mock_client.head_bucket.side_effect = ClientError(error_response, 'HeadBucket')
            except ImportError:
                # If botocore not available, skip
                self.skipTest("botocore not available")
            
            MediaService._ensure_bucket_exists()
            
            # Verify create_bucket was called
            mock_client.create_bucket.assert_called_once_with(Bucket='test-bucket')
    
    @override_settings(
        AWS_STORAGE_BUCKET_NAME='test-bucket',
        AWS_S3_ENDPOINT_URL='http://localhost:9000'
    )
    def test_ensure_bucket_exists_bucket_already_exists(self):
        """Test bucket creation when bucket already exists."""
        # Skip if boto3 not available
        try:
            import boto3
        except ImportError:
            self.skipTest("boto3 not available")
        
        # Mock boto3.client at the module level
        with patch('boto3.client') as mock_boto3_client:
            # Mock S3 client
            mock_client = MagicMock()
            mock_boto3_client.return_value = mock_client
            
            # Mock head_bucket to succeed (bucket exists)
            mock_client.head_bucket.return_value = None
            
            MediaService._ensure_bucket_exists()
            
            # Verify create_bucket was NOT called
            mock_client.create_bucket.assert_not_called()
    
    def test_generate_file_path(self):
        """Test file path generation."""
        path = MediaService._generate_file_path(self.academy, 'test-file.jpg')
        
        # Should contain academy ID, year, month, and filename
        self.assertIn(str(self.academy.id), path)
        self.assertIn('test-file.jpg', path)
        # Should have format: {academy_id}/{year}/{month}/{uuid}-{filename}
        parts = path.split('/')
        self.assertEqual(len(parts), 4)
        self.assertEqual(parts[0], str(self.academy.id))
        # Year should be 4 digits
        self.assertEqual(len(parts[1]), 4)
        # Month should be 2 digits
        self.assertEqual(len(parts[2]), 2)

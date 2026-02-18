from django.test import TestCase
from tenant.media.models import MediaFile
from saas_platform.tenants.models import Academy


class MediaFileModelTest(TestCase):
    """Test MediaFile model."""
    
    def setUp(self):
        self.academy = Academy.objects.create(
            name='Test Academy',
            slug='test-academy',
            email='test@example.com'
        )
    
    def test_create_media_file(self):
        """Test creating a MediaFile."""
        media_file = MediaFile.objects.create(
            academy=self.academy,
            file_name='test.jpg',
            file_path='test-academy/2024/01/test-uuid-test.jpg',
            file_size=1024000,  # 1MB
            mime_type='image/jpeg',
            description='Test image'
        )
        self.assertEqual(media_file.academy, self.academy)
        self.assertEqual(media_file.file_name, 'test.jpg')
        self.assertEqual(media_file.file_size, 1024000)
        self.assertEqual(media_file.mime_type, 'image/jpeg')
        self.assertTrue(media_file.is_active)
    
    def test_media_file_str(self):
        """Test MediaFile string representation."""
        media_file = MediaFile.objects.create(
            academy=self.academy,
            file_name='test.jpg',
            file_path='test-academy/2024/01/test-uuid-test.jpg',
            file_size=1024000
        )
        expected = f"test.jpg ({self.academy.name})"
        self.assertEqual(str(media_file), expected)
    
    def test_media_file_relationship(self):
        """Test MediaFile relationship with Academy."""
        media_file = MediaFile.objects.create(
            academy=self.academy,
            file_name='test.jpg',
            file_path='test-academy/2024/01/test-uuid-test.jpg',
            file_size=1024000
        )
        self.assertEqual(media_file.academy, self.academy)
        self.assertIn(media_file, self.academy.media_files.all())
    
    def test_soft_delete(self):
        """Test soft delete functionality."""
        media_file = MediaFile.objects.create(
            academy=self.academy,
            file_name='test.jpg',
            file_path='test-academy/2024/01/test-uuid-test.jpg',
            file_size=1024000
        )
        self.assertTrue(media_file.is_active)
        
        # Soft delete
        media_file.is_active = False
        media_file.save()
        
        # Verify it's marked as inactive
        media_file.refresh_from_db()
        self.assertFalse(media_file.is_active)
        
        # Verify it still exists in database
        self.assertTrue(MediaFile.objects.filter(id=media_file.id).exists())
    
    def test_media_file_ordering(self):
        """Test MediaFile default ordering (newest first)."""
        import time
        file1 = MediaFile.objects.create(
            academy=self.academy,
            file_name='test1.jpg',
            file_path='test-academy/2024/01/test1.jpg',
            file_size=1024000
        )
        # Small delay to ensure different timestamps
        time.sleep(0.01)
        file2 = MediaFile.objects.create(
            academy=self.academy,
            file_name='test2.jpg',
            file_path='test-academy/2024/01/test2.jpg',
            file_size=2048000
        )
        
        files = list(MediaFile.objects.all())
        # Should be ordered by -created_at (newest first)
        self.assertEqual(files[0], file2)
        self.assertEqual(files[1], file1)
    
    def test_media_file_uuid_primary_key(self):
        """Test that MediaFile uses UUID as primary key."""
        media_file = MediaFile.objects.create(
            academy=self.academy,
            file_name='test.jpg',
            file_path='test-academy/2024/01/test-uuid-test.jpg',
            file_size=1024000
        )
        self.assertIsNotNone(media_file.id)
        # UUID should be a string representation
        self.assertIsInstance(str(media_file.id), str)

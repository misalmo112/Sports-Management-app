from datetime import date
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIRequestFactory

from saas_platform.tenants.models import Academy
from tenant.classes.models import Class
from tenant.media.models import MediaFile
from tenant.media.serializers import MediaFileSerializer, MediaFileUploadSerializer
from tenant.media.services import MediaService

User = get_user_model()


class _FakeStorage:
    def save(self, path, file):
        return path

    def size(self, stored_path):
        return 123


class MediaCaptureDateTests(TestCase):
    def setUp(self):
        self.academy = Academy.objects.create(
            name='Media Academy',
            slug='media-academy',
            email='media@academy.test',
            onboarding_completed=True,
        )
        self.user = User.objects.create_user(
            email='media-admin@test.com',
            password='pass',
            role='ADMIN',
            academy=self.academy,
            is_active=True,
        )
        self.class_obj = Class.objects.create(
            academy=self.academy,
            name='U12',
            max_capacity=20,
        )

    def test_media_file_serializer_includes_capture_date(self):
        media = MediaFile.objects.create(
            academy=self.academy,
            class_obj=self.class_obj,
            file_name='sample.jpg',
            file_path='1/2026/03/sample.jpg',
            file_size=10,
            mime_type='image/jpeg',
            capture_date=date(2026, 3, 10),
        )
        data = MediaFileSerializer(instance=media).data
        self.assertEqual(data['capture_date'], '2026-03-10')

    def test_upload_serializer_accepts_optional_capture_date(self):
        request = APIRequestFactory().post('/api/v1/tenant/media/media/', {})
        request.user = self.user
        request.academy = self.academy
        serializer = MediaFileUploadSerializer(
            data={
                'file': SimpleUploadedFile('clip.mp4', b'123', content_type='video/mp4'),
                'class_id': self.class_obj.id,
                'capture_date': '2026-03-11',
            },
            context={'request': request},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data['capture_date'], date(2026, 3, 11))

    def test_media_service_persists_capture_date(self):
        upload = SimpleUploadedFile('photo.jpg', b'abc', content_type='image/jpeg')
        with patch.object(MediaService, '_get_storage', return_value=_FakeStorage()):
            media = MediaService.upload_file(
                academy=self.academy,
                class_obj=self.class_obj,
                file=upload,
                description='desc',
                capture_date=date(2026, 3, 12),
            )
        self.assertEqual(media.capture_date, date(2026, 3, 12))

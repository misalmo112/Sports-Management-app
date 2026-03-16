from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from saas_platform.subscriptions.models import Plan, Subscription, SubscriptionStatus
from saas_platform.tenants.models import Academy
from tenant.coaches.models import Coach
from tenant.students.models import Parent, Student

User = get_user_model()


class BulkImportViewsTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.academy = Academy.objects.create(
            name='Academy One',
            slug='academy-one',
            email='academy@example.com',
            onboarding_completed=True,
        )
        self.plan = Plan.objects.create(
            name='Growth',
            slug='growth',
            limits_json={
                'max_students': 20,
                'max_coaches': 10,
                'max_classes': 20,
            },
        )
        Subscription.objects.create(
            academy=self.academy,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            is_current=True,
            start_at=timezone.now(),
        )
        self.admin = User.objects.create_user(
            email='admin@academy.com',
            password='testpass123',
            role=User.Role.ADMIN,
            academy=self.academy,
        )
        self.client.force_authenticate(self.admin)
        self.request_headers = {'HTTP_X_ACADEMY_ID': str(self.academy.id)}

    def test_student_schema_endpoint(self):
        response = self.client.get(
            '/api/v1/tenant/bulk-imports/students/schema/',
            **self.request_headers,
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['dataset_type'], 'students')
        self.assertIn('first_name', response.data['required_columns'])
        self.assertIn('template_headers', response.data)

    def test_student_preview_and_commit_create_parent_without_invite(self):
        csv_content = '\n'.join([
            'first_name,last_name,date_of_birth,gender,parent_email,parent_first_name,parent_last_name,parent_phone',
            'Sara,Ali,2014-05-20,FEMALE,parent@example.com,Ali,Hassan,+971500000000',
        ])
        upload = SimpleUploadedFile('students.csv', csv_content.encode('utf-8'), content_type='text/csv')

        preview_response = self.client.post(
            '/api/v1/tenant/bulk-imports/students/preview/',
            {'file': upload},
            format='multipart',
            **self.request_headers,
        )

        self.assertEqual(preview_response.status_code, status.HTTP_200_OK)
        self.assertEqual(preview_response.data['valid_rows'], 1)
        self.assertEqual(preview_response.data['invalid_rows'], 0)

        commit_response = self.client.post(
            '/api/v1/tenant/bulk-imports/students/commit/',
            {'preview_token': preview_response.data['preview_token']},
            format='json',
            **self.request_headers,
        )

        self.assertEqual(commit_response.status_code, status.HTTP_200_OK)
        self.assertEqual(commit_response.data['created_count'], 1)
        self.assertEqual(Parent.objects.filter(academy=self.academy).count(), 1)
        self.assertEqual(Student.objects.filter(academy=self.academy).count(), 1)
        self.assertEqual(User.objects.filter(academy=self.academy).count(), 1)

    def test_coach_preview_reports_invalid_rows_and_commit_imports_only_valid_rows(self):
        Coach.objects.create(
            academy=self.academy,
            first_name='Existing',
            last_name='Coach',
            email='existing@example.com',
        )
        csv_content = '\n'.join([
            'first_name,last_name,email,is_active',
            'New,Coach,newcoach@example.com,true',
            'Duplicate,Coach,existing@example.com,true',
        ])
        upload = SimpleUploadedFile('coaches.csv', csv_content.encode('utf-8'), content_type='text/csv')

        preview_response = self.client.post(
            '/api/v1/tenant/bulk-imports/coaches/preview/',
            {'file': upload},
            format='multipart',
            **self.request_headers,
        )

        self.assertEqual(preview_response.status_code, status.HTTP_200_OK)
        self.assertEqual(preview_response.data['valid_rows'], 1)
        self.assertEqual(preview_response.data['invalid_rows'], 1)
        self.assertIn('email:', ' '.join(preview_response.data['row_results'][1]['errors']))

        commit_response = self.client.post(
            '/api/v1/tenant/bulk-imports/coaches/commit/',
            {'preview_token': preview_response.data['preview_token']},
            format='json',
            **self.request_headers,
        )

        self.assertEqual(commit_response.status_code, status.HTTP_200_OK)
        self.assertEqual(commit_response.data['created_count'], 1)
        self.assertEqual(commit_response.data['skipped_count'], 1)
        self.assertEqual(Coach.objects.filter(academy=self.academy).count(), 2)

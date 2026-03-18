"""
Tests for onboarding API views.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from datetime import date, timedelta
from saas_platform.tenants.models import Academy, OnboardingState
from saas_platform.masters.models import Currency, Timezone
from tenant.onboarding.models import (
    Location, Sport, AgeCategory, Term
)
from tenant.billing.models import Item as BillingItem

User = get_user_model()


class OnboardingViewsTest(TestCase):
    """Test onboarding API endpoints."""
    
    def setUp(self):
        self.client = APIClient()
        # Ensure master data for step 1 validation (timezone/currency from global master)
        if not Currency.objects.filter(code='USD', is_active=True).exists():
            Currency.objects.create(code='USD', is_active=True, sort_order=0)
        if not Timezone.objects.filter(code='UTC', is_active=True).exists():
            Timezone.objects.create(code='UTC', is_active=True, sort_order=0)
        # Create academy
        self.academy = Academy.objects.create(
            name='Test Academy',
            slug='test-academy',
            email='test@example.com',
            timezone='UTC'
        )
        
        # Create admin user
        self.admin = User.objects.create_user(
            email='admin@example.com',
            password='testpass123',
            role=User.Role.ADMIN,
            academy=self.academy
        )
        
        # Authenticate
        self.client.force_authenticate(user=self.admin)
        self.client.credentials(HTTP_X_ACADEMY_ID=str(self.academy.id))
    
    def test_get_onboarding_state(self):
        """Test GET /api/v1/tenant/onboarding/state/"""
        response = self.client.get('/api/v1/tenant/onboarding/state/')
        if response.status_code != status.HTTP_200_OK:
            print(f"Response status: {response.status_code}")
            print(f"Response data: {response.data}")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')
        self.assertIn('data', response.data)
        self.assertEqual(response.data['data']['current_step'], 1)
        self.assertFalse(response.data['data']['is_completed'])
        # Pre-fill: response includes current academy profile for Step 1
        self.assertIn('profile', response.data['data'])
        profile = response.data['data']['profile']
        self.assertEqual(profile['name'], self.academy.name)
        self.assertEqual(profile['email'], self.academy.email)

    def test_get_onboarding_checklist_default(self):
        """Test GET /api/v1/tenant/onboarding/checklist/ returns defaults."""
        response = self.client.get('/api/v1/tenant/onboarding/checklist/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')
        data = response.data['data']
        self.assertFalse(data['members_imported'])
        self.assertFalse(data['staff_invited'])
        self.assertFalse(data['first_program_created'])
        self.assertFalse(data['age_categories_configured'])
        self.assertFalse(data['attendance_defaults_configured'])

    def test_patch_onboarding_checklist(self):
        """Test PATCH /api/v1/tenant/onboarding/checklist/ updates flags."""
        payload = {
            'members_imported': True,
            'staff_invited': True,
        }
        response = self.client.patch('/api/v1/tenant/onboarding/checklist/', payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')
        data = response.data['data']
        self.assertTrue(data['members_imported'])
        self.assertTrue(data['staff_invited'])
        self.assertIsNotNone(data.get('members_imported_at'))
        self.assertIsNotNone(data.get('staff_invited_at'))

    def test_get_onboarding_templates(self):
        """Test GET /api/v1/tenant/onboarding/templates/ returns suggestions."""
        # Ensure academy has currency for response normalization
        self.academy.currency = 'USD'
        self.academy.save(update_fields=['currency'])

        response = self.client.get('/api/v1/tenant/onboarding/templates/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')
        data = response.data['data']
        self.assertIn('suggested_term', data)
        self.assertIn('suggested_pricing_items', data)
        self.assertTrue(len(data['suggested_pricing_items']) >= 1)
    
    def test_step_1_academy_profile(self):
        """Test POST /api/v1/tenant/onboarding/step/1/"""
        data = {
            'name': 'Elite Sports Academy',
            'email': 'contact@elite.com',
            'phone': '+1-555-0123',
            'website': 'https://elite.com',
            'address_line1': '123 Main St',
            'city': 'New York',
            'state': 'NY',
            'postal_code': '10001',
            'timezone': 'UTC',
            'currency': 'USD'
        }
        response = self.client.post('/api/v1/tenant/onboarding/step/1/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')
        self.assertEqual(response.data['step'], 1)
        self.assertEqual(response.data['next_step'], 2)
        
        # Verify academy was updated
        self.academy.refresh_from_db()
        self.assertEqual(self.academy.name, 'Elite Sports Academy')
        self.assertEqual(self.academy.email, 'contact@elite.com')
        
        # Verify onboarding state
        state = OnboardingState.objects.get(academy=self.academy)
        self.assertTrue(state.step_1_completed)
        self.assertEqual(state.current_step, 2)
        self.assertIsNotNone(state.step_1_completed_at)
    
    def test_step_2_locations(self):
        """Test POST /api/v1/tenant/onboarding/step/2/"""
        # First complete step 1
        self.client.post('/api/v1/tenant/onboarding/step/1/', {
            'name': 'Test Academy',
            'email': 'test@example.com',
            'phone': '+1 555 012 3456',
            'address_line1': '123 Main St',
            'timezone': 'UTC',
            'currency': 'USD'
        }, format='json')
        
        data = {
            'locations': [
                {
                    'name': 'Main Facility',
                    'address_line1': '123 Main St',
                    'city': 'New York',
                    'state': 'NY',
                    'capacity': 200
                },
                {
                    'name': 'Training Center',
                    'address_line1': '456 Training Ave',
                    'city': 'New York',
                    'capacity': 100
                }
            ]
        }
        response = self.client.post('/api/v1/tenant/onboarding/step/2/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')
        self.assertEqual(response.data['step'], 2)
        self.assertEqual(response.data['data']['locations_created'], 2)
        
        # Verify locations were created
        locations = Location.objects.filter(academy=self.academy)
        self.assertEqual(locations.count(), 2)
        
        # Verify onboarding state
        state = OnboardingState.objects.get(academy=self.academy)
        self.assertTrue(state.step_2_completed)
        self.assertEqual(state.current_step, 3)
    
    def test_step_3_sports(self):
        """Test POST /api/v1/tenant/onboarding/step/3/"""
        # Complete steps 1 and 2
        self.client.post('/api/v1/tenant/onboarding/step/1/', {
            'name': 'Test Academy',
            'email': 'test@example.com',
            'phone': '+1 555 012 3456',
            'address_line1': '123 Main St',
            'timezone': 'UTC',
            'currency': 'USD'
        }, format='json')
        self.client.post('/api/v1/tenant/onboarding/step/2/', {
            'locations': [{'name': 'Main Facility'}]
        }, format='json')

        data = {
            'sports': [
                {
                    'name': 'Soccer',
                    'description': 'Youth soccer',
                    'age_min': 5,
                    'age_max': 18
                },
                {
                    'name': 'Basketball',
                    'description': 'Basketball training',
                    'age_min': 6,
                    'age_max': 16
                }
            ]
        }
        response = self.client.post('/api/v1/tenant/onboarding/step/3/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')
        self.assertEqual(response.data['data']['sports_created'], 2)
        
        # Verify sports were created
        sports = Sport.objects.filter(academy=self.academy)
        self.assertEqual(sports.count(), 2)
    
    def test_step_4_terms(self):
        """Test POST /api/v1/tenant/onboarding/step/4/ (Age Categories removed; step 4 is Terms)."""
        # Complete previous steps
        self._complete_steps_1_3()

        data = {
            'terms': [
                {
                    'name': 'Fall 2024',
                    'start_date': '2024-09-01',
                    'end_date': '2024-12-15',
                    'description': 'Fall semester'
                },
                {
                    'name': 'Spring 2025',
                    'start_date': '2025-01-15',
                    'end_date': '2025-05-30',
                    'description': 'Spring semester'
                }
            ]
        }
        response = self.client.post('/api/v1/tenant/onboarding/step/4/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')

        # Verify terms were created
        terms = Term.objects.filter(academy=self.academy)
        self.assertEqual(terms.count(), 2)
    
    def test_step_5_pricing(self):
        """Test POST /api/v1/tenant/onboarding/step/5/ (pricing shifted up)."""
        # Complete previous steps
        self._complete_steps_1_4()

        data = {
            'pricing_items': [
                {
                    'name': 'Monthly Membership',
                    'description': 'Monthly unlimited classes',
                    'duration_type': 'MONTHLY',
                    'duration_value': 1,
                    'price': '99.99',
                    'currency': 'USD'
                },
                {
                    'name': 'Drop-in Class',
                    'description': 'Single class session',
                    'duration_type': 'SESSION',
                    'duration_value': 1,
                    'price': '15.00',
                    'currency': 'USD'
                }
            ]
        }
        response = self.client.post('/api/v1/tenant/onboarding/step/5/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')

        # Verify billing items were created
        items = BillingItem.objects.filter(academy=self.academy)
        self.assertEqual(items.count(), 2)

    def test_step_5_pricing_currency_missing_defaults_to_academy(self):
        """If pricing items omit currency, it should default to academy.currency."""
        # Complete previous steps
        self._complete_steps_1_4()

        # Pick a non-USD currency to prove backend derivation
        self.academy.currency = 'AED'
        self.academy.save(update_fields=['currency'])

        data = {
            'pricing_items': [
                {
                    'name': 'Monthly Membership',
                    'description': 'Monthly unlimited classes',
                    'duration_type': 'MONTHLY',
                    'duration_value': 1,
                    'price': '99.99',
                    # currency intentionally omitted
                },
            ],
        }

        response = self.client.post('/api/v1/tenant/onboarding/step/5/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        items = BillingItem.objects.filter(academy=self.academy)
        self.assertEqual(items.count(), 1)
        self.assertEqual(items.first().currency, 'AED')

    def test_step_5_pricing_currency_mismatch_returns_400(self):
        """Reject when pricing item currency differs from academy currency."""
        # Complete previous steps
        self._complete_steps_1_4()

        # Flip academy currency after step 1 (step 5 should enforce academy.currency).
        self.academy.currency = 'AED'
        self.academy.save(update_fields=['currency'])

        data = {
            'pricing_items': [
                {
                    'name': 'Monthly Membership',
                    'description': 'Monthly unlimited classes',
                    'duration_type': 'MONTHLY',
                    'duration_value': 1,
                    'price': '99.99',
                    'currency': 'USD',  # Mismatch
                },
            ],
        }

        response = self.client.post('/api/v1/tenant/onboarding/step/5/', data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_step_6_pricing_removed(self):
        """Step 6 no longer exists (Age Categories removed, onboarding is 5 steps)."""
        # Complete previous steps
        self._complete_steps_1_5()

        response = self.client.post('/api/v1/tenant/onboarding/step/6/', {'pricing_items': []}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_complete_onboarding(self):
        """Test POST /api/v1/tenant/onboarding/complete/"""
        # Complete all steps
        self._complete_all_steps()
        
        response = self.client.post('/api/v1/tenant/onboarding/complete/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'success')
        
        # Verify academy is marked as onboarded
        self.academy.refresh_from_db()
        self.assertTrue(self.academy.onboarding_completed)
        
        # Verify onboarding state
        state = OnboardingState.objects.get(academy=self.academy)
        self.assertTrue(state.is_completed)
        self.assertIsNotNone(state.completed_at)
    
    def test_complete_onboarding_validation_failure(self):
        """Test completion fails if steps not completed."""
        # Don't complete all steps
        self.client.post('/api/v1/tenant/onboarding/step/1/', {
            'name': 'Test Academy',
            'email': 'test@example.com',
            'phone': '+1 555 012 3456',
            'address_line1': '123 Main St',
            'timezone': 'UTC',
            'currency': 'USD'
        }, format='json')

        response = self.client.post('/api/v1/tenant/onboarding/complete/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(response.data.get('error'))
        self.assertIn('missing_requirements', response.data)
    
    def test_step_validation_errors(self):
        """Test step endpoints return validation errors."""
        # Test step 1 with invalid data
        response = self.client.post('/api/v1/tenant/onboarding/step/1/', {
            'name': '',  # Invalid: required field
            'email': 'invalid-email'  # Invalid: not a valid email
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['status'], 'error')
        self.assertIn('errors', response.data)
    
    def test_step_progression_enforcement(self):
        """Test that steps cannot be skipped."""
        # Try to complete step 2 without completing step 1
        response = self.client.post('/api/v1/tenant/onboarding/step/2/', {
            'locations': [{'name': 'Main Facility'}]
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Step 1 must be completed', response.data.get('message', ''))
    
    def test_idempotency(self):
        """Test that step endpoints are idempotent."""
        # Complete step 1
        data = {
            'name': 'Test Academy',
            'email': 'test@example.com',
            'phone': '+1 555 012 3456',
            'address_line1': '123 Main St',
            'timezone': 'UTC',
            'currency': 'USD'
        }
        response1 = self.client.post('/api/v1/tenant/onboarding/step/1/', data, format='json')
        self.assertEqual(response1.status_code, status.HTTP_200_OK)

        # Submit same data again
        response2 = self.client.post('/api/v1/tenant/onboarding/step/1/', data, format='json')
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        
        # Academy should still be updated (idempotent)
        self.academy.refresh_from_db()
        self.assertEqual(self.academy.name, 'Test Academy')
    
    def _complete_steps_1_3(self):
        """Helper to complete steps 1-3."""
        self.client.post('/api/v1/tenant/onboarding/step/1/', {
            'name': 'Test Academy',
            'email': 'test@example.com',
            'phone': '+1 555 012 3456',
            'address_line1': '123 Main St',
            'timezone': 'UTC',
            'currency': 'USD'
        }, format='json')
        self.client.post('/api/v1/tenant/onboarding/step/2/', {
            'locations': [{'name': 'Main Facility'}]
        }, format='json')
        self.client.post('/api/v1/tenant/onboarding/step/3/', {
            'sports': [{'name': 'Soccer', 'age_min': 5, 'age_max': 18}]
        }, format='json')
    
    def _complete_steps_1_4(self):
        """Helper to complete steps 1-4."""
        self._complete_steps_1_3()
        self.client.post('/api/v1/tenant/onboarding/step/4/', {
            'terms': [{'name': 'Fall 2024', 'start_date': '2024-09-01', 'end_date': '2024-12-15'}]
        }, format='json')
    
    def _complete_steps_1_5(self):
        """Helper to complete steps 1-5."""
        self._complete_steps_1_4()
        self.client.post('/api/v1/tenant/onboarding/step/5/', {
            'pricing_items': [{
                'name': 'Monthly Membership',
                'duration_type': 'MONTHLY',
                'duration_value': 1,
                'price': '99.99',
                'currency': 'USD'
            }]
        }, format='json')
    
    def _complete_all_steps(self):
        """Helper to complete all steps."""
        self._complete_steps_1_5()
        # No step 6 (pricing shifted to step 5)

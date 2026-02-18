"""
Tests for onboarding services.
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from saas_platform.tenants.models import Academy, OnboardingState
from tenant.onboarding.models import (
    Location, Sport, AgeCategory, Term, PricingItem
)
from tenant.onboarding.services import OnboardingService, OnboardingValidationService

User = get_user_model()


class OnboardingServiceTest(TestCase):
    """Test OnboardingService."""
    
    def setUp(self):
        self.academy = Academy.objects.create(
            name='Test Academy',
            slug='test-academy',
            email='test@example.com',
            timezone='UTC'
        )
        self.user = User.objects.create_user(
            email='admin@example.com',
            password='testpass123',
            role=User.Role.ADMIN,
            academy=self.academy
        )
    
    def test_get_or_create_state(self):
        """Test getting or creating onboarding state."""
        state = OnboardingService.get_or_create_state(self.academy)
        self.assertIsNotNone(state)
        self.assertEqual(state.academy, self.academy)
        self.assertEqual(state.current_step, 1)
        
        # Get existing state
        state2 = OnboardingService.get_or_create_state(self.academy)
        self.assertEqual(state.id, state2.id)
    
    def test_acquire_lock(self):
        """Test acquiring lock."""
        state = OnboardingState.objects.create(academy=self.academy)
        
        result = OnboardingService.acquire_lock(state, self.user)
        self.assertIsNone(result)  # No error
        
        state.refresh_from_db()
        self.assertEqual(state.locked_by, self.user)
        self.assertIsNotNone(state.locked_at)
    
    def test_check_lock_other_user(self):
        """Test checking lock held by another user."""
        other_user = User.objects.create_user(
            email='other@example.com',
            password='testpass123',
            role=User.Role.ADMIN,
            academy=self.academy
        )
        state = OnboardingState.objects.create(
            academy=self.academy,
            locked_by=other_user,
            locked_at=timezone.now()
        )
        
        result = OnboardingService.check_lock(state, self.user)
        self.assertIsNotNone(result)
        self.assertTrue(result.get('error'))
        self.assertIn('locked by another user', result.get('message', ''))
    
    def test_lock_expires(self):
        """Test that lock expires after timeout."""
        state = OnboardingState.objects.create(
            academy=self.academy,
            locked_by=self.user,
            locked_at=timezone.now() - timedelta(minutes=31)  # Expired
        )
        
        # Lock should be considered expired
        self.assertFalse(state.is_locked())
    
    def test_process_step_1(self):
        """Test processing step 1."""
        data = {
            'name': 'Updated Academy',
            'email': 'updated@example.com',
            'timezone': 'America/New_York',
            'currency': 'USD'
        }
        
        result = OnboardingService.process_step_1(self.academy, data)
        
        self.academy.refresh_from_db()
        self.assertEqual(self.academy.name, 'Updated Academy')
        self.assertEqual(self.academy.email, 'updated@example.com')
        
        state = OnboardingState.objects.get(academy=self.academy)
        self.assertTrue(state.step_1_completed)
        self.assertEqual(state.current_step, 2)
    
    def test_process_step_2(self):
        """Test processing step 2."""
        data = {
            'locations': [
                {'name': 'Location 1', 'city': 'New York'},
                {'name': 'Location 2', 'city': 'Boston'}
            ]
        }
        
        result = OnboardingService.process_step_2(self.academy, data)
        
        self.assertEqual(result['locations_created'], 2)
        self.assertEqual(Location.objects.filter(academy=self.academy).count(), 2)
        
        state = OnboardingState.objects.get(academy=self.academy)
        self.assertTrue(state.step_2_completed)
    
    def test_process_step_2_idempotent(self):
        """Test that step 2 is idempotent."""
        data = {
            'locations': [
                {'name': 'Location 1', 'city': 'New York'}
            ]
        }
        
        # Process twice
        OnboardingService.process_step_2(self.academy, data)
        OnboardingService.process_step_2(self.academy, data)
        
        # Should still have only one location
        self.assertEqual(Location.objects.filter(academy=self.academy).count(), 1)
    
    def test_validate_step_progression(self):
        """Test step progression validation."""
        state = OnboardingState.objects.create(academy=self.academy, current_step=1)
        
        # Try to skip to step 3
        result = OnboardingService.validate_step_progression(state, 3)
        self.assertIsNotNone(result)
        self.assertTrue(result.get('error'))
    
    def test_release_lock(self):
        """Test releasing lock."""
        state = OnboardingState.objects.create(
            academy=self.academy,
            locked_by=self.user,
            locked_at=timezone.now()
        )
        
        OnboardingService.release_lock(state)
        
        state.refresh_from_db()
        self.assertIsNone(state.locked_by)
        self.assertIsNone(state.locked_at)


class OnboardingValidationServiceTest(TestCase):
    """Test OnboardingValidationService."""
    
    def setUp(self):
        self.academy = Academy.objects.create(
            name='Test Academy',
            slug='test-academy',
            email='test@example.com',
            timezone='UTC'
        )
        self.user = User.objects.create_user(
            email='admin@example.com',
            password='testpass123',
            role=User.Role.ADMIN,
            academy=self.academy
        )
    
    def test_validate_completion_success(self):
        """Test validation succeeds when all data exists."""
        # Create all required data
        Location.objects.create(academy=self.academy, name='Location 1')
        Sport.objects.create(academy=self.academy, name='Soccer')
        AgeCategory.objects.create(
            academy=self.academy,
            name='U8',
            age_min=5,
            age_max=7
        )
        Term.objects.create(
            academy=self.academy,
            name='Fall 2024',
            start_date='2024-09-01',
            end_date='2024-12-15'
        )
        PricingItem.objects.create(
            academy=self.academy,
            name='Monthly',
            duration_type=PricingItem.DurationType.MONTHLY,
            duration_value=1,
            price=99.99
        )
        
        # Complete all steps
        state = OnboardingState.objects.create(academy=self.academy)
        state.step_1_completed = True
        state.step_2_completed = True
        state.step_3_completed = True
        state.step_4_completed = True
        state.step_5_completed = True
        state.step_6_completed = True
        state.save()
        
        errors = OnboardingValidationService.validate_completion(self.academy)
        self.assertEqual(len(errors), 0)
    
    def test_validate_completion_missing_location(self):
        """Test validation fails when location is missing."""
        errors = OnboardingValidationService.validate_completion(self.academy)
        self.assertIn('At least one location is required', errors)
    
    def test_validate_completion_missing_sport(self):
        """Test validation fails when sport is missing."""
        Location.objects.create(academy=self.academy, name='Location 1')
        
        errors = OnboardingValidationService.validate_completion(self.academy)
        self.assertIn('At least one sport is required', errors)
    
    def test_complete_onboarding(self):
        """Test completing onboarding."""
        # Create all required data
        Location.objects.create(academy=self.academy, name='Location 1')
        Sport.objects.create(academy=self.academy, name='Soccer')
        AgeCategory.objects.create(
            academy=self.academy,
            name='U8',
            age_min=5,
            age_max=7
        )
        Term.objects.create(
            academy=self.academy,
            name='Fall 2024',
            start_date='2024-09-01',
            end_date='2024-12-15'
        )
        PricingItem.objects.create(
            academy=self.academy,
            name='Monthly',
            duration_type=PricingItem.DurationType.MONTHLY,
            duration_value=1,
            price=99.99
        )
        
        # Complete all steps
        state = OnboardingState.objects.create(academy=self.academy)
        state.step_1_completed = True
        state.step_2_completed = True
        state.step_3_completed = True
        state.step_4_completed = True
        state.step_5_completed = True
        state.step_6_completed = True
        state.save()
        
        result = OnboardingValidationService.complete_onboarding(self.academy, self.user)
        
        self.assertFalse(result.get('error'))
        self.assertTrue(result.get('success'))
        
        self.academy.refresh_from_db()
        self.assertTrue(self.academy.onboarding_completed)
        
        state.refresh_from_db()
        self.assertTrue(state.is_completed)
        self.assertEqual(state.completed_by_user, self.user)
        self.assertIsNotNone(state.completed_at)

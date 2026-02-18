"""
Tests for onboarding models.
"""
from django.test import TestCase
from django.core.exceptions import ValidationError
from saas_platform.tenants.models import Academy, OnboardingState
from tenant.onboarding.models import (
    Location, Sport, AgeCategory, Term, PricingItem
)


class OnboardingStateModelTest(TestCase):
    """Test OnboardingState model."""
    
    def setUp(self):
        self.academy = Academy.objects.create(
            name='Test Academy',
            slug='test-academy',
            email='test@example.com',
            timezone='UTC'
        )
    
    def test_create_onboarding_state(self):
        """Test creating an onboarding state."""
        state = OnboardingState.objects.create(
            academy=self.academy,
            current_step=1
        )
        self.assertEqual(state.academy, self.academy)
        self.assertEqual(state.current_step, 1)
        self.assertFalse(state.is_completed)
        self.assertFalse(state.step_1_completed)
    
    def test_onboarding_state_one_to_one(self):
        """Test that OnboardingState has OneToOne relationship with Academy."""
        state1 = OnboardingState.objects.create(academy=self.academy)
        
        # Try to create another state for same academy - should fail
        with self.assertRaises(Exception):  # IntegrityError
            OnboardingState.objects.create(academy=self.academy)
    
    def test_onboarding_state_str(self):
        """Test OnboardingState string representation."""
        state = OnboardingState.objects.create(
            academy=self.academy,
            current_step=3
        )
        self.assertIn('Test Academy', str(state))
        self.assertIn('Step 3', str(state))


class LocationModelTest(TestCase):
    """Test Location model."""
    
    def setUp(self):
        self.academy = Academy.objects.create(
            name='Test Academy',
            slug='test-academy',
            email='test@example.com',
            timezone='UTC'
        )
    
    def test_create_location(self):
        """Test creating a location."""
        location = Location.objects.create(
            academy=self.academy,
            name='Main Facility',
            address_line1='123 Main St',
            city='New York',
            capacity=200
        )
        self.assertEqual(location.academy, self.academy)
        self.assertEqual(location.name, 'Main Facility')
        self.assertEqual(location.capacity, 200)
    
    def test_location_unique_per_academy(self):
        """Test that location names are unique per academy."""
        Location.objects.create(
            academy=self.academy,
            name='Main Facility'
        )
        
        # Same name for same academy should fail
        from django.db import IntegrityError, transaction
        with transaction.atomic():
            with self.assertRaises(IntegrityError):
                Location.objects.create(
                    academy=self.academy,
                    name='Main Facility'
                )
        
        # Same name for different academy should work
        academy2 = Academy.objects.create(
            name='Another Academy',
            slug='another-academy',
            email='another@example.com',
            timezone='UTC'
        )
        location2 = Location.objects.create(
            academy=academy2,
            name='Main Facility'
        )
        self.assertEqual(location2.name, 'Main Facility')


class SportModelTest(TestCase):
    """Test Sport model."""
    
    def setUp(self):
        self.academy = Academy.objects.create(
            name='Test Academy',
            slug='test-academy',
            email='test@example.com',
            timezone='UTC'
        )
    
    def test_create_sport(self):
        """Test creating a sport."""
        sport = Sport.objects.create(
            academy=self.academy,
            name='Soccer',
            description='Youth soccer',
            age_min=5,
            age_max=18
        )
        self.assertEqual(sport.academy, self.academy)
        self.assertEqual(sport.name, 'Soccer')
        self.assertEqual(sport.age_min, 5)
        self.assertEqual(sport.age_max, 18)
    
    def test_sport_unique_per_academy(self):
        """Test that sport names are unique per academy."""
        Sport.objects.create(
            academy=self.academy,
            name='Soccer'
        )
        
        # Same name for same academy should fail
        with self.assertRaises(Exception):  # IntegrityError
            Sport.objects.create(
                academy=self.academy,
                name='Soccer'
            )
    
    def test_sport_age_range_validation(self):
        """Test sport age range validation."""
        sport = Sport(
            academy=self.academy,
            name='Soccer',
            age_min=10,
            age_max=5  # Invalid: max <= min
        )
        with self.assertRaises(ValidationError):
            sport.full_clean()


class AgeCategoryModelTest(TestCase):
    """Test AgeCategory model."""
    
    def setUp(self):
        self.academy = Academy.objects.create(
            name='Test Academy',
            slug='test-academy',
            email='test@example.com',
            timezone='UTC'
        )
    
    def test_create_age_category(self):
        """Test creating an age category."""
        category = AgeCategory.objects.create(
            academy=self.academy,
            name='U8 (Under 8)',
            age_min=5,
            age_max=7,
            description='Ages 5-7'
        )
        self.assertEqual(category.academy, self.academy)
        self.assertEqual(category.name, 'U8 (Under 8)')
        self.assertEqual(category.age_min, 5)
        self.assertEqual(category.age_max, 7)
    
    def test_age_category_unique_per_academy(self):
        """Test that age category names are unique per academy."""
        AgeCategory.objects.create(
            academy=self.academy,
            name='U8',
            age_min=5,
            age_max=7
        )
        
        # Same name for same academy should fail
        with self.assertRaises(Exception):  # IntegrityError
            AgeCategory.objects.create(
                academy=self.academy,
                name='U8',
                age_min=8,
                age_max=9
            )
    
    def test_age_category_age_range_validation(self):
        """Test age category age range validation."""
        category = AgeCategory(
            academy=self.academy,
            name='Invalid',
            age_min=10,
            age_max=5  # Invalid: max <= min
        )
        with self.assertRaises(ValidationError):
            category.full_clean()


class TermModelTest(TestCase):
    """Test Term model."""
    
    def setUp(self):
        self.academy = Academy.objects.create(
            name='Test Academy',
            slug='test-academy',
            email='test@example.com',
            timezone='UTC'
        )
    
    def test_create_term(self):
        """Test creating a term."""
        from datetime import date
        term = Term.objects.create(
            academy=self.academy,
            name='Fall 2024',
            start_date=date(2024, 9, 1),
            end_date=date(2024, 12, 15)
        )
        self.assertEqual(term.academy, self.academy)
        self.assertEqual(term.name, 'Fall 2024')
    
    def test_term_unique_per_academy_name_start_date(self):
        """Test that term name+start_date is unique per academy."""
        from datetime import date
        Term.objects.create(
            academy=self.academy,
            name='Fall 2024',
            start_date=date(2024, 9, 1),
            end_date=date(2024, 12, 15)
        )
        
        # Same name and start_date for same academy should fail
        with self.assertRaises(Exception):  # IntegrityError
            Term.objects.create(
                academy=self.academy,
                name='Fall 2024',
                start_date=date(2024, 9, 1),
                end_date=date(2024, 12, 20)
            )
    
    def test_term_date_range_validation(self):
        """Test term date range validation."""
        from datetime import date
        term = Term(
            academy=self.academy,
            name='Invalid',
            start_date=date(2024, 12, 15),
            end_date=date(2024, 9, 1)  # Invalid: end <= start
        )
        with self.assertRaises(ValidationError):
            term.full_clean()


class PricingItemModelTest(TestCase):
    """Test PricingItem model."""
    
    def setUp(self):
        self.academy = Academy.objects.create(
            name='Test Academy',
            slug='test-academy',
            email='test@example.com',
            timezone='UTC'
        )
    
    def test_create_pricing_item(self):
        """Test creating a pricing item."""
        item = PricingItem.objects.create(
            academy=self.academy,
            name='Monthly Membership',
            duration_type=PricingItem.DurationType.MONTHLY,
            duration_value=1,
            price=99.99,
            currency='USD'
        )
        self.assertEqual(item.academy, self.academy)
        self.assertEqual(item.name, 'Monthly Membership')
        self.assertEqual(item.duration_type, PricingItem.DurationType.MONTHLY)
        self.assertEqual(item.price, 99.99)
    
    def test_pricing_item_unique_per_academy_name_duration(self):
        """Test that pricing item name+duration_type is unique per academy."""
        PricingItem.objects.create(
            academy=self.academy,
            name='Monthly Membership',
            duration_type=PricingItem.DurationType.MONTHLY,
            duration_value=1,
            price=99.99
        )
        
        # Same name and duration_type for same academy should fail
        with self.assertRaises(Exception):  # IntegrityError
            PricingItem.objects.create(
                academy=self.academy,
                name='Monthly Membership',
                duration_type=PricingItem.DurationType.MONTHLY,
                duration_value=2,
                price=199.99
            )

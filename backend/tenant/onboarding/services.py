"""
Business logic services for onboarding wizard.
"""
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from saas_platform.tenants.models import Academy, OnboardingState
from tenant.onboarding.models import (
    Location, Sport, AgeCategory, Term, PricingItem
)


class OnboardingService:
    """Service for processing onboarding steps."""
    
    LOCK_TIMEOUT_MINUTES = 30
    
    @staticmethod
    def get_or_create_state(academy):
        """Get or create OnboardingState for academy."""
        state, created = OnboardingState.objects.get_or_create(
            academy=academy,
            defaults={'current_step': 1}
        )
        return state
    
    @staticmethod
    def check_lock(state, user):
        """Check if onboarding is locked by another user."""
        if state.is_locked() and not state.is_locked_by_user(user):
            return {
                'error': True,
                'message': 'Onboarding wizard is locked by another user',
                'locked_by': state.locked_by.email if hasattr(state.locked_by, 'email') else str(state.locked_by),
                'locked_at': state.locked_at.isoformat() if state.locked_at else None
            }
        return None
    
    @staticmethod
    def acquire_lock(state, user):
        """Acquire lock for onboarding wizard."""
        # Check if locked by another user
        lock_error = OnboardingService.check_lock(state, user)
        if lock_error:
            return lock_error
        
        # Acquire lock
        state.locked_by = user
        state.locked_at = timezone.now()
        state.save(update_fields=['locked_by', 'locked_at'])
        return None
    
    @staticmethod
    def release_lock(state):
        """Release lock for onboarding wizard."""
        state.locked_by = None
        state.locked_at = None
        state.save(update_fields=['locked_by', 'locked_at'])
    
    @staticmethod
    def validate_step_progression(state, step):
        """Validate that step progression is valid."""
        # Can't skip steps - must complete previous steps first
        if step > 1:
            previous_step_completed = getattr(state, f'step_{step - 1}_completed', False)
            if not previous_step_completed:
                return {
                    'error': True,
                    'message': f'Step {step - 1} must be completed before step {step}'
                }
        
        # Can revisit completed steps (allowed)
        return None
    
    @staticmethod
    @transaction.atomic
    def process_step_1(academy, validated_data):
        """Process Step 1: Academy Profile."""
        # Update academy with profile data
        for field, value in validated_data.items():
            setattr(academy, field, value)
        academy.save()
        
        # Update onboarding state
        state = OnboardingService.get_or_create_state(academy)
        state.step_1_completed = True
        if state.current_step == 1:
            state.current_step = 2
        state.save(update_fields=['step_1_completed', 'current_step'])
        
        return {
            'academy_id': str(academy.id),
            'name': academy.name,
            'email': academy.email,
            'completed': True
        }
    
    @staticmethod
    @transaction.atomic
    def process_step_2(academy, validated_data):
        """Process Step 2: Locations."""
        locations_data = validated_data['locations']
        created_count = 0
        updated_count = 0
        
        for location_data in locations_data:
            location, created = Location.objects.update_or_create(
                academy=academy,
                name=location_data['name'],
                defaults=location_data
            )
            if created:
                created_count += 1
            else:
                updated_count += 1
        
        # Update onboarding state
        state = OnboardingService.get_or_create_state(academy)
        state.step_2_completed = True
        if state.current_step == 2:
            state.current_step = 3
        state.save(update_fields=['step_2_completed', 'current_step'])
        
        return {
            'locations_created': created_count,
            'locations_updated': updated_count,
            'total_locations': Location.objects.filter(academy=academy).count()
        }
    
    @staticmethod
    @transaction.atomic
    def process_step_3(academy, validated_data):
        """Process Step 3: Sports."""
        sports_data = validated_data['sports']
        created_count = 0
        updated_count = 0
        
        for sport_data in sports_data:
            sport, created = Sport.objects.update_or_create(
                academy=academy,
                name=sport_data['name'],
                defaults=sport_data
            )
            if created:
                created_count += 1
            else:
                updated_count += 1
        
        # Update onboarding state
        state = OnboardingService.get_or_create_state(academy)
        state.step_3_completed = True
        if state.current_step == 3:
            state.current_step = 4
        state.save(update_fields=['step_3_completed', 'current_step'])
        
        return {
            'sports_created': created_count,
            'sports_updated': updated_count,
            'total_sports': Sport.objects.filter(academy=academy).count()
        }
    
    @staticmethod
    @transaction.atomic
    def process_step_4(academy, validated_data):
        """Process Step 4: Age Categories."""
        age_categories_data = validated_data['age_categories']
        created_count = 0
        updated_count = 0
        
        for category_data in age_categories_data:
            category, created = AgeCategory.objects.update_or_create(
                academy=academy,
                name=category_data['name'],
                defaults=category_data
            )
            if created:
                created_count += 1
            else:
                updated_count += 1
        
        # Update onboarding state
        state = OnboardingService.get_or_create_state(academy)
        state.step_4_completed = True
        if state.current_step == 4:
            state.current_step = 5
        state.save(update_fields=['step_4_completed', 'current_step'])
        
        return {
            'age_categories_created': created_count,
            'age_categories_updated': updated_count,
            'total_age_categories': AgeCategory.objects.filter(academy=academy).count()
        }
    
    @staticmethod
    @transaction.atomic
    def process_step_5(academy, validated_data):
        """Process Step 5: Terms."""
        terms_data = validated_data['terms']
        created_count = 0
        updated_count = 0
        
        for term_data in terms_data:
            term, created = Term.objects.update_or_create(
                academy=academy,
                name=term_data['name'],
                start_date=term_data['start_date'],
                defaults=term_data
            )
            if created:
                created_count += 1
            else:
                updated_count += 1
        
        # Update onboarding state
        state = OnboardingService.get_or_create_state(academy)
        state.step_5_completed = True
        if state.current_step == 5:
            state.current_step = 6
        state.save(update_fields=['step_5_completed', 'current_step'])
        
        return {
            'terms_created': created_count,
            'terms_updated': updated_count,
            'total_terms': Term.objects.filter(academy=academy).count()
        }
    
    @staticmethod
    @transaction.atomic
    def process_step_6(academy, validated_data):
        """Process Step 6: Pricing."""
        pricing_items_data = validated_data['pricing_items']
        created_count = 0
        updated_count = 0
        
        for item_data in pricing_items_data:
            item, created = PricingItem.objects.update_or_create(
                academy=academy,
                name=item_data['name'],
                duration_type=item_data['duration_type'],
                defaults=item_data
            )
            if created:
                created_count += 1
            else:
                updated_count += 1
        
        # Update onboarding state
        state = OnboardingService.get_or_create_state(academy)
        state.step_6_completed = True
        if state.current_step == 6:
            state.current_step = 6  # Stay at 6 until completion
        state.save(update_fields=['step_6_completed', 'current_step'])
        
        return {
            'pricing_items_created': created_count,
            'pricing_items_updated': updated_count,
            'total_pricing_items': PricingItem.objects.filter(academy=academy).count()
        }


class OnboardingValidationService:
    """Service for validating onboarding completion."""
    
    @staticmethod
    def validate_completion(academy):
        """Validate that all mandatory data exists for onboarding completion."""
        errors = []
        
        # Check academy profile
        if not academy.name or not academy.email or not academy.timezone or not academy.currency:
            errors.append("Academy profile is incomplete")
        
        # Check at least one location
        if not Location.objects.filter(academy=academy).exists():
            errors.append("At least one location is required")
        
        # Check at least one sport
        if not Sport.objects.filter(academy=academy).exists():
            errors.append("At least one sport is required")
        
        # Check at least one age category
        if not AgeCategory.objects.filter(academy=academy).exists():
            errors.append("At least one age category is required")
        
        # Check at least one term
        if not Term.objects.filter(academy=academy).exists():
            errors.append("At least one term is required")
        
        # Check at least one pricing item
        if not PricingItem.objects.filter(academy=academy).exists():
            errors.append("At least one pricing item is required")
        
        # Check all steps are completed
        state = OnboardingService.get_or_create_state(academy)
        if not all([
            state.step_1_completed,
            state.step_2_completed,
            state.step_3_completed,
            state.step_4_completed,
            state.step_5_completed,
            state.step_6_completed,
        ]):
            errors.append("All onboarding steps must be completed")
        
        return errors
    
    @staticmethod
    @transaction.atomic
    def complete_onboarding(academy, user):
        """Complete onboarding and mark academy as onboarded."""
        # Validate completion
        errors = OnboardingValidationService.validate_completion(academy)
        if errors:
            return {
                'error': True,
                'message': 'Onboarding validation failed',
                'missing_requirements': errors
            }
        
        # Mark onboarding as completed
        academy.onboarding_completed = True
        academy.save(update_fields=['onboarding_completed'])
        
        # Update onboarding state
        state = OnboardingService.get_or_create_state(academy)
        state.is_completed = True
        state.completed_by_user = user
        state.completed_at = timezone.now()
        OnboardingService.release_lock(state)
        state.save(update_fields=['is_completed', 'completed_by_user', 'completed_at', 'locked_by', 'locked_at'])
        
        return {
            'success': True,
            'message': 'Onboarding completed successfully'
        }

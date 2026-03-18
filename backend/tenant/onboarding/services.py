"""
Business logic services for onboarding wizard.
"""
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError as DRFValidationError
from saas_platform.tenants.models import Academy, OnboardingState
from tenant.users.models import User
from tenant.onboarding.models import (
    Location, Sport, Term
)
from tenant.billing.models import Item as BillingItem


class OnboardingService:
    """Service for processing onboarding steps."""
    
    LOCK_TIMEOUT_MINUTES = 30

    @staticmethod
    def _resolve_schema_user(user, academy):
        """
        Resolve a user instance that exists in the current schema.
        In tenant schema mode, request.user can come from a different schema/user table.
        """
        if not user or not getattr(user, "is_authenticated", False):
            return None

        # Fast path: same PK exists in current schema.
        try:
            schema_user = User.objects.filter(pk=user.pk).first()
            if schema_user:
                return schema_user
        except Exception:
            # Keep onboarding resilient; fallback by email below.
            pass

        email = (getattr(user, "email", "") or "").strip().lower()
        if not email:
            return None

        # Fallback: match by academy + email in current tenant schema.
        return User.objects.filter(
            academy=academy,
            email__iexact=email,
            is_active=True,
        ).first()
    
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

        schema_user = OnboardingService._resolve_schema_user(user, state.academy)
        # Acquire lock
        state.locked_by = schema_user
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
        state.step_1_completed_at = timezone.now()
        if state.current_step == 1:
            state.current_step = 2
        state.save(update_fields=['step_1_completed', 'step_1_completed_at', 'current_step'])
        
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
        state.step_2_completed_at = timezone.now()
        if state.current_step == 2:
            state.current_step = 3
        state.save(update_fields=['step_2_completed', 'step_2_completed_at', 'current_step'])
        
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
        state.step_3_completed_at = timezone.now()
        if state.current_step == 3:
            state.current_step = 4
        state.save(update_fields=['step_3_completed', 'step_3_completed_at', 'current_step'])
        
        return {
            'sports_created': created_count,
            'sports_updated': updated_count,
            'total_sports': Sport.objects.filter(academy=academy).count()
        }
    
    @staticmethod
    @transaction.atomic
    def process_step_4(academy, validated_data):
        """Process Step 4: Terms (Age Categories removed from onboarding)."""
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
        state.step_4_completed = True
        state.step_4_completed_at = timezone.now()
        if state.current_step == 4:
            state.current_step = 5
        state.save(update_fields=['step_4_completed', 'step_4_completed_at', 'current_step'])

        return {
            'terms_created': created_count,
            'terms_updated': updated_count,
            'total_terms': Term.objects.filter(academy=academy).count()
        }
    
    @staticmethod
    @transaction.atomic
    def process_step_5(academy, validated_data):
        """Process Step 5: Pricing (Age Categories removed; pricing shifted up)."""
        pricing_items_data = validated_data['pricing_items']
        created_count = 0
        updated_count = 0

        academy_currency = str(getattr(academy, 'currency', None) or '').strip().upper() or 'USD'
        
        for item_data in pricing_items_data:
            payload_currency = item_data.get('currency')
            if payload_currency is not None:
                provided_currency = str(payload_currency).strip().upper()
                if provided_currency != academy_currency:
                    raise DRFValidationError({
                        'currency': 'Currency must match the academy currency.'
                    })

            # Always persist academy currency (reject mismatches above).
            item_data['currency'] = academy_currency

            # Persist onboarding "pricing" as reusable billing items.
            # Billing items are what the academic dashboard exposes (ItemViewSet -> /finance/items).
            item, created = BillingItem.objects.update_or_create(
                academy=academy,
                name=item_data['name'],
                defaults={
                    'description': item_data.get('description', '') or '',
                    'price': item_data['price'],
                    'currency': academy_currency,
                    # Keep billing items active by default; if you need inactive items,
                    # add support in the onboarding UI + serializer later.
                    'is_active': True,
                },
            )
            if created:
                created_count += 1
            else:
                updated_count += 1
        
        # Update onboarding state
        state = OnboardingService.get_or_create_state(academy)
        state.step_5_completed = True
        state.step_5_completed_at = timezone.now()
        if state.current_step == 5:
            state.current_step = 5  # Stay at 5 until completion
        state.save(update_fields=['step_5_completed', 'step_5_completed_at', 'current_step'])
        
        return {
            'billing_items_created': created_count,
            'billing_items_updated': updated_count,
            'total_billing_items': BillingItem.objects.filter(academy=academy).count(),
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
        
        # Check at least one term
        if not Term.objects.filter(academy=academy).exists():
            errors.append("At least one term is required")
        
        # Check at least one billing item (source of truth for dashboard billing)
        if not BillingItem.objects.filter(academy=academy).exists():
            errors.append("At least one billing item is required")
        
        # Check all steps are completed
        state = OnboardingService.get_or_create_state(academy)
        if not all([
            state.step_1_completed,
            state.step_2_completed,
            state.step_3_completed,
            state.step_4_completed,
            state.step_5_completed,
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
        state.completed_by_user = OnboardingService._resolve_schema_user(user, academy)
        state.completed_at = timezone.now()
        OnboardingService.release_lock(state)
        state.save(update_fields=['is_completed', 'completed_by_user', 'completed_at', 'locked_by', 'locked_at'])
        
        return {
            'success': True,
            'message': 'Onboarding completed successfully'
        }

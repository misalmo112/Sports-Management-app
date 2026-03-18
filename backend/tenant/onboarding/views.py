"""
API views for onboarding wizard.
"""
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError as DRFValidationError
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from saas_platform.tenants.models import Academy
from tenant.onboarding.models import Location, Sport, AgeCategory, Term
from tenant.onboarding.serializers import (
    OnboardingStateSerializer,
    AcademyProfileSerializer,
    LocationBulkSerializer,
    SportBulkSerializer,
    TermBulkSerializer,
    PricingItemBulkSerializer,
    OnboardingChecklistStateSerializer,
    LocationSerializer,
    LocationListSerializer,
    SportSerializer,
    SportListSerializer,
    AgeCategorySerializer,
    AgeCategoryListSerializer,
    TermSerializer,
    TermListSerializer,
)
from tenant.onboarding.services import OnboardingService, OnboardingValidationService
from tenant.onboarding.permissions import IsOnboardingUser
from shared.permissions.tenant import IsTenantAdmin
from shared.utils.queryset_filtering import filter_by_academy
from tenant.onboarding.models import OnboardingChecklistState


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsOnboardingUser])
def get_onboarding_state(request):
    """Get current onboarding status."""
    academy = request.academy
    
    if not academy:
        return Response(
            {'detail': 'Academy not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    state = OnboardingService.get_or_create_state(academy)
    serializer = OnboardingStateSerializer(state)
    data = dict(serializer.data)
    data['profile'] = AcademyProfileSerializer(academy).data
    return Response({
        'status': 'success',
        'data': data
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsOnboardingUser])
def process_step(request, step):
    """Process a specific onboarding step."""
    academy = request.academy
    
    if not academy:
        return Response(
            {'detail': 'Academy not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Validate step number
    try:
        step_num = int(step)
        if step_num < 1 or step_num > 5:
            return Response(
                {'detail': 'Invalid step number. Must be between 1 and 5.'},
                status=status.HTTP_400_BAD_REQUEST
            )
    except ValueError:
        return Response(
            {'detail': 'Invalid step number.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get or create onboarding state
    state = OnboardingService.get_or_create_state(academy)
    
    # Check lock
    lock_error = OnboardingService.check_lock(state, request.user)
    if lock_error:
        return Response(lock_error, status=status.HTTP_409_CONFLICT)
    
    # Acquire lock if not already locked
    if not state.is_locked_by_user(request.user):
        lock_error = OnboardingService.acquire_lock(state, request.user)
        if lock_error:
            return Response(lock_error, status=status.HTTP_409_CONFLICT)
    
    # Validate step progression
    progression_error = OnboardingService.validate_step_progression(state, step_num)
    if progression_error:
        return Response(progression_error, status=status.HTTP_400_BAD_REQUEST)
    
    # Process step based on step number
    try:
        if step_num == 1:
            serializer = AcademyProfileSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            result = OnboardingService.process_step_1(academy, serializer.validated_data)
            next_step = 2 if state.current_step == 1 else None
        
        elif step_num == 2:
            serializer = LocationBulkSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            result = OnboardingService.process_step_2(academy, serializer.validated_data)
            next_step = 3 if state.current_step == 2 else None
        
        elif step_num == 3:
            serializer = SportBulkSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            result = OnboardingService.process_step_3(academy, serializer.validated_data)
            next_step = 4 if state.current_step == 3 else None
        
        elif step_num == 4:
            serializer = TermBulkSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            result = OnboardingService.process_step_4(academy, serializer.validated_data)
            next_step = 5 if state.current_step == 4 else None
        
        elif step_num == 5:
            serializer = PricingItemBulkSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            result = OnboardingService.process_step_5(academy, serializer.validated_data)
            next_step = None
        
        # Refresh state to get updated values
        state.refresh_from_db()
        
        response_data = {
            'status': 'success',
            'step': step_num,
            'message': f'Step {step_num} completed successfully',
            'data': result,
            'next_step': next_step
        }
        
        # For final step, include onboarding_complete flag
        if step_num == 5:
            response_data['onboarding_complete'] = all([
                state.step_1_completed,
                state.step_2_completed,
                state.step_3_completed,
                state.step_4_completed,
                state.step_5_completed,
            ])
        
        return Response(response_data, status=status.HTTP_200_OK)
    
    except DRFValidationError as e:
        # Handle DRF serializer validation errors
        # Convert error detail to proper format if needed
        errors = e.detail
        if isinstance(errors, dict):
            # Ensure all error values are lists
            formatted_errors = {}
            for key, value in errors.items():
                if isinstance(value, list):
                    formatted_errors[key] = value
                elif isinstance(value, str):
                    formatted_errors[key] = [value]
                else:
                    formatted_errors[key] = [str(value)]
            errors = formatted_errors
        elif isinstance(errors, list):
            # If it's a list, wrap in _general
            errors = {'_general': errors if isinstance(errors[0], str) else [str(e) for e in errors]}
        
        return Response({
            'status': 'error',
            'step': step_num,
            'message': 'Validation failed',
            'errors': errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    except Exception as e:
        # Handle other errors - ensure they return 400, not 500
        import logging
        logger = logging.getLogger(__name__)
        logger.exception(f"Error processing onboarding step {step_num}: {str(e)}")
        
        return Response({
            'status': 'error',
            'step': step_num,
            'message': 'An error occurred while processing this step',
            'errors': {'_general': [str(e)]}
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsOnboardingUser])
def complete_onboarding(request):
    """Complete onboarding and mark academy as onboarded."""
    academy = request.academy
    
    if not academy:
        return Response(
            {'detail': 'Academy not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Get onboarding state
    state = OnboardingService.get_or_create_state(academy)
    
    # Check lock
    lock_error = OnboardingService.check_lock(state, request.user)
    if lock_error:
        return Response(lock_error, status=status.HTTP_409_CONFLICT)
    
    # Validate and complete onboarding
    result = OnboardingValidationService.complete_onboarding(academy, request.user)
    
    if result.get('error'):
        return Response(result, status=status.HTTP_400_BAD_REQUEST)
    
    return Response({
        'status': 'success',
        'message': result['message'],
        'data': {
            'academy_id': str(academy.id),
            'onboarding_completed': academy.onboarding_completed
        }
    }, status=status.HTTP_200_OK)


@api_view(["GET", "PATCH"])
@permission_classes([IsAuthenticated, IsTenantAdmin])
def onboarding_checklist(request):
    """
    Post-activation checklist (soft-gated).

    - GET returns current checklist state for academy
    - PATCH updates one or more checklist flags (boolean values)
    """
    academy = request.academy
    if not academy:
        return Response({"detail": "Academy not found"}, status=status.HTTP_404_NOT_FOUND)

    state, _created = OnboardingChecklistState.objects.get_or_create(academy=academy)

    if request.method == "GET":
        return Response(
            {"status": "success", "data": OnboardingChecklistStateSerializer(state).data},
            status=status.HTTP_200_OK,
        )

    before = {
        "members_imported": state.members_imported,
        "staff_invited": state.staff_invited,
        "first_program_created": state.first_program_created,
        "age_categories_configured": state.age_categories_configured,
        "attendance_defaults_configured": state.attendance_defaults_configured,
    }

    serializer = OnboardingChecklistStateSerializer(state, data=request.data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()

    # Populate per-item timestamps for analytics/funnel tracking.
    now = timezone.now()
    timestamp_fields = {
        "members_imported": "members_imported_at",
        "staff_invited": "staff_invited_at",
        "first_program_created": "first_program_created_at",
        "age_categories_configured": "age_categories_configured_at",
        "attendance_defaults_configured": "attendance_defaults_configured_at",
    }
    changed = False
    for flag_field, ts_field in timestamp_fields.items():
        prev = bool(before.get(flag_field))
        curr = bool(getattr(state, flag_field))
        if not prev and curr:
            setattr(state, ts_field, now)
            changed = True
        elif prev and not curr:
            setattr(state, ts_field, None)
            changed = True
    if changed:
        state.save(update_fields=list(timestamp_fields.values()))

    return Response(
        {"status": "success", "data": OnboardingChecklistStateSerializer(state).data},
        status=status.HTTP_200_OK,
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated, IsTenantAdmin])
def onboarding_templates(request):
    """
    Template suggestions to make activation faster.

    These are suggestions only; callers can use them to prefill forms.
    """
    academy = request.academy
    if not academy:
        return Response({"detail": "Academy not found"}, status=status.HTTP_404_NOT_FOUND)

    tz_name = (academy.timezone or "UTC").strip() or "UTC"
    currency = (academy.currency or "USD").strip().upper() or "USD"

    # Compute "current term" suggestion in academy timezone
    try:
        import pytz

        tz = pytz.timezone(tz_name)
        now = timezone.now().astimezone(tz)
    except Exception:
        now = timezone.now()

    month = now.month
    year = now.year
    if 1 <= month <= 3:
        season = "Winter"
        start_month, end_month = 1, 3
    elif 4 <= month <= 6:
        season = "Spring"
        start_month, end_month = 4, 6
    elif 7 <= month <= 9:
        season = "Summer"
        start_month, end_month = 7, 9
    else:
        season = "Fall"
        start_month, end_month = 10, 12

    from datetime import date

    term_suggestion = {
        "name": f"{season} {year}",
        "start_date": date(year, start_month, 1).isoformat(),
        "end_date": date(year, end_month, 28).isoformat(),
        "description": f"Suggested term for {season.lower()} season",
    }

    pricing_suggestions = [
        {
            "name": "Monthly Membership",
            "description": "Monthly access to programs/classes",
            "duration_type": "MONTHLY",
            "duration_value": 1,
            "price": "99.99",
            "currency": currency,
        },
        {
            "name": "Drop-in Session",
            "description": "Single session",
            "duration_type": "SESSION",
            "duration_value": 1,
            "price": "15.00",
            "currency": currency,
        },
        {
            "name": "10-Session Pack",
            "description": "Pack of 10 sessions",
            "duration_type": "SESSION",
            "duration_value": 10,
            "price": "120.00",
            "currency": currency,
        },
    ]

    return Response(
        {
            "status": "success",
            "data": {
                "timezone": tz_name,
                "currency": currency,
                "suggested_term": term_suggestion,
                "suggested_pricing_items": pricing_suggestions,
            },
        },
        status=status.HTTP_200_OK,
    )


class LocationViewSet(viewsets.ModelViewSet):
    """ViewSet for Location model."""
    
    queryset = Location.objects.all()
    serializer_class = LocationSerializer
    permission_classes = [IsTenantAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name', 'city', 'state', 'country']
    ordering_fields = ['name', 'city', 'created_at']
    ordering = ['name']
    
    def get_queryset(self):
        """Filter by academy."""
        queryset = super().get_queryset()
        return filter_by_academy(
            queryset,
            self.request.academy,
            self.request.user,
            self.request
        )
    
    def get_serializer_class(self):
        """Use list serializer for list action."""
        if self.action == 'list':
            return LocationListSerializer
        return LocationSerializer
    
    def perform_create(self, serializer):
        """Set academy on create."""
        serializer.save(academy=self.request.academy)
    
    def perform_destroy(self, instance):
        """Hard delete - actually delete the location."""
        instance.delete()


class SportViewSet(viewsets.ModelViewSet):
    """ViewSet for Sport model."""
    
    queryset = Sport.objects.all()
    serializer_class = SportSerializer
    permission_classes = [IsTenantAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']
    
    def get_queryset(self):
        """Filter by academy."""
        queryset = super().get_queryset()
        return filter_by_academy(
            queryset,
            self.request.academy,
            self.request.user,
            self.request
        )
    
    def get_serializer_class(self):
        """Use list serializer for list action."""
        if self.action == 'list':
            return SportListSerializer
        return SportSerializer
    
    def perform_create(self, serializer):
        """Set academy on create."""
        serializer.save(academy=self.request.academy)
    
    def perform_destroy(self, instance):
        """Hard delete - actually delete the sport."""
        instance.delete()


class AgeCategoryViewSet(viewsets.ModelViewSet):
    """ViewSet for AgeCategory model."""
    
    queryset = AgeCategory.objects.all()
    serializer_class = AgeCategorySerializer
    permission_classes = [IsTenantAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'age_min', 'age_max', 'created_at']
    ordering = ['age_min', 'name']
    
    def get_queryset(self):
        """Filter by academy."""
        queryset = super().get_queryset()
        return filter_by_academy(
            queryset,
            self.request.academy,
            self.request.user,
            self.request
        )
    
    def get_serializer_class(self):
        """Use list serializer for list action."""
        if self.action == 'list':
            return AgeCategoryListSerializer
        return AgeCategorySerializer
    
    def perform_create(self, serializer):
        """Set academy on create."""
        serializer.save(academy=self.request.academy)
    
    def perform_destroy(self, instance):
        """Hard delete - actually delete the age category."""
        instance.delete()


class TermViewSet(viewsets.ModelViewSet):
    """ViewSet for Term model."""
    
    queryset = Term.objects.all()
    serializer_class = TermSerializer
    permission_classes = [IsTenantAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'start_date', 'end_date', 'created_at']
    ordering = ['-start_date', 'name']
    
    def get_queryset(self):
        """Filter by academy."""
        queryset = super().get_queryset()
        return filter_by_academy(
            queryset,
            self.request.academy,
            self.request.user,
            self.request
        )
    
    def get_serializer_class(self):
        """Use list serializer for list action."""
        if self.action == 'list':
            return TermListSerializer
        return TermSerializer
    
    def perform_create(self, serializer):
        """Set academy on create."""
        serializer.save(academy=self.request.academy)
    
    def perform_destroy(self, instance):
        """Hard delete - actually delete the term."""
        instance.delete()

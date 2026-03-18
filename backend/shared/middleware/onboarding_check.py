"""
Onboarding Check Middleware.

Blocks all tenant APIs if Academy.onboarding_completed == False.
Only onboarding endpoints are allowed when onboarding is incomplete.
"""
import logging
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger(__name__)


class OnboardingCheckMiddleware(MiddlewareMixin):
    """
    Middleware to block tenant APIs until onboarding is completed.
    
    Rules:
    - Blocks all tenant APIs if Academy.onboarding_completed == False
    - Allows onboarding endpoints regardless of completion status
    - Allows platform endpoints (superadmin operations)
    - Allows auth and admin endpoints
    """
    
    # Paths that should skip onboarding check
    EXEMPT_PATHS = [
        '/api/v1/platform/',
        '/api/v1/tenant/onboarding/',
        '/api/v1/tenant/masters/',  # timezones, currencies, countries for Step 1 dropdowns
        '/api/v1/auth/',
        '/admin/',
        '/health/',
        '/static/',
        '/media/',
    ]
    
    def process_request(self, request):
        """
        Check if onboarding is completed before allowing tenant API access.
        
        Returns:
            None: Continue processing request
            JsonResponse: Error response if onboarding incomplete
        """
        # Skip check for exempt paths
        if any(request.path.startswith(path) for path in self.EXEMPT_PATHS):
            return None
        
        # Skip if no academy context (handled by AcademyContextMiddleware)
        if not hasattr(request, 'academy') or not request.academy:
            return None
        
        # Check if onboarding is completed
        if not request.academy.onboarding_completed:
            user_id = None
            if hasattr(request, 'user') and request.user:
                user_id = getattr(request.user, 'id', None)
            
            logger.warning(
                f"Tenant API blocked: Academy {request.academy.id} onboarding not completed",
                extra={
                    'academy_id': str(request.academy.id),
                    'path': request.path,
                    'user_id': user_id
                }
            )
            return JsonResponse(
                {
                    'detail': 'Onboarding not completed',
                    'required_steps': [
                        'profile',
                        'location',
                        'sport',
                        'age_category',
                        'term',
                        'pricing'
                    ]
                },
                status=403
            )
        
        return None

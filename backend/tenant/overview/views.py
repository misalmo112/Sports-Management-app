"""
Views for Tenant Overview API.
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from tenant.overview.services import OverviewService
from tenant.overview.serializers import OverviewSerializer
from shared.permissions.tenant import (
    IsTenantAdmin, IsCoach, IsParent,
    IsTenantAdminOrParentOrCoach
)


class OverviewView(APIView):
    """
    View for Tenant Overview (role-based).
    
    Provides:
    - GET /api/v1/tenant/overview/ - Get overview data based on user role
    """

    required_tenant_module = 'admin-overview'
    permission_classes = [IsTenantAdminOrParentOrCoach]
    
    def get(self, request):
        """Get overview data based on user role."""
        if not hasattr(request, 'academy') or not request.academy:
            return Response(
                {'error': 'Academy context required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Determine user role
        user_role = 'ADMIN'  # Default
        if hasattr(request.user, 'role'):
            user_role = request.user.role
        elif hasattr(request.user, 'is_staff') and request.user.is_staff:
            user_role = 'ADMIN'
        
        # Get overview data
        overview_data = OverviewService.get_overview_data(
            academy=request.academy,
            user_role=user_role,
            user=request.user
        )
        
        serializer = OverviewSerializer(overview_data)
        return Response(serializer.data)

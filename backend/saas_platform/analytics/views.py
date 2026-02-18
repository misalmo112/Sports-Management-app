"""
Views for Platform Analytics API (Superadmin only).
"""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as filters
from django.utils import timezone
from saas_platform.analytics.services import StatsService
from saas_platform.analytics.serializers import PlatformStatsSerializer, PlatformErrorsSerializer
from shared.permissions.platform import IsPlatformAdmin


class StatsView(APIView):
    """
    View for Platform Statistics (Superadmin only).
    
    Provides:
    - GET /api/v1/platform/stats/ - Get platform statistics
    """
    permission_classes = [IsPlatformAdmin]
    
    def get(self, request):
        """Get platform-wide statistics."""
        stats = StatsService.get_platform_stats()
        serializer = PlatformStatsSerializer(stats)
        return Response(serializer.data)


class ErrorsView(APIView):
    """
    View for Platform Errors (Superadmin only).
    
    Provides:
    - GET /api/v1/platform/errors/ - Get platform error statistics
    
    Query parameters:
    - date_from: Start date (ISO format)
    - date_to: End date (ISO format)
    """
    permission_classes = [IsPlatformAdmin]
    
    def get(self, request):
        """Get platform error statistics."""
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        
        # Parse dates if provided
        parsed_date_from = None
        parsed_date_to = None
        
        if date_from:
            try:
                parsed_date_from = timezone.datetime.fromisoformat(date_from.replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                pass
        
        if date_to:
            try:
                parsed_date_to = timezone.datetime.fromisoformat(date_to.replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                pass
        
        errors = StatsService.get_platform_errors(
            date_from=parsed_date_from,
            date_to=parsed_date_to
        )
        serializer = PlatformErrorsSerializer(errors)
        # Wrap response in paginated format expected by tests
        return Response({
            'results': serializer.data.get('recent_errors', []),
            'count': serializer.data.get('total_errors', 0)
        })

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from tenant.media.models import MediaFile
from tenant.media.serializers import (
    MediaFileSerializer,
    MediaFileListSerializer,
    MediaFileUploadSerializer,
)
from tenant.media.services import MediaService
from shared.permissions.tenant import (
    IsTenantAdmin, IsParent, IsCoach, 
    IsTenantAdminOrCoach, IsTenantAdminOrParentOrCoach
)
from shared.decorators.quota import check_quota
from shared.utils.queryset_filtering import filter_by_academy
from saas_platform.quotas.models import TenantUsage


class MediaFileViewSet(viewsets.ModelViewSet):
    """ViewSet for MediaFile model."""

    required_tenant_module = 'media'
    
    queryset = MediaFile.objects.all()
    serializer_class = MediaFileSerializer
    permission_classes = [IsTenantAdminOrParentOrCoach]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active', 'mime_type', 'class_obj']
    search_fields = ['file_name', 'description']
    ordering_fields = ['file_name', 'file_size', 'created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter by academy, with special handling for coaches."""
        queryset = super().get_queryset()
        
        # Superadmin can see all
        if hasattr(self.request.user, 'role') and self.request.user.role == 'SUPERADMIN':
            return queryset
        
        # Coaches can only see media for their assigned classes
        is_coach = False
        if hasattr(self.request.user, 'role') and self.request.user.role == 'COACH':
            is_coach = True
        else:
            # Fallback: check if user is linked to a coach profile
            try:
                from tenant.coaches.models import Coach
                Coach.objects.get(user=self.request.user, academy=self.request.academy)
                is_coach = True
            except (Coach.DoesNotExist, ImportError):
                pass
        
        if is_coach:
            # Get coach profile for the user
            try:
                from tenant.coaches.models import Coach
                coach = Coach.objects.get(user=self.request.user, academy=self.request.academy)
                # Filter to only media for classes assigned to this coach
                queryset = queryset.filter(
                    class_obj__coach=coach,
                    class_obj__is_active=True
                )
            except (Coach.DoesNotExist, ImportError):
                queryset = queryset.none()
        else:
            # Admin/Owner/Parent: filter by academy
            queryset = filter_by_academy(
                queryset,
                self.request.academy,
                self.request.user,
                self.request
            )
        
        return queryset.select_related('class_obj', 'class_obj__coach')
    
    def get_serializer_class(self):
        """Use appropriate serializer based on action."""
        if self.action == 'list':
            return MediaFileListSerializer
        elif self.action == 'upload':
            return MediaFileUploadSerializer
        return MediaFileSerializer
    
    def get_permissions(self):
        """Restrict create/delete to admins and coaches (parents are read-only)."""
        if self.action in ['create', 'destroy', 'upload_multiple']:
            return [IsTenantAdminOrCoach()]
        return super().get_permissions()
    
    @check_quota('storage_bytes')
    def create(self, request, *args, **kwargs):
        """
        Upload a file with quota enforcement.
        
        Quota check is performed by @check_quota decorator before this method.
        """
        serializer = MediaFileUploadSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        file = serializer.validated_data['file']
        class_id = serializer.validated_data['class_id']
        description = serializer.validated_data.get('description', '')
        
        # Get class object
        from tenant.classes.models import Class
        try:
            class_obj = Class.objects.get(
                id=class_id,
                academy=request.academy,
                is_active=True
            )
        except Class.DoesNotExist:
            return Response(
                {'detail': 'Class not found or does not belong to this academy'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check coach permission for assigned classes
        if hasattr(request.user, 'role') and request.user.role == 'COACH':
            try:
                coach = Coach.objects.get(user=request.user, academy=request.academy)
                if class_obj.coach != coach:
                    return Response(
                        {'detail': 'You can only upload media for your assigned classes.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            except Coach.DoesNotExist:
                return Response(
                    {'detail': 'Coach profile not found.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        try:
            # Upload file to S3 and create MediaFile record
            media_file = MediaService.upload_file(
                academy=request.academy,
                class_obj=class_obj,
                file=file,
                description=description
            )
            
            # Update storage usage atomically
            with transaction.atomic():
                usage, _ = TenantUsage.objects.select_for_update().get_or_create(
                    academy=request.academy
                )
                usage.storage_used_bytes += media_file.file_size
                usage.save()
            
            # Return created media file
            response_serializer = MediaFileSerializer(media_file)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            return Response(
                {'detail': f'File upload failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def destroy(self, request, *args, **kwargs):
        """
        Delete a file and update storage usage.
        """
        media_file = self.get_object()
        file_size = media_file.file_size
        
        try:
            # Delete file from S3 and database
            MediaService.delete_file(media_file)
            
            # Update storage usage atomically (decrement)
            with transaction.atomic():
                usage, _ = TenantUsage.objects.select_for_update().get_or_create(
                    academy=request.academy
                )
                usage.storage_used_bytes -= file_size
                
                # Prevent negative storage
                if usage.storage_used_bytes < 0:
                    usage.storage_used_bytes = 0
                
                usage.save()
            
            return Response(status=status.HTTP_204_NO_CONTENT)
        
        except MediaFile.DoesNotExist:
            return Response(
                {'detail': 'Media file not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'detail': f'File deletion failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], url_path='upload-multiple')
    @check_quota('storage_bytes')
    def upload_multiple(self, request):
        """
        Upload multiple files at once.
        
        Request should contain 'files' field with list of files.
        """
        files = request.FILES.getlist('files')
        if not files:
            return Response(
                {'detail': 'No files provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        uploaded_files = []
        errors = []
        
        # Calculate total size for quota check
        total_size = sum(f.size for f in files)
        
        try:
            # Get class_id from request (required for bulk upload)
            class_id = request.data.get('class_id')
            if not class_id:
                return Response(
                    {'detail': 'class_id is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            from tenant.classes.models import Class
            try:
                class_obj = Class.objects.get(
                    id=class_id,
                    academy=request.academy,
                    is_active=True
                )
            except Class.DoesNotExist:
                return Response(
                    {'detail': 'Class not found or does not belong to this academy'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Upload all files
            for file in files:
                try:
                    media_file = MediaService.upload_file(
                        academy=request.academy,
                        class_obj=class_obj,
                        file=file,
                        description=request.data.get('description', '')
                    )
                    uploaded_files.append(media_file)
                except Exception as e:
                    errors.append({
                        'file': file.name,
                        'error': str(e)
                    })
            
            # Update storage usage atomically for all successful uploads
            if uploaded_files:
                total_uploaded_size = sum(mf.file_size for mf in uploaded_files)
                with transaction.atomic():
                    usage, _ = TenantUsage.objects.select_for_update().get_or_create(
                        academy=request.academy
                    )
                    usage.storage_used_bytes += total_uploaded_size
                    usage.save()
            
            # Return results
            response_data = {
                'uploaded': MediaFileListSerializer(uploaded_files, many=True).data,
                'errors': errors
            }
            
            status_code = status.HTTP_201_CREATED
            if errors:
                status_code = status.HTTP_207_MULTI_STATUS  # Multi-Status
            
            return Response(response_data, status=status_code)
        
        except Exception as e:
            return Response(
                {'detail': f'Bulk upload failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def perform_destroy(self, instance):
        """Override to prevent direct deletion (use destroy method instead)."""
        # This should not be called directly, destroy() handles deletion
        pass

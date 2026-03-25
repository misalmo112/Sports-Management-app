from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from rest_framework.exceptions import ValidationError
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction
from django.utils import timezone
from django.utils.dateparse import parse_date
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
    filterset_fields = ['mime_type']
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
        
        queryset = queryset.select_related('class_obj', 'class_obj__coach')

        class_id = self.request.query_params.get('class_id')
        if class_id:
            queryset = queryset.filter(class_obj_id=class_id)

        mime_type = self.request.query_params.get('mime_type')
        if mime_type:
            queryset = queryset.filter(mime_type=mime_type)

        is_active_param = self.request.query_params.get('is_active')
        if is_active_param is None:
            queryset = queryset.filter(is_active=True)
        else:
            normalized = str(is_active_param).strip().lower()
            if normalized in {'true', '1', 'yes'}:
                queryset = queryset.filter(is_active=True)
            elif normalized in {'false', '0', 'no'}:
                queryset = queryset.filter(is_active=False)
            else:
                raise ValidationError({'is_active': 'Invalid boolean value.'})

        date_from = self.request.query_params.get('date_from')
        if date_from:
            parsed_from = parse_date(date_from)
            if not parsed_from:
                raise ValidationError({'date_from': 'Invalid date format. Use YYYY-MM-DD.'})
            queryset = queryset.filter(capture_date__gte=parsed_from)

        date_to = self.request.query_params.get('date_to')
        if date_to:
            parsed_to = parse_date(date_to)
            if not parsed_to:
                raise ValidationError({'date_to': 'Invalid date format. Use YYYY-MM-DD.'})
            queryset = queryset.filter(capture_date__lte=parsed_to)

        return queryset
    
    def get_serializer_class(self):
        """Use appropriate serializer based on action."""
        if self.action == 'list':
            return MediaFileListSerializer
        elif self.action == 'upload':
            return MediaFileUploadSerializer
        return MediaFileSerializer
    
    def get_permissions(self):
        """Restrict create/delete to admins and coaches (parents are read-only)."""
        if self.action in ['create', 'destroy', 'upload_multiple', 'upload', 'bulk_deactivate']:
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
        class_obj = serializer.validated_data['class_obj']
        description = serializer.validated_data.get('description', '')
        capture_date = serializer.validated_data.get('capture_date') or timezone.localdate()
        
        try:
            # Upload file to S3 and create MediaFile record
            media_file = MediaService.upload_file(
                academy=request.academy,
                class_obj=class_obj,
                file=file,
                description=description,
                capture_date=capture_date,
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

    @action(detail=False, methods=['post'], url_path='upload')
    @check_quota('storage_bytes')
    def upload(self, request, *args, **kwargs):
        """Alias endpoint for single media upload."""
        return self.create(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """
        Soft-delete a media file (S3 object remains intact).
        """
        media_file = self.get_object()
        media_file.is_active = False
        media_file.save(update_fields=['is_active', 'updated_at'])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['patch'], url_path='bulk-deactivate')
    def bulk_deactivate(self, request):
        """Soft-delete multiple media files scoped to request.academy."""
        ids = request.data.get('ids')
        if not isinstance(ids, list) or not ids:
            return Response(
                {'detail': 'ids must be a non-empty list.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        deactivated_count = self.get_queryset().filter(id__in=ids).update(is_active=False)
        return Response({'deactivated': deactivated_count}, status=status.HTTP_200_OK)
    
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
                        description=request.data.get('description', ''),
                        capture_date=request.data.get('capture_date') or None,
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

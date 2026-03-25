from rest_framework import serializers
from tenant.media.models import MediaFile
from saas_platform.quotas.services import QuotaService
from tenant.classes.models import Class


class MediaFileSerializer(serializers.ModelSerializer):
    """Full detail serializer for MediaFile."""
    
    file_url = serializers.CharField(read_only=True)
    class_detail = serializers.SerializerMethodField()
    
    class Meta:
        model = MediaFile
        fields = [
            'id',
            'academy',
            'class_obj',
            'class_detail',
            'file_name',
            'file_path',
            'file_url',
            'file_size',
            'mime_type',
            'description',
            'capture_date',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'academy',
            'file_name',
            'file_path',
            'file_url',
            'file_size',
            'mime_type',
            'created_at',
            'updated_at',
        ]
    
    def get_class_detail(self, obj):
        """Get class details if class_obj exists."""
        if obj.class_obj:
            from tenant.classes.serializers import ClassListSerializer
            return ClassListSerializer(obj.class_obj).data
        return None


class MediaFileListSerializer(serializers.ModelSerializer):
    """List serializer for MediaFile (excludes file_path)."""
    
    file_url = serializers.CharField(read_only=True)
    class_detail = serializers.SerializerMethodField()
    
    class Meta:
        model = MediaFile
        fields = [
            'id',
            'academy',
            'class_obj',
            'class_detail',
            'file_name',
            'file_url',
            'file_size',
            'mime_type',
            'description',
            'capture_date',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'academy',
            'file_name',
            'file_url',
            'file_size',
            'mime_type',
            'created_at',
            'updated_at',
        ]
    
    def get_class_detail(self, obj):
        """Get class details if class_obj exists."""
        if obj.class_obj:
            from tenant.classes.serializers import ClassListSerializer
            return ClassListSerializer(obj.class_obj).data
        return None


class MediaFileUploadSerializer(serializers.Serializer):
    """Serializer for file upload requests."""

    DEFAULT_ALLOWED_MIME_TYPES = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'video/mp4',
        'video/quicktime',
        'application/pdf',
    ]
    DEFAULT_MAX_FILE_SIZE_MB = 100

    file = serializers.FileField(required=True)
    class_id = serializers.IntegerField(required=True)
    description = serializers.CharField(required=False, allow_blank=True, max_length=1000)
    capture_date = serializers.DateField(required=False, allow_null=True)

    def _get_upload_limits(self):
        request = self.context.get('request')
        if not request or not getattr(request, 'academy', None):
            return self.DEFAULT_ALLOWED_MIME_TYPES, self.DEFAULT_MAX_FILE_SIZE_MB

        effective_limits = QuotaService.calculate_effective_quota(request.academy) or {}
        allowed_mime_types = effective_limits.get('allowed_mime_types', self.DEFAULT_ALLOWED_MIME_TYPES)
        max_file_size_mb = effective_limits.get('max_file_size_mb', self.DEFAULT_MAX_FILE_SIZE_MB)
        return allowed_mime_types, max_file_size_mb

    def validate_file(self, value):
        """Validate uploaded file."""
        allowed_mime_types, max_file_size_mb = self._get_upload_limits()
        content_type = getattr(value, 'content_type', None)
        if content_type not in allowed_mime_types:
            allowed_types_display = ", ".join(sorted(allowed_mime_types))
            raise serializers.ValidationError(
                f"Unsupported file type '{content_type}'. Allowed types: {allowed_types_display}."
            )

        max_size = int(max_file_size_mb) * 1024 * 1024
        if value.size > max_size:
            raise serializers.ValidationError(
                f"File size exceeds the maximum allowed limit of {max_file_size_mb} MB."
            )

        return value

    def validate(self, attrs):
        """Validate class ownership and coach access, then attach class object."""
        request = self.context.get('request')
        if not request or not hasattr(request, 'academy') or not request.academy:
            raise serializers.ValidationError({'class_id': "Academy context required."})

        class_id = attrs.get('class_id')
        try:
            class_obj = Class.objects.get(
                id=class_id,
                is_active=True
            )
        except Class.DoesNotExist:
            raise serializers.ValidationError({'class_id': "Class not found."})

        if class_obj.academy_id != request.academy.id:
            raise serializers.ValidationError(
                {'class_id': "Class does not belong to this academy."}
            )

        # Check coach permission if user is a coach
        if hasattr(request.user, 'role') and request.user.role == 'COACH':
            from tenant.coaches.models import Coach
            try:
                coach = Coach.objects.get(user=request.user, academy=request.academy)
                if not class_obj.coach or class_obj.coach.id != coach.id:
                    raise serializers.ValidationError(
                        {'class_id': "You can only upload media for your assigned classes."}
                    )
            except Coach.DoesNotExist:
                raise serializers.ValidationError({'class_id': "Coach profile not found."})

        attrs['class_obj'] = class_obj
        return attrs
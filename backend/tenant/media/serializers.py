from rest_framework import serializers
from tenant.media.models import MediaFile


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
    
    file = serializers.FileField(required=True)
    class_id = serializers.IntegerField(required=True)
    description = serializers.CharField(required=False, allow_blank=True, max_length=1000)
    
    def validate_file(self, value):
        """Validate uploaded file."""
        # Check file size (max 100MB)
        max_size = 100 * 1024 * 1024  # 100MB
        if value.size > max_size:
            raise serializers.ValidationError(
                f"File size exceeds maximum allowed size of {max_size / (1024 * 1024)}MB"
            )
        
        # Optional: Validate MIME type
        # You can add whitelist of allowed MIME types here
        
        return value
    
    def validate_class_id(self, value):
        """Validate class exists and belongs to academy."""
        request = self.context.get('request')
        if not request or not hasattr(request, 'academy') or not request.academy:
            raise serializers.ValidationError("Academy context required.")
        
        from tenant.classes.models import Class
        try:
            class_obj = Class.objects.get(
                id=value,
                academy=request.academy,
                is_active=True
            )
        except Class.DoesNotExist:
            raise serializers.ValidationError(
                "Class not found or does not belong to this academy."
            )
        
        # Check coach permission if user is a coach
        if hasattr(request.user, 'role') and request.user.role == 'COACH':
            from tenant.coaches.models import Coach
            try:
                coach = Coach.objects.get(user=request.user, academy=request.academy)
                if not class_obj.coach or class_obj.coach.id != coach.id:
                    raise serializers.ValidationError(
                        "You can only upload media for your assigned classes."
                    )
            except Coach.DoesNotExist:
                raise serializers.ValidationError("Coach profile not found.")
        
        return value
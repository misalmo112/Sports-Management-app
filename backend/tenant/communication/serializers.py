"""
Serializers for Tenant Feedback API.
"""
from rest_framework import serializers
from tenant.communication.models import Feedback, FeedbackStatus, FeedbackPriority


class FeedbackSerializer(serializers.ModelSerializer):
    """Serializer for Feedback."""
    
    parent_email = serializers.EmailField(source='parent.email', read_only=True)
    parent_name = serializers.SerializerMethodField()
    student_name = serializers.SerializerMethodField()
    assigned_to_email = serializers.EmailField(source='assigned_to.email', read_only=True, allow_null=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    
    class Meta:
        model = Feedback
        fields = [
            'id', 'academy', 'parent', 'parent_email', 'parent_name',
            'student', 'student_name', 'subject', 'message',
            'status', 'status_display', 'priority', 'priority_display',
            'assigned_to', 'assigned_to_email',
            'resolved_at', 'resolution_notes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'resolved_at']
    
    def get_parent_name(self, obj):
        """Get parent's full name."""
        if obj.parent:
            return f"{obj.parent.first_name} {obj.parent.last_name}".strip() or obj.parent.email
        return None
    
    def get_student_name(self, obj):
        """Get student's full name."""
        if obj.student:
            return obj.student.full_name
        return None


class FeedbackCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating feedback (Parent only)."""
    
    # Accept 'description' as alias for 'message' for API compatibility
    description = serializers.CharField(write_only=True, required=False, allow_blank=True)
    # Accept 'category' but ignore it (not part of model, for API compatibility)
    category = serializers.CharField(write_only=True, required=False, allow_blank=True)
    # Make message optional since we'll handle it in validate()
    message = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = Feedback
        fields = ['student', 'subject', 'message', 'description', 'priority', 'category']
    
    def validate(self, attrs):
        """Validate feedback data."""
        # Remove 'category' if provided (not part of model)
        attrs.pop('category', None)
        
        # Map 'description' to 'message' if provided
        if 'description' in attrs and 'message' not in attrs:
            attrs['message'] = attrs.pop('description')
        elif 'description' in attrs and 'message' in attrs:
            # If both provided, use 'message' and ignore 'description'
            attrs.pop('description')
        
        # Ensure message is provided (either as 'message' or 'description')
        if 'message' not in attrs or not attrs.get('message'):
            raise serializers.ValidationError({
                'message': 'This field is required.'
            })
        
        # Ensure parent is creating the feedback
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            if not hasattr(request.user, 'role') or request.user.role != 'PARENT':
                raise serializers.ValidationError("Only parents can create feedback.")
            
            # If student is provided, ensure it belongs to the parent
            student = attrs.get('student')
            if student:
                if hasattr(student, 'parent') and student.parent:
                    # Check if student's parent email matches the user email
                    if hasattr(student.parent, 'email') and hasattr(request.user, 'email'):
                        if student.parent.email != request.user.email:
                            raise serializers.ValidationError("Student does not belong to you.")
        
        return attrs


class FeedbackUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating feedback (Admin/Owner only)."""
    
    class Meta:
        model = Feedback
        fields = ['status', 'priority', 'assigned_to', 'resolution_notes']
    
    def validate(self, attrs):
        """Validate update data."""
        # If status is being set to RESOLVED, set resolved_at
        if 'status' in attrs and attrs['status'] == FeedbackStatus.RESOLVED:
            if not self.instance.resolved_at:
                from django.utils import timezone
                attrs['resolved_at'] = timezone.now()
        
        return attrs

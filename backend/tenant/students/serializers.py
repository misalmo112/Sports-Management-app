from rest_framework import serializers
from django.db import transaction
from django.core.exceptions import ValidationError
from tenant.students.models import Parent, Student
from tenant.classes.models import Class
from tenant.classes.services import EnrollmentService
from tenant.users.models import User
from tenant.users.services import UserService


class ParentSerializer(serializers.ModelSerializer):
    """Serializer for Parent model."""
    
    full_name = serializers.CharField(read_only=True)
    
    class Meta:
        model = Parent
        fields = [
            'id',
            'academy',
            'first_name',
            'last_name',
            'full_name',
            'email',
            'phone',
            'phone_numbers',
            'address_line1',
            'address_line2',
            'city',
            'state',
            'postal_code',
            'country',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'academy', 'created_at', 'updated_at']
    
    def validate_email(self, value):
        """Validate email uniqueness per academy."""
        academy = self.context.get('request').academy if self.context.get('request') else None
        if not academy:
            return value
        
        # Check if email already exists for this academy
        queryset = Parent.objects.filter(academy=academy, email=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        
        if queryset.exists():
            raise serializers.ValidationError(
                f"A parent with email {value} already exists in this academy."
            )
        
        return value
    
    def create(self, validated_data):
        """Auto-set academy from request."""
        request = self.context.get('request')
        if request and hasattr(request, 'academy') and request.academy:
            validated_data['academy'] = request.academy
        return super().create(validated_data)


class ParentListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for Parent list views."""
    
    full_name = serializers.CharField(read_only=True)
    
    class Meta:
        model = Parent
        fields = [
            'id',
            'full_name',
            'email',
            'phone',
            'is_active',
        ]


class CreateParentDataSerializer(serializers.Serializer):
    """Serializer for nested parent creation data."""
    
    first_name = serializers.CharField(max_length=100, required=True)
    last_name = serializers.CharField(max_length=100, required=True)
    email = serializers.EmailField(max_length=255, required=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    phone_numbers = serializers.ListField(
        child=serializers.CharField(max_length=20),
        required=False
    )
    address_line1 = serializers.CharField(max_length=255, required=False, allow_blank=True)
    address_line2 = serializers.CharField(max_length=255, required=False, allow_blank=True)
    city = serializers.CharField(max_length=100, required=False, allow_blank=True)
    state = serializers.CharField(max_length=100, required=False, allow_blank=True)
    postal_code = serializers.CharField(max_length=20, required=False, allow_blank=True)
    country = serializers.CharField(max_length=100, required=False, allow_blank=True)


class StudentSerializer(serializers.ModelSerializer):
    """Serializer for Student model."""
    
    full_name = serializers.CharField(read_only=True)
    age = serializers.IntegerField(read_only=True)
    parent_detail = ParentListSerializer(source='parent', read_only=True)
    parent_data = CreateParentDataSerializer(write_only=True, required=False)
    enroll_class_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = Student
        fields = [
            'id',
            'academy',
            'parent',
            'parent_detail',
            'parent_data',
            'enroll_class_id',
            'first_name',
            'last_name',
            'full_name',
            'date_of_birth',
            'age',
            'gender',
            'email',
            'phone',
            'emirates_id',
            'emergency_contact_name',
            'emergency_contact_phone',
            'emergency_contact_relationship',
            'medical_notes',
            'allergies',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'academy', 'created_at', 'updated_at']
        extra_kwargs = {
            'date_of_birth': {'required': True},
        }
    
    def validate(self, attrs):
        """Validate that only one of parent or parent_data is provided."""
        parent = attrs.get('parent')
        parent_data = attrs.get('parent_data')
        
        if parent and parent_data:
            raise serializers.ValidationError(
                "Cannot provide both parent and parent_data. Use one or the other."
            )
        
        return attrs
    
    def validate_parent(self, value):
        """Validate parent belongs to same academy."""
        if not value:
            return value
        
        request = self.context.get('request')
        if request and hasattr(request, 'academy') and request.academy:
            if value.academy_id != request.academy.id:
                raise serializers.ValidationError(
                    "Parent must belong to the same academy."
                )
        
        return value

    def validate_enroll_class_id(self, value):
        """Validate class exists, is active, and belongs to academy."""
        if value is None:
            return value
        
        request = self.context.get('request')
        if not request or not hasattr(request, 'academy') or not request.academy:
            raise serializers.ValidationError("Academy context required.")
        
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
        
        return class_obj
    
    @transaction.atomic
    def create(self, validated_data):
        """Create student, optionally creating parent and user account."""
        parent_data = validated_data.pop('parent_data', None)
        enroll_class = validated_data.pop('enroll_class_id', None)
        request = self.context.get('request')
        academy = request.academy if request and hasattr(request, 'academy') and request.academy else None
        
        # Create parent if parent_data provided
        if parent_data:
            if not academy:
                raise serializers.ValidationError("Academy is required to create a parent.")
            
            # Normalize email
            email = parent_data['email'].lower().strip()
            parent_data['email'] = email
            
            # Check if parent with email already exists
            existing_parent = Parent.objects.filter(academy=academy, email=email).first()
            
            if existing_parent:
                raise serializers.ValidationError({
                    'parent_data': {
                        'email': ['A parent with this email already exists. Please select the existing parent instead.']
                    }
                })
            
            # Create Parent record
            if not parent_data.get('phone_numbers'):
                parent_data['phone_numbers'] = []
            parent_data['academy'] = academy
            parent = Parent.objects.create(**parent_data)
            
            # Create User account with invite
            try:
                user, token = UserService.create_user_with_invite(
                    role=User.Role.PARENT,
                    email=email,
                    academy=academy,
                    created_by=request.user,
                    profile_data={'phone': parent_data.get('phone', '')},
                    first_name=parent_data.get('first_name'),
                    last_name=parent_data.get('last_name')
                )
                UserService.send_invite_email_async(user, token)
            except (ValidationError, Exception) as e:
                # If user creation fails, still keep the parent record
                # Log error but don't fail the student creation
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Failed to create user account for parent {email}: {str(e)}")
            
            validated_data['parent'] = parent
        
        # Set academy and create student
        if academy:
            validated_data['academy'] = academy
        
        student = super().create(validated_data)
        
        if enroll_class:
            try:
                EnrollmentService.enroll_student(student, enroll_class)
            except ValidationError as e:
                raise serializers.ValidationError({
                    'enroll_class_id': [str(e)]
                })
        
        return student


class StudentListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for Student list views."""
    
    full_name = serializers.CharField(read_only=True)
    age = serializers.IntegerField(read_only=True)
    parent_name = serializers.SerializerMethodField()
    parent_detail = ParentListSerializer(source='parent', read_only=True)
    
    class Meta:
        model = Student
        fields = [
            'id',
            'full_name',
            'age',
            'gender',
            'parent_name',
            'parent_detail',
            'email',
            'phone',
            'is_active',
        ]
    
    def get_parent_name(self, obj):
        """Safely get parent name, handling NULL parent."""
        if obj.parent:
            return obj.parent.full_name
        return None
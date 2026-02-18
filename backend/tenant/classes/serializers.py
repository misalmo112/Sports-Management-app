from rest_framework import serializers
from django.core.exceptions import ValidationError
from tenant.classes.models import Class, Enrollment
from tenant.coaches.serializers import CoachListSerializer
from tenant.students.serializers import StudentListSerializer
from tenant.onboarding.serializers import SportListSerializer, LocationListSerializer


class ClassSerializer(serializers.ModelSerializer):
    """Serializer for Class model."""
    
    available_spots = serializers.IntegerField(read_only=True)
    is_full = serializers.BooleanField(read_only=True)
    coach_detail = CoachListSerializer(source='coach', read_only=True)
    sport_detail = SportListSerializer(source='sport', read_only=True)
    location_detail = LocationListSerializer(source='location', read_only=True)
    enrolled_students = serializers.SerializerMethodField()
    
    class Meta:
        model = Class
        fields = [
            'id',
            'academy',
            'name',
            'description',
            'coach',
            'coach_detail',
            'sport',
            'sport_detail',
            'location',
            'location_detail',
            'max_capacity',
            'current_enrollment',
            'available_spots',
            'is_full',
            'schedule',
            'start_date',
            'end_date',
            'enrolled_students',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'academy',
            'current_enrollment',
            'created_at',
            'updated_at',
        ]
    
    def get_enrolled_students(self, obj):
        """Get list of enrolled students."""
        try:
            # Use select_related to avoid N+1 queries and filter safely
            enrollments = obj.enrollments.select_related('student').filter(
                status=Enrollment.Status.ENROLLED,
                student__is_active=True
            )
            # Only include students that actually exist and are active
            students = [e.student for e in enrollments if e.student and e.student.is_active]
            return StudentListSerializer(students, many=True).data
        except Exception:
            # If there's any error, return empty list to prevent breaking the API
            return []
    
    def validate_coach(self, value):
        """Validate coach belongs to same academy."""
        if not value:
            return value
        
        request = self.context.get('request')
        if request and hasattr(request, 'academy') and request.academy:
            if value.academy_id != request.academy.id:
                raise serializers.ValidationError(
                    "Coach must belong to the same academy."
                )
        
        return value
    
    def validate_sport(self, value):
        """Validate sport belongs to same academy."""
        if not value:
            return value
        
        request = self.context.get('request')
        if request and hasattr(request, 'academy') and request.academy:
            if value.academy_id != request.academy.id:
                raise serializers.ValidationError(
                    "Sport must belong to the same academy."
                )
        
        return value
    
    def validate_location(self, value):
        """Validate location belongs to same academy."""
        if not value:
            return value
        
        request = self.context.get('request')
        if request and hasattr(request, 'academy') and request.academy:
            if value.academy_id != request.academy.id:
                raise serializers.ValidationError(
                    "Location must belong to the same academy."
                )
        
        return value
    
    def validate(self, data):
        """Validate class data."""
        # For PATCH requests, only validate fields that are being updated
        if 'end_date' in data and 'start_date' in data:
            if data['end_date'] < data['start_date']:
                raise serializers.ValidationError({
                    'end_date': 'End date must be after start date.'
                })
        elif 'end_date' in data and self.instance:
            # If only end_date is being updated, check against existing start_date
            if self.instance.start_date and data['end_date'] < self.instance.start_date:
                raise serializers.ValidationError({
                    'end_date': 'End date must be after start date.'
                })
        elif 'start_date' in data and self.instance:
            # If only start_date is being updated, check against existing end_date
            if self.instance.end_date and data['start_date'] > self.instance.end_date:
                raise serializers.ValidationError({
                    'start_date': 'Start date must be before end date.'
                })
        
        # Only validate max_capacity if it's being updated
        if 'max_capacity' in data and data['max_capacity'] < 1:
            raise serializers.ValidationError({
                'max_capacity': 'Max capacity must be at least 1.'
            })
        
        return data
    
    def create(self, validated_data):
        """Auto-set academy from request."""
        request = self.context.get('request')
        if request and hasattr(request, 'academy') and request.academy:
            validated_data['academy'] = request.academy
        return super().create(validated_data)


class ClassListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for Class list views."""
    
    coach_name = serializers.SerializerMethodField()
    sport_name = serializers.SerializerMethodField()
    location_name = serializers.SerializerMethodField()
    available_spots = serializers.IntegerField(read_only=True)
    is_full = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Class
        fields = [
            'id',
            'name',
            'coach_name',
            'sport',
            'sport_name',
            'location',
            'location_name',
            'max_capacity',
            'current_enrollment',
            'available_spots',
            'is_full',
            'start_date',
            'end_date',
            'is_active',
        ]
    
    def get_coach_name(self, obj):
        """Safely get coach name, handling NULL coach."""
        if obj.coach:
            return obj.coach.full_name
        return None
    
    def get_sport_name(self, obj):
        """Safely get sport name, handling NULL sport."""
        if obj.sport:
            return obj.sport.name
        return None
    
    def get_location_name(self, obj):
        """Safely get location name, handling NULL location."""
        if obj.location:
            return obj.location.name
        return None


class EnrollmentSerializer(serializers.ModelSerializer):
    """Serializer for Enrollment model."""
    
    student_detail = StudentListSerializer(source='student', read_only=True)
    class_detail = ClassListSerializer(source='class_obj', read_only=True)
    
    class Meta:
        model = Enrollment
        fields = [
            'id',
            'academy',
            'student',
            'student_detail',
            'class_obj',
            'class_detail',
            'enrolled_at',
            'status',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'academy',
            'enrolled_at',
            'created_at',
            'updated_at',
        ]
    
    def validate(self, data):
        """Validate enrollment data."""
        student = data.get('student')
        class_obj = data.get('class_obj')
        
        if not student or not class_obj:
            return data
        
        # Ensure student is active (not soft-deleted)
        if not student.is_active:
            raise serializers.ValidationError(
                "Cannot enroll an inactive student."
            )
        
        # Ensure student and class belong to same academy
        if student.academy_id != class_obj.academy_id:
            raise serializers.ValidationError(
                "Student and class must belong to the same academy."
            )
        
        # Check class capacity
        if class_obj.is_full:
            raise serializers.ValidationError(
                "Class is at full capacity."
            )
        
        # Check for duplicate enrollment
        existing = Enrollment.objects.filter(
            student=student,
            class_obj=class_obj,
            status=Enrollment.Status.ENROLLED
        )
        if self.instance:
            existing = existing.exclude(pk=self.instance.pk)
        
        if existing.exists():
            raise serializers.ValidationError(
                "Student is already enrolled in this class."
            )
        
        return data
    
    def create(self, validated_data):
        """Auto-set academy from request."""
        request = self.context.get('request')
        if request and hasattr(request, 'academy') and request.academy:
            validated_data['academy'] = request.academy
        return super().create(validated_data)


class EnrollStudentSerializer(serializers.Serializer):
    """Serializer for enrolling a student in a class."""
    
    student_id = serializers.IntegerField()
    
    def validate_student_id(self, value):
        """Validate student exists and belongs to academy."""
        request = self.context.get('request')
        if not request or not hasattr(request, 'academy') or not request.academy:
            raise serializers.ValidationError("Academy context required.")
        
        from tenant.students.models import Student
        try:
            student = Student.objects.get(
                id=value,
                academy=request.academy,
                is_active=True
            )
        except Student.DoesNotExist:
            raise serializers.ValidationError(
                "Student not found or does not belong to this academy."
            )
        
        return value

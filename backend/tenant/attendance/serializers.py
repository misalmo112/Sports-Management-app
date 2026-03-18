from rest_framework import serializers
from django.core.exceptions import ValidationError
from tenant.attendance.models import Attendance, CoachAttendance
from tenant.classes.models import Class
from tenant.students.models import Student
from tenant.coaches.models import Coach
from tenant.students.serializers import StudentListSerializer
from tenant.coaches.serializers import CoachListSerializer
from tenant.classes.serializers import ClassListSerializer


class AttendanceSerializer(serializers.ModelSerializer):
    """Serializer for Attendance model."""
    
    student_detail = StudentListSerializer(source='student', read_only=True)
    class_detail = ClassListSerializer(source='class_obj', read_only=True)
    marked_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Attendance
        fields = [
            'id',
            'academy',
            'student',
            'student_detail',
            'class_obj',
            'class_detail',
            'date',
            'status',
            'notes',
            'marked_by',
            'marked_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'academy',
            'created_at',
            'updated_at',
        ]
    
    def get_marked_by_name(self, obj):
        """Get name of user who marked attendance."""
        if obj.marked_by:
            return obj.marked_by.get_full_name() or obj.marked_by.email
        return None
    
    def validate(self, data):
        """Validate attendance data."""
        student = data.get('student')
        class_obj = data.get('class_obj')
        
        if not student or not class_obj:
            return data
        
        # Ensure student and class belong to same academy
        if student.academy_id != class_obj.academy_id:
            raise serializers.ValidationError(
                "Student and class must belong to the same academy."
            )
        
        # Ensure status is valid
        status = data.get('status')
        if status and status not in [Attendance.Status.PRESENT, Attendance.Status.ABSENT]:
            raise serializers.ValidationError(
                f"Invalid status: {status}. Must be PRESENT or ABSENT."
            )
        
        return data
    
    def create(self, validated_data):
        """Auto-set academy from request."""
        request = self.context.get('request')
        if request and hasattr(request, 'academy') and request.academy:
            validated_data['academy'] = request.academy
        if request and request.user.is_authenticated:
            validated_data['marked_by'] = request.user
        return super().create(validated_data)


class AttendanceListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for Attendance list views."""
    
    student_name = serializers.SerializerMethodField()
    class_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Attendance
        fields = [
            'id',
            'student',
            'student_name',
            'class_obj',
            'class_name',
            'date',
            'status',
            'notes',
            'created_at',
        ]
    
    def get_student_name(self, obj):
        """Safely get student name, handling NULL or inactive student."""
        if obj.student:
            return obj.student.full_name
        return None
    
    def get_class_name(self, obj):
        """Safely get class name, handling NULL class."""
        if obj.class_obj:
            return obj.class_obj.name
        return None


class AttendanceRecordSerializer(serializers.Serializer):
    """Serializer for a single attendance record in bulk marking."""
    
    student_id = serializers.IntegerField()
    status = serializers.ChoiceField(choices=Attendance.Status.choices)
    notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate_student_id(self, value):
        """Validate student exists and belongs to academy."""
        request = self.context.get('request')
        if not request or not hasattr(request, 'academy') or not request.academy:
            raise serializers.ValidationError("Academy context required.")
        
        try:
            student = Student.objects.get(
                id=value,
                academy=request.academy,
                is_active=True
            )
        except Student.DoesNotExist:
            raise serializers.ValidationError(
                f"Student with id {value} not found or does not belong to this academy."
            )
        
        return value


class MarkAttendanceSerializer(serializers.Serializer):
    """Serializer for bulk marking attendance."""
    
    class_id = serializers.IntegerField()
    date = serializers.DateField()
    attendance_records = AttendanceRecordSerializer(many=True)
    
    def validate_class_id(self, value):
        """Validate class exists and belongs to academy."""
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
                f"Class with id {value} not found or does not belong to this academy."
            )
        
        return value
    
    def validate_attendance_records(self, value):
        """Validate attendance records list is not empty."""
        if not value or len(value) == 0:
            raise serializers.ValidationError(
                "At least one attendance record is required."
            )
        return value


class CoachAttendanceSerializer(serializers.ModelSerializer):
    """Serializer for CoachAttendance model."""
    
    coach_detail = CoachListSerializer(source='coach', read_only=True)
    class_detail = ClassListSerializer(source='class_obj', read_only=True)
    marked_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = CoachAttendance
        fields = [
            'id',
            'academy',
            'coach',
            'coach_detail',
            'class_obj',
            'class_detail',
            'date',
            'status',
            'notes',
            'marked_by',
            'marked_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'academy',
            'created_at',
            'updated_at',
        ]
    
    def get_marked_by_name(self, obj):
        """Get name of user who marked attendance."""
        if obj.marked_by:
            return obj.marked_by.get_full_name() or obj.marked_by.email
        return None
    
    def validate(self, data):
        """Validate coach attendance data."""
        coach = data.get('coach')
        class_obj = data.get('class_obj')
        
        if not coach or not class_obj:
            return data
        
        # Ensure coach and class belong to same academy
        if coach.academy_id != class_obj.academy_id:
            raise serializers.ValidationError(
                "Coach and class must belong to the same academy."
            )
        
        # Ensure status is valid
        status = data.get('status')
        if status and status not in [CoachAttendance.Status.PRESENT, CoachAttendance.Status.ABSENT]:
            raise serializers.ValidationError(
                f"Invalid status: {status}. Must be PRESENT or ABSENT."
            )
        
        return data
    
    def create(self, validated_data):
        """Auto-set academy from request."""
        request = self.context.get('request')
        if request and hasattr(request, 'academy') and request.academy:
            validated_data['academy'] = request.academy
        if request and request.user.is_authenticated:
            validated_data['marked_by'] = request.user
        return super().create(validated_data)


class CoachAttendanceListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for CoachAttendance list views."""
    
    coach_name = serializers.SerializerMethodField()
    class_name = serializers.SerializerMethodField()
    
    class Meta:
        model = CoachAttendance
        fields = [
            'id',
            'coach',
            'coach_name',
            'class_obj',
            'class_name',
            'date',
            'status',
            'notes',
            'created_at',
        ]
    
    def get_coach_name(self, obj):
        """Safely get coach name, handling NULL coach."""
        if obj.coach:
            return obj.coach.full_name
        return None
    
    def get_class_name(self, obj):
        """Safely get class name, handling NULL class."""
        if obj.class_obj:
            return obj.class_obj.name
        return None


class MarkCoachAttendanceSerializer(serializers.Serializer):
    """Serializer for marking coach attendance."""
    
    class_id = serializers.IntegerField()
    coach_id = serializers.IntegerField()
    date = serializers.DateField()
    status = serializers.ChoiceField(choices=CoachAttendance.Status.choices)
    notes = serializers.CharField(required=False, allow_blank=True)
    
    def validate_class_id(self, value):
        """Validate class exists and belongs to academy."""
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
                f"Class with id {value} not found or does not belong to this academy."
            )
        
        return value
    
    def validate_coach_id(self, value):
        """Validate coach exists and belongs to academy."""
        request = self.context.get('request')
        if not request or not hasattr(request, 'academy') or not request.academy:
            raise serializers.ValidationError("Academy context required.")
        
        try:
            coach = Coach.objects.get(
                id=value,
                academy=request.academy,
                is_active=True
            )
        except Coach.DoesNotExist:
            raise serializers.ValidationError(
                f"Coach with id {value} not found or does not belong to this academy."
            )
        
        return value


class MonthlySummaryItemSerializer(serializers.Serializer):
    """Serializer for individual summary item."""
    
    student_id = serializers.IntegerField()
    student_name = serializers.CharField()
    class_id = serializers.IntegerField()
    class_name = serializers.CharField()
    total_classes = serializers.IntegerField()
    present_count = serializers.IntegerField()
    absent_count = serializers.IntegerField()
    attendance_rate = serializers.FloatField()


class AcademySummarySerializer(serializers.Serializer):
    """Serializer for academy-wide summary."""
    
    total_students = serializers.IntegerField()
    total_classes = serializers.IntegerField()
    average_attendance_rate = serializers.FloatField()


class MonthlySummarySerializer(serializers.Serializer):
    """Serializer for monthly summary response."""
    
    year = serializers.IntegerField()
    month = serializers.IntegerField()
    summaries = MonthlySummaryItemSerializer(many=True)
    academy_summary = AcademySummarySerializer()

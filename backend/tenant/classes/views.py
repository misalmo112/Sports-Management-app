from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.core.exceptions import ValidationError
from tenant.classes.models import Class, Enrollment
from tenant.classes.serializers import (
    ClassSerializer,
    ClassListSerializer,
    EnrollmentSerializer,
    EnrollStudentSerializer,
)
from tenant.classes.services import EnrollmentService
from tenant.students.models import Student
from tenant.coaches.models import Coach
from shared.permissions.tenant import (
    IsTenantAdmin, IsCoach, IsParent, 
    IsTenantAdminOrCoach, IsTenantAdminOrParent, IsTenantAdminOrParentOrCoach
)
from shared.decorators.quota import check_quota
from shared.utils.queryset_filtering import filter_by_academy


class ClassViewSet(viewsets.ModelViewSet):
    """ViewSet for Class model."""
    
    queryset = Class.objects.all()
    serializer_class = ClassSerializer
    permission_classes = [IsTenantAdminOrCoach]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active', 'coach', 'sport', 'location']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'start_date', 'created_at']
    ordering = ['name']
    
    def get_queryset(self):
        """Filter by academy, with special handling for coaches."""
        queryset = super().get_queryset()
        
        # Superadmin can see all
        if hasattr(self.request.user, 'role') and self.request.user.role == 'SUPERADMIN':
            return queryset
        
        # Coaches can only see their assigned classes
        if hasattr(self.request.user, 'role') and self.request.user.role == 'COACH':
            queryset = queryset.filter(
                coach__user=self.request.user,
                is_active=True
            )
        else:
            # Admin/Owner: filter by academy
            queryset = filter_by_academy(
                queryset,
                self.request.academy,
                self.request.user,
                self.request
            )
        
        return queryset
    
    def get_serializer_class(self):
        """Use list serializer for list action."""
        if self.action == 'list':
            return ClassListSerializer
        return ClassSerializer
    
    def list(self, request, *args, **kwargs):
        """Override list to add error handling and instrumentation."""
        import json
        import os
        log_path = r'c:\Users\misal\OneDrive\Belgeler\Projects\Github\The Sports App\.cursor\debug.log'
        try:
            # #region agent log
            with open(log_path, 'a', encoding='utf-8') as f:
                f.write(json.dumps({"location":"classes/views.py:72","message":"Starting list action","data":{"action":self.action},"timestamp":int(__import__('time').time()*1000),"sessionId":"debug-session","runId":"run4","hypothesisId":"U"}) + '\n')
            # #endregion
            queryset = self.filter_queryset(self.get_queryset())
            # #region agent log
            with open(log_path, 'a', encoding='utf-8') as f:
                f.write(json.dumps({"location":"classes/views.py:76","message":"After filter_queryset","data":{"querysetCount":queryset.count() if hasattr(queryset, 'count') else 'N/A'},"timestamp":int(__import__('time').time()*1000),"sessionId":"debug-session","runId":"run4","hypothesisId":"U"}) + '\n')
            # #endregion
            page = self.paginate_queryset(queryset)
            if page is not None:
                # #region agent log
                with open(log_path, 'a', encoding='utf-8') as f:
                    f.write(json.dumps({"location":"classes/views.py:80","message":"Paginating queryset","data":{"pageSize":len(page) if page else 0},"timestamp":int(__import__('time').time()*1000),"sessionId":"debug-session","runId":"run4","hypothesisId":"U"}) + '\n')
                # #endregion
                serializer = self.get_serializer(page, many=True)
                # #region agent log
                with open(log_path, 'a', encoding='utf-8') as f:
                    f.write(json.dumps({"location":"classes/views.py:84","message":"Serializing page","data":{"serializedCount":len(serializer.data)},"timestamp":int(__import__('time').time()*1000),"sessionId":"debug-session","runId":"run4","hypothesisId":"U"}) + '\n')
                # #endregion
                return self.get_paginated_response(serializer.data)
            
            serializer = self.get_serializer(queryset, many=True)
            # #region agent log
            with open(log_path, 'a', encoding='utf-8') as f:
                f.write(json.dumps({"location":"classes/views.py:92","message":"Serializing queryset","data":{"serializedCount":len(serializer.data)},"timestamp":int(__import__('time').time()*1000),"sessionId":"debug-session","runId":"run4","hypothesisId":"U"}) + '\n')
            # #endregion
            return Response(serializer.data)
        except Exception as e:
            # #region agent log
            with open(log_path, 'a', encoding='utf-8') as f:
                f.write(json.dumps({"location":"classes/views.py:98","message":"Error in list action","data":{"errorType":type(e).__name__,"errorMessage":str(e),"errorArgs":str(e.args) if hasattr(e, 'args') else None},"timestamp":int(__import__('time').time()*1000),"sessionId":"debug-session","runId":"run4","hypothesisId":"V"}) + '\n')
            # #endregion
            raise
    
    @check_quota('classes')
    def create(self, request, *args, **kwargs):
        """Create class with quota check."""
        return super().create(request, *args, **kwargs)
    
    def get_permissions(self):
        """Restrict create/delete to admins only, allow coaches to update assigned classes."""
        if self.action in ['create', 'destroy']:
            return [IsTenantAdmin()]
        elif self.action in ['update', 'partial_update']:
            # Admins can update any class, coaches can only update assigned classes
            return [IsTenantAdminOrCoach()]
        return super().get_permissions()
    
    def update(self, request, *args, **kwargs):
        """Update class with coach permission check."""
        instance = self.get_object()
        
        # Check if coach is trying to update and verify they're assigned to this class
        if hasattr(request.user, 'role') and request.user.role == 'COACH':
            try:
                coach = Coach.objects.get(user=request.user, academy=request.academy)
                if instance.coach != coach:
                    return Response(
                        {'detail': 'You can only update classes assigned to you.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            except Coach.DoesNotExist:
                return Response(
                    {'detail': 'Coach profile not found.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        return super().update(request, *args, **kwargs)
    
    def perform_destroy(self, instance):
        """Hard delete - actually delete the class."""
        instance.delete()
    
    @action(detail=True, methods=['post'], permission_classes=[IsTenantAdmin])
    def assign_coach(self, request, pk=None):
        """Assign a coach to a class."""
        class_obj = self.get_object()
        
        coach_id = request.data.get('coach_id')
        if not coach_id:
            return Response(
                {'detail': 'coach_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            coach = Coach.objects.get(
                id=coach_id,
                academy=request.academy,
                is_active=True
            )
        except Coach.DoesNotExist:
            return Response(
                {'detail': 'Coach not found or does not belong to this academy'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        class_obj.coach = coach
        class_obj.save()
        
        serializer = self.get_serializer(class_obj)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], permission_classes=[IsTenantAdminOrParent])
    def enroll(self, request, pk=None):
        """Enroll a student in this class."""
        class_obj = self.get_object()
        
        serializer = EnrollStudentSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        student_id = serializer.validated_data['student_id']
        
        try:
            student = Student.objects.get(
                id=student_id,
                academy=request.academy,
                is_active=True
            )
        except Student.DoesNotExist:
            return Response(
                {'detail': 'Student not found or does not belong to this academy'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check parent permission
        if hasattr(request.user, 'role') and request.user.role == 'PARENT':
            # Verify student belongs to this parent
            if not student.parent or student.parent.email != request.user.email:
                return Response(
                    {'detail': 'You can only enroll your own children'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        try:
            enrollment = EnrollmentService.enroll_student(
                student=student,
                class_obj=class_obj,
                notes=request.data.get('notes', '')
            )
        except ValidationError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = EnrollmentSerializer(enrollment, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'], permission_classes=[IsTenantAdminOrParentOrCoach])
    def enrollments(self, request, pk=None):
        """List enrollments for this class."""
        class_obj = self.get_object()
        
        enrollments = class_obj.enrollments.filter(
            status=Enrollment.Status.ENROLLED,
            student__is_active=True
        ).select_related('student', 'student__parent')
        
        # Parents can only see their children's enrollments
        if hasattr(request.user, 'role') and request.user.role == 'PARENT':
            if hasattr(request.user, 'email'):
                enrollments = enrollments.filter(
                    student__parent__email=request.user.email
                )
            else:
                enrollments = enrollments.none()
        
        serializer = EnrollmentSerializer(enrollments, many=True, context={'request': request})
        # Return in paginated format expected by tests
        return Response({
            'results': serializer.data,
            'count': len(serializer.data)
        })


class EnrollmentViewSet(viewsets.ModelViewSet):
    """ViewSet for Enrollment model."""
    
    queryset = Enrollment.objects.all()
    serializer_class = EnrollmentSerializer
    permission_classes = [IsTenantAdminOrParent]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ['status', 'student', 'class_obj']
    ordering_fields = ['enrolled_at', 'created_at']
    ordering = ['-enrolled_at']
    
    def get_queryset(self):
        """Filter by academy, with special handling for parents."""
        queryset = super().get_queryset()
        
        # Superadmin can see all
        if hasattr(self.request.user, 'role') and self.request.user.role == 'SUPERADMIN':
            # Still filter out inactive students for superadmin
            queryset = queryset.select_related('student', 'class_obj').filter(student__is_active=True)
            return queryset
        
        # Parents can only see their children's enrollments
        if hasattr(self.request.user, 'role') and self.request.user.role == 'PARENT':
            if hasattr(self.request.user, 'email'):
                queryset = queryset.select_related('student', 'student__parent', 'class_obj').filter(
                    student__parent__email=self.request.user.email,
                    student__is_active=True
                )
            else:
                queryset = queryset.none()
        else:
            # Admin/Owner: filter by academy first, then by active students
            queryset = filter_by_academy(
                queryset,
                self.request.academy,
                self.request.user,
                self.request
            )
            queryset = queryset.select_related('student', 'class_obj').filter(student__is_active=True)
        
        return queryset
    
    def get_permissions(self):
        """Restrict create/delete to admins and parents."""
        if self.action in ['create', 'destroy']:
            return [IsTenantAdminOrParent()]
        return super().get_permissions()
    
    def perform_destroy(self, instance):
        """Unenroll student using service."""
        EnrollmentService.unenroll_student(instance)

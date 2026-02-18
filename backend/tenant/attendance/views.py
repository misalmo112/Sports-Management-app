from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import datetime, date

from tenant.attendance.models import Attendance, CoachAttendance
from tenant.attendance.serializers import (
    AttendanceSerializer,
    AttendanceListSerializer,
    MarkAttendanceSerializer,
    CoachAttendanceSerializer,
    CoachAttendanceListSerializer,
    MarkCoachAttendanceSerializer,
    MonthlySummarySerializer,
)
from tenant.attendance.services import AttendanceService
from tenant.classes.models import Class
from tenant.coaches.models import Coach
from shared.permissions.tenant import (
    IsTenantAdmin, IsCoach, IsParent,
    IsTenantAdminOrCoach, IsTenantAdminOrParentOrCoach
)
from shared.utils.queryset_filtering import filter_by_academy


class AttendanceViewSet(viewsets.ModelViewSet):
    """ViewSet for Attendance model."""
    
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    permission_classes = [IsTenantAdminOrParentOrCoach]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['date', 'student', 'class_obj', 'status']
    search_fields = ['student__first_name', 'student__last_name', 'class_obj__name']
    ordering_fields = ['date', 'student', 'created_at']
    ordering = ['-date', 'student']
    
    def get_queryset(self):
        """Filter by academy, with special handling for coaches and parents."""
        queryset = super().get_queryset()
        
        # Superadmin can see all
        if hasattr(self.request.user, 'role') and self.request.user.role == 'SUPERADMIN':
            return queryset
        
        # Parents can only see attendance for their own children
        if hasattr(self.request.user, 'role') and self.request.user.role == 'PARENT':
            if hasattr(self.request.user, 'email'):
                queryset = queryset.filter(
                    student__parent__email=self.request.user.email
                )
            else:
                queryset = queryset.none()
        # Coaches can only see attendance for their assigned classes
        elif hasattr(self.request.user, 'role') and self.request.user.role == 'COACH':
            try:
                coach = Coach.objects.get(user=self.request.user, academy=self.request.academy)
                queryset = queryset.filter(
                    class_obj__coach=coach,
                    class_obj__is_active=True
                )
            except Coach.DoesNotExist:
                queryset = queryset.none()
        else:
            # Fallback: check if user is linked to a coach profile
            try:
                coach = Coach.objects.get(user=self.request.user, academy=self.request.academy)
                queryset = queryset.filter(
                    class_obj__coach=coach,
                    class_obj__is_active=True
                )
            except Coach.DoesNotExist:
                # Admin/Owner: filter by academy
                queryset = filter_by_academy(
                    queryset,
                    self.request.academy,
                    self.request.user,
                    self.request
                )
        
        return queryset.select_related('student', 'class_obj', 'marked_by')
    
    def get_serializer_class(self):
        """Use list serializer for list action."""
        if self.action == 'list':
            return AttendanceListSerializer
        return AttendanceSerializer
    
    def list(self, request, *args, **kwargs):
        """Override list to add error handling and instrumentation."""
        import json
        import os
        log_path = r'c:\Users\misal\OneDrive\Belgeler\Projects\Github\The Sports App\.cursor\debug.log'
        try:
            # #region agent log
            with open(log_path, 'a', encoding='utf-8') as f:
                f.write(json.dumps({"location":"attendance/views.py:100","message":"Starting list action","data":{"action":self.action},"timestamp":int(__import__('time').time()*1000),"sessionId":"debug-session","runId":"run4","hypothesisId":"W"}) + '\n')
            # #endregion
            queryset = self.filter_queryset(self.get_queryset())
            # #region agent log
            with open(log_path, 'a', encoding='utf-8') as f:
                f.write(json.dumps({"location":"attendance/views.py:104","message":"After filter_queryset","data":{"querysetCount":queryset.count() if hasattr(queryset, 'count') else 'N/A'},"timestamp":int(__import__('time').time()*1000),"sessionId":"debug-session","runId":"run4","hypothesisId":"W"}) + '\n')
            # #endregion
            page = self.paginate_queryset(queryset)
            if page is not None:
                # #region agent log
                with open(log_path, 'a', encoding='utf-8') as f:
                    f.write(json.dumps({"location":"attendance/views.py:108","message":"Paginating queryset","data":{"pageSize":len(page) if page else 0},"timestamp":int(__import__('time').time()*1000),"sessionId":"debug-session","runId":"run4","hypothesisId":"W"}) + '\n')
                # #endregion
                serializer = self.get_serializer(page, many=True)
                # #region agent log
                with open(log_path, 'a', encoding='utf-8') as f:
                    f.write(json.dumps({"location":"attendance/views.py:112","message":"Serializing page","data":{"serializedCount":len(serializer.data)},"timestamp":int(__import__('time').time()*1000),"sessionId":"debug-session","runId":"run4","hypothesisId":"W"}) + '\n')
                # #endregion
                return self.get_paginated_response(serializer.data)
            
            serializer = self.get_serializer(queryset, many=True)
            # #region agent log
            with open(log_path, 'a', encoding='utf-8') as f:
                f.write(json.dumps({"location":"attendance/views.py:120","message":"Serializing queryset","data":{"serializedCount":len(serializer.data)},"timestamp":int(__import__('time').time()*1000),"sessionId":"debug-session","runId":"run4","hypothesisId":"W"}) + '\n')
            # #endregion
            return Response(serializer.data)
        except Exception as e:
            # #region agent log
            with open(log_path, 'a', encoding='utf-8') as f:
                f.write(json.dumps({"location":"attendance/views.py:126","message":"Error in list action","data":{"errorType":type(e).__name__,"errorMessage":str(e),"errorArgs":str(e.args) if hasattr(e, 'args') else None},"timestamp":int(__import__('time').time()*1000),"sessionId":"debug-session","runId":"run4","hypothesisId":"X"}) + '\n')
            # #endregion
            raise
    
    def get_permissions(self):
        """
        Parents can only view attendance (list/retrieve).
        Only admins and coaches can create/update/delete attendance.
        """
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsTenantAdminOrCoach()]
        return super().get_permissions()
    
    def create(self, request, *args, **kwargs):
        """Create attendance record."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Check coach permission for assigned classes
        if hasattr(request.user, 'role') and request.user.role == 'COACH':
            class_obj = serializer.validated_data.get('class_obj')
            if class_obj:
                try:
                    coach = Coach.objects.get(user=request.user, academy=request.academy)
                    if class_obj.coach != coach:
                        return Response(
                            {'detail': 'You can only mark attendance for your assigned classes.'},
                            status=status.HTTP_403_FORBIDDEN
                        )
                except Coach.DoesNotExist:
                    return Response(
                        {'detail': 'Coach profile not found.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
        
        # Auto-set marked_by if not provided
        if not serializer.validated_data.get('marked_by') and request.user.is_authenticated:
            serializer.validated_data['marked_by'] = request.user
        
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    @action(detail=False, methods=['post'], permission_classes=[IsTenantAdminOrCoach])
    def mark(self, request):
        """
        Bulk mark attendance for multiple students in a class.
        POST /api/v1/tenant/attendance/mark/
        """
        serializer = MarkAttendanceSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        class_id = serializer.validated_data['class_id']
        date = serializer.validated_data['date']
        attendance_records = serializer.validated_data['attendance_records']
        
        # Get class object
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
        
        # Check coach permission
        is_coach = False
        if hasattr(request.user, 'role') and request.user.role == 'COACH':
            is_coach = True
        else:
            # Fallback: check if user is linked to a coach profile
            try:
                Coach.objects.get(user=request.user, academy=request.academy)
                is_coach = True
            except Coach.DoesNotExist:
                pass
        
        if is_coach:
            # Verify coach is assigned to this class
            try:
                coach = Coach.objects.get(user=request.user, academy=request.academy)
                if not class_obj.coach or class_obj.coach.id != coach.id:
                    return Response(
                        {'detail': 'You can only mark attendance for your assigned classes'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            except Coach.DoesNotExist:
                return Response(
                    {'detail': 'Coach profile not found'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Prepare attendance records for service
        records = []
        for record in attendance_records:
            records.append({
                'student_id': record['student_id'],
                'status': record['status'],
                'notes': record.get('notes', '')
            })
        
        try:
            created_or_updated = AttendanceService.mark_attendance(
                class_obj=class_obj,
                date=date,
                attendance_records=records,
                marked_by=request.user if request.user.is_authenticated else None
            )
            
            # Serialize response
            response_serializer = AttendanceSerializer(
                created_or_updated,
                many=True,
                context={'request': request}
            )
            
            return Response({
                'message': f'Successfully marked attendance for {len(created_or_updated)} student(s)',
                'attendance_records': response_serializer.data
            }, status=status.HTTP_201_CREATED)
            
        except ValidationError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'], permission_classes=[IsTenantAdminOrCoach])
    def monthly_summary(self, request):
        """
        Get monthly attendance summary.
        GET /api/v1/tenant/attendance/monthly-summary/?year=2024&month=1&student_id=1&class_id=1
        """
        # Get query parameters
        year = request.query_params.get('year')
        month = request.query_params.get('month')
        student_id = request.query_params.get('student_id')
        class_id = request.query_params.get('class_id')
        
        # Validate required parameters
        if not year or not month:
            return Response(
                {'detail': 'year and month query parameters are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            year = int(year)
            month = int(month)
            if month < 1 or month > 12:
                raise ValueError("Month must be between 1 and 12")
        except ValueError as e:
            return Response(
                {'detail': f'Invalid year or month: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Convert optional parameters
        student_id = int(student_id) if student_id else None
        class_id = int(class_id) if class_id else None
        
        # Check coach permission
        if hasattr(request.user, 'role') and request.user.role == 'COACH':
            # Coaches can only see summaries for their assigned classes
            if class_id:
                try:
                    class_obj = Class.objects.get(
                        id=class_id,
                        academy=request.academy,
                        is_active=True
                    )
                    if not class_obj.coach or class_obj.coach.user_id != request.user.id:
                        return Response(
                            {'detail': 'You can only view summaries for your assigned classes'},
                            status=status.HTTP_403_FORBIDDEN
                        )
                except Class.DoesNotExist:
                    return Response(
                        {'detail': 'Class not found'},
                        status=status.HTTP_404_NOT_FOUND
                    )
        
        # Get summary
        summary = AttendanceService.get_monthly_summary(
            academy=request.academy,
            year=year,
            month=month,
            student_id=student_id,
            class_id=class_id
        )
        
        # Filter for coaches if needed
        if hasattr(request.user, 'role') and request.user.role == 'COACH':
            # Filter summaries to only include coach's classes
            coach_classes = Class.objects.filter(
                academy=request.academy,
                coach__user=request.user,
                is_active=True
            ).values_list('id', flat=True)
            
            summary['summaries'] = [
                s for s in summary['summaries']
                if s['class_id'] in coach_classes
            ]
        
        serializer = MonthlySummarySerializer(summary)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], permission_classes=[IsTenantAdminOrCoach])
    def export(self, request):
        """
        Export attendance records to CSV.
        GET /api/v1/tenant/attendance/export/?start_date=2024-01-01&end_date=2024-01-31&class_id=1
        """
        # Get query parameters
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        class_id = request.query_params.get('class_id')
        student_id = request.query_params.get('student_id')
        
        # Build queryset
        queryset = self.get_queryset()
        
        # Apply filters
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                queryset = queryset.filter(date__gte=start_date_obj)
            except ValueError:
                return Response(
                    {'detail': 'Invalid start_date format. Use YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                queryset = queryset.filter(date__lte=end_date_obj)
            except ValueError:
                return Response(
                    {'detail': 'Invalid end_date format. Use YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if class_id:
            try:
                queryset = queryset.filter(class_obj_id=int(class_id))
            except ValueError:
                return Response(
                    {'detail': 'Invalid class_id'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if student_id:
            try:
                queryset = queryset.filter(student_id=int(student_id))
            except ValueError:
                return Response(
                    {'detail': 'Invalid student_id'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Generate filename
        filename = f'attendance_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        if start_date and end_date:
            filename = f'attendance_export_{start_date}_to_{end_date}.csv'
        
        # Export to CSV
        return AttendanceService.export_to_csv(queryset, filename=filename)


class CoachAttendanceViewSet(viewsets.ModelViewSet):
    """ViewSet for CoachAttendance model."""
    
    queryset = CoachAttendance.objects.all()
    serializer_class = CoachAttendanceSerializer
    permission_classes = [IsTenantAdminOrCoach]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['date', 'coach', 'class_obj', 'status']
    search_fields = ['coach__first_name', 'coach__last_name', 'class_obj__name']
    ordering_fields = ['date', 'coach', 'created_at']
    ordering = ['-date', 'coach']
    
    def get_queryset(self):
        """Filter by academy, with special handling for coaches."""
        queryset = super().get_queryset()
        
        # Superadmin can see all
        if hasattr(self.request.user, 'role') and self.request.user.role == 'SUPERADMIN':
            return queryset
        
        # Coaches can only see their own attendance
        is_coach = False
        if hasattr(self.request.user, 'role') and self.request.user.role == 'COACH':
            is_coach = True
        else:
            # Fallback: check if user is linked to a coach profile
            try:
                Coach.objects.get(user=self.request.user, academy=self.request.academy)
                is_coach = True
            except Coach.DoesNotExist:
                pass
        
        if is_coach:
            # Get coach profile for the user
            try:
                coach = Coach.objects.get(user=self.request.user, academy=self.request.academy)
                queryset = queryset.filter(coach=coach)
            except Coach.DoesNotExist:
                queryset = queryset.none()
        else:
            # Admin/Owner: filter by academy
            queryset = filter_by_academy(
                queryset,
                self.request.academy,
                self.request.user,
                self.request
            )
        
        return queryset.select_related('coach', 'class_obj', 'marked_by')
    
    def get_serializer_class(self):
        """Use list serializer for list action."""
        if self.action == 'list':
            return CoachAttendanceListSerializer
        return CoachAttendanceSerializer
    
    def create(self, request, *args, **kwargs):
        """Create coach attendance record."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Auto-set marked_by if not provided
        if not serializer.validated_data.get('marked_by') and request.user.is_authenticated:
            serializer.validated_data['marked_by'] = request.user
        
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    @action(detail=False, methods=['post'], permission_classes=[IsTenantAdminOrCoach])
    def mark(self, request):
        """
        Mark coach attendance.
        POST /api/v1/tenant/attendance/coach-attendance/mark/
        """
        serializer = MarkCoachAttendanceSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        class_id = serializer.validated_data['class_id']
        coach_id = serializer.validated_data['coach_id']
        attendance_date = serializer.validated_data['date']
        attendance_status = serializer.validated_data['status']
        notes = serializer.validated_data.get('notes', '')
        
        # Get class object
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
        
        # Check coach permission
        if hasattr(request.user, 'role') and request.user.role == 'COACH':
            # Coaches can only mark their own attendance
            try:
                coach = Coach.objects.get(user=request.user, academy=request.academy)
                if coach_id != coach.id:
                    return Response(
                        {'detail': 'You can only mark your own attendance'},
                        status=status.HTTP_403_FORBIDDEN
                    )
            except Coach.DoesNotExist:
                return Response(
                    {'detail': 'Coach profile not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        
        try:
            attendance = AttendanceService.mark_coach_attendance(
                class_obj=class_obj,
                date=attendance_date,
                coach_id=coach_id,
                status=attendance_status,
                notes=notes,
                marked_by=request.user if request.user.is_authenticated else None
            )
            
            response_serializer = CoachAttendanceSerializer(
                attendance,
                context={'request': request}
            )
            
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
            
        except ValidationError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=['get'], permission_classes=[IsTenantAdminOrCoach])
    def export(self, request):
        """
        Export coach attendance records to CSV.
        GET /api/v1/tenant/attendance/coach-attendance/export/?start_date=2024-01-01&end_date=2024-01-31
        """
        # Get query parameters
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        class_id = request.query_params.get('class_id')
        coach_id = request.query_params.get('coach_id')
        
        # Build queryset
        queryset = self.get_queryset()
        
        # Apply filters
        if start_date:
            try:
                start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                queryset = queryset.filter(date__gte=start_date_obj)
            except ValueError:
                return Response(
                    {'detail': 'Invalid start_date format. Use YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if end_date:
            try:
                end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                queryset = queryset.filter(date__lte=end_date_obj)
            except ValueError:
                return Response(
                    {'detail': 'Invalid end_date format. Use YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if class_id:
            try:
                queryset = queryset.filter(class_obj_id=int(class_id))
            except ValueError:
                return Response(
                    {'detail': 'Invalid class_id'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if coach_id:
            try:
                queryset = queryset.filter(coach_id=int(coach_id))
            except ValueError:
                return Response(
                    {'detail': 'Invalid coach_id'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Generate filename
        filename = f'coach_attendance_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        if start_date and end_date:
            filename = f'coach_attendance_export_{start_date}_to_{end_date}.csv'
        
        # Export to CSV
        return AttendanceService.export_coach_attendance_to_csv(queryset, filename=filename)

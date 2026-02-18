"""
Service for Tenant Overview data aggregation.
"""
from django.db.models import Count, Sum, Q
from django.utils import timezone
from datetime import date, timedelta
from tenant.classes.models import Class, Enrollment
from tenant.attendance.models import Attendance
from tenant.billing.models import Invoice
from tenant.students.models import Student
from tenant.coaches.models import Coach


class OverviewService:
    """Service for aggregating tenant overview data."""
    
    @staticmethod
    def get_overview_data(academy, user_role, user=None):
        """
        Get overview data for a tenant based on user role.
        
        Args:
            academy: Academy instance
            user_role: User role (ADMIN, OWNER, COACH, PARENT)
            user: User instance (optional, for role-specific filtering)
            
        Returns:
            dict: Overview data
        """
        today = date.today()
        
        if user_role in ['ADMIN', 'OWNER']:
            return OverviewService._get_admin_overview(academy, today)
        elif user_role == 'COACH':
            return OverviewService._get_coach_overview(academy, user, today)
        elif user_role == 'PARENT':
            return OverviewService._get_parent_overview(academy, user, today)
        else:
            return {
                'role': user_role,
                'today_classes': [],
                'attendance_summary': {'present': 0, 'absent': 0},
                'finance_summary': {'unpaid_invoices': 0, 'overdue_invoices': 0, 'total_due': 0},
                'alerts': []
            }
    
    @staticmethod
    def _get_admin_overview(academy, today):
        """Get overview data for ADMIN/OWNER role."""
        # Today's classes
        today_classes = Class.objects.filter(
            academy=academy,
            is_active=True,
            start_date__lte=today
        ).filter(
            Q(end_date__isnull=True) | Q(end_date__gte=today)
        )[:10]  # Limit to 10
        
        from tenant.classes.serializers import ClassSerializer
        today_classes_data = ClassSerializer(today_classes, many=True).data
        
        # Attendance summary (last 30 days)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        attendance_stats = Attendance.objects.filter(
            academy=academy,
            date__gte=thirty_days_ago.date()
        ).aggregate(
            present=Count('id', filter=Q(status='PRESENT')),
            absent=Count('id', filter=Q(status='ABSENT'))
        )
        
        # Finance summary
        unpaid_invoices = Invoice.objects.filter(
            academy=academy
        ).exclude(status=Invoice.Status.PAID)
        overdue_invoices = unpaid_invoices.filter(due_date__lt=today)
        
        # Calculate total due from unpaid invoices
        total_due = sum(float(inv.total) for inv in unpaid_invoices)
        
        finance_summary = {
            'unpaid_invoices': unpaid_invoices.count(),
            'overdue_invoices': overdue_invoices.count(),
            'total_due': total_due
        }
        
        # Alerts
        alerts = []
        if overdue_invoices.exists():
            alerts.append({
                'type': 'overdue_invoices',
                'message': f'{overdue_invoices.count()} overdue invoice(s)',
                'severity': 'high'
            })
        
        return {
            'role': 'ADMIN',
            'today_classes': today_classes_data,
            'attendance_summary': {
                'present': attendance_stats['present'] or 0,
                'absent': attendance_stats['absent'] or 0
            },
            'finance_summary': finance_summary,
            'alerts': alerts
        }
    
    @staticmethod
    def _get_coach_overview(academy, user, today):
        """Get overview data for COACH role."""
        # Get coach's assigned classes
        try:
            coach = Coach.objects.get(academy=academy, user=user, is_active=True)
            coach_classes = Class.objects.filter(
                academy=academy,
                coach=coach,
                is_active=True,
                start_date__lte=today
            ).filter(
                Q(end_date__isnull=True) | Q(end_date__gte=today)
            )
        except Coach.DoesNotExist:
            coach_classes = Class.objects.none()
        
        from tenant.classes.serializers import ClassSerializer
        today_classes_data = ClassSerializer(coach_classes[:10], many=True).data
        
        # Attendance for coach's classes (last 30 days)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        if coach_classes.exists():
            attendance_stats = Attendance.objects.filter(
                academy=academy,
                class_obj__in=coach_classes,
                date__gte=thirty_days_ago.date()
            ).aggregate(
                present=Count('id', filter=Q(status='PRESENT')),
                absent=Count('id', filter=Q(status='ABSENT'))
            )
        else:
            attendance_stats = {'present': 0, 'absent': 0}
        
        return {
            'role': 'COACH',
            'today_classes': today_classes_data,
            'attendance_summary': {
                'present': attendance_stats['present'] or 0,
                'absent': attendance_stats['absent'] or 0
            },
            'finance_summary': {'unpaid_invoices': 0, 'overdue_invoices': 0, 'total_due': 0},
            'alerts': []
        }
    
    @staticmethod
    def _get_parent_overview(academy, user, today):
        """Get overview data for PARENT role."""
        # Get parent's children - Parent model has email, match by user email
        try:
            from tenant.students.models import Parent
            parent = Parent.objects.get(academy=academy, email=user.email)
            children = Student.objects.filter(academy=academy, parent=parent, is_active=True)
        except Exception:
            children = Student.objects.none()
        
        # Get children's enrollments
        if children.exists():
            enrollments = Enrollment.objects.filter(
                academy=academy,
                student__in=children,
                status='ENROLLED'
            )
            classes = Class.objects.filter(
                academy=academy,
                enrollments__in=enrollments
            ).distinct()
        else:
            classes = Class.objects.none()
        
        from tenant.classes.serializers import ClassSerializer
        today_classes_data = ClassSerializer(classes[:10], many=True).data
        
        # Attendance for children (last 30 days)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        if children.exists():
            attendance_stats = Attendance.objects.filter(
                academy=academy,
                student__in=children,
                date__gte=thirty_days_ago.date()
            ).aggregate(
                present=Count('id', filter=Q(status='PRESENT')),
                absent=Count('id', filter=Q(status='ABSENT'))
            )
        else:
            attendance_stats = {'present': 0, 'absent': 0}
        
        # Finance summary for children's invoices
        if children.exists():
            # Get parent IDs from children
            parent_ids = list(children.values_list('parent_id', flat=True).distinct())
            unpaid_invoices = Invoice.objects.filter(
                academy=academy,
                parent_id__in=parent_ids,
            ).exclude(status=Invoice.Status.PAID)
            overdue_invoices = unpaid_invoices.filter(due_date__lt=today)
            
            # Calculate total due
            total_due = sum(float(inv.total) for inv in unpaid_invoices)
            
            finance_summary = {
                'unpaid_invoices': unpaid_invoices.count(),
                'overdue_invoices': overdue_invoices.count(),
                'total_due': total_due
            }
        else:
            finance_summary = {'unpaid_invoices': 0, 'overdue_invoices': 0, 'total_due': 0}
        
        return {
            'role': 'PARENT',
            'today_classes': today_classes_data,
            'attendance_summary': {
                'present': attendance_stats['present'] or 0,
                'absent': attendance_stats['absent'] or 0
            },
            'finance_summary': finance_summary,
            'alerts': []
        }

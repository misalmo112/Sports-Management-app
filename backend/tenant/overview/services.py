"""
Service for Tenant Overview data aggregation.
"""
from django.db.models import Count, Sum, Q
from django.utils import timezone
from datetime import date, timedelta
from tenant.classes.models import Class, Enrollment
from tenant.attendance.models import Attendance
from tenant.billing.models import Invoice, Receipt
from tenant.students.models import Student
from tenant.coaches.models import Coach
from tenant.users.models import User


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
        
        if user_role in ['ADMIN', 'OWNER', 'STAFF']:
            return OverviewService._get_admin_overview(academy, today)
        elif user_role == 'COACH':
            return OverviewService._get_coach_overview(academy, user, today)
        elif user_role == 'PARENT':
            return OverviewService._get_parent_overview(academy, user, today)
        else:
            return {
                'role': user_role,
                'counts': {'students': 0, 'coaches': 0, 'admins': 0, 'classes': 0, 'enrollments': 0},
                'today_classes': [],
                'attendance_summary': {'present': 0, 'absent': 0},
                'finance_summary': {'unpaid_invoices': 0, 'overdue_invoices': 0, 'total_due': 0, 'collected_last_30_days': 0},
                'alerts': []
            }
    
    @staticmethod
    def _get_admin_overview(academy, today):
        """Get overview data for ADMIN/OWNER role."""
        thirty_days_ago = timezone.now() - timedelta(days=30)

        # Counts: prefer TenantUsage, fallback to live counts
        usage = getattr(academy, 'usage', None)
        if usage is not None:
            counts = {
                'students': getattr(usage, 'students_count', 0) or 0,
                'coaches': getattr(usage, 'coaches_count', 0) or 0,
                'admins': getattr(usage, 'admins_count', 0) or 0,
                'classes': getattr(usage, 'classes_count', 0) or 0,
            }
        else:
            active_class_filter = Q(
                academy=academy, is_active=True,
                start_date__lte=today
            ) & (Q(end_date__isnull=True) | Q(end_date__gte=today))
            counts = {
                'students': Student.objects.filter(academy=academy, is_active=True).count(),
                'coaches': Coach.objects.filter(academy=academy, is_active=True).count(),
                'admins': User.objects.filter(
                    academy=academy,
                    role__in=[User.Role.ADMIN, User.Role.STAFF, User.Role.OWNER],
                    is_active=True,
                ).count(),
                'classes': Class.objects.filter(active_class_filter).count(),
            }
        counts['enrollments'] = Enrollment.objects.filter(
            academy=academy, status='ENROLLED'
        ).count()

        # Usage / quota (optional)
        usage_data = None
        quota_data = None
        if usage is not None:
            storage = getattr(usage, 'storage_used_bytes', 0) or 0
            usage_data = {
                'students_count': counts['students'],
                'coaches_count': counts['coaches'],
                'admins_count': counts['admins'],
                'classes_count': counts['classes'],
                'storage_used_bytes': storage,
                'storage_used_gb': round(storage / (1024 ** 3), 2),
            }
        quota = getattr(academy, 'quota', None)
        if quota is not None:
            quota_data = {
                'max_students': getattr(quota, 'max_students', 0) or 0,
                'max_coaches': getattr(quota, 'max_coaches', 0) or 0,
                'max_admins': getattr(quota, 'max_admins', 0) or 0,
                'max_classes': getattr(quota, 'max_classes', 0) or 0,
                'storage_bytes_limit': getattr(quota, 'storage_bytes_limit', 0) or 0,
            }

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

        # Collected (last 30 days) from Receipts
        collected_result = Receipt.objects.filter(
            academy=academy,
            created_at__gte=thirty_days_ago
        ).aggregate(total=Sum('amount'))
        collected_last_30_days = float((collected_result['total'] or 0))

        finance_summary = {
            'unpaid_invoices': unpaid_invoices.count(),
            'overdue_invoices': overdue_invoices.count(),
            'total_due': total_due,
            'collected_last_30_days': collected_last_30_days,
        }

        # Alerts
        alerts = []
        if overdue_invoices.exists():
            alerts.append({
                'type': 'overdue_invoices',
                'message': f'{overdue_invoices.count()} overdue invoice(s)',
                'severity': 'high'
            })
        if quota_data and usage_data:
            max_s = quota_data.get('max_students') or 0
            if max_s > 0 and usage_data['students_count'] >= 0.9 * max_s:
                alerts.append({
                    'type': 'quota_students',
                    'message': f"Students near plan limit ({usage_data['students_count']}/{max_s})",
                    'severity': 'medium'
                })
            max_c = quota_data.get('max_coaches') or 0
            if max_c > 0 and usage_data['coaches_count'] >= 0.9 * max_c:
                alerts.append({
                    'type': 'quota_coaches',
                    'message': f"Coaches near plan limit ({usage_data['coaches_count']}/{max_c})",
                    'severity': 'medium'
                })
        try:
            from tenant.facilities.models import RentInvoice
            rent_overdue = RentInvoice.objects.filter(
                academy=academy, status=RentInvoice.Status.OVERDUE
            ).count()
            if rent_overdue > 0:
                alerts.append({
                    'type': 'overdue_rent',
                    'message': f'{rent_overdue} overdue rent invoice(s)',
                    'severity': 'high'
                })
        except Exception:
            pass

        # Activity (last 30 days)
        activity = {
            'new_students_30d': Student.objects.filter(
                academy=academy, is_active=True,
                created_at__gte=thirty_days_ago
            ).count(),
            'new_enrollments_30d': Enrollment.objects.filter(
                academy=academy, status='ENROLLED',
                created_at__gte=thirty_days_ago
            ).count(),
        }

        result = {
            'role': 'ADMIN',
            'counts': counts,
            'today_classes': today_classes_data,
            'attendance_summary': {
                'present': attendance_stats['present'] or 0,
                'absent': attendance_stats['absent'] or 0
            },
            'finance_summary': finance_summary,
            'alerts': alerts
        }
        if usage_data is not None:
            result['usage'] = usage_data
        if quota_data is not None:
            result['quota'] = quota_data
        result['activity'] = activity
        return result
    
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
            'counts': {'students': 0, 'coaches': 0, 'admins': 0, 'classes': 0, 'enrollments': 0},
            'today_classes': today_classes_data,
            'attendance_summary': {
                'present': attendance_stats['present'] or 0,
                'absent': attendance_stats['absent'] or 0
            },
            'finance_summary': {'unpaid_invoices': 0, 'overdue_invoices': 0, 'total_due': 0, 'collected_last_30_days': 0},
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
            'counts': {'students': 0, 'coaches': 0, 'admins': 0, 'classes': 0, 'enrollments': 0},
            'today_classes': today_classes_data,
            'attendance_summary': {
                'present': attendance_stats['present'] or 0,
                'absent': attendance_stats['absent'] or 0
            },
            'finance_summary': {**finance_summary, 'collected_last_30_days': 0},
            'alerts': []
        }

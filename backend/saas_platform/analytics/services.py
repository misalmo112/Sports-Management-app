"""
Service for Platform Analytics and Statistics.
"""
from django.db import connection
from django.db.models import Count, Sum, Q
from django.apps import apps
from django.utils import timezone
from django.core.cache import cache
from datetime import timedelta
from saas_platform.tenants.models import Academy
from saas_platform.subscriptions.models import Subscription, SubscriptionStatus
from saas_platform.quotas.models import TenantUsage


class StatsService:
    """Service for aggregating platform statistics."""

    _DB_SIZE_CACHE_KEY_PREFIX = "db_size_bytes:"
    _DB_SIZE_CACHE_TIMEOUT_SECONDS = 300

    @staticmethod
    def _get_table_sizes():
        """Return a map of table name to total size in bytes (Postgres only)."""
        if connection.vendor != 'postgresql':
            return {}

        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT relname, pg_total_relation_size(relid) "
                "FROM pg_catalog.pg_statio_user_tables"
            )
            return {row[0]: row[1] for row in cursor.fetchall()}

    @staticmethod
    def _get_academy_fk_models():
        """Return models that have a FK to Academy named 'academy'."""
        models = []
        for model in apps.get_models():
            for field in model._meta.fields:
                if (
                    field.name == 'academy'
                    and field.is_relation
                    and field.many_to_one
                    and field.related_model == Academy
                ):
                    models.append(model)
                    break
        return models

    @staticmethod
    def get_academy_db_sizes():
        """
        Estimate per-academy DB size by allocating table size proportionally to
        row counts for models keyed by academy.
        """
        table_sizes = StatsService._get_table_sizes()
        if not table_sizes:
            return {}

        academy_sizes = {}
        models = StatsService._get_academy_fk_models()
        for model in models:
            table_name = model._meta.db_table
            table_size = table_sizes.get(table_name)
            if not table_size:
                continue

            total_count = model.objects.count()
            if total_count == 0:
                continue

            counts = model.objects.values('academy_id').annotate(count=Count('id'))
            for row in counts:
                academy_id = row['academy_id']
                proportion = row['count'] / total_count
                allocated = int(table_size * proportion)
                academy_sizes[academy_id] = academy_sizes.get(academy_id, 0) + allocated

        # Warm per-academy read-through cache keys.
        for academy_id, db_size_bytes in academy_sizes.items():
            cache_key = f"{StatsService._DB_SIZE_CACHE_KEY_PREFIX}{academy_id}"
            cache.set(cache_key, db_size_bytes, timeout=StatsService._DB_SIZE_CACHE_TIMEOUT_SECONDS)

        return academy_sizes

    @staticmethod
    def get_platform_db_size_bytes():
        """Return total database size in bytes (Postgres only)."""
        if connection.vendor != 'postgresql':
            return 0
        with connection.cursor() as cursor:
            cursor.execute("SELECT pg_database_size(current_database())")
            return int(cursor.fetchone()[0])

    @staticmethod
    def get_academy_db_size_bytes(academy_id):
        """Estimate DB size for a single academy."""
        cache_key = f"{StatsService._DB_SIZE_CACHE_KEY_PREFIX}{academy_id}"
        cached_value = cache.get(cache_key)
        if cached_value is not None:
            return cached_value

        # Preserve existing computation logic.
        db_size_bytes = StatsService.get_academy_db_sizes().get(academy_id, 0)
        cache.set(cache_key, db_size_bytes, timeout=StatsService._DB_SIZE_CACHE_TIMEOUT_SECONDS)
        return db_size_bytes
    
    @staticmethod
    def get_platform_stats():
        """
        Get platform-wide statistics.
        
        Returns:
            dict: Platform statistics
        """
        # Academy statistics
        total_academies = Academy.objects.count()
        active_academies = Academy.objects.filter(is_active=True).count()
        onboarded_academies = Academy.objects.filter(onboarding_completed=True).count()
        
        # Subscription statistics
        total_subscriptions = Subscription.objects.count()
        active_subscriptions = Subscription.objects.filter(
            status=SubscriptionStatus.ACTIVE,
            is_current=True
        ).count()
        trial_subscriptions = Subscription.objects.filter(
            status=SubscriptionStatus.TRIAL,
            is_current=True
        ).count()
        
        # Usage statistics (compute live counts per academy for accuracy)
        from tenant.students.models import Student
        from tenant.coaches.models import Coach
        from tenant.classes.models import Class
        from tenant.users.models import User
        from tenant.media.models import MediaFile

        students_by_academy = {
            row['academy_id']: row['count']
            for row in Student.objects.values('academy_id').annotate(count=Count('id'))
        }
        coaches_by_academy = {
            row['academy_id']: row['count']
            for row in Coach.objects.values('academy_id').annotate(count=Count('id'))
        }
        classes_by_academy = {
            row['academy_id']: row['count']
            for row in Class.objects.values('academy_id').annotate(count=Count('id'))
        }
        admins_by_academy = {
            row['academy_id']: row['count']
            for row in User.objects.filter(role=User.Role.ADMIN).values('academy_id').annotate(count=Count('id'))
        }
        storage_by_academy = {
            row['academy_id']: row['total']
            for row in MediaFile.objects.filter(is_active=True).values('academy_id').annotate(total=Sum('file_size'))
        }
        db_sizes_by_academy = StatsService.get_academy_db_sizes()
        platform_db_size_bytes = StatsService.get_platform_db_size_bytes()

        academies = Academy.objects.all().values(
            'id', 'name', 'slug', 'email', 'is_active', 'onboarding_completed'
        )
        per_academy_usage = []
        total_students = 0
        total_coaches = 0
        total_classes = 0
        total_admins = 0
        total_storage_bytes = 0
        total_db_bytes = 0

        for academy in academies:
            academy_id = academy['id']
            students_count = students_by_academy.get(academy_id, 0)
            coaches_count = coaches_by_academy.get(academy_id, 0)
            classes_count = classes_by_academy.get(academy_id, 0)
            admins_count = admins_by_academy.get(academy_id, 0)
            storage_used_bytes = storage_by_academy.get(academy_id, 0) or 0
            db_size_bytes = db_sizes_by_academy.get(academy_id, 0) or 0

            usage, _created = TenantUsage.objects.get_or_create(
                academy_id=academy_id,
                defaults={
                    'storage_used_bytes': storage_used_bytes,
                    'students_count': students_count,
                    'coaches_count': coaches_count,
                    'admins_count': admins_count,
                    'classes_count': classes_count,
                }
            )

            # Refresh cached counts/storage to keep usage table in sync
            updates = {}
            if usage.storage_used_bytes != storage_used_bytes:
                updates['storage_used_bytes'] = storage_used_bytes
            if usage.students_count != students_count:
                updates['students_count'] = students_count
            if usage.coaches_count != coaches_count:
                updates['coaches_count'] = coaches_count
            if usage.admins_count != admins_count:
                updates['admins_count'] = admins_count
            if usage.classes_count != classes_count:
                updates['classes_count'] = classes_count
            if updates:
                updates['counts_computed_at'] = timezone.now()
                TenantUsage.objects.filter(pk=usage.pk).update(**updates)

            total_students += students_count
            total_coaches += coaches_count
            total_classes += classes_count
            total_admins += admins_count
            total_storage_bytes += storage_used_bytes
            total_db_bytes += db_size_bytes

            per_academy_usage.append({
                'academy_id': str(academy_id),
                'academy_name': academy['name'],
                'academy_slug': academy['slug'],
                'academy_email': academy['email'],
                'is_active': academy['is_active'],
                'onboarding_completed': academy['onboarding_completed'],
                'students_count': students_count,
                'coaches_count': coaches_count,
                'admins_count': admins_count,
                'classes_count': classes_count,
                'storage_used_bytes': storage_used_bytes,
                'storage_used_gb': round(storage_used_bytes / (1024 ** 3), 2),
                'db_size_bytes': db_size_bytes,
                'db_size_gb': round(db_size_bytes / (1024 ** 3), 2),
            })
        
        # Recent activity (last 30 days)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        recent_academies = Academy.objects.filter(created_at__gte=thirty_days_ago).count()
        
        return {
            'academies': {
                'total': total_academies,
                'active': active_academies,
                'onboarded': onboarded_academies,
                'recent_30_days': recent_academies
            },
            'subscriptions': {
                'total': total_subscriptions,
                'active': active_subscriptions,
                'trial': trial_subscriptions
            },
            'usage': {
                'total_students': total_students,
                'total_coaches': total_coaches,
                'total_admins': total_admins,
                'total_classes': total_classes,
                'total_storage_bytes': total_storage_bytes,
                'total_storage_gb': round(total_storage_bytes / (1024 ** 3), 2),
                'total_db_bytes': total_db_bytes,
                'total_db_gb': round(total_db_bytes / (1024 ** 3), 2),
                'platform_db_bytes': platform_db_size_bytes,
                'platform_db_gb': round(platform_db_size_bytes / (1024 ** 3), 2),
            },
            'per_academy_usage': per_academy_usage,
            'generated_at': timezone.now().isoformat()
        }
    
    @staticmethod
    def get_platform_errors(date_from=None, date_to=None):
        """
        Get platform error statistics.
        
        Args:
            date_from: Start date for filtering (optional)
            date_to: End date for filtering (optional)
            
        Returns:
            dict: Error statistics
        """
        from saas_platform.audit.models import AuditLog, AuditAction
        
        # For now, we'll use audit logs to track errors
        # In the future, a dedicated Error model could be created
        queryset = AuditLog.objects.all()
        
        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)
        
        # Count errors by resource type
        error_counts = queryset.values('resource_type').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Recent errors (last 100)
        recent_errors = queryset.order_by('-created_at')[:100]
        
        from saas_platform.audit.serializers import AuditLogSerializer
        recent_errors_data = AuditLogSerializer(recent_errors, many=True).data
        
        return {
            'error_counts': list(error_counts),
            'recent_errors': recent_errors_data,
            'total_errors': queryset.count(),
            'date_from': date_from.isoformat() if date_from else None,
            'date_to': date_to.isoformat() if date_to else None
        }

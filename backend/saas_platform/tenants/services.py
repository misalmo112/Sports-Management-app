from django.core.management import call_command
from django.db import connection, transaction
from django.utils import timezone
from saas_platform.tenants.models import Academy
from saas_platform.subscriptions.models import Subscription, SubscriptionStatus
from saas_platform.quotas.models import TenantQuota, TenantUsage
from saas_platform.quotas.services import QuotaService
from shared.tenancy.schema import build_schema_name, is_valid_schema_name


class AcademyService:
    """Service for academy business logic."""
    
    @staticmethod
    @transaction.atomic
    def create_academy(academy_data):
        """
        Create academy with TenantQuota and TenantUsage records.
        
        Args:
            academy_data: Dictionary of academy fields
            
        Returns:
            Academy instance
        """
        academy = Academy.objects.create(**academy_data)
        
        # Create TenantQuota with default values (will be updated when subscription is created)
        TenantQuota.objects.create(
            academy=academy,
            storage_bytes_limit=0,
            max_students=0,
            max_coaches=0,
            max_admins=0,
            max_classes=0,
        )
        
        # Create TenantUsage with default values
        TenantUsage.objects.create(
            academy=academy,
            storage_used_bytes=0,
            students_count=0,
            coaches_count=0,
            admins_count=0,
            classes_count=0,
        )
        
        return academy

    @staticmethod
    def provision_tenant_schema(academy):
        if connection.vendor != 'postgresql':
            return None

        schema_name = academy.schema_name or build_schema_name(academy.id)
        if not is_valid_schema_name(schema_name):
            raise ValueError(f"Invalid schema name: {schema_name}")

        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT 1 FROM information_schema.schemata WHERE schema_name = %s",
                [schema_name],
            )
            schema_exists = cursor.fetchone() is not None
            cursor.execute(
                f'CREATE SCHEMA IF NOT EXISTS {connection.ops.quote_name(schema_name)}'
            )

        if academy.schema_name != schema_name:
            Academy.objects.filter(pk=academy.pk).update(schema_name=schema_name)

        try:
            call_command(
                'tenant_migrate',
                schema=schema_name,
                database='default',
                interactive=False,
                verbosity=0,
            )
            call_command(
                'tenant_sync_sequences',
                schema=schema_name,
                database='default',
                interactive=False,
                verbosity=0,
            )
        except Exception:
            if not schema_exists:
                with connection.cursor() as cursor:
                    cursor.execute(
                        f'DROP SCHEMA IF EXISTS {connection.ops.quote_name(schema_name)} CASCADE'
                    )
            raise

        return schema_name
    
    @staticmethod
    @transaction.atomic
    def update_academy_plan(academy, plan_id, start_at=None, overrides_json=None):
        """
        Update academy's subscription plan.
        
        Marks old subscription as not current and creates new subscription.
        Updates TenantQuota with new effective limits.
        
        Args:
            academy: Academy instance
            plan_id: Plan ID to assign
            start_at: Optional start date (defaults to now)
            overrides_json: Optional quota overrides
            
        Returns:
            New Subscription instance
        """
        from saas_platform.subscriptions.models import Plan
        
        plan = Plan.objects.get(id=plan_id, is_active=True)
        
        # Mark old subscription as not current
        old_subscription = Subscription.objects.filter(
            academy=academy,
            is_current=True
        ).first()
        
        if old_subscription:
            old_subscription.is_current = False
            old_subscription.end_at = start_at or timezone.now()
            old_subscription.save()
        
        # Create new subscription
        start_date = start_at or timezone.now()
        trial_ends_at = None
        if plan.trial_days > 0:
            from datetime import timedelta
            trial_ends_at = start_date + timedelta(days=plan.trial_days)
        
        new_subscription = Subscription.objects.create(
            academy=academy,
            plan=plan,
            status=SubscriptionStatus.ACTIVE if not plan.trial_days else SubscriptionStatus.TRIAL,
            is_current=True,
            start_at=start_date,
            trial_ends_at=trial_ends_at,
            overrides_json=overrides_json or {},
        )
        
        # Update TenantQuota with new effective limits
        QuotaService.update_tenant_quota(academy)
        
        return new_subscription
    
    @staticmethod
    @transaction.atomic
    def update_academy_quota(academy, overrides_json):
        """
        Update quota overrides for academy.
        
        Updates current subscription's overrides_json and recalculates TenantQuota.
        
        Args:
            academy: Academy instance
            overrides_json: Dictionary of quota overrides (partial update)
            
        Returns:
            Updated Subscription instance
        """
        subscription = Subscription.objects.filter(
            academy=academy,
            is_current=True
        ).first()
        
        if not subscription:
            raise ValueError("No active subscription found for academy.")
        
        # Merge existing overrides with new ones
        current_overrides = subscription.overrides_json.copy()
        current_overrides.update(overrides_json)
        
        subscription.overrides_json = current_overrides
        subscription.save()
        
        # Recalculate TenantQuota
        QuotaService.update_tenant_quota(academy)
        
        return subscription

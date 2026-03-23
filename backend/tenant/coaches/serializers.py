from datetime import datetime, time, timedelta

from django.utils import timezone
from rest_framework import serializers
from tenant.billing.models import Receipt
from tenant.coaches.models import (
    Coach,
    CoachPayScheme,
    CoachPayment,
    StaffInvoice,
    StaffPaySchedule,
    StaffPayScheduleRun,
    StaffReceipt,
)


class CoachSerializer(serializers.ModelSerializer):
    """Serializer for Coach model."""
    
    full_name = serializers.CharField(read_only=True)
    assigned_classes_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Coach
        fields = [
            'id',
            'academy',
            'user',
            'first_name',
            'last_name',
            'full_name',
            'email',
            'phone',
            'specialization',
            'certifications',
            'bio',
            'assigned_classes_count',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'academy', 'created_at', 'updated_at']
    
    def get_assigned_classes_count(self, obj):
        """Get count of classes assigned to this coach."""
        return obj.assigned_classes.filter(is_active=True).count()
    
    def validate_email(self, value):
        """Validate email uniqueness per academy."""
        academy = self.context.get('request').academy if self.context.get('request') else None
        if not academy:
            return value
        
        # Check if email already exists for this academy
        queryset = Coach.objects.filter(academy=academy, email=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        
        if queryset.exists():
            raise serializers.ValidationError(
                f"A coach with email {value} already exists in this academy."
            )
        
        return value
    
    def validate_user(self, value):
        """Validate user is not already linked to another coach."""
        if not value:
            return value
        
        queryset = Coach.objects.filter(user=value)
        if self.instance:
            queryset = queryset.exclude(pk=self.instance.pk)
        
        if queryset.exists():
            raise serializers.ValidationError(
                "This user is already linked to another coach."
            )
        
        return value
    
    def create(self, validated_data):
        """Auto-set academy from request."""
        request = self.context.get('request')
        if request and hasattr(request, 'academy') and request.academy:
            validated_data['academy'] = request.academy
        return super().create(validated_data)


class CoachListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for Coach list views."""
    
    full_name = serializers.CharField(read_only=True)
    assigned_classes_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Coach
        fields = [
            'id',
            'full_name',
            'email',
            'phone',
            'specialization',
            'assigned_classes_count',
            'is_active',
        ]
    
    def get_assigned_classes_count(self, obj):
        """Get count of classes assigned to this coach."""
        return obj.assigned_classes.filter(is_active=True).count()


class CoachPaySchemeSerializer(serializers.ModelSerializer):
    """Serializer for CoachPayScheme model."""

    coach_name = serializers.CharField(source='coach.full_name', read_only=True)

    class Meta:
        model = CoachPayScheme
        fields = [
            'id',
            'coach',
            'coach_name',
            'academy',
            'period_type',
            'amount',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'academy', 'created_at', 'updated_at']

    def validate_coach(self, value):
        """Ensure coach belongs to request academy."""
        request = self.context.get('request')
        if request and hasattr(request, 'academy') and request.academy:
            if value.academy_id != request.academy.id:
                raise serializers.ValidationError(
                    'Coach must belong to the current academy.'
                )
        return value

    def validate_amount(self, value):
        """Ensure amount is non-negative."""
        if value is not None and value < 0:
            raise serializers.ValidationError('Amount must be zero or greater.')
        return value

    def create(self, validated_data):
        """Auto-set academy from request."""
        request = self.context.get('request')
        if not request or not getattr(request, 'academy', None):
            raise serializers.ValidationError(
                {'academy': 'Academy context is required. Please ensure you are in an academy context.'}
            )
        validated_data['academy'] = request.academy
        return super().create(validated_data)


class CoachPaymentSerializer(serializers.ModelSerializer):
    """Serializer for CoachPayment model."""

    coach_name = serializers.CharField(source='coach.full_name', read_only=True)

    class Meta:
        model = CoachPayment
        fields = [
            'id',
            'coach',
            'coach_name',
            'academy',
            'period_type',
            'period_start',
            'amount',
            'payment_date',
            'payment_method',
            'staff_invoice',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'academy', 'created_at', 'updated_at']
        extra_kwargs = {'payment_method': {'default': Receipt.PaymentMethod.OTHER}}

    def validate_coach(self, value):
        """Ensure coach belongs to request academy."""
        request = self.context.get('request')
        if request and hasattr(request, 'academy') and request.academy:
            if value.academy_id != request.academy.id:
                raise serializers.ValidationError(
                    'Coach must belong to the current academy.'
                )
        return value

    def validate_amount(self, value):
        """Ensure amount is positive."""
        if value is not None and value <= 0:
            raise serializers.ValidationError('Amount must be greater than zero.')
        return value

    def validate_staff_invoice(self, value):
        """Ensure staff_invoice belongs to request academy and matches coach."""
        request = self.context.get('request')
        if not value:
            return value
        if request and hasattr(request, 'academy') and request.academy and value.academy_id != request.academy.id:
            raise serializers.ValidationError('Staff invoice must belong to the current academy.')
        coach = self.initial_data.get('coach') or (self.instance and self.instance.coach_id)
        if coach and value.coach_id != coach:
            raise serializers.ValidationError('Staff invoice must be for the selected coach.')
        return value

    def validate(self, attrs):
        """Ensure staff_invoice coach matches coach in attrs."""
        staff_invoice = attrs.get('staff_invoice')
        coach = attrs.get('coach')
        if staff_invoice and coach and staff_invoice.coach_id != coach.id:
            raise serializers.ValidationError({'staff_invoice': 'Staff invoice must be for the selected coach.'})
        return attrs


class StaffInvoiceSerializer(serializers.ModelSerializer):
    """Serializer for StaffInvoice model."""

    coach_name = serializers.CharField(source='coach.full_name', read_only=True)

    def _get_academy_currency(self):
        request = self.context.get('request')
        academy = getattr(request, 'academy', None) if request else None
        if not academy:
            return None
        currency = getattr(academy, 'currency', None)
        if not currency:
            return None
        return str(currency).strip().upper()

    class Meta:
        model = StaffInvoice
        fields = [
            'id',
            'academy',
            'coach',
            'coach_name',
            'invoice_number',
            'amount',
            'currency',
            'period_description',
            'period_type',
            'period_start',
            'status',
            'issued_date',
            'due_date',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'invoice_number', 'created_at', 'updated_at']

    def validate_coach(self, value):
        """Ensure coach belongs to request academy."""
        request = self.context.get('request')
        if request and hasattr(request, 'academy') and request.academy and value.academy_id != request.academy.id:
            raise serializers.ValidationError('Coach must belong to the current academy.')
        return value

    def validate(self, attrs):
        academy_currency = self._get_academy_currency()
        if academy_currency:
            # If client provided currency, reject mismatches. Always store academy currency.
            if 'currency' in attrs and attrs['currency'] is not None:
                provided_currency = str(attrs['currency']).strip().upper()
                if provided_currency != academy_currency:
                    raise serializers.ValidationError({
                        'currency': 'Currency must match the academy currency.'
                    })
            attrs['currency'] = academy_currency
        return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)
        academy_currency = self._get_academy_currency()
        if not academy_currency:
            academy = getattr(instance, 'academy', None)
            academy_currency = getattr(academy, 'currency', None) if academy else None
            if academy_currency:
                academy_currency = str(academy_currency).strip().upper()
        if academy_currency:
            data['currency'] = academy_currency
        return data


class StaffReceiptSerializer(serializers.ModelSerializer):
    """Serializer for StaffReceipt (list/detail; receipt_number read-only)."""

    coach_name = serializers.CharField(source='coach.full_name', read_only=True)
    staff_invoice_detail = serializers.SerializerMethodField()

    class Meta:
        model = StaffReceipt
        fields = [
            'id',
            'academy',
            'coach',
            'coach_name',
            'staff_invoice',
            'staff_invoice_detail',
            'coach_payment',
            'receipt_number',
            'amount',
            'payment_method',
            'payment_date',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'academy', 'receipt_number', 'created_at', 'updated_at']

    def get_staff_invoice_detail(self, obj):
        if not obj.staff_invoice_id:
            return None
        inv = obj.staff_invoice
        return {'id': inv.id, 'invoice_number': inv.invoice_number, 'coach_name': inv.coach.full_name}


class StaffPayScheduleSerializer(serializers.ModelSerializer):
    """Serializer for StaffPaySchedule with computed next_run_at."""

    next_run_at = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = StaffPaySchedule
        fields = [
            'id',
            'academy',
            'coach',
            'billing_type',
            'amount',
            'sessions_per_cycle',
            'class_scope',
            'billing_day',
            'billing_day_of_week',
            'cycle_start_date',
            'is_active',
            'last_run_at',
            'next_run_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'academy', 'last_run_at', 'created_at', 'updated_at', 'next_run_at']

    def get_next_run_at(self, obj):
        today = timezone.localdate()
        if obj.billing_type == StaffPaySchedule.BillingType.SESSION:
            return None
        if obj.billing_type == StaffPaySchedule.BillingType.MONTHLY and obj.billing_day:
            if today.day <= obj.billing_day:
                next_date = today.replace(day=obj.billing_day)
            else:
                first_next_month = (today.replace(day=1) + timedelta(days=32)).replace(day=1)
                next_date = first_next_month.replace(day=obj.billing_day)
            return timezone.make_aware(datetime.combine(next_date, time.min))
        if obj.billing_type == StaffPaySchedule.BillingType.WEEKLY and obj.billing_day_of_week is not None:
            days_ahead = (obj.billing_day_of_week - today.weekday()) % 7
            next_date = today + timedelta(days=days_ahead)
            return timezone.make_aware(datetime.combine(next_date, time.min))
        return None

    def validate_coach(self, value):
        request = self.context.get('request')
        if request and getattr(request, 'academy', None) and value.academy_id != request.academy.id:
            raise serializers.ValidationError('Coach must belong to the current academy.')
        return value

    def validate(self, attrs):
        instance = getattr(self, 'instance', None)
        billing_type = attrs.get('billing_type', instance.billing_type if instance else None)
        sessions_per_cycle = attrs.get('sessions_per_cycle', instance.sessions_per_cycle if instance else None)
        class_scope = attrs.get('class_scope', instance.class_scope if instance else None)
        billing_day = attrs.get('billing_day', instance.billing_day if instance else None)
        billing_day_of_week = attrs.get(
            'billing_day_of_week',
            instance.billing_day_of_week if instance else None,
        )

        if billing_type == StaffPaySchedule.BillingType.SESSION:
            if not sessions_per_cycle:
                raise serializers.ValidationError(
                    {'sessions_per_cycle': 'sessions_per_cycle must be set for SESSION schedules.'}
                )
            if billing_day is not None or billing_day_of_week is not None:
                raise serializers.ValidationError(
                    'billing_day and billing_day_of_week must be null for SESSION schedules.'
                )
        elif billing_type == StaffPaySchedule.BillingType.MONTHLY:
            if billing_day is None:
                raise serializers.ValidationError({'billing_day': 'billing_day must be set for MONTHLY schedules.'})
            if sessions_per_cycle is not None or class_scope is not None or billing_day_of_week is not None:
                raise serializers.ValidationError(
                    'sessions_per_cycle, class_scope, and billing_day_of_week must be null for MONTHLY schedules.'
                )
        elif billing_type == StaffPaySchedule.BillingType.WEEKLY:
            if billing_day_of_week is None:
                raise serializers.ValidationError(
                    {'billing_day_of_week': 'billing_day_of_week must be set for WEEKLY schedules.'}
                )
            if billing_day_of_week < 0 or billing_day_of_week > 6:
                raise serializers.ValidationError({'billing_day_of_week': 'billing_day_of_week must be between 0 and 6.'})
            if sessions_per_cycle is not None or class_scope is not None or billing_day is not None:
                raise serializers.ValidationError(
                    'sessions_per_cycle, class_scope, and billing_day must be null for WEEKLY schedules.'
                )
        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        if request and getattr(request, 'academy', None):
            validated_data['academy'] = request.academy
        return super().create(validated_data)


class StaffPayScheduleRunSerializer(serializers.ModelSerializer):
    """Read-only serializer for schedule run history."""

    class Meta:
        model = StaffPayScheduleRun
        fields = ['id', 'schedule', 'run_at', 'invoices_created', 'status', 'triggered_by', 'error_detail']
        read_only_fields = fields


class PendingCoachSerializer(serializers.ModelSerializer):
    class Meta:
        model = Coach
        fields = ['id', 'full_name']
        read_only_fields = fields


class PendingScheduleSerializer(serializers.ModelSerializer):
    next_run_at = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = StaffPaySchedule
        fields = ['id', 'billing_type', 'next_run_at']
        read_only_fields = fields

    def get_next_run_at(self, obj):
        return StaffPayScheduleSerializer(context=self.context).get_next_run_at(obj)


class PendingStaffInvoiceSerializer(serializers.ModelSerializer):
    coach = PendingCoachSerializer(read_only=True)
    schedule = PendingScheduleSerializer(read_only=True)

    class Meta:
        model = StaffInvoice
        fields = [
            'id',
            'academy',
            'coach',
            'schedule',
            'invoice_number',
            'amount',
            'currency',
            'period_description',
            'period_type',
            'period_start',
            'status',
            'issued_date',
            'due_date',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = fields

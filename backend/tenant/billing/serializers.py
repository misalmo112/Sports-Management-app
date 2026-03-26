"""
Serializers for billing models.
"""
from rest_framework import serializers
from decimal import Decimal
from datetime import datetime, time, timedelta

from django.utils import timezone
from django.core.exceptions import ObjectDoesNotExist

from tenant.billing.models import (
    BillingType,
    InvoiceCreationTiming,
    DiscountType,
    Invoice,
    InvoiceItem,
    InvoiceSchedule,
    InvoiceScheduleRun,
    Item,
    Receipt,
    StudentScheduleOverride,
)
from tenant.students.models import Parent, Student
from tenant.onboarding.serializers import SportListSerializer, LocationListSerializer
from tenant.notifications.models import NotificationLog


def resolve_invoice_display_currency(invoice):
    """
    Currency code for displaying amounts: schedule billing item when present,
    otherwise the academy's configured currency (tenant master).
    """
    schedule_id = getattr(invoice, "schedule_id", None)
    if schedule_id:
        schedule = getattr(invoice, "schedule", None)
        if schedule and getattr(schedule, "billing_item_id", None) and schedule.billing_item:
            c = getattr(schedule.billing_item, "currency", None)
            if c:
                return str(c).strip().upper()
    academy = getattr(invoice, "academy", None)
    if academy and getattr(academy, "currency", None):
        return str(academy.currency).strip().upper()
    return None


def whatsapp_enabled_for_academy(academy) -> bool:
    """
    WhatsApp feature flag guard.
    Returns False when academy config is missing or explicitly disabled.
    """
    try:
        config = academy.whatsapp_config
    except ObjectDoesNotExist:
        return False
    return bool(getattr(config, "is_enabled", False))


def latest_notification_status(*, academy, doc_type: str, object_id: int, channel: str):
    """
    Returns latest NotificationLog.status for the given channel, or None.
    """
    return (
        NotificationLog.objects.filter(
            academy=academy,
            doc_type=doc_type,
            object_id=object_id,
            channel=channel,
        )
        .order_by("-sent_at")
        .values_list("status", flat=True)
        .first()
    )


class ItemSerializer(serializers.ModelSerializer):
    """Full item details serializer."""

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
        model = Item
        fields = [
            'id', 'academy', 'name', 'description', 'price', 'currency',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'academy', 'created_at', 'updated_at']

    def validate(self, attrs):
        academy_currency = self._get_academy_currency()
        if not academy_currency:
            return attrs

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


class ItemListSerializer(serializers.ModelSerializer):
    """List view serializer for items."""

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
        model = Item
        fields = ['id', 'name', 'price', 'currency', 'is_active']
        read_only_fields = ['id']

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


class InvoiceItemSerializer(serializers.ModelSerializer):
    """Full invoice item details serializer."""
    
    item_detail = ItemListSerializer(source='item', read_only=True)
    student_name = serializers.SerializerMethodField()
    
    class Meta:
        model = InvoiceItem
        fields = [
            'id', 'invoice', 'item', 'item_detail', 'student', 'student_name',
            'description', 'quantity', 'unit_price', 'line_total',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'line_total', 'created_at', 'updated_at']
    
    def get_student_name(self, obj):
        """Get student full name."""
        if obj.student:
            return f"{obj.student.first_name} {obj.student.last_name}"
        return None


class CreateInvoiceItemSerializer(serializers.Serializer):
    """Serializer for adding item to invoice."""
    
    item_id = serializers.IntegerField(required=False, allow_null=True)
    student_id = serializers.IntegerField(required=False, allow_null=True)
    description = serializers.CharField(max_length=500)
    quantity = serializers.IntegerField(min_value=1, default=1)
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=0)


class ReceiptSerializer(serializers.ModelSerializer):
    """Full receipt details serializer."""
    
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)
    invoice_total = serializers.DecimalField(
        source='invoice.total',
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    sport_detail = serializers.SerializerMethodField()
    location_detail = serializers.SerializerMethodField()
    notification_summary = serializers.SerializerMethodField()
    
    class Meta:
        model = Receipt
        fields = [
            'id', 'academy', 'invoice', 'invoice_number', 'invoice_total',
            'receipt_number', 'amount', 'payment_method', 'payment_date',
            'sport', 'sport_detail', 'location', 'location_detail',
            'notes', 'created_at', 'updated_at', 'notification_summary'
        ]
        read_only_fields = ['id', 'academy', 'receipt_number', 'created_at', 'updated_at']
    
    def validate_sport(self, value):
        """Validate sport belongs to the same academy."""
        if value and 'request' in self.context and hasattr(self.context['request'], 'academy') and self.context['request'].academy:
            if value.academy_id != self.context['request'].academy.id:
                raise serializers.ValidationError(
                    'Sport must belong to the same academy.'
                )
        return value
    
    def validate_location(self, value):
        """Validate location belongs to the same academy."""
        if value and 'request' in self.context and hasattr(self.context['request'], 'academy') and self.context['request'].academy:
            if value.academy_id != self.context['request'].academy.id:
                raise serializers.ValidationError(
                    'Location must belong to the same academy.'
                )
        return value
    
    def get_sport_detail(self, obj):
        """Get sport detail safely."""
        if obj.sport:
            return SportListSerializer(obj.sport).data
        return None
    
    def get_location_detail(self, obj):
        """Get location detail safely."""
        if obj.location:
            return LocationListSerializer(obj.location).data
        return None

    def get_notification_summary(self, obj: Receipt):
        email_status = latest_notification_status(
            academy=obj.academy,
            doc_type=NotificationLog.DocType.RECEIPT,
            object_id=obj.id,
            channel=NotificationLog.Channel.EMAIL,
        )
        whatsapp_status = latest_notification_status(
            academy=obj.academy,
            doc_type=NotificationLog.DocType.RECEIPT,
            object_id=obj.id,
            channel=NotificationLog.Channel.WHATSAPP,
        )
        if not whatsapp_enabled_for_academy(obj.academy):
            whatsapp_status = None
        return {"email": email_status, "whatsapp": whatsapp_status}


class ReceiptListSerializer(serializers.ModelSerializer):
    """List view serializer for receipts."""
    
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)
    sport_name = serializers.SerializerMethodField()
    location_name = serializers.SerializerMethodField()
    parent_name = serializers.SerializerMethodField()
    student_names = serializers.SerializerMethodField()
    
    class Meta:
        model = Receipt
        fields = [
            'id', 'invoice', 'invoice_number', 'receipt_number', 'amount',
            'payment_method', 'payment_date', 'sport', 'sport_name',
            'location', 'location_name', 'parent_name', 'student_names'
        ]
        read_only_fields = ['id', 'invoice', 'receipt_number']
    
    def get_parent_name(self, obj):
        """Get parent full name from invoice."""
        if obj.invoice and obj.invoice.parent:
            return obj.invoice.parent.full_name
        return None
    
    def get_student_names(self, obj):
        """Get comma-separated student names from invoice items."""
        if not obj.invoice:
            return None
        names = []
        seen = set()
        # InvoiceItem -> Invoice uses related_name='items'
        for item in obj.invoice.items.filter(student__isnull=False).select_related('student'):
            if item.student_id and item.student_id not in seen:
                seen.add(item.student_id)
                names.append(f"{item.student.first_name} {item.student.last_name}".strip())
        return ", ".join(names) if names else None
    
    def get_sport_name(self, obj):
        """Get sport name safely."""
        return obj.sport.name if obj.sport else None
    
    def get_location_name(self, obj):
        """Get location name safely."""
        return obj.location.name if obj.location else None


class CreateReceiptSerializer(serializers.Serializer):
    """Serializer for creating receipt."""
    
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'))
    payment_method = serializers.ChoiceField(choices=Receipt.PaymentMethod.choices)
    payment_date = serializers.DateField(required=False)
    sport = serializers.IntegerField(required=False, allow_null=True)
    location = serializers.IntegerField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)


class InvoiceSerializer(serializers.ModelSerializer):
    """Full invoice details serializer."""
    
    items = InvoiceItemSerializer(many=True, read_only=True)
    receipts = ReceiptListSerializer(many=True, read_only=True)
    parent_name = serializers.CharField(source='parent.full_name', read_only=True)
    parent_email = serializers.EmailField(source='parent.email', read_only=True)
    sport_detail = serializers.SerializerMethodField()
    location_detail = serializers.SerializerMethodField()
    currency = serializers.SerializerMethodField()
    paid_amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    remaining_balance = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        read_only=True
    )
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'academy', 'parent', 'parent_name', 'parent_email',
            'invoice_number', 'status', 'subtotal', 'discount_type',
            'discount_value', 'discount_amount', 'tax_amount', 'total',
            'due_date', 'issued_date', 'parent_invoice', 'sport', 'sport_detail',
            'location', 'location_detail', 'notes',
            'currency', 'paid_amount', 'remaining_balance', 'items', 'receipts',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'academy', 'invoice_number', 'subtotal', 'discount_amount',
            'total', 'paid_amount', 'remaining_balance', 'created_at', 'updated_at'
        ]
    
    def validate_sport(self, value):
        """Validate sport belongs to the same academy."""
        if value and 'request' in self.context and hasattr(self.context['request'], 'academy') and self.context['request'].academy:
            if value.academy_id != self.context['request'].academy.id:
                raise serializers.ValidationError(
                    'Sport must belong to the same academy.'
                )
        return value
    
    def validate_location(self, value):
        """Validate location belongs to the same academy."""
        if value and 'request' in self.context and hasattr(self.context['request'], 'academy') and self.context['request'].academy:
            if value.academy_id != self.context['request'].academy.id:
                raise serializers.ValidationError(
                    'Location must belong to the same academy.'
                )
        return value
    
    def get_sport_detail(self, obj):
        """Get sport detail safely."""
        if obj.sport:
            return SportListSerializer(obj.sport).data
        return None
    
    def get_location_detail(self, obj):
        """Get location detail safely."""
        if obj.location:
            return LocationListSerializer(obj.location).data
        return None

    def get_currency(self, obj):
        return resolve_invoice_display_currency(obj)
    
    def get_paid_amount(self, obj):
        """Get paid amount."""
        return obj.get_paid_amount()
    
    def get_remaining_balance(self, obj):
        """Get remaining balance."""
        return obj.get_remaining_balance()


class InvoiceListSerializer(serializers.ModelSerializer):
    """List view serializer for invoices."""
    
    parent_name = serializers.CharField(source='parent.full_name', read_only=True)
    sport_name = serializers.SerializerMethodField()
    location_name = serializers.SerializerMethodField()
    currency = serializers.SerializerMethodField()
    paid_amount = serializers.SerializerMethodField()
    remaining_balance = serializers.SerializerMethodField()
    notification_summary = serializers.SerializerMethodField()
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'parent', 'parent_name', 'status',
            'currency', 'total', 'paid_amount', 'remaining_balance', 'due_date',
            'sport', 'sport_name', 'location', 'location_name',
            'created_at', 'notification_summary'
        ]
        read_only_fields = ['id', 'invoice_number', 'paid_amount', 'remaining_balance']
    
    def get_sport_name(self, obj):
        """Get sport name safely."""
        return obj.sport.name if obj.sport else None
    
    def get_location_name(self, obj):
        """Get location name safely."""
        return obj.location.name if obj.location else None

    def get_currency(self, obj):
        return resolve_invoice_display_currency(obj)
    
    def get_paid_amount(self, obj):
        """Get paid amount."""
        return obj.get_paid_amount()
    
    def get_remaining_balance(self, obj):
        """Get remaining balance."""
        return obj.get_remaining_balance()

    def get_notification_summary(self, obj: Invoice):
        """
        Uses list queryset annotations to avoid N+1 queries.
        Returns latest per-channel status:
        - email: "SENT" | "FAILED" | "SKIPPED" | null
        - whatsapp: same or null (hidden when academy WhatsApp config is disabled/missing)
        """
        email_status = getattr(obj, "notification_email_status", None)
        whatsapp_status = getattr(obj, "notification_whatsapp_status", None)

        if not whatsapp_enabled_for_academy(obj.academy):
            whatsapp_status = None

        return {
            "email": email_status,
            "whatsapp": whatsapp_status,
        }


class CreateInvoiceSerializer(serializers.Serializer):
    """Serializer for creating invoice."""
    
    parent_id = serializers.IntegerField()
    items = CreateInvoiceItemSerializer(many=True, min_length=1)
    discount_type = serializers.ChoiceField(
        choices=Invoice.DiscountType.choices,
        required=False,
        allow_null=True
    )
    discount_value = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True,
        min_value=0
    )
    due_date = serializers.DateField(required=False, allow_null=True)
    issued_date = serializers.DateField(required=False, allow_null=True)
    sport = serializers.IntegerField(required=False, allow_null=True)
    location = serializers.IntegerField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    parent_invoice_id = serializers.IntegerField(required=False, allow_null=True)
    
    def validate(self, attrs):
        """Validate invoice data."""
        discount_type = attrs.get('discount_type')
        discount_value = attrs.get('discount_value')
        
        if discount_type and not discount_value:
            raise serializers.ValidationError({
                'discount_value': 'Discount value is required when discount type is set.'
            })
        if discount_type == Invoice.DiscountType.PERCENTAGE and discount_value:
            if discount_value > Decimal('100.00'):
                raise serializers.ValidationError({
                    'discount_value': 'Percentage discount cannot exceed 100%.'
                })
        
        return attrs


class ApplyDiscountSerializer(serializers.Serializer):
    """Serializer for applying discount to invoice."""
    
    discount_type = serializers.ChoiceField(choices=Invoice.DiscountType.choices)
    discount_value = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        min_value=0
    )
    
    def validate(self, attrs):
        """Validate discount."""
        discount_type = attrs.get('discount_type')
        discount_value = attrs.get('discount_value')
        
        if discount_type == Invoice.DiscountType.PERCENTAGE:
            if discount_value > Decimal('100.00'):
                raise serializers.ValidationError({
                    'discount_value': 'Percentage discount cannot exceed 100%.'
                })
        
        return attrs


class InvoiceDetailSerializer(serializers.ModelSerializer):
    """Detailed invoice view with items and receipts."""
    
    items = InvoiceItemSerializer(many=True, read_only=True)
    receipts = ReceiptSerializer(many=True, read_only=True)
    parent_name = serializers.CharField(source='parent.full_name', read_only=True)
    parent_email = serializers.EmailField(source='parent.email', read_only=True)
    sport_detail = serializers.SerializerMethodField()
    location_detail = serializers.SerializerMethodField()
    currency = serializers.SerializerMethodField()
    paid_amount = serializers.SerializerMethodField()
    remaining_balance = serializers.SerializerMethodField()
    notification_summary = serializers.SerializerMethodField()
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'academy', 'parent', 'parent_name', 'parent_email',
            'invoice_number', 'status', 'subtotal', 'discount_type',
            'discount_value', 'discount_amount', 'tax_amount', 'total',
            'due_date', 'issued_date', 'parent_invoice', 'sport', 'sport_detail',
            'location', 'location_detail', 'notes',
            'currency', 'paid_amount', 'remaining_balance', 'items', 'receipts',
            'created_at', 'updated_at', 'notification_summary'
        ]
        read_only_fields = [
            'id', 'academy', 'invoice_number', 'subtotal', 'discount_amount',
            'total', 'paid_amount', 'remaining_balance', 'created_at', 'updated_at'
        ]
    
    def get_sport_detail(self, obj):
        """Get sport detail safely."""
        if obj.sport:
            return SportListSerializer(obj.sport).data
        return None
    
    def get_location_detail(self, obj):
        """Get location detail safely."""
        if obj.location:
            return LocationListSerializer(obj.location).data
        return None

    def get_currency(self, obj):
        return resolve_invoice_display_currency(obj)
    
    def get_paid_amount(self, obj):
        """Get paid amount."""
        return obj.get_paid_amount()
    
    def get_remaining_balance(self, obj):
        """Get remaining balance."""
        return obj.get_remaining_balance()

    def get_notification_summary(self, obj: Invoice):
        # For detail endpoints we can query (single invoice) and keep logic centralized.
        email_status = latest_notification_status(
            academy=obj.academy,
            doc_type=NotificationLog.DocType.INVOICE,
            object_id=obj.id,
            channel=NotificationLog.Channel.EMAIL,
        )
        whatsapp_status = latest_notification_status(
            academy=obj.academy,
            doc_type=NotificationLog.DocType.INVOICE,
            object_id=obj.id,
            channel=NotificationLog.Channel.WHATSAPP,
        )
        if not whatsapp_enabled_for_academy(obj.academy):
            whatsapp_status = None
        return {"email": email_status, "whatsapp": whatsapp_status}


class ParentSummarySerializer(serializers.ModelSerializer):
    """Small nested parent payload for pending approval invoices."""

    full_name = serializers.SerializerMethodField()

    class Meta:
        model = Parent
        fields = ["id", "first_name", "last_name", "full_name", "email"]

    def get_full_name(self, obj) -> str:
        return obj.full_name


class InvoiceScheduleSerializer(serializers.ModelSerializer):
    """Serializer for managing invoice schedules."""

    next_run_at = serializers.SerializerMethodField()

    class Meta:
        model = InvoiceSchedule
        fields = [
            "id",
            "academy",
            "class_obj",
            "billing_item",
            "billing_type",
            "sessions_per_cycle",
            "bill_absent_sessions",
            "billing_day",
            "invoice_creation_timing",
            "cycle_start_date",
            "is_active",
            "last_run_at",
            "next_run_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "academy", "last_run_at", "next_run_at", "created_at", "updated_at"]

    def get_next_run_at(self, obj: InvoiceSchedule):
        # SESSION_BASED schedules aren't tied to a specific calendar day. For UX purposes we
        # return a deterministic "soonest possible" datetime: last_run_at + 1 day, or now.
        if obj.billing_type == BillingType.SESSION_BASED:
            return obj.last_run_at + timedelta(days=1) if obj.last_run_at else timezone.now()

        # MONTHLY schedules: START_OF_PERIOD runs on billing_day, ON_COMPLETION runs on month end.
        if obj.billing_type == BillingType.MONTHLY:
            import calendar

            today = timezone.now().date()
            start = max(obj.cycle_start_date, today)

            effective_timing = obj.invoice_creation_timing
            if effective_timing == InvoiceCreationTiming.AUTO:
                effective_timing = (
                    InvoiceCreationTiming.START_OF_PERIOD
                    if obj.billing_type == BillingType.MONTHLY
                    else InvoiceCreationTiming.ON_COMPLETION
                )

            if effective_timing == InvoiceCreationTiming.ON_COMPLETION:
                year = start.year
                month = start.month
                last_day = calendar.monthrange(year, month)[1]
                candidate = datetime(year, month, last_day, tzinfo=None).date()

                # If we're already past month end (shouldn't happen), advance to next month.
                if candidate < start:
                    month += 1
                    if month > 12:
                        year += 1
                        month = 1
                    last_day = calendar.monthrange(year, month)[1]
                    candidate = datetime(year, month, last_day, tzinfo=None).date()

                return timezone.make_aware(datetime.combine(candidate, time.min))

            # Default/START_OF_PERIOD path.
            if obj.billing_day is None:
                return None
            candidate = datetime(start.year, start.month, obj.billing_day, tzinfo=None).date()

            # If cycle_start_date is in the current month and billing_day is already passed, advance.
            if candidate < start:
                year = candidate.year
                month = candidate.month + 1
                if month > 12:
                    year += 1
                    month = 1
                candidate = datetime(year, month, obj.billing_day, tzinfo=None).date()

            return timezone.make_aware(datetime.combine(candidate, time.min))

    def validate(self, attrs):
        billing_type = attrs.get("billing_type", getattr(self.instance, "billing_type", None))

        if billing_type == BillingType.SESSION_BASED:
            sessions_per_cycle = attrs.get(
                "sessions_per_cycle",
                getattr(self.instance, "sessions_per_cycle", None),
            )
            if not sessions_per_cycle:
                raise serializers.ValidationError(
                    "sessions_per_cycle must be set for SESSION_BASED schedules."
                )

        if billing_type == BillingType.MONTHLY:
            billing_day = attrs.get("billing_day", getattr(self.instance, "billing_day", None))
            if not billing_day:
                raise serializers.ValidationError("billing_day must be set for MONTHLY schedules.")

        return attrs

    def create(self, validated_data):
        request = self.context.get("request")
        academy = getattr(request, "academy", None) if request else None
        if not academy:
            raise serializers.ValidationError("academy is required.")
        validated_data["academy"] = academy
        return super().create(validated_data)


class StudentScheduleOverrideSerializer(serializers.ModelSerializer):
    """Serializer for per-student invoice schedule discount overrides."""

    class Meta:
        model = StudentScheduleOverride
        fields = [
            "id",
            "schedule",
            "student",
            "discount_type",
            "discount_value",
            "reason",
            "is_active",
            "valid_from",
            "valid_until",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "schedule", "created_at", "updated_at"]

    def validate(self, attrs):
        discount_type = attrs.get("discount_type", getattr(self.instance, "discount_type", None))
        discount_value = attrs.get(
            "discount_value",
            getattr(self.instance, "discount_value", None),
        )

        if discount_type == DiscountType.PERCENTAGE and discount_value is not None:
            if discount_value > Decimal("100.00"):
                raise serializers.ValidationError(
                    "discount_value cannot exceed 100 for PERCENTAGE overrides."
                )

        return attrs


class InvoiceScheduleRunSerializer(serializers.ModelSerializer):
    """Read-only audit serializer for invoice schedule executions."""

    class Meta:
        model = InvoiceScheduleRun
        fields = [
            "id",
            "schedule",
            "run_at",
            "invoices_created",
            "status",
            "triggered_by",
            "error_detail",
        ]
        read_only_fields = fields


class PendingApprovalInvoiceItemSerializer(serializers.ModelSerializer):
    """Pending approvals payload includes student name on each invoice item."""

    student_name = serializers.SerializerMethodField()

    class Meta:
        model = InvoiceItem
        fields = [
            "id",
            "description",
            "quantity",
            "unit_price",
            "line_total",
            "student",
            "student_name",
        ]
        read_only_fields = ["id", "line_total"]

    def get_student_name(self, obj: InvoiceItem):
        if obj.student_id is None or obj.student is None:
            return None
        return obj.student.full_name


class PendingApprovalInvoiceSerializer(serializers.ModelSerializer):
    """
    Serializer for auto-generated DRAFT invoices awaiting manual approval.
    """

    parent = ParentSummarySerializer(read_only=True)

    # Schedule/class info
    schedule_id = serializers.IntegerField(source="schedule.id", read_only=True)
    class_id = serializers.IntegerField(source="schedule.class_obj.id", read_only=True)
    class_name = serializers.CharField(source="schedule.class_obj.name", read_only=True)
    billing_type = serializers.CharField(source="schedule.billing_type", read_only=True)

    sport_detail = serializers.SerializerMethodField()
    location_detail = serializers.SerializerMethodField()

    items = PendingApprovalInvoiceItemSerializer(many=True, read_only=True)

    # Phase IS.5 Pending Approvals table fields
    total = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    currency = serializers.SerializerMethodField()
    # Comma-separated distinct student full names in deterministic order
    students = serializers.SerializerMethodField()
    # Date-only "generated" marker (invoice created by schedule)
    generated_date = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            "id",
            "invoice_number",
            "status",
            "due_date",
            "issued_date",
            "parent",
            "schedule_id",
            "class_id",
            "class_name",
            "billing_type",
            "sport_detail",
            "location_detail",
            "items",
            "total",
            "currency",
            "students",
            "generated_date",
            "created_at",
        ]

    def get_sport_detail(self, obj):
        if obj.schedule and obj.schedule.class_obj and obj.schedule.class_obj.sport:
            return SportListSerializer(obj.schedule.class_obj.sport).data
        return None

    def get_location_detail(self, obj):
        if obj.schedule and obj.schedule.class_obj and obj.schedule.class_obj.location:
            return LocationListSerializer(obj.schedule.class_obj.location).data
        return None

    def get_currency(self, obj: Invoice):
        return resolve_invoice_display_currency(obj)

    def get_students(self, obj: Invoice):
        # Deterministic order: sort by student_id ascending, de-dupe by student_id.
        names_by_student_id: dict[int, str] = {}
        # If the view prefetches items__student, DRF will avoid extra queries here.
        for item in obj.items.select_related("student").all():
            if not item.student_id or not item.student:
                continue
            if item.student_id in names_by_student_id:
                continue
            names_by_student_id[item.student_id] = item.student.full_name

        if not names_by_student_id:
            return None

        return ", ".join(names_by_student_id[sid] for sid in sorted(names_by_student_id.keys()))

    def get_generated_date(self, obj: Invoice):
        if not getattr(obj, "created_at", None):
            return None
        return obj.created_at.date().isoformat()

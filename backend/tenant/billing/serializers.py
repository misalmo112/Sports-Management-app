"""
Serializers for billing models.
"""
from rest_framework import serializers
from decimal import Decimal
from tenant.billing.models import Item, Invoice, InvoiceItem, Receipt
from tenant.students.models import Parent, Student
from tenant.onboarding.serializers import SportListSerializer, LocationListSerializer


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
    
    class Meta:
        model = Receipt
        fields = [
            'id', 'academy', 'invoice', 'invoice_number', 'invoice_total',
            'receipt_number', 'amount', 'payment_method', 'payment_date',
            'sport', 'sport_detail', 'location', 'location_detail',
            'notes', 'created_at', 'updated_at'
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
            'paid_amount', 'remaining_balance', 'items', 'receipts',
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
    paid_amount = serializers.SerializerMethodField()
    remaining_balance = serializers.SerializerMethodField()
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'parent', 'parent_name', 'status',
            'total', 'paid_amount', 'remaining_balance', 'due_date',
            'sport', 'sport_name', 'location', 'location_name',
            'created_at'
        ]
        read_only_fields = ['id', 'invoice_number', 'paid_amount', 'remaining_balance']
    
    def get_sport_name(self, obj):
        """Get sport name safely."""
        return obj.sport.name if obj.sport else None
    
    def get_location_name(self, obj):
        """Get location name safely."""
        return obj.location.name if obj.location else None
    
    def get_paid_amount(self, obj):
        """Get paid amount."""
        return obj.get_paid_amount()
    
    def get_remaining_balance(self, obj):
        """Get remaining balance."""
        return obj.get_remaining_balance()


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
    paid_amount = serializers.SerializerMethodField()
    remaining_balance = serializers.SerializerMethodField()
    
    class Meta:
        model = Invoice
        fields = [
            'id', 'academy', 'parent', 'parent_name', 'parent_email',
            'invoice_number', 'status', 'subtotal', 'discount_type',
            'discount_value', 'discount_amount', 'tax_amount', 'total',
            'due_date', 'issued_date', 'parent_invoice', 'sport', 'sport_detail',
            'location', 'location_detail', 'notes',
            'paid_amount', 'remaining_balance', 'items', 'receipts',
            'created_at', 'updated_at'
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
    
    def get_paid_amount(self, obj):
        """Get paid amount."""
        return obj.get_paid_amount()
    
    def get_remaining_balance(self, obj):
        """Get remaining balance."""
        return obj.get_remaining_balance()

"""Serializers for facilities APIs."""
from decimal import Decimal

from rest_framework import serializers

from tenant.billing.models import Receipt
from tenant.facilities.models import (
    Bill,
    BillLineItem,
    FacilityRentConfig,
    InventoryItem,
    RentInvoice,
    RentPayment,
    RentReceipt,
)
from tenant.onboarding.serializers import LocationListSerializer


class FacilityRentConfigSerializer(serializers.ModelSerializer):
    location_detail = LocationListSerializer(source='location', read_only=True)

    class Meta:
        model = FacilityRentConfig
        fields = [
            'id',
            'academy',
            'location',
            'location_detail',
            'amount',
            'currency',
            'period_type',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'academy', 'created_at', 'updated_at']

    def validate(self, attrs):
        request = self.context.get('request')
        academy = getattr(request, 'academy', None) if request else None
        if not academy:
            raise serializers.ValidationError({'academy': 'Academy context is required.'})

        location = attrs.get('location') or getattr(self.instance, 'location', None)
        period_type = attrs.get('period_type') or getattr(self.instance, 'period_type', None)

        if location and location.academy_id != academy.id:
            raise serializers.ValidationError({'location': 'Location must belong to the same academy.'})

        if location and period_type:
            queryset = FacilityRentConfig.objects.filter(
                academy=academy,
                location=location,
                period_type=period_type,
            )
            if self.instance:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                raise serializers.ValidationError(
                    {'period_type': 'A rent configuration already exists for this location and period.'}
                )

        return attrs


class RentPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = RentPayment
        fields = [
            'id',
            'rent_invoice',
            'amount',
            'payment_date',
            'payment_method',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class RentInvoiceSerializer(serializers.ModelSerializer):
    location_detail = LocationListSerializer(source='location', read_only=True)
    payments = RentPaymentSerializer(many=True, read_only=True)
    paid_amount = serializers.SerializerMethodField()
    remaining_amount = serializers.SerializerMethodField()

    class Meta:
        model = RentInvoice
        fields = [
            'id',
            'academy',
            'location',
            'location_detail',
            'invoice_number',
            'amount',
            'currency',
            'period_description',
            'issued_date',
            'due_date',
            'status',
            'notes',
            'paid_amount',
            'remaining_amount',
            'payments',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'academy',
            'invoice_number',
            'paid_amount',
            'remaining_amount',
            'payments',
            'created_at',
            'updated_at',
        ]

    def get_paid_amount(self, obj):
        return obj.get_paid_amount()

    def get_remaining_amount(self, obj):
        return obj.get_remaining_amount()

    def validate_location(self, value):
        request = self.context.get('request')
        if request and hasattr(request, 'academy') and request.academy and value.academy_id != request.academy.id:
            raise serializers.ValidationError('Location must belong to the same academy.')
        return value


class RentReceiptSerializer(serializers.ModelSerializer):
    """Serializer for RentReceipt (list/detail; receipt_number read-only)."""
    rent_invoice_detail = serializers.SerializerMethodField()

    class Meta:
        model = RentReceipt
        fields = [
            'id',
            'academy',
            'rent_invoice',
            'rent_invoice_detail',
            'rent_payment',
            'receipt_number',
            'amount',
            'payment_method',
            'payment_date',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'academy', 'receipt_number', 'created_at', 'updated_at']

    def get_rent_invoice_detail(self, obj):
        if not obj.rent_invoice_id:
            return None
        inv = obj.rent_invoice
        return {'id': inv.id, 'invoice_number': inv.invoice_number, 'location_name': inv.location.name}


class AddRentPaymentSerializer(serializers.Serializer):
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'))
    payment_method = serializers.ChoiceField(choices=Receipt.PaymentMethod.choices)
    payment_date = serializers.DateField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True)


class MarkPaidRentInvoiceSerializer(serializers.Serializer):
    payment_method = serializers.ChoiceField(
        choices=Receipt.PaymentMethod.choices,
        required=False,
        default=Receipt.PaymentMethod.OTHER,
    )
    payment_date = serializers.DateField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True)


class InventoryItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InventoryItem
        fields = [
            'id',
            'academy',
            'name',
            'description',
            'quantity',
            'unit',
            'reorder_level',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'academy', 'created_at', 'updated_at']


class BillLineItemSerializer(serializers.ModelSerializer):
    inventory_item_detail = InventoryItemSerializer(source='inventory_item', read_only=True)

    class Meta:
        model = BillLineItem
        fields = [
            'id',
            'bill',
            'description',
            'quantity',
            'unit_price',
            'line_total',
            'inventory_item',
            'inventory_item_detail',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'line_total', 'created_at', 'updated_at']

    def validate(self, attrs):
        bill = attrs.get('bill') or getattr(self.instance, 'bill', None)
        inventory_item = attrs.get('inventory_item')
        request = self.context.get('request')

        if bill and request and hasattr(request, 'academy') and request.academy and bill.academy_id != request.academy.id:
            raise serializers.ValidationError({'bill': 'Bill must belong to the same academy.'})

        if inventory_item and bill and inventory_item.academy_id != bill.academy_id:
            raise serializers.ValidationError({'inventory_item': 'Inventory item must belong to the same academy as the bill.'})

        return attrs


class BillSerializer(serializers.ModelSerializer):
    line_items = BillLineItemSerializer(many=True, read_only=True)

    class Meta:
        model = Bill
        fields = [
            'id',
            'academy',
            'vendor_name',
            'bill_number',
            'total_amount',
            'currency',
            'bill_date',
            'due_date',
            'status',
            'notes',
            'line_items',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'academy', 'total_amount', 'line_items', 'created_at', 'updated_at']


class MarkBillPaidSerializer(serializers.Serializer):
    pass


class InventoryAdjustSerializer(serializers.Serializer):
    delta = serializers.IntegerField()

    def validate_delta(self, value):
        if value == 0:
            raise serializers.ValidationError('Delta must not be zero.')
        return value

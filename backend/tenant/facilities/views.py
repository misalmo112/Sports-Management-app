"""Views for facilities APIs."""
from django.db import IntegrityError
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from shared.permissions.tenant import IsTenantAdmin
from shared.utils.queryset_filtering import filter_by_academy
from tenant.facilities.models import (
    Bill,
    BillLineItem,
    FacilityRentConfig,
    InventoryItem,
    RentInvoice,
    RentReceipt,
)
from tenant.facilities.serializers import (
    AddRentPaymentSerializer,
    BillLineItemSerializer,
    BillSerializer,
    FacilityRentConfigSerializer,
    InventoryAdjustSerializer,
    InventoryItemSerializer,
    MarkBillPaidSerializer,
    MarkPaidRentInvoiceSerializer,
    RentInvoiceSerializer,
    RentPaymentSerializer,
    RentReceiptSerializer,
)
from tenant.facilities.services import FacilitiesService


class FacilityRentConfigViewSet(viewsets.ModelViewSet):
    required_tenant_module = 'facilities'
    queryset = FacilityRentConfig.objects.all()
    serializer_class = FacilityRentConfigSerializer
    permission_classes = [IsTenantAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['location', 'period_type', 'is_active']
    search_fields = ['location__name']
    ordering_fields = ['location__name', 'amount', 'created_at']
    ordering = ['location__name']

    def get_queryset(self):
        return filter_by_academy(
            super().get_queryset(),
            self.request.academy,
            self.request.user,
            self.request,
        )

    def perform_create(self, serializer):
        if not getattr(self.request, 'academy', None):
            raise ValidationError({'academy': 'Academy context is required.'})
        try:
            serializer.save(academy=self.request.academy)
        except IntegrityError:
            raise ValidationError(
                {'period_type': 'A rent configuration already exists for this location and period.'}
            )


class RentInvoiceViewSet(viewsets.ModelViewSet):
    required_tenant_module = 'facilities'
    queryset = RentInvoice.objects.all()
    serializer_class = RentInvoiceSerializer
    permission_classes = [IsTenantAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'location', 'issued_date', 'due_date']
    search_fields = ['invoice_number', 'period_description', 'notes']
    ordering_fields = ['issued_date', 'due_date', 'amount', 'created_at']
    ordering = ['-issued_date', '-created_at']

    def get_queryset(self):
        queryset = filter_by_academy(
            super().get_queryset(),
            self.request.academy,
            self.request.user,
            self.request,
        )
        return queryset.select_related('location').prefetch_related('payments')

    def perform_create(self, serializer):
        serializer.save(
            academy=self.request.academy,
            invoice_number=FacilitiesService.generate_rent_invoice_number(self.request.academy),
        )

    @action(detail=True, methods=['post'], permission_classes=[IsTenantAdmin])
    def add_payment(self, request, pk=None):
        rent_invoice = self.get_object()
        serializer = AddRentPaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        payment = FacilitiesService.add_rent_payment(
            rent_invoice=rent_invoice,
            amount=serializer.validated_data['amount'],
            payment_method=serializer.validated_data['payment_method'],
            payment_date=serializer.validated_data.get('payment_date'),
            notes=serializer.validated_data.get('notes', ''),
        )
        return Response(RentPaymentSerializer(payment).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], permission_classes=[IsTenantAdmin])
    def mark_paid(self, request, pk=None):
        rent_invoice = self.get_object()
        serializer = MarkPaidRentInvoiceSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        payment = FacilitiesService.mark_rent_invoice_paid(
            rent_invoice=rent_invoice,
            payment_method=serializer.validated_data.get('payment_method'),
            payment_date=serializer.validated_data.get('payment_date'),
            notes=serializer.validated_data.get('notes', ''),
        )

        response = RentInvoiceSerializer(rent_invoice).data
        if payment is not None:
            response['payment'] = RentPaymentSerializer(payment).data
        return Response(response)


class RentReceiptViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only ViewSet for RentReceipt (list/retrieve)."""

    required_tenant_module = 'facilities'
    queryset = RentReceipt.objects.all()
    serializer_class = RentReceiptSerializer
    permission_classes = [IsTenantAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['rent_invoice', 'payment_date', 'payment_method']
    search_fields = ['receipt_number', 'rent_invoice__invoice_number']
    ordering_fields = ['receipt_number', 'payment_date', 'amount', 'created_at']
    ordering = ['-payment_date', '-created_at']

    def get_queryset(self):
        return filter_by_academy(
            super().get_queryset(),
            self.request.academy,
            self.request.user,
            self.request,
        ).select_related('rent_invoice', 'rent_invoice__location', 'rent_payment')


class BillViewSet(viewsets.ModelViewSet):
    required_tenant_module = 'facilities'
    queryset = Bill.objects.all()
    serializer_class = BillSerializer
    permission_classes = [IsTenantAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'bill_date', 'due_date']
    search_fields = ['vendor_name', 'bill_number', 'notes']
    ordering_fields = ['bill_date', 'due_date', 'total_amount', 'created_at']
    ordering = ['-bill_date', '-created_at']

    def get_queryset(self):
        queryset = filter_by_academy(
            super().get_queryset(),
            self.request.academy,
            self.request.user,
            self.request,
        )
        return queryset.prefetch_related('line_items')

    def perform_create(self, serializer):
        serializer.save(academy=self.request.academy)

    @action(detail=True, methods=['post'], permission_classes=[IsTenantAdmin])
    def mark_paid(self, request, pk=None):
        bill = self.get_object()
        serializer = MarkBillPaidSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        bill = FacilitiesService.mark_bill_paid(bill)
        return Response(BillSerializer(bill).data)


class BillLineItemViewSet(viewsets.ModelViewSet):
    required_tenant_module = 'facilities'
    queryset = BillLineItem.objects.all()
    serializer_class = BillLineItemSerializer
    permission_classes = [IsTenantAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['bill', 'inventory_item']
    search_fields = ['description']
    ordering_fields = ['created_at', 'quantity', 'unit_price', 'line_total']
    ordering = ['created_at']

    def get_queryset(self):
        queryset = super().get_queryset().select_related('bill', 'inventory_item')
        if getattr(self.request.user, 'role', None) == 'SUPERADMIN':
            return queryset
        if not getattr(self.request, 'academy', None):
            return queryset.none()
        return queryset.filter(bill__academy=self.request.academy)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        line_item = FacilitiesService.create_bill_line_item(
            bill=serializer.validated_data['bill'],
            description=serializer.validated_data['description'],
            quantity=serializer.validated_data['quantity'],
            unit_price=serializer.validated_data['unit_price'],
            inventory_item=serializer.validated_data.get('inventory_item'),
        )
        response_serializer = self.get_serializer(line_item)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        line_item = FacilitiesService.update_bill_line_item(
            instance,
            **serializer.validated_data,
        )
        response_serializer = self.get_serializer(line_item)
        return Response(response_serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        FacilitiesService.delete_bill_line_item(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)


class InventoryItemViewSet(viewsets.ModelViewSet):
    required_tenant_module = 'facilities'
    queryset = InventoryItem.objects.all()
    serializer_class = InventoryItemSerializer
    permission_classes = [IsTenantAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['unit']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'quantity', 'created_at']
    ordering = ['name']

    def get_queryset(self):
        return filter_by_academy(
            super().get_queryset(),
            self.request.academy,
            self.request.user,
            self.request,
        )

    def perform_create(self, serializer):
        serializer.save(academy=self.request.academy)

    @action(detail=True, methods=['post'], permission_classes=[IsTenantAdmin])
    def adjust_quantity(self, request, pk=None):
        inventory_item = self.get_object()
        serializer = InventoryAdjustSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        inventory_item = FacilitiesService.adjust_inventory_quantity(
            inventory_item,
            serializer.validated_data['delta'],
        )
        return Response(InventoryItemSerializer(inventory_item).data)

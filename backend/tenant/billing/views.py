"""
Views for billing models.
"""
from rest_framework import viewsets, status, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django_filters.rest_framework import DjangoFilterBackend
from django.core.exceptions import ValidationError
from django.db import transaction
from tenant.billing.models import Item, Invoice, InvoiceItem, Receipt
from tenant.billing.serializers import (
    ItemSerializer,
    ItemListSerializer,
    InvoiceSerializer,
    InvoiceListSerializer,
    InvoiceDetailSerializer,
    CreateInvoiceSerializer,
    ApplyDiscountSerializer,
    InvoiceItemSerializer,
    ReceiptSerializer,
    ReceiptListSerializer,
    CreateReceiptSerializer,
)
from tenant.billing.services import InvoiceService
from tenant.students.models import Parent
from shared.permissions.tenant import (
    IsTenantAdmin, IsParent,
    IsTenantAdminOrParent
)
from shared.utils.queryset_filtering import filter_by_academy


class ItemViewSet(viewsets.ModelViewSet):
    """ViewSet for Item model."""

    required_tenant_module = 'finance-items'
    
    queryset = Item.objects.all()
    serializer_class = ItemSerializer
    permission_classes = [IsTenantAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['is_active']
    search_fields = ['name', 'description']
    ordering_fields = ['name', 'price', 'created_at']
    ordering = ['name']
    
    def get_queryset(self):
        """Filter by academy."""
        queryset = super().get_queryset()
        return filter_by_academy(
            queryset,
            self.request.academy,
            self.request.user,
            self.request
        )
    
    def get_serializer_class(self):
        """Use list serializer for list action."""
        if self.action == 'list':
            return ItemListSerializer
        return ItemSerializer
    
    def perform_create(self, serializer):
        """Set academy on create."""
        serializer.save(academy=self.request.academy)
    
    def perform_destroy(self, instance):
        """Soft delete - deactivate the item."""
        instance.is_active = False
        instance.save(update_fields=['is_active', 'updated_at'])


class InvoiceViewSet(viewsets.ModelViewSet):
    """ViewSet for Invoice model."""

    required_tenant_module = 'invoices'
    
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    permission_classes = [IsTenantAdminOrParent]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'parent', 'due_date']
    search_fields = ['invoice_number', 'parent__first_name', 'parent__last_name', 'parent__email']
    ordering_fields = ['invoice_number', 'created_at', 'due_date', 'total']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter by academy and parent visibility."""
        queryset = super().get_queryset()
        
        # Superadmin can see all
        if hasattr(self.request.user, 'role') and self.request.user.role == 'SUPERADMIN':
            return queryset
        
        # Parents can only see their own invoices
        if hasattr(self.request.user, 'role') and self.request.user.role == 'PARENT':
            if hasattr(self.request.user, 'email'):
                queryset = queryset.filter(parent__email=self.request.user.email)
            else:
                queryset = queryset.none()
        else:
            # Admin/Owner: filter by academy
            queryset = filter_by_academy(
                queryset,
                self.request.academy,
                self.request.user,
                self.request
            )
        
        return queryset
    
    def get_permissions(self):
        """Return appropriate permissions based on action."""
        # Admin-only actions (even though parents can read invoices)
        if self.action in ['create', 'apply_discount', 'add_payment', 'mark_paid']:
            return [IsTenantAdmin()]

        # Parents can read their own invoices; admins can read all
        return [IsTenantAdminOrParent()]
    
    def get_serializer_class(self):
        """Use appropriate serializer based on action."""
        if self.action == 'list':
            return InvoiceListSerializer
        elif self.action == 'retrieve':
            return InvoiceDetailSerializer
        elif self.action == 'create':
            return CreateInvoiceSerializer
        return InvoiceSerializer
    
    def get_serializer_context(self):
        """Add request to serializer context."""
        context = super().get_serializer_context()
        return context
    
    def create(self, request, *args, **kwargs):
        """Create invoice with items."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            # Get parent
            parent_id = serializer.validated_data['parent_id']
            parent = Parent.objects.get(id=parent_id, academy=request.academy)
            
            # Get items data
            items_data = serializer.validated_data['items']
            
            # Get optional fields
            discount_type = serializer.validated_data.get('discount_type')
            discount_value = serializer.validated_data.get('discount_value')
            due_date = serializer.validated_data.get('due_date')
            issued_date = serializer.validated_data.get('issued_date')
            notes = serializer.validated_data.get('notes', '')
            parent_invoice_id = serializer.validated_data.get('parent_invoice_id')
            sport_id = serializer.validated_data.get('sport')
            location_id = serializer.validated_data.get('location')
            
            # Get parent invoice if provided
            parent_invoice = None
            if parent_invoice_id:
                parent_invoice = Invoice.objects.get(
                    id=parent_invoice_id,
                    academy=request.academy
                )
            
            # Get sport and location if provided
            sport = None
            if sport_id:
                from tenant.onboarding.models import Sport
                sport = Sport.objects.get(id=sport_id, academy=request.academy)
            
            location = None
            if location_id:
                from tenant.onboarding.models import Location
                location = Location.objects.get(id=location_id, academy=request.academy)
            
            # Create invoice using service
            invoice = InvoiceService.create_invoice(
                parent=parent,
                items_data=items_data,
                discount_type=discount_type,
                discount_value=discount_value,
                due_date=due_date,
                issued_date=issued_date,
                notes=notes,
                parent_invoice=parent_invoice,
                sport=sport,
                location=location
            )
            
            # Return created invoice
            response_serializer = InvoiceDetailSerializer(invoice)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        
        except Parent.DoesNotExist:
            return Response(
                {'detail': 'Parent not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Invoice.DoesNotExist:
            return Response(
                {'detail': 'Parent invoice not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        except ValidationError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'], permission_classes=[IsTenantAdmin])
    def apply_discount(self, request, pk=None):
        """Apply discount to invoice."""
        invoice = self.get_object()
        serializer = ApplyDiscountSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            invoice = InvoiceService.apply_discount(
                invoice,
                serializer.validated_data['discount_type'],
                serializer.validated_data['discount_value']
            )
            response_serializer = InvoiceDetailSerializer(invoice)
            return Response(response_serializer.data)
        except ValidationError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'], permission_classes=[IsTenantAdmin])
    def add_payment(self, request, pk=None):
        """Add payment (create receipt) for invoice."""
        invoice = self.get_object()
        serializer = CreateReceiptSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            receipt = InvoiceService.add_payment(
                invoice,
                serializer.validated_data['amount'],
                serializer.validated_data['payment_method'],
                serializer.validated_data.get('payment_date'),
                serializer.validated_data.get('notes', '')
            )
            response_serializer = ReceiptSerializer(receipt)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        except ValidationError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=True, methods=['post'], permission_classes=[IsTenantAdmin])
    def mark_paid(self, request, pk=None):
        """Mark invoice as fully paid."""
        invoice = self.get_object()
        
        # For mark_paid, amount is not required (it uses remaining balance)
        # Create a custom serializer that makes amount optional
        class MarkPaidSerializer(serializers.Serializer):
            payment_method = serializers.ChoiceField(
                choices=Receipt.PaymentMethod.choices,
                required=False
            )
            payment_date = serializers.DateField(required=False)
            notes = serializers.CharField(required=False, allow_blank=True)
        
        serializer = MarkPaidSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            receipt = InvoiceService.mark_as_paid(
                invoice,
                serializer.validated_data.get('payment_method'),
                serializer.validated_data.get('payment_date'),
                serializer.validated_data.get('notes', '')
            )
            
            response_serializer = InvoiceDetailSerializer(invoice)
            response_data = response_serializer.data
            
            if receipt:
                receipt_data = ReceiptSerializer(receipt).data
                response_data['receipt'] = receipt_data
            
            return Response(response_data)
        except ValidationError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def get_object(self):
        """Get object with permission check."""
        obj = super().get_object()
        
        # Parents can only access their own invoices
        if hasattr(self.request.user, 'role') and self.request.user.role == 'PARENT':
            if hasattr(self.request.user, 'email'):
                if obj.parent.email != self.request.user.email:
                    from rest_framework.exceptions import PermissionDenied
                    raise PermissionDenied('You do not have permission to access this invoice.')
        
        return obj


class ReceiptViewSet(viewsets.ModelViewSet):
    """ViewSet for Receipt model."""

    required_tenant_module = 'receipts'
    
    queryset = Receipt.objects.all()
    serializer_class = ReceiptSerializer
    permission_classes = [IsTenantAdminOrParent]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['invoice', 'payment_method', 'payment_date']
    search_fields = [
        'receipt_number', 'invoice__invoice_number',
        'invoice__parent__first_name', 'invoice__parent__last_name', 'invoice__parent__email',
        'invoice__items__student__first_name', 'invoice__items__student__last_name',
    ]
    ordering_fields = ['receipt_number', 'payment_date', 'amount', 'created_at']
    ordering = ['-payment_date', '-created_at']
    
    def get_queryset(self):
        """Filter by academy; optimize list and avoid duplicates when searching."""
        queryset = super().get_queryset()
        
        # Superadmin can see all
        if hasattr(self.request.user, 'role') and self.request.user.role == 'SUPERADMIN':
            pass
        # Parents can only see receipts for their own invoices
        elif hasattr(self.request.user, 'role') and self.request.user.role == 'PARENT':
            if hasattr(self.request.user, 'email'):
                queryset = queryset.filter(invoice__parent__email=self.request.user.email)
            else:
                queryset = queryset.none()
        else:
            # Admin/Owner: filter by academy
            queryset = filter_by_academy(
                queryset,
                self.request.academy,
                self.request.user,
                self.request
            )
        
        if self.action == 'list':
            queryset = queryset.select_related(
                'invoice', 'invoice__parent', 'sport', 'location'
            ).prefetch_related('invoice__items__student')
            # Avoid duplicate rows when search matches via invoice_items (multiple students)
            queryset = queryset.distinct()
        
        return queryset
    
    def get_serializer_class(self):
        """Use appropriate serializer based on action."""
        if self.action == 'list':
            return ReceiptListSerializer
        elif self.action == 'create':
            return CreateReceiptSerializer
        return ReceiptSerializer
    
    def get_serializer_context(self):
        """Add request to serializer context."""
        context = super().get_serializer_context()
        return context
    
    def create(self, request, *args, **kwargs):
        """Create receipt for invoice."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        invoice_id = request.data.get('invoice')
        if not invoice_id:
            return Response(
                {'detail': 'Invoice ID is required.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            invoice = Invoice.objects.get(id=invoice_id, academy=request.academy)
            
            # Get sport and location if provided
            sport_id = serializer.validated_data.get('sport')
            location_id = serializer.validated_data.get('location')
            
            sport = None
            if sport_id:
                from tenant.onboarding.models import Sport
                sport = Sport.objects.get(id=sport_id, academy=request.academy)
            
            location = None
            if location_id:
                from tenant.onboarding.models import Location
                location = Location.objects.get(id=location_id, academy=request.academy)
            
            receipt = InvoiceService.add_payment(
                invoice,
                serializer.validated_data['amount'],
                serializer.validated_data['payment_method'],
                serializer.validated_data.get('payment_date'),
                serializer.validated_data.get('notes', ''),
                sport=sport,
                location=location
            )
            
            response_serializer = ReceiptSerializer(receipt)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        
        except Invoice.DoesNotExist:
            return Response(
                {'detail': 'Invoice not found.'},
                status=status.HTTP_404_NOT_FOUND
            )
        except ValidationError as e:
            return Response(
                {'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def get_object(self):
        """Get object with permission check."""
        return super().get_object()

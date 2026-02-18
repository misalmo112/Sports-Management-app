from rest_framework import serializers
from tenant.billing.models import Receipt
from tenant.coaches.models import Coach, CoachPayScheme, CoachPayment, StaffInvoice, StaffReceipt


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

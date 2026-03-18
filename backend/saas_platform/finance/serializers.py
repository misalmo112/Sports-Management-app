from rest_framework import serializers

from saas_platform.finance.models import OperationalExpense


class OperationalExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = OperationalExpense
        fields = [
            'id', 'category', 'vendor_name', 'description', 'amount',
            'currency', 'billing_cycle', 'due_date', 'paid_date',
            'is_paid', 'notes', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than 0.")
        return value

    def validate(self, attrs):
        is_paid = attrs.get('is_paid', getattr(self.instance, 'is_paid', False))
        paid_date = attrs.get('paid_date', getattr(self.instance, 'paid_date', None))

        if paid_date and not is_paid:
            raise serializers.ValidationError("paid_date requires is_paid=True")
        if is_paid and paid_date is None:
            raise serializers.ValidationError("paid_date is required when is_paid=True")

        return attrs


class ExpenseBreakdownItemSerializer(serializers.Serializer):
    category = serializers.CharField()
    total = serializers.DecimalField(max_digits=12, decimal_places=2)


class FinanceSummarySerializer(serializers.Serializer):
    year = serializers.IntegerField()
    month = serializers.IntegerField()
    mrr = serializers.DecimalField(max_digits=12, decimal_places=2)
    arr = serializers.DecimalField(max_digits=12, decimal_places=2)
    active_subscriptions = serializers.IntegerField()
    churn_count = serializers.IntegerField()
    revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    expenses = serializers.DecimalField(max_digits=12, decimal_places=2)
    pl = serializers.DecimalField(max_digits=12, decimal_places=2)
    expense_breakdown = ExpenseBreakdownItemSerializer(many=True)


class FinanceSummaryQuerySerializer(serializers.Serializer):
    year = serializers.IntegerField(required=False, min_value=1)
    month = serializers.IntegerField(required=False, min_value=1, max_value=12)

    def validate(self, attrs):
        has_year = 'year' in attrs
        has_month = 'month' in attrs

        if has_year != has_month:
            raise serializers.ValidationError("year and month must be provided together")

        return attrs


class FinanceTrendQuerySerializer(serializers.Serializer):
    months = serializers.IntegerField(required=False, default=12, min_value=1)

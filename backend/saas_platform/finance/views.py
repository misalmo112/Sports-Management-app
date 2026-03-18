import csv
import io

from django.http import HttpResponse
from django_filters.rest_framework import DjangoFilterBackend
from django_filters import rest_framework as filters
from django.utils import timezone
from rest_framework import status, viewsets
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.response import Response
from rest_framework.views import APIView

from saas_platform.finance.models import OperationalExpense
from saas_platform.finance.serializers import (
    FinanceSummarySerializer,
    FinanceTrendQuerySerializer,
    OperationalExpenseSerializer,
)
from saas_platform.finance.services import FinanceService
from shared.permissions.platform import IsPlatformAdmin


class OperationalExpenseFilterSet(filters.FilterSet):
    category = filters.CharFilter(field_name='category', lookup_expr='exact')
    billing_cycle = filters.CharFilter(field_name='billing_cycle', lookup_expr='exact')
    is_paid = filters.BooleanFilter(field_name='is_paid')
    paid_date_after = filters.DateFilter(field_name='paid_date', lookup_expr='gte')
    paid_date_before = filters.DateFilter(field_name='paid_date', lookup_expr='lte')

    class Meta:
        model = OperationalExpense
        fields = [
            'category',
            'billing_cycle',
            'is_paid',
            'paid_date_after',
            'paid_date_before',
        ]


class OperationalExpenseViewSet(viewsets.ModelViewSet):
    permission_classes = [IsPlatformAdmin]
    serializer_class = OperationalExpenseSerializer
    filterset_class = OperationalExpenseFilterSet
    filter_backends = [DjangoFilterBackend, OrderingFilter, SearchFilter]
    search_fields = ['vendor_name', 'description']
    ordering_fields = ['paid_date', 'due_date', 'amount', 'created_at']
    ordering = ['-created_at']
    queryset = OperationalExpense.objects.all()


class FinanceSummaryView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        year = request.query_params.get('year')
        month = request.query_params.get('month')

        if year and month:
            try:
                year = int(year)
                month = int(month)
                if not 1 <= month <= 12:
                    raise ValueError
            except ValueError:
                return Response(
                    {'detail': 'Invalid year or month.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            year = None
            month = None

        summary = FinanceService.get_summary(year, month)
        response_serializer = FinanceSummarySerializer(summary)
        return Response(response_serializer.data)


class FinanceTrendView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        query_serializer = FinanceTrendQuerySerializer(data=request.query_params)
        query_serializer.is_valid(raise_exception=True)

        trend = FinanceService.get_monthly_trend(**query_serializer.validated_data)
        response_serializer = FinanceSummarySerializer(trend, many=True)
        return Response(response_serializer.data)


class PaymentExportView(APIView):
    permission_classes = [IsPlatformAdmin]

    def get(self, request):
        year = request.query_params.get('year')
        month = request.query_params.get('month')

        if not year or not month:
            now = timezone.now()
            year = now.year
            month = now.month
        else:
            try:
                year = int(year)
                month = int(month)
                if not 1 <= month <= 12:
                    raise ValueError
            except (TypeError, ValueError):
                return Response(
                    {'detail': 'Invalid year or month.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        payments = FinanceService.get_payments_for_export(year, month)

        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(
            ['Date', 'Academy', 'Plan', 'Amount', 'Currency', 'Method', 'Invoice Ref']
        )

        for payment in payments:
            academy_name = payment.academy.name if payment.academy_id else ''
            writer.writerow(
                [
                    payment.payment_date.isoformat(),
                    academy_name,
                    payment.subscription.plan.name,
                    str(payment.amount),
                    payment.currency,
                    payment.payment_method,
                    payment.invoice_ref or '',
                ]
            )

        filename = f'payments_{year}_{str(month).zfill(2)}.csv'
        response = HttpResponse(buffer.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        return response

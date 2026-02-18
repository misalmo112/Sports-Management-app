"""
Serializers for Tenant Reports API.
"""
from rest_framework import serializers


class ReportSerializer(serializers.Serializer):
    """Serializer for report data."""
    type = serializers.CharField()
    date_from = serializers.DateField(required=False, allow_null=True)
    date_to = serializers.DateField(required=False, allow_null=True)
    summary = serializers.DictField()
    by_class = serializers.ListField(required=False, allow_null=True)
    by_student = serializers.ListField(required=False, allow_null=True)
    invoices_by_status = serializers.ListField(required=False, allow_null=True)
    rent_by_location = serializers.ListField(required=False, allow_null=True)
    bills_by_status = serializers.ListField(required=False, allow_null=True)
    inventory_summary = serializers.ListField(required=False, allow_null=True)


class AcademyFinancialsReportSerializer(serializers.Serializer):
    """Serializer for academy financials report payload."""

    type = serializers.CharField()
    date_from = serializers.DateField(required=False, allow_null=True)
    date_to = serializers.DateField(required=False, allow_null=True)
    summary = serializers.DictField()
    rent_by_location = serializers.ListField()
    bills_by_status = serializers.ListField()
    inventory_summary = serializers.ListField()


class FinanceOverviewReportSerializer(serializers.Serializer):
    """Serializer for finance overview report (student + rent + staff + bills + cash flow)."""

    type = serializers.CharField()
    date_from = serializers.DateField(required=False, allow_null=True)
    date_to = serializers.DateField(required=False, allow_null=True)
    net_cash_position = serializers.FloatField(required=False, allow_null=True)
    student = serializers.DictField()
    rent = serializers.DictField()
    staff = serializers.DictField()
    bills = serializers.DictField(required=False, allow_null=True)
    cash_flow = serializers.DictField(required=False, allow_null=True)

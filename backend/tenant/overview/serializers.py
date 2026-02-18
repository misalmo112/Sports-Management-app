"""
Serializers for Tenant Overview API.
"""
from rest_framework import serializers


class AttendanceSummarySerializer(serializers.Serializer):
    """Serializer for attendance summary."""
    present = serializers.IntegerField()
    absent = serializers.IntegerField()


class FinanceSummarySerializer(serializers.Serializer):
    """Serializer for finance summary."""
    unpaid_invoices = serializers.IntegerField()
    overdue_invoices = serializers.IntegerField()
    total_due = serializers.FloatField()


class AlertSerializer(serializers.Serializer):
    """Serializer for alerts."""
    type = serializers.CharField()
    message = serializers.CharField()
    severity = serializers.CharField()


class OverviewSerializer(serializers.Serializer):
    """Serializer for overview data."""
    role = serializers.CharField()
    today_classes = serializers.ListField()
    attendance_summary = AttendanceSummarySerializer()
    finance_summary = FinanceSummarySerializer()
    alerts = serializers.ListField(child=AlertSerializer())

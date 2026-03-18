"""
Serializers for Tenant Overview API.
"""
from rest_framework import serializers


class AttendanceSummarySerializer(serializers.Serializer):
    """Serializer for attendance summary."""
    present = serializers.IntegerField()
    absent = serializers.IntegerField()


class CountsSerializer(serializers.Serializer):
    """Serializer for academy headcount counts."""
    students = serializers.IntegerField()
    coaches = serializers.IntegerField()
    admins = serializers.IntegerField()
    classes = serializers.IntegerField()
    enrollments = serializers.IntegerField()


class UsageSerializer(serializers.Serializer):
    """Serializer for usage (optional)."""
    students_count = serializers.IntegerField()
    coaches_count = serializers.IntegerField()
    admins_count = serializers.IntegerField()
    classes_count = serializers.IntegerField()
    storage_used_bytes = serializers.IntegerField()
    storage_used_gb = serializers.FloatField()


class QuotaSerializer(serializers.Serializer):
    """Serializer for quota limits (optional)."""
    max_students = serializers.IntegerField()
    max_coaches = serializers.IntegerField()
    max_admins = serializers.IntegerField()
    max_classes = serializers.IntegerField()
    storage_bytes_limit = serializers.IntegerField()


class FinanceSummarySerializer(serializers.Serializer):
    """Serializer for finance summary."""
    unpaid_invoices = serializers.IntegerField()
    overdue_invoices = serializers.IntegerField()
    total_due = serializers.FloatField()
    collected_last_30_days = serializers.FloatField(required=False, default=0)


class AlertSerializer(serializers.Serializer):
    """Serializer for alerts."""
    type = serializers.CharField()
    message = serializers.CharField()
    severity = serializers.CharField()


class ActivitySerializer(serializers.Serializer):
    """Serializer for activity summary (optional)."""
    new_students_30d = serializers.IntegerField()
    new_enrollments_30d = serializers.IntegerField()


class OverviewSerializer(serializers.Serializer):
    """Serializer for overview data."""
    role = serializers.CharField()
    counts = CountsSerializer()
    today_classes = serializers.ListField()
    attendance_summary = AttendanceSummarySerializer()
    finance_summary = FinanceSummarySerializer()
    alerts = serializers.ListField(child=AlertSerializer())
    usage = UsageSerializer(required=False, allow_null=True)
    quota = QuotaSerializer(required=False, allow_null=True)
    activity = ActivitySerializer(required=False, allow_null=True)

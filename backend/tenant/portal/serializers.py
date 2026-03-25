from rest_framework import serializers

from tenant.billing.models import Invoice, InvoiceItem, Receipt
from tenant.billing.serializers import resolve_invoice_display_currency
from tenant.classes.models import Enrollment
from tenant.media.services import MediaService
from tenant.students.models import Student


class PortalPingResponseSerializer(serializers.Serializer):
    status = serializers.CharField()
    parent_id = serializers.IntegerField()


class PortalStudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = [
            "id",
            "academy",
            "parent",
            "is_active",
            "emirates_id",
            "created_at",
            "updated_at",
            "emergency_contact_name",
            "emergency_contact_phone",
            "emergency_contact_relationship",
            "medical_notes",
            "allergies",
        ]
        read_only_fields = [
            "id",
            "academy",
            "parent",
            "is_active",
            "emirates_id",
            "created_at",
            "updated_at",
        ]


class PortalScheduleSerializer(serializers.ModelSerializer):
    class_name = serializers.CharField(source="class_obj.name", read_only=True)
    coach_name = serializers.SerializerMethodField()
    location_name = serializers.CharField(source="class_obj.location.name", read_only=True)
    sport_name = serializers.CharField(source="class_obj.sport.name", read_only=True)
    days_of_week = serializers.SerializerMethodField()
    start_time = serializers.SerializerMethodField()
    end_time = serializers.SerializerMethodField()
    timezone = serializers.SerializerMethodField()
    start_date = serializers.DateField(source="class_obj.start_date", read_only=True)
    end_date = serializers.DateField(source="class_obj.end_date", read_only=True)

    class Meta:
        model = Enrollment
        fields = [
            "class_name",
            "coach_name",
            "location_name",
            "sport_name",
            "days_of_week",
            "start_time",
            "end_time",
            "timezone",
            "start_date",
            "end_date",
        ]

    def get_coach_name(self, obj):
        coach = getattr(obj.class_obj, "coach", None)
        if not coach:
            return None
        return coach.full_name

    def _get_schedule(self, obj):
        return obj.class_obj.schedule or {}

    def get_days_of_week(self, obj):
        days = self._get_schedule(obj).get("days_of_week", [])
        if not isinstance(days, list):
            return []

        day_names = {
            "monday": "Monday",
            "tuesday": "Tuesday",
            "wednesday": "Wednesday",
            "thursday": "Thursday",
            "friday": "Friday",
            "saturday": "Saturday",
            "sunday": "Sunday",
        }
        return [day_names.get(str(day).lower(), str(day).title()) for day in days]

    def get_start_time(self, obj):
        return self._get_schedule(obj).get("start_time")

    def get_end_time(self, obj):
        return self._get_schedule(obj).get("end_time")

    def get_timezone(self, obj):
        return self._get_schedule(obj).get("timezone")


class PortalInvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = ["id", "description", "quantity", "unit_price", "line_total"]


class PortalInvoiceSerializer(serializers.ModelSerializer):
    paid_amount = serializers.SerializerMethodField()
    remaining_balance = serializers.SerializerMethodField()
    currency = serializers.SerializerMethodField()

    class Meta:
        model = Invoice
        fields = [
            "id",
            "invoice_number",
            "status",
            "currency",
            "subtotal",
            "discount_amount",
            "tax_amount",
            "total",
            "paid_amount",
            "remaining_balance",
            "due_date",
            "issued_date",
            "created_at",
        ]

    def get_paid_amount(self, obj):
        return obj.get_paid_amount()

    def get_remaining_balance(self, obj):
        return obj.get_remaining_balance()

    def get_currency(self, obj):
        return resolve_invoice_display_currency(obj)


class PortalInvoiceDetailSerializer(PortalInvoiceSerializer):
    items = PortalInvoiceItemSerializer(many=True, read_only=True)

    class Meta(PortalInvoiceSerializer.Meta):
        fields = PortalInvoiceSerializer.Meta.fields + ["items"]


class PortalReceiptSerializer(serializers.ModelSerializer):
    class Meta:
        model = Receipt
        fields = [
            "id",
            "receipt_number",
            "amount",
            "payment_method",
            "payment_date",
            "notes",
            "created_at",
        ]


class PortalMediaSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    file_name = serializers.CharField(read_only=True)
    file_url = serializers.SerializerMethodField()
    description = serializers.CharField(read_only=True)
    capture_date = serializers.DateField(read_only=True, allow_null=True)
    class_name = serializers.CharField(source="class_obj.name", read_only=True)
    created_at = serializers.DateTimeField(read_only=True)

    def get_file_url(self, obj):
        # Generate a fresh URL from storage every response, no DB persistence.
        return MediaService.get_file_url(obj)

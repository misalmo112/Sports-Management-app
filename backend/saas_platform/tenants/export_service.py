"""
Academy data export: build a ZIP of all platform and tenant data for an academy.
Used before delete so platform admins can download a full backup.
"""
import io
import json
import zipfile
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from django.forms.models import model_to_dict


def _json_serial(obj):
    """Convert common non-JSON-serializable types for export."""
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, Decimal):
        return str(obj)
    if isinstance(obj, UUID):
        return str(obj)
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")


def _serialize_queryset(queryset, exclude_fields=None):
    """Serialize a queryset to a list of JSON-serializable dicts."""
    exclude_fields = exclude_fields or set()
    out = []
    for obj in queryset:
        d = model_to_dict(obj, exclude=exclude_fields)
        for key, value in d.items():
            if value is None:
                continue
            if isinstance(value, (datetime, date, Decimal, UUID)):
                d[key] = _json_serial(value)
            elif isinstance(value, dict):
                d[key] = json.loads(json.dumps(value, default=_json_serial))
        out.append(d)
    return out


def _serialize_one(obj, exclude_fields=None):
    """Serialize a single model instance to a JSON-serializable dict."""
    if obj is None:
        return None
    exclude_fields = exclude_fields or set()
    d = model_to_dict(obj, exclude=exclude_fields)
    for key, value in d.items():
        if value is None:
            continue
        if isinstance(value, (datetime, date, Decimal, UUID)):
            d[key] = _json_serial(value)
        elif isinstance(value, dict):
            d[key] = json.loads(json.dumps(value, default=_json_serial))
    return d


def build_academy_export_zip(academy):
    """
    Build a ZIP file containing all platform and tenant data for the given academy.
    Returns a BytesIO buffer.
    """
    from saas_platform.tenants.models import Academy as AcademyModel, OnboardingState
    from saas_platform.subscriptions.models import Subscription, PlatformPayment
    from saas_platform.quotas.models import TenantQuota, TenantUsage
    from saas_platform.audit.models import AuditLog, ErrorLog

    buffer = io.BytesIO()
    safe_slug = (academy.slug or str(academy.id))[:50].replace(" ", "-")

    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        # --- Platform: single academy ---
        academy_data = _serialize_one(academy)
        if academy_data:
            zf.writestr(
                "platform/academy.json",
                json.dumps(academy_data, indent=2, default=_json_serial),
            )

        # --- Platform: subscriptions ---
        subs = list(Subscription.objects.filter(academy=academy).order_by("id"))
        subs_data = _serialize_queryset(subs)
        zf.writestr(
            "platform/subscriptions.json",
            json.dumps(subs_data, indent=2, default=_json_serial),
        )

        # --- Platform: platform_payments ---
        payments = list(
            PlatformPayment.objects.filter(academy=academy).order_by("payment_date")
        )
        payments_data = _serialize_queryset(payments)
        zf.writestr(
            "platform/platform_payments.json",
            json.dumps(payments_data, indent=2, default=_json_serial),
        )

        # --- Platform: quota & usage ---
        try:
            quota = TenantQuota.objects.get(academy=academy)
            zf.writestr(
                "platform/tenant_quota.json",
                json.dumps(_serialize_one(quota), indent=2, default=_json_serial),
            )
        except TenantQuota.DoesNotExist:
            zf.writestr("platform/tenant_quota.json", "null")

        try:
            usage = TenantUsage.objects.get(academy=academy)
            zf.writestr(
                "platform/tenant_usage.json",
                json.dumps(_serialize_one(usage), indent=2, default=_json_serial),
            )
        except TenantUsage.DoesNotExist:
            zf.writestr("platform/tenant_usage.json", "null")

        # --- Platform: onboarding_state ---
        try:
            onboarding = OnboardingState.objects.get(academy=academy)
            zf.writestr(
                "platform/onboarding_state.json",
                json.dumps(
                    _serialize_one(onboarding, exclude_fields={"locked_by", "completed_by_user"}),
                    indent=2,
                    default=_json_serial,
                ),
            )
        except OnboardingState.DoesNotExist:
            zf.writestr("platform/onboarding_state.json", "null")

        # --- Platform: audit_logs & error_logs ---
        audit_logs = list(
            AuditLog.objects.filter(academy=academy).order_by("created_at")
        )
        zf.writestr(
            "platform/audit_logs.json",
            json.dumps(
                _serialize_queryset(audit_logs, exclude_fields={"user"}),
                indent=2,
                default=_json_serial,
            ),
        )
        error_logs = list(
            ErrorLog.objects.filter(academy=academy).order_by("created_at")
        )
        zf.writestr(
            "platform/error_logs.json",
            json.dumps(
                _serialize_queryset(error_logs, exclude_fields={"user"}),
                indent=2,
                default=_json_serial,
            ),
        )

        # --- Tenant data: all models with academy FK ---
        from tenant.users.models import User, AdminProfile, CoachProfile, ParentProfile
        from tenant.users.models import InviteToken

        users = list(User.objects.filter(academy=academy).order_by("id"))
        zf.writestr(
            "tenant/users.json",
            json.dumps(_serialize_queryset(users), indent=2, default=_json_serial),
        )
        for model, name in [
            (AdminProfile, "admin_profiles"),
            (CoachProfile, "coach_profiles"),
            (ParentProfile, "parent_profiles"),
            (InviteToken, "invite_tokens"),
        ]:
            qs = list(model.objects.filter(academy=academy).order_by("id"))
            zf.writestr(
                f"tenant/{name}.json",
                json.dumps(_serialize_queryset(qs), indent=2, default=_json_serial),
            )

        from tenant.students.models import Parent, Student

        for model, name in [(Parent, "parents"), (Student, "students")]:
            qs = list(model.objects.filter(academy=academy).order_by("id"))
            zf.writestr(
                f"tenant/{name}.json",
                json.dumps(_serialize_queryset(qs), indent=2, default=_json_serial),
            )

        from tenant.coaches.models import Coach, CoachPayScheme, CoachPayment
        from tenant.coaches.models import StaffInvoice, StaffReceipt

        for model, name in [
            (Coach, "coaches"),
            (CoachPayScheme, "coach_pay_schemes"),
            (CoachPayment, "coach_payments"),
            (StaffInvoice, "staff_invoices"),
            (StaffReceipt, "staff_receipts"),
        ]:
            qs = list(model.objects.filter(academy=academy).order_by("id"))
            zf.writestr(
                f"tenant/{name}.json",
                json.dumps(_serialize_queryset(qs), indent=2, default=_json_serial),
            )

        from tenant.classes.models import Class, Enrollment

        for model, name in [(Class, "classes"), (Enrollment, "enrollments")]:
            qs = list(model.objects.filter(academy=academy).order_by("id"))
            zf.writestr(
                f"tenant/{name}.json",
                json.dumps(_serialize_queryset(qs), indent=2, default=_json_serial),
            )

        from tenant.attendance.models import Attendance, CoachAttendance

        for model, name in [
            (Attendance, "attendance_records"),
            (CoachAttendance, "coach_attendance_records"),
        ]:
            qs = list(model.objects.filter(academy=academy).order_by("id"))
            zf.writestr(
                f"tenant/{name}.json",
                json.dumps(_serialize_queryset(qs), indent=2, default=_json_serial),
            )

        from tenant.billing.models import Item, Invoice, InvoiceItem, Receipt

        for model, name in [
            (Item, "billing_items"),
            (Invoice, "invoices"),
            (InvoiceItem, "invoice_items"),
            (Receipt, "receipts"),
        ]:
            qs = list(model.objects.filter(academy=academy).order_by("id"))
            zf.writestr(
                f"tenant/{name}.json",
                json.dumps(_serialize_queryset(qs), indent=2, default=_json_serial),
            )

        from tenant.media.models import MediaFile

        media = list(MediaFile.objects.filter(academy=academy).order_by("id"))
        zf.writestr(
            "tenant/media_files.json",
            json.dumps(_serialize_queryset(media), indent=2, default=_json_serial),
        )

        from tenant.communication.models import Feedback

        feedback = list(Feedback.objects.filter(academy=academy).order_by("id"))
        zf.writestr(
            "tenant/feedback.json",
            json.dumps(_serialize_queryset(feedback), indent=2, default=_json_serial),
        )

        from tenant.onboarding.models import (
            Location,
            Sport,
            AgeCategory,
            Term,
            PricingItem,
        )

        for model, name in [
            (Location, "locations"),
            (Sport, "sports"),
            (AgeCategory, "age_categories"),
            (Term, "terms"),
            (PricingItem, "pricing_items"),
        ]:
            qs = list(model.objects.filter(academy=academy).order_by("id"))
            zf.writestr(
                f"tenant/{name}.json",
                json.dumps(_serialize_queryset(qs), indent=2, default=_json_serial),
            )

        from tenant.facilities.models import (
            Bill,
            FacilityRentConfig,
            InventoryItem,
            RentInvoice,
            RentReceipt,
        )

        for model, name in [
            (Bill, "bills"),
            (FacilityRentConfig, "facility_rent_configs"),
            (InventoryItem, "inventory_items"),
            (RentInvoice, "rent_invoices"),
            (RentReceipt, "rent_receipts"),
        ]:
            qs = list(model.objects.filter(academy=academy).order_by("id"))
            zf.writestr(
                f"tenant/{name}.json",
                json.dumps(_serialize_queryset(qs), indent=2, default=_json_serial),
            )

    buffer.seek(0)
    return buffer

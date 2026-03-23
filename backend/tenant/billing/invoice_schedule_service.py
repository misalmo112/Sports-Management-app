"""
Invoice schedule business logic (tenant layer).

Phase IS.2 implements service used by session-based invoice scheduling.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Dict, List

from django.db import transaction
from django.utils import timezone

from tenant.billing.models import (
    DiscountType,
    Invoice,
    InvoiceItem,
    InvoiceSchedule,
    Item,
    Student,
    StudentScheduleOverride,
)
from tenant.billing.services import InvoiceService


def _override_applies_today(override: StudentScheduleOverride, today) -> bool:
    if not override.is_active:
        return False

    if override.valid_from is not None and today < override.valid_from:
        return False

    if override.valid_until is not None and today > override.valid_until:
        return False

    return True


def _discounted_unit_price(*, base_price: Decimal, override: StudentScheduleOverride | None) -> Decimal:
    """
    Apply per-student discount override to a single unit price.

    Returns the discounted price (after discount), not the discount amount.
    """
    if override is None:
        return base_price.quantize(Decimal("0.01"))

    if override.discount_type == DiscountType.PERCENTAGE:
        discount_amount = (base_price * (override.discount_value / Decimal("100.00"))).quantize(Decimal("0.01"))
    elif override.discount_type == DiscountType.FIXED:
        discount_amount = min(override.discount_value, base_price).quantize(Decimal("0.01"))
    else:
        discount_amount = Decimal("0.00")

    discounted = (base_price - discount_amount).quantize(Decimal("0.01"))
    if discounted < Decimal("0.00"):
        discounted = Decimal("0.00")
    return discounted


@transaction.atomic
def generate_invoices_for_schedule(schedule: InvoiceSchedule, qualifying_students: List[Student]):
    """
    Generate one DRAFT invoice per parent (grouping multiple students under the same parent).

    Returns:
        dict with keys:
            - invoices_created: int
            - student_to_invoice: {student_id: invoice_instance}
            - invoices: [invoice_instances]
    """
    today = timezone.now().date()
    billing_item: Item = schedule.billing_item
    base_price = billing_item.price

    students_by_parent: Dict[int, List[Student]] = {}
    for student in qualifying_students:
        if student.parent_id is None:
            raise ValueError("Qualifying student must have a parent to generate invoices.")
        students_by_parent.setdefault(student.parent_id, []).append(student)

    # Only consider overrides that are both active and valid for today.
    overrides_qs = StudentScheduleOverride.objects.filter(
        schedule=schedule,
        student__in=qualifying_students,
        is_active=True,
    ).select_related("student")

    active_overrides_by_student: Dict[int, StudentScheduleOverride] = {}
    for override in overrides_qs:
        if _override_applies_today(override, today):
            active_overrides_by_student[override.student_id] = override

    invoices: List[Invoice] = []
    student_to_invoice: Dict[int, Invoice] = {}

    for parent_id, students in students_by_parent.items():
        parent = students[0].parent

        invoice_number = InvoiceService.generate_invoice_number(schedule.academy)
        invoice = Invoice.objects.create(
            academy=schedule.academy,
            parent=parent,
            invoice_number=invoice_number,
            status=Invoice.Status.DRAFT,
            schedule=schedule,
            sport=schedule.class_obj.sport,
            location=schedule.class_obj.location,
        )
        invoices.append(invoice)

        for student in students:
            override = active_overrides_by_student.get(student.id)

            description = f"{billing_item.name} — {student.full_name}"
            if override is not None:
                description = f"{description} ({override.reason})"

            unit_price = _discounted_unit_price(base_price=base_price, override=override)

            InvoiceItem.objects.create(
                invoice=invoice,
                item=billing_item,
                student=student,
                description=description,
                quantity=1,
                unit_price=unit_price,
            )
            student_to_invoice[student.id] = invoice

    return {
        "invoices_created": len(invoices),
        "student_to_invoice": student_to_invoice,
        "invoices": invoices,
    }


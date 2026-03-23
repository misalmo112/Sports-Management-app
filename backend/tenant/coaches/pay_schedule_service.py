"""Service helpers for staff pay schedule automation."""

from tenant.coaches.models import StaffInvoice
from tenant.coaches.services import CoachesService


def generate_staff_invoice(schedule, period_description, period_start):
    """
    Generate a draft staff invoice for a pay schedule cycle.

    Currency defaults to academy currency, with AED as fallback when missing.
    """
    academy_currency = getattr(schedule.academy, "currency", None) or "AED"

    return StaffInvoice.objects.create(
        academy=schedule.academy,
        coach=schedule.coach,
        schedule=schedule,
        invoice_number=CoachesService.generate_staff_invoice_number(schedule.academy),
        amount=schedule.amount,
        currency=academy_currency,
        period_type=schedule.billing_type,
        period_start=period_start,
        period_description=period_description,
        status=StaffInvoice.Status.DRAFT,
    )

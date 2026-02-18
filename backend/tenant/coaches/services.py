"""Business services for coaches/staff domain."""
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from tenant.coaches.models import CoachPayment, StaffInvoice, StaffReceipt


class CoachesService:
    """Service layer for staff invoicing and payments."""

    @staticmethod
    def generate_staff_invoice_number(academy):
        """Generate unique staff invoice number. Format: STF-INV-{academy.slug}-{year}-{seq}."""
        year = timezone.now().year
        prefix = f"STF-INV-{academy.slug}-{year}-"
        last_invoice = StaffInvoice.objects.filter(
            academy=academy,
            invoice_number__startswith=prefix,
        ).order_by('-invoice_number').first()
        if last_invoice:
            try:
                last_num = int(last_invoice.invoice_number.split('-')[-1])
                next_num = last_num + 1
            except (ValueError, IndexError):
                next_num = 1
        else:
            next_num = 1
        return f"{prefix}{next_num:03d}"

    @staticmethod
    def generate_staff_receipt_number(academy):
        """Generate unique staff receipt number. Format: STAFF-RCP-{academy.slug}-{year}-{seq}."""
        year = timezone.now().year
        prefix = f"STAFF-RCP-{academy.slug}-{year}-"
        last_receipt = StaffReceipt.objects.filter(
            academy=academy,
            receipt_number__startswith=prefix,
        ).order_by('-receipt_number').first()
        if last_receipt:
            try:
                last_num = int(last_receipt.receipt_number.split('-')[-1])
                next_num = last_num + 1
            except (ValueError, IndexError):
                next_num = 1
        else:
            next_num = 1
        return f"{prefix}{next_num:03d}"

    @staticmethod
    @transaction.atomic
    def create_coach_payment(
        academy,
        coach,
        period_type,
        period_start,
        amount,
        payment_method,
        payment_date=None,
        staff_invoice=None,
        notes='',
    ):
        """
        Create a coach payment and a corresponding staff receipt.
        Returns (payment, receipt).
        """
        payment_date = payment_date or timezone.now().date()
        amount = Decimal(str(amount))
        if amount <= Decimal('0.00'):
            raise ValidationError('Payment amount must be greater than zero.')
        if staff_invoice and staff_invoice.coach_id != coach.id:
            raise ValidationError('Staff invoice must be for the same coach.')

        payment = CoachPayment.objects.create(
            academy=academy,
            coach=coach,
            period_type=period_type,
            period_start=period_start,
            amount=amount,
            payment_date=payment_date,
            payment_method=payment_method,
            staff_invoice=staff_invoice,
            notes=notes,
        )
        receipt = StaffReceipt.objects.create(
            academy=academy,
            coach=coach,
            staff_invoice=staff_invoice,
            coach_payment=payment,
            receipt_number=CoachesService.generate_staff_receipt_number(academy),
            amount=amount,
            payment_method=payment_method,
            payment_date=payment_date,
            notes=notes,
        )
        return payment, receipt

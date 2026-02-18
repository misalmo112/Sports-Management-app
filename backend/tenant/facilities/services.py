"""Business services for facilities domain."""
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from tenant.facilities.models import Bill, BillLineItem, InventoryItem, RentInvoice, RentPayment, RentReceipt


class FacilitiesService:
    """Service layer for facilities operations."""

    @staticmethod
    def generate_rent_invoice_number(academy):
        year = timezone.now().year
        prefix = f"RINV-{academy.slug}-{year}-"
        last_invoice = RentInvoice.objects.filter(
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
    def generate_rent_receipt_number(academy):
        """Generate unique rent receipt number. Format: RENT-RCP-{academy.slug}-{year}-{seq}."""
        year = timezone.now().year
        prefix = f"RENT-RCP-{academy.slug}-{year}-"
        last_receipt = RentReceipt.objects.filter(
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
    def create_rent_invoice(
        academy,
        location,
        amount,
        period_description,
        currency='USD',
        issued_date=None,
        due_date=None,
        notes='',
        status=RentInvoice.Status.DRAFT,
    ):
        invoice = RentInvoice.objects.create(
            academy=academy,
            location=location,
            invoice_number=FacilitiesService.generate_rent_invoice_number(academy),
            amount=amount,
            currency=currency,
            period_description=period_description,
            issued_date=issued_date or timezone.now().date(),
            due_date=due_date,
            notes=notes,
            status=status,
        )
        invoice.update_status()
        invoice.save(update_fields=['status', 'updated_at'])
        return invoice

    @staticmethod
    @transaction.atomic
    def add_rent_payment(rent_invoice, amount, payment_method, payment_date=None, notes=''):
        if rent_invoice.status == RentInvoice.Status.CANCELLED:
            raise ValidationError('Cannot add payment to a cancelled rent invoice.')

        amount = Decimal(str(amount))
        if amount <= Decimal('0.00'):
            raise ValidationError('Payment amount must be greater than zero.')

        payment_date = payment_date or timezone.now().date()
        payment = RentPayment.objects.create(
            rent_invoice=rent_invoice,
            amount=amount,
            payment_method=payment_method,
            payment_date=payment_date,
            notes=notes,
        )
        RentReceipt.objects.create(
            academy=rent_invoice.academy,
            rent_invoice=rent_invoice,
            rent_payment=payment,
            receipt_number=FacilitiesService.generate_rent_receipt_number(rent_invoice.academy),
            amount=amount,
            payment_method=payment_method,
            payment_date=payment_date,
            notes=notes,
        )
        return payment

    @staticmethod
    @transaction.atomic
    def mark_rent_invoice_paid(rent_invoice, payment_method, payment_date=None, notes=''):
        remaining = rent_invoice.get_remaining_amount()
        if remaining > Decimal('0.00'):
            return FacilitiesService.add_rent_payment(
                rent_invoice=rent_invoice,
                amount=remaining,
                payment_method=payment_method,
                payment_date=payment_date,
                notes=notes,
            )

        rent_invoice.update_status()
        rent_invoice.save(update_fields=['status', 'updated_at'])
        return None

    @staticmethod
    def _adjust_inventory_quantity(inventory_item, delta):
        if delta == 0:
            return inventory_item

        item = InventoryItem.objects.select_for_update().get(pk=inventory_item.pk)
        new_qty = int(item.quantity) + int(delta)
        if new_qty < 0:
            raise ValidationError(f'Inventory quantity cannot be negative for {item.name}.')
        item.quantity = new_qty
        item.save(update_fields=['quantity', 'updated_at'])
        return item

    @staticmethod
    def recalculate_bill_total(bill):
        bill.recalculate_total()
        bill.update_status_for_due_date()
        bill.save(update_fields=['total_amount', 'status', 'updated_at'])
        return bill

    @staticmethod
    @transaction.atomic
    def create_bill_line_item(bill, description, quantity, unit_price, inventory_item=None):
        line_item = BillLineItem.objects.create(
            bill=bill,
            description=description,
            quantity=quantity,
            unit_price=unit_price,
            inventory_item=inventory_item,
        )

        if inventory_item:
            FacilitiesService._adjust_inventory_quantity(inventory_item, int(quantity))

        FacilitiesService.recalculate_bill_total(bill)
        return line_item

    @staticmethod
    @transaction.atomic
    def update_bill_line_item(line_item, **updates):
        old_qty = int(line_item.quantity)
        old_item = line_item.inventory_item
        old_bill = line_item.bill

        for field, value in updates.items():
            setattr(line_item, field, value)
        line_item.save()

        new_qty = int(line_item.quantity)
        new_item = line_item.inventory_item

        old_item_id = old_item.id if old_item else None
        new_item_id = new_item.id if new_item else None

        if old_item_id == new_item_id and new_item:
            delta = new_qty - old_qty
            if delta:
                FacilitiesService._adjust_inventory_quantity(new_item, delta)
        else:
            if old_item:
                FacilitiesService._adjust_inventory_quantity(old_item, -old_qty)
            if new_item:
                FacilitiesService._adjust_inventory_quantity(new_item, new_qty)

        FacilitiesService.recalculate_bill_total(line_item.bill)
        if old_bill.id != line_item.bill.id:
            FacilitiesService.recalculate_bill_total(old_bill)

        return line_item

    @staticmethod
    @transaction.atomic
    def delete_bill_line_item(line_item):
        bill = line_item.bill
        inventory_item = line_item.inventory_item
        quantity = int(line_item.quantity)

        if inventory_item:
            FacilitiesService._adjust_inventory_quantity(inventory_item, -quantity)

        line_item.delete()
        FacilitiesService.recalculate_bill_total(bill)

    @staticmethod
    @transaction.atomic
    def adjust_inventory_quantity(inventory_item, delta):
        delta = int(delta)
        if delta == 0:
            raise ValidationError('Delta must not be zero.')
        return FacilitiesService._adjust_inventory_quantity(inventory_item, delta)

    @staticmethod
    @transaction.atomic
    def mark_bill_paid(bill):
        if bill.status == Bill.Status.CANCELLED:
            raise ValidationError('Cannot mark a cancelled bill as paid.')
        bill.status = Bill.Status.PAID
        bill.save(update_fields=['status', 'updated_at'])
        return bill

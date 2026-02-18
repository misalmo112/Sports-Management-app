"""
Service for Tenant Reports generation.
"""
from datetime import date
from decimal import Decimal

from django.db.models import Count, Q, Sum
from tenant.classes.models import Enrollment
from tenant.attendance.models import Attendance
from tenant.billing.models import Invoice, Receipt
from tenant.coaches.models import CoachPayScheme, CoachPayment
from tenant.facilities.models import Bill, InventoryItem, RentInvoice, RentPayment


class ReportsService:
    """Service for generating tenant reports."""
    
    @staticmethod
    def get_attendance_report(academy, date_from=None, date_to=None, class_id=None, student_id=None, sport_id=None, location_id=None):
        """
        Generate attendance report.
        
        Args:
            academy: Academy instance
            date_from: Start date (optional)
            date_to: End date (optional)
            class_id: Filter by class (optional)
            student_id: Filter by student (optional)
            sport_id: Filter by sport (optional)
            location_id: Filter by location (optional)
            
        Returns:
            dict: Attendance report data
        """
        queryset = Attendance.objects.filter(academy=academy)
        
        if date_from:
            queryset = queryset.filter(date__gte=date_from)
        if date_to:
            queryset = queryset.filter(date__lte=date_to)
        if class_id:
            queryset = queryset.filter(class_obj_id=class_id)
        if student_id:
            queryset = queryset.filter(student_id=student_id)
        if sport_id:
            queryset = queryset.filter(class_obj__sport_id=sport_id)
        if location_id:
            queryset = queryset.filter(class_obj__location_id=location_id)
        
        # Aggregate statistics
        stats = queryset.aggregate(
            total_records=Count('id'),
            present=Count('id', filter=Q(status='PRESENT')),
            absent=Count('id', filter=Q(status='ABSENT'))
        )
        
        # Attendance rate
        if stats['total_records'] > 0:
            attendance_rate = (stats['present'] / stats['total_records']) * 100
        else:
            attendance_rate = 0
        
        # By class
        by_class = queryset.values('class_obj__name', 'class_obj_id').annotate(
            total=Count('id'),
            present=Count('id', filter=Q(status='PRESENT')),
            absent=Count('id', filter=Q(status='ABSENT'))
        )
        
        # By student
        by_student = queryset.values('student__first_name', 'student__last_name', 'student_id').annotate(
            total=Count('id'),
            present=Count('id', filter=Q(status='PRESENT')),
            absent=Count('id', filter=Q(status='ABSENT'))
        )
        
        return {
            'type': 'attendance',
            'date_from': date_from.isoformat() if date_from else None,
            'date_to': date_to.isoformat() if date_to else None,
            'summary': {
                'total_records': stats['total_records'] or 0,
                'present': stats['present'] or 0,
                'absent': stats['absent'] or 0,
                'attendance_rate': round(attendance_rate, 2)
            },
            'by_class': list(by_class),
            'by_student': list(by_student)
        }
    
    @staticmethod
    def get_financial_report(academy, date_from=None, date_to=None, sport_id=None, location_id=None):
        """
        Generate financial report.
        
        Args:
            academy: Academy instance
            date_from: Start date (optional)
            date_to: End date (optional)
            sport_id: Filter by sport (optional)
            location_id: Filter by location (optional)
            
        Returns:
            dict: Financial report data
        """
        invoice_queryset = Invoice.objects.filter(academy=academy)
        receipt_queryset = Receipt.objects.filter(academy=academy)
        
        if date_from:
            invoice_queryset = invoice_queryset.filter(created_at__date__gte=date_from)
            receipt_queryset = receipt_queryset.filter(payment_date__gte=date_from)
        if date_to:
            invoice_queryset = invoice_queryset.filter(created_at__date__lte=date_to)
            receipt_queryset = receipt_queryset.filter(payment_date__lte=date_to)
        
        if sport_id:
            invoice_queryset = invoice_queryset.filter(sport_id=sport_id)
            receipt_queryset = receipt_queryset.filter(sport_id=sport_id)
        if location_id:
            invoice_queryset = invoice_queryset.filter(location_id=location_id)
            receipt_queryset = receipt_queryset.filter(location_id=location_id)
        
        # Invoice statistics
        total_amount = sum(float(inv.total) for inv in invoice_queryset)
        paid_amount = Decimal('0.00')
        for invoice in invoice_queryset:
            paid_amount += invoice.get_paid_amount()

        # Overdue: in range, due_date < today, not PAID/CANCELLED
        today = date.today()
        overdue_invoices = invoice_queryset.exclude(
            status__in=[Invoice.Status.PAID, Invoice.Status.CANCELLED]
        ).filter(due_date__lt=today, due_date__isnull=False)
        overdue_count = overdue_invoices.count()
        overdue_amount = Decimal('0.00')
        for inv in overdue_invoices:
            overdue_amount += inv.get_remaining_balance()
        
        invoice_stats = {
            'total_invoices': invoice_queryset.count(),
            'total_amount': total_amount,
            'paid_amount': float(paid_amount),
            'unpaid_amount': total_amount - float(paid_amount),
            'overdue_count': overdue_count,
            'overdue_amount': float(overdue_amount),
        }
        
        # Receipt statistics (payment_date filter already applied to receipt_queryset above)
        receipt_stats = receipt_queryset.aggregate(
            total_receipts=Count('id'),
            total_collected=Sum('amount')
        )
        
        # By status
        invoices_by_status = invoice_queryset.values('status').annotate(
            count=Count('id'),
            total=Sum('total')
        )
        
        return {
            'type': 'financial',
            'date_from': date_from.isoformat() if date_from else None,
            'date_to': date_to.isoformat() if date_to else None,
            'summary': {
                'total_invoices': invoice_stats['total_invoices'] or 0,
                'total_amount': float(invoice_stats['total_amount'] or 0),
                'paid_amount': float(invoice_stats['paid_amount'] or 0),
                'unpaid_amount': float(invoice_stats['unpaid_amount'] or 0),
                'overdue_count': invoice_stats['overdue_count'],
                'overdue_amount': invoice_stats['overdue_amount'],
                'total_receipts': receipt_stats['total_receipts'] or 0,
                'total_collected': float(receipt_stats['total_collected'] or 0)
            },
            'invoices_by_status': list(invoices_by_status)
        }
    
    @staticmethod
    def get_enrollment_report(academy, class_id=None, sport_id=None, location_id=None):
        """
        Generate enrollment report.
        
        Args:
            academy: Academy instance
            class_id: Filter by class (optional)
            sport_id: Filter by sport (optional)
            location_id: Filter by location (optional)
            
        Returns:
            dict: Enrollment report data
        """
        enrollment_queryset = Enrollment.objects.filter(
            academy=academy, 
            status='ENROLLED',
            student__is_active=True
        )
        
        if class_id:
            enrollment_queryset = enrollment_queryset.filter(class_obj_id=class_id)
        if sport_id:
            enrollment_queryset = enrollment_queryset.filter(class_obj__sport_id=sport_id)
        if location_id:
            enrollment_queryset = enrollment_queryset.filter(class_obj__location_id=location_id)
        
        # Total enrollments
        total_enrollments = enrollment_queryset.count()
        
        # By class
        by_class = enrollment_queryset.values('class_obj__name', 'class_obj_id').annotate(
            count=Count('id')
        )
        
        # By student
        by_student = enrollment_queryset.values('student__first_name', 'student__last_name', 'student_id').annotate(
            count=Count('id')
        )
        
        return {
            'type': 'enrollment',
            'summary': {
                'total_enrollments': total_enrollments
            },
            'by_class': list(by_class),
            'by_student': list(by_student)
        }

    @staticmethod
    def get_academy_financials_report(academy, date_from=None, date_to=None, location_id=None):
        """
        Generate academy financials report (running costs + revenue reference).

        Args:
            academy: Academy instance
            date_from: Start date (optional)
            date_to: End date (optional)
            location_id: Filter rent/inventory by location (optional)

        Returns:
            dict: Academy financials report data
        """
        rent_invoice_queryset = RentInvoice.objects.filter(academy=academy)
        rent_payment_queryset = RentPayment.objects.filter(rent_invoice__academy=academy)
        bill_queryset = Bill.objects.filter(academy=academy)
        inventory_queryset = InventoryItem.objects.filter(academy=academy)
        revenue_invoice_queryset = Invoice.objects.filter(academy=academy)
        revenue_receipt_queryset = Receipt.objects.filter(academy=academy)

        if date_from:
            rent_invoice_queryset = rent_invoice_queryset.filter(issued_date__gte=date_from)
            rent_payment_queryset = rent_payment_queryset.filter(payment_date__gte=date_from)
            bill_queryset = bill_queryset.filter(bill_date__gte=date_from)
            revenue_invoice_queryset = revenue_invoice_queryset.filter(created_at__date__gte=date_from)
            revenue_receipt_queryset = revenue_receipt_queryset.filter(created_at__date__gte=date_from)
        if date_to:
            rent_invoice_queryset = rent_invoice_queryset.filter(issued_date__lte=date_to)
            rent_payment_queryset = rent_payment_queryset.filter(payment_date__lte=date_to)
            bill_queryset = bill_queryset.filter(bill_date__lte=date_to)
            revenue_invoice_queryset = revenue_invoice_queryset.filter(created_at__date__lte=date_to)
            revenue_receipt_queryset = revenue_receipt_queryset.filter(created_at__date__lte=date_to)
        if location_id:
            rent_invoice_queryset = rent_invoice_queryset.filter(location_id=location_id)
            rent_payment_queryset = rent_payment_queryset.filter(rent_invoice__location_id=location_id)

        rent_invoiced = rent_invoice_queryset.aggregate(total=Sum('amount')).get('total') or Decimal('0.00')
        rent_paid = rent_payment_queryset.aggregate(total=Sum('amount')).get('total') or Decimal('0.00')
        rent_unpaid = rent_invoiced - rent_paid
        if rent_unpaid < Decimal('0.00'):
            rent_unpaid = Decimal('0.00')

        rent_overdue_queryset = rent_invoice_queryset.filter(status=RentInvoice.Status.OVERDUE)
        rent_overdue_count = rent_overdue_queryset.count()
        rent_overdue_amount = sum(
            inv.get_remaining_amount() for inv in rent_overdue_queryset
        )

        bills_total = bill_queryset.aggregate(total=Sum('total_amount')).get('total') or Decimal('0.00')
        bills_paid_total = bill_queryset.filter(status=Bill.Status.PAID).aggregate(total=Sum('total_amount')).get('total') or Decimal('0.00')
        bills_pending_total = bill_queryset.filter(status=Bill.Status.PENDING).aggregate(total=Sum('total_amount')).get('total') or Decimal('0.00')
        bills_overdue_total = bill_queryset.filter(status=Bill.Status.OVERDUE).aggregate(total=Sum('total_amount')).get('total') or Decimal('0.00')

        running_cost_invoiced_basis = rent_invoiced + bills_total
        running_cost_paid_basis = rent_paid + bills_paid_total

        revenue_invoiced_total = revenue_invoice_queryset.aggregate(total=Sum('total')).get('total') or Decimal('0.00')
        revenue_collected_total = revenue_receipt_queryset.aggregate(total=Sum('amount')).get('total') or Decimal('0.00')

        net_invoiced_basis = revenue_invoiced_total - running_cost_invoiced_basis
        net_cash_basis = revenue_collected_total - running_cost_paid_basis

        rent_by_location = rent_invoice_queryset.values(
            'location_id',
            'location__name',
        ).annotate(
            invoiced=Sum('amount'),
            count=Count('id'),
        ).order_by('location__name')

        rent_paid_by_location_raw = rent_payment_queryset.values(
            'rent_invoice__location_id',
            'rent_invoice__location__name',
        ).annotate(
            paid=Sum('amount'),
        )
        paid_map = {
            row['rent_invoice__location_id']: row['paid'] or Decimal('0.00')
            for row in rent_paid_by_location_raw
        }
        rent_by_location_rows = []
        for row in rent_by_location:
            location_key = row['location_id']
            location_paid = paid_map.get(location_key, Decimal('0.00'))
            location_unpaid = (row['invoiced'] or Decimal('0.00')) - location_paid
            if location_unpaid < Decimal('0.00'):
                location_unpaid = Decimal('0.00')
            rent_by_location_rows.append({
                'location_id': location_key,
                'location_name': row['location__name'],
                'count': row['count'],
                'invoiced': float(row['invoiced'] or 0),
                'paid': float(location_paid),
                'unpaid': float(location_unpaid),
            })

        bills_by_status = bill_queryset.values('status').annotate(
            count=Count('id'),
            total=Sum('total_amount'),
        ).order_by('status')

        inventory_items = inventory_queryset.values(
            'id',
            'name',
            'quantity',
            'unit',
            'reorder_level',
        ).order_by('name')
        inventory_count = inventory_queryset.count()
        inventory_total_quantity = inventory_queryset.aggregate(total=Sum('quantity')).get('total') or 0

        return {
            'type': 'academy_financials',
            'date_from': date_from.isoformat() if date_from else None,
            'date_to': date_to.isoformat() if date_to else None,
            'summary': {
                'rent_invoiced': float(rent_invoiced),
                'rent_paid': float(rent_paid),
                'rent_unpaid': float(rent_unpaid),
                'rent_overdue_count': rent_overdue_count,
                'rent_overdue_amount': float(rent_overdue_amount),
                'bills_total': float(bills_total),
                'bills_paid_total': float(bills_paid_total),
                'bills_pending_total': float(bills_pending_total),
                'bills_overdue_total': float(bills_overdue_total),
                'running_cost_invoiced_basis': float(running_cost_invoiced_basis),
                'running_cost_paid_basis': float(running_cost_paid_basis),
                'revenue_invoiced_total': float(revenue_invoiced_total),
                'revenue_collected_total': float(revenue_collected_total),
                'net_invoiced_basis': float(net_invoiced_basis),
                'net_cash_basis': float(net_cash_basis),
                'inventory_item_count': inventory_count,
                'inventory_total_quantity': inventory_total_quantity,
            },
            'rent_by_location': rent_by_location_rows,
            'bills_by_status': [
                {
                    'status': row['status'],
                    'count': row['count'],
                    'total': float(row['total'] or 0),
                }
                for row in bills_by_status
            ],
            'inventory_summary': list(inventory_items),
        }

    @staticmethod
    def _periods_in_range(date_from, date_to, period_type):
        """Return number of periods (months or weeks) overlapping [date_from, date_to]."""
        if period_type == CoachPayScheme.PeriodType.MONTH:
            return max(
                0,
                (date_to.year - date_from.year) * 12
                + (date_to.month - date_from.month)
                + 1,
            )
        if period_type == CoachPayScheme.PeriodType.WEEK:
            days = (date_to - date_from).days
            return max(0, days // 7 + 1) if days >= 0 else 0
        return 0  # SESSION not computed in v1

    @staticmethod
    def get_staff_financial_report(academy, date_from=None, date_to=None, coach_id=None):
        """
        Generate staff (coach) financial report: expected vs paid for date range.

        Expected: from CoachPayScheme (MONTH/WEEK only; SESSION omitted in v1).
        Paid: from CoachPayment where payment_date in [date_from, date_to].
        """
        today = date.today()
        date_from = date_from or today
        date_to = date_to or today
        if date_from > date_to:
            date_from, date_to = date_to, date_from

        paid_queryset = CoachPayment.objects.filter(
            academy=academy,
            payment_date__gte=date_from,
            payment_date__lte=date_to,
        )
        if coach_id:
            paid_queryset = paid_queryset.filter(coach_id=coach_id)
        paid_total = paid_queryset.aggregate(total=Sum('amount')).get('total') or Decimal('0.00')

        by_coach_paid = {
            row['coach_id']: row['paid']
            for row in paid_queryset.values('coach_id').annotate(
                paid=Sum('amount')
            ).order_by('coach_id')
        }

        scheme_queryset = CoachPayScheme.objects.filter(academy=academy).select_related('coach')
        if coach_id:
            scheme_queryset = scheme_queryset.filter(coach_id=coach_id)
        expected_by_coach = {}
        for scheme in scheme_queryset:
            periods = ReportsService._periods_in_range(
                date_from, date_to, scheme.period_type
            )
            expected = (scheme.amount * periods).quantize(Decimal('0.01'))
            coach_id = scheme.coach_id
            coach_name = scheme.coach.full_name
            if coach_id not in expected_by_coach:
                expected_by_coach[coach_id] = {'coach_name': coach_name, 'expected': Decimal('0.00')}
            expected_by_coach[coach_id]['expected'] += expected

        expected_total = sum(e['expected'] for e in expected_by_coach.values())
        by_coach_rows = []
        for coach_id, data in expected_by_coach.items():
            expected = data['expected']
            paid = by_coach_paid.get(coach_id, Decimal('0.00'))
            if not isinstance(paid, Decimal):
                paid = Decimal(str(paid))
            pending = max(Decimal('0.00'), expected - paid)
            by_coach_rows.append({
                'coach_id': coach_id,
                'coach_name': data['coach_name'],
                'expected': float(expected),
                'paid': float(paid),
                'pending': float(pending),
            })

        pending_total = max(Decimal('0.00'), expected_total - paid_total)

        return {
            'summary': {
                'expected_total': float(expected_total),
                'paid_total': float(paid_total),
                'pending_total': float(pending_total),
            },
            'by_coach': by_coach_rows,
        }

    @staticmethod
    def get_cash_flow(academy, date_from, date_to, location_id=None, sport_id=None, coach_id=None):
        """
        Cash flow by day: In (receipts), Out (rent, staff, bills).
        Returns by_day list of { date, in_total, out_rent, out_staff, out_bills, out_total, net }.
        """
        if not date_from or not date_to:
            return {'by_day': []}
        if date_from > date_to:
            date_from, date_to = date_to, date_from

        # In: Receipts by payment_date
        receipt_qs = Receipt.objects.filter(
            academy=academy,
            payment_date__gte=date_from,
            payment_date__lte=date_to,
        )
        if sport_id:
            receipt_qs = receipt_qs.filter(sport_id=sport_id)
        if location_id:
            receipt_qs = receipt_qs.filter(location_id=location_id)
        in_by_date = dict(
            receipt_qs.values('payment_date')
            .annotate(total=Sum('amount'))
            .values_list('payment_date', 'total')
        )

        # Out: RentPayment by payment_date
        rent_payment_qs = RentPayment.objects.filter(
            rent_invoice__academy=academy,
            payment_date__gte=date_from,
            payment_date__lte=date_to,
        )
        if location_id:
            rent_payment_qs = rent_payment_qs.filter(rent_invoice__location_id=location_id)
        rent_by_date = dict(
            rent_payment_qs.values('payment_date')
            .annotate(total=Sum('amount'))
            .values_list('payment_date', 'total')
        )

        # Out: CoachPayment by payment_date
        staff_qs = CoachPayment.objects.filter(
            academy=academy,
            payment_date__gte=date_from,
            payment_date__lte=date_to,
        )
        if coach_id:
            staff_qs = staff_qs.filter(coach_id=coach_id)
        staff_by_date = dict(
            staff_qs.values('payment_date')
            .annotate(total=Sum('amount'))
            .values_list('payment_date', 'total')
        )

        # Out: Bills (PAID) by bill_date
        bills_by_date = dict(
            Bill.objects.filter(
                academy=academy,
                status=Bill.Status.PAID,
                bill_date__gte=date_from,
                bill_date__lte=date_to,
            )
            .values('bill_date')
            .annotate(total=Sum('total_amount'))
            .values_list('bill_date', 'total')
        )

        all_dates = set()
        all_dates.update(in_by_date.keys(), rent_by_date.keys(), staff_by_date.keys(), bills_by_date.keys())
        by_day = []
        for d in sorted(all_dates):
            in_total = float(in_by_date.get(d) or 0)
            out_rent = float(rent_by_date.get(d) or 0)
            out_staff = float(staff_by_date.get(d) or 0)
            out_bills = float(bills_by_date.get(d) or 0)
            out_total = out_rent + out_staff + out_bills
            by_day.append({
                'date': d.isoformat() if hasattr(d, 'isoformat') else str(d),
                'in_total': in_total,
                'out_rent': out_rent,
                'out_staff': out_staff,
                'out_bills': out_bills,
                'out_total': out_total,
                'net': in_total - out_total,
            })
        return {'by_day': by_day}

    @staticmethod
    def get_finance_overview_report(
        academy, date_from=None, date_to=None, location_id=None, sport_id=None, coach_id=None
    ):
        """
        Combined finance overview: student fees, rent, staff fees, overdue, net cash, cash flow, bills.
        """
        student = ReportsService.get_financial_report(
            academy, date_from=date_from, date_to=date_to,
            sport_id=sport_id, location_id=location_id,
        )
        rent_and_costs = ReportsService.get_academy_financials_report(
            academy, date_from=date_from, date_to=date_to, location_id=location_id,
        )
        staff = ReportsService.get_staff_financial_report(
            academy, date_from=date_from, date_to=date_to, coach_id=coach_id,
        )

        student_received = student['summary'].get('total_collected') or 0
        rent_paid = rent_and_costs['summary']['rent_paid']
        staff_paid = staff['summary']['paid_total']
        bills_paid = rent_and_costs['summary'].get('bills_paid_total') or 0
        net_cash_position = student_received - rent_paid - staff_paid - bills_paid

        cash_flow = None
        if date_from and date_to:
            cash_flow = ReportsService.get_cash_flow(
                academy, date_from, date_to,
                location_id=location_id, sport_id=sport_id, coach_id=coach_id,
            )

        return {
            'type': 'finance_overview',
            'date_from': date_from.isoformat() if date_from else None,
            'date_to': date_to.isoformat() if date_to else None,
            'net_cash_position': round(net_cash_position, 2),
            'student': {
                'summary': {
                    **student['summary'],
                    'overdue_count': student['summary'].get('overdue_count', 0),
                    'overdue_amount': student['summary'].get('overdue_amount', 0),
                },
                'invoices_by_status': student.get('invoices_by_status', []),
            },
            'rent': {
                'summary': {
                    'rent_invoiced': rent_and_costs['summary']['rent_invoiced'],
                    'rent_paid': rent_and_costs['summary']['rent_paid'],
                    'rent_unpaid': rent_and_costs['summary']['rent_unpaid'],
                    'rent_overdue_count': rent_and_costs['summary'].get('rent_overdue_count', 0),
                    'rent_overdue_amount': rent_and_costs['summary'].get('rent_overdue_amount', 0),
                },
                'rent_by_location': rent_and_costs.get('rent_by_location', []),
            },
            'staff': staff,
            'bills': {
                'summary': {
                    'bills_total': rent_and_costs['summary']['bills_total'],
                    'bills_paid_total': rent_and_costs['summary']['bills_paid_total'],
                    'bills_pending_total': rent_and_costs['summary']['bills_pending_total'],
                    'bills_overdue_total': rent_and_costs['summary']['bills_overdue_total'],
                },
                'bills_by_status': rent_and_costs.get('bills_by_status', []),
            },
            'cash_flow': cash_flow,
        }

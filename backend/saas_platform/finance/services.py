from decimal import Decimal

from django.db.models import Sum
from django.utils import timezone

from saas_platform.finance.models import OperationalExpense
from saas_platform.subscriptions.models import PlatformPayment, Subscription, SubscriptionStatus


class FinanceService:
    """Service layer for platform finance metrics."""

    ZERO = Decimal('0.00')
    TWOPLACES = Decimal('0.01')

    @staticmethod
    def _format_money(value):
        return value.quantize(FinanceService.TWOPLACES)

    @staticmethod
    def get_mrr():
        total = FinanceService.ZERO
        subscriptions = Subscription.objects.filter(
            is_current=True,
            status=SubscriptionStatus.ACTIVE,
        ).select_related('plan')

        for subscription in subscriptions:
            plan = subscription.plan
            if plan.price_yearly is not None:
                total += plan.price_yearly / Decimal('12')
            elif plan.price_monthly is not None:
                total += plan.price_monthly

        return FinanceService._format_money(total)

    @staticmethod
    def get_arr():
        return FinanceService._format_money(FinanceService.get_mrr() * Decimal('12'))

    @staticmethod
    def get_active_count():
        return Subscription.objects.filter(
            is_current=True,
            status=SubscriptionStatus.ACTIVE,
        ).count()

    @staticmethod
    def get_churn_count(year, month):
        return Subscription.objects.filter(
            is_current=True,
            status__in=[SubscriptionStatus.CANCELED, SubscriptionStatus.SUSPENDED],
            canceled_at__year=year,
            canceled_at__month=month,
        ).count()

    @staticmethod
    def get_revenue(year, month):
        result = PlatformPayment.objects.filter(
            payment_date__year=year,
            payment_date__month=month,
        ).aggregate(total=Sum('amount'))
        return FinanceService._format_money(result['total'] or FinanceService.ZERO)

    @staticmethod
    def get_expenses(year, month):
        result = OperationalExpense.objects.filter(
            paid_date__year=year,
            paid_date__month=month,
            is_paid=True,
        ).aggregate(total=Sum('amount'))
        return FinanceService._format_money(result['total'] or FinanceService.ZERO)

    @staticmethod
    def get_expense_breakdown(year, month):
        breakdown = (
            OperationalExpense.objects.filter(
                paid_date__year=year,
                paid_date__month=month,
                is_paid=True,
            )
            .values('category')
            .annotate(total=Sum('amount'))
            .order_by('-total')
        )

        return [
            {
                'category': item['category'],
                'total': FinanceService._format_money(item['total'] or FinanceService.ZERO),
            }
            for item in breakdown
        ]

    @staticmethod
    def get_pl(year, month):
        return FinanceService._format_money(
            FinanceService.get_revenue(year, month) - FinanceService.get_expenses(year, month)
        )

    @staticmethod
    def get_payments_for_export(year, month):
        return (
            PlatformPayment.objects.filter(
                payment_date__year=year,
                payment_date__month=month,
            )
            .select_related('academy', 'subscription__plan')
            .order_by('payment_date')
        )

    @staticmethod
    def get_summary(year=None, month=None):
        now = timezone.now()
        target_year = year or now.year
        target_month = month or now.month

        return {
            'year': target_year,
            'month': target_month,
            'mrr': FinanceService.get_mrr(),
            'arr': FinanceService.get_arr(),
            'active_subscriptions': FinanceService.get_active_count(),
            'churn_count': FinanceService.get_churn_count(target_year, target_month),
            'revenue': FinanceService.get_revenue(target_year, target_month),
            'expenses': FinanceService.get_expenses(target_year, target_month),
            'pl': FinanceService.get_pl(target_year, target_month),
            'expense_breakdown': FinanceService.get_expense_breakdown(target_year, target_month),
        }

    @staticmethod
    def get_monthly_trend(months=12):
        now = timezone.now()
        summaries = []

        for index in range(months - 1, -1, -1):
            zero_based_month = now.month - 1 - index
            target_year = now.year + zero_based_month // 12
            target_month = zero_based_month % 12 + 1
            summaries.append(
                FinanceService.get_summary(
                    year=target_year,
                    month=target_month,
                )
            )

        return summaries

from django.db import models


class ExpenseCategory(models.TextChoices):
    CLOUD = 'CLOUD', 'Cloud Infrastructure'
    DOMAIN = 'DOMAIN', 'Domain & DNS'
    SERVER = 'SERVER', 'Server / VPS'
    SAAS = 'SAAS', 'SaaS Tool'
    LEGAL = 'LEGAL', 'Legal & Compliance'
    MARKETING = 'MARKETING', 'Marketing'
    OTHER = 'OTHER', 'Other'


class BillingCycle(models.TextChoices):
    ONE_TIME = 'ONE_TIME', 'One-time'
    MONTHLY = 'MONTHLY', 'Monthly'
    YEARLY = 'YEARLY', 'Yearly'


class OperationalExpense(models.Model):
    category = models.CharField(
        max_length=20,
        choices=ExpenseCategory.choices,
        db_index=True,
    )
    vendor_name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    billing_cycle = models.CharField(max_length=10, choices=BillingCycle.choices)
    due_date = models.DateField(null=True, blank=True)
    paid_date = models.DateField(null=True, blank=True, db_index=True)
    is_paid = models.BooleanField(default=False, db_index=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'operational_expenses'
        indexes = [
            models.Index(fields=['paid_date', 'is_paid']),
            models.Index(fields=['billing_cycle', 'category']),
        ]

    def __str__(self):
        return f"{self.category} - {self.vendor_name} ({self.amount} {self.currency})"


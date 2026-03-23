from decimal import Decimal
from django.db import models
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.validators import EmailValidator, MaxValueValidator, MinValueValidator
from django.utils import timezone
from saas_platform.tenants.models import Academy
from tenant.billing.models import Receipt

User = get_user_model()


class Coach(models.Model):
    """Coach model for academy instructors."""
    
    academy = models.ForeignKey(
        Academy,
        on_delete=models.CASCADE,
        related_name='coaches',
        db_index=True
    )
    
    # Optional link to User model for authentication
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='coach_profile',
        db_index=True
    )
    
    # Personal Information
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(
        max_length=255,
        validators=[EmailValidator()],
        db_index=True
    )
    phone = models.CharField(max_length=20, blank=True)
    
    # Professional Information
    specialization = models.CharField(max_length=255, blank=True)
    certifications = models.TextField(blank=True)  # Store as text or JSON
    bio = models.TextField(blank=True)
    
    # Status
    is_active = models.BooleanField(default=True, db_index=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tenant_coaches'
        indexes = [
            models.Index(fields=['academy', 'email']),
            models.Index(fields=['academy', 'is_active']),
            models.Index(fields=['user']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['academy', 'email'],
                name='unique_coach_email_per_academy'
            ),
            models.UniqueConstraint(
                fields=['user'],
                condition=models.Q(user__isnull=False),
                name='unique_coach_user'
            )
        ]
        verbose_name = 'Coach'
        verbose_name_plural = 'Coaches'
        ordering = ['last_name', 'first_name']
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


class CoachPayScheme(models.Model):
    """Pay scheme for a coach: rate per session, per month, or per week."""

    class PeriodType(models.TextChoices):
        SESSION = 'SESSION', 'Per Session'
        MONTH = 'MONTH', 'Per Month'
        WEEK = 'WEEK', 'Per Week'

    coach = models.ForeignKey(
        Coach,
        on_delete=models.CASCADE,
        related_name='pay_schemes',
        db_index=True,
    )
    academy = models.ForeignKey(
        Academy,
        on_delete=models.CASCADE,
        related_name='coach_pay_schemes',
        db_index=True,
    )
    period_type = models.CharField(
        max_length=20,
        choices=PeriodType.choices,
        db_index=True,
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0'))],
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tenant_coach_pay_schemes'
        indexes = [
            models.Index(fields=['academy', 'coach']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['coach', 'period_type'],
                name='unique_coach_pay_scheme_per_period',
            )
        ]
        verbose_name = 'Coach Pay Scheme'
        verbose_name_plural = 'Coach Pay Schemes'
        ordering = ['coach', 'period_type']

    def __str__(self):
        return f"{self.coach.full_name} - {self.get_period_type_display()} - {self.amount}"


class StaffInvoice(models.Model):
    """Invoice for staff (coach) payment: what is owed for a period."""

    class Status(models.TextChoices):
        DRAFT = 'DRAFT', 'Draft'
        PENDING = 'PENDING', 'Pending'
        PAID = 'PAID', 'Paid'
        CANCELLED = 'CANCELLED', 'Cancelled'

    class PeriodType(models.TextChoices):
        SESSION = 'SESSION', 'Per Session'
        MONTH = 'MONTH', 'Per Month'
        WEEK = 'WEEK', 'Per Week'

    academy = models.ForeignKey(
        Academy,
        on_delete=models.CASCADE,
        related_name='staff_invoices',
        db_index=True,
    )
    coach = models.ForeignKey(
        Coach,
        on_delete=models.CASCADE,
        related_name='staff_invoices',
        db_index=True,
    )
    schedule = models.ForeignKey(
        'StaffPaySchedule',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='generated_invoices',
        help_text='Set if this invoice was auto-generated by a schedule',
    )
    invoice_number = models.CharField(max_length=100, db_index=True)
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
    )
    currency = models.CharField(max_length=3, default='USD')
    period_description = models.CharField(max_length=255)
    period_type = models.CharField(
        max_length=20,
        choices=PeriodType.choices,
        db_index=True,
    )
    period_start = models.DateField(
        help_text='Week start, month start, or session date',
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )
    issued_date = models.DateField(default=timezone.localdate)
    due_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tenant_staff_invoices'
        ordering = ['-issued_date', '-created_at']
        indexes = [
            models.Index(fields=['academy', 'status']),
            models.Index(fields=['academy', 'coach']),
            models.Index(fields=['academy', 'due_date']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['academy', 'invoice_number'],
                name='unique_staff_invoice_number_per_academy',
            )
        ]

    def __str__(self):
        return f"{self.invoice_number} - {self.coach.full_name}"

    def clean(self):
        if self.coach_id and self.academy_id and self.coach.academy_id != self.academy_id:
            raise ValidationError({'coach': 'Coach must belong to the same academy.'})


class StaffPaySchedule(models.Model):
    """Admin-defined schedule used to auto-generate staff invoices."""

    class BillingType(models.TextChoices):
        SESSION = 'SESSION', 'Per Session'
        MONTHLY = 'MONTHLY', 'Monthly'
        WEEKLY = 'WEEKLY', 'Weekly'

    academy = models.ForeignKey(
        Academy,
        on_delete=models.CASCADE,
        related_name='staff_pay_schedules',
        db_index=True,
    )
    coach = models.ForeignKey(
        Coach,
        on_delete=models.CASCADE,
        related_name='pay_schedules',
        db_index=True,
    )
    billing_type = models.CharField(
        max_length=20,
        choices=BillingType.choices,
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0'))],
        help_text='Auto-populated from CoachPayScheme; can be overridden here',
    )
    sessions_per_cycle = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text='SESSION only - how many sessions before invoice fires',
    )
    class_scope = models.ForeignKey(
        'classes.Class',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='staff_pay_schedules',
        help_text='SESSION only - count sessions only for this class; null = all assigned classes',
    )
    billing_day = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(28)],
        help_text='MONTHLY only - day of month invoice fires',
    )
    billing_day_of_week = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(6)],
        help_text='WEEKLY only - 0=Monday, 6=Sunday',
    )
    cycle_start_date = models.DateField(help_text='Automation ignores attendance before this date')
    is_active = models.BooleanField(default=True, db_index=True)
    last_run_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tenant_staff_pay_schedules'
        constraints = [
            models.UniqueConstraint(
                fields=['coach', 'billing_type'],
                name='unique_staff_pay_schedule_per_coach_billing_type',
            )
        ]

    def __str__(self):
        return f"{self.coach.full_name} ({self.billing_type})"

    def clean(self):
        if self.coach_id and self.academy_id and self.coach.academy_id != self.academy_id:
            raise ValidationError({'coach': 'Coach must belong to the same academy.'})
        if self.billing_type == self.BillingType.SESSION:
            if not self.sessions_per_cycle:
                raise ValidationError({'sessions_per_cycle': 'sessions_per_cycle must be set for SESSION schedules.'})
            if self.billing_day is not None or self.billing_day_of_week is not None:
                raise ValidationError('billing_day and billing_day_of_week must be null for SESSION schedules.')
        if self.billing_type == self.BillingType.MONTHLY:
            if self.billing_day is None:
                raise ValidationError({'billing_day': 'billing_day must be set for MONTHLY schedules.'})
            if self.sessions_per_cycle is not None or self.class_scope_id is not None or self.billing_day_of_week is not None:
                raise ValidationError(
                    'sessions_per_cycle, class_scope, and billing_day_of_week must be null for MONTHLY schedules.'
                )
        if self.billing_type == self.BillingType.WEEKLY:
            if self.billing_day_of_week is None:
                raise ValidationError({'billing_day_of_week': 'billing_day_of_week must be set for WEEKLY schedules.'})
            if self.billing_day_of_week < 0 or self.billing_day_of_week > 6:
                raise ValidationError({'billing_day_of_week': 'billing_day_of_week must be between 0 and 6.'})
            if self.sessions_per_cycle is not None or self.class_scope_id is not None or self.billing_day is not None:
                raise ValidationError('sessions_per_cycle, class_scope, and billing_day must be null for WEEKLY schedules.')


class CoachSessionCycle(models.Model):
    """Per-coach session counter for SESSION staff pay schedules."""

    schedule = models.ForeignKey(
        StaffPaySchedule,
        on_delete=models.CASCADE,
        related_name='session_cycles',
    )
    coach = models.ForeignKey(
        Coach,
        on_delete=models.CASCADE,
        related_name='session_cycles',
    )
    cycle_number = models.PositiveIntegerField(default=1)
    sessions_counted = models.PositiveIntegerField(default=0)
    last_counted_date = models.DateField(
        null=True,
        blank=True,
        help_text='Prevents double-counting on reruns',
    )
    invoice = models.ForeignKey(
        StaffInvoice,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='source_coach_cycle',
        help_text='Null until this cycle fires; set on invoice generation',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tenant_coach_session_cycles'
        constraints = [
            models.UniqueConstraint(
                fields=['schedule', 'coach', 'cycle_number'],
                name='unique_coach_cycle_per_schedule',
            )
        ]

    def __str__(self):
        return f"{self.coach.full_name} cycle {self.cycle_number}"


class StaffPayScheduleRun(models.Model):
    """Audit log for each StaffPaySchedule execution."""

    class RunStatus(models.TextChoices):
        SUCCEEDED = 'SUCCEEDED', 'Succeeded'
        FAILED = 'FAILED', 'Failed'
        PARTIAL = 'PARTIAL', 'Partial'

    class TriggerSource(models.TextChoices):
        SCHEDULED = 'SCHEDULED', 'Scheduled'
        MANUAL = 'MANUAL', 'Manual'

    schedule = models.ForeignKey(
        StaffPaySchedule,
        on_delete=models.CASCADE,
        related_name='runs',
    )
    run_at = models.DateTimeField(auto_now_add=True)
    invoices_created = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=RunStatus.choices)
    triggered_by = models.CharField(max_length=20, choices=TriggerSource.choices, default=TriggerSource.SCHEDULED)
    error_detail = models.TextField(blank=True)

    class Meta:
        db_table = 'tenant_staff_pay_schedule_runs'
        ordering = ['-run_at']

    def __str__(self):
        return f"Run {self.id} for {self.schedule.coach.full_name} ({self.status})"


class CoachPayment(models.Model):
    """Record of actual payment to a coach for a given period."""

    class PeriodType(models.TextChoices):
        SESSION = 'SESSION', 'Per Session'
        MONTH = 'MONTH', 'Per Month'
        WEEK = 'WEEK', 'Per Week'

    academy = models.ForeignKey(
        Academy,
        on_delete=models.CASCADE,
        related_name='coach_payments',
        db_index=True,
    )
    coach = models.ForeignKey(
        Coach,
        on_delete=models.CASCADE,
        related_name='payments',
        db_index=True,
    )
    period_type = models.CharField(
        max_length=20,
        choices=PeriodType.choices,
        db_index=True,
    )
    period_start = models.DateField(
        help_text='Week start, month start, or session date',
    )
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
    )
    payment_date = models.DateField(default=timezone.localdate)
    payment_method = models.CharField(
        max_length=20,
        choices=Receipt.PaymentMethod.choices,
        default=Receipt.PaymentMethod.OTHER,
    )
    staff_invoice = models.ForeignKey(
        StaffInvoice,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invoice_payments',
        db_index=True,
    )
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tenant_coach_payments'
        ordering = ['-payment_date', '-created_at']
        indexes = [
            models.Index(fields=['academy', 'payment_date']),
            models.Index(fields=['coach', 'period_type', 'period_start']),
        ]
        verbose_name = 'Coach Payment'
        verbose_name_plural = 'Coach Payments'

    def __str__(self):
        return f"{self.coach.full_name} - {self.get_period_type_display()} - {self.amount} ({self.payment_date})"

    def clean(self):
        if self.coach_id and self.academy_id and self.coach.academy_id != self.academy_id:
            raise ValidationError({'coach': 'Coach must belong to the same academy.'})
        if self.staff_invoice_id and self.coach_id and self.staff_invoice.coach_id != self.coach_id:
            raise ValidationError({'staff_invoice': 'Staff invoice must be for the same coach.'})


class StaffReceipt(models.Model):
    """Receipt for a staff (coach) payment; one-to-one with CoachPayment."""

    academy = models.ForeignKey(
        Academy,
        on_delete=models.CASCADE,
        related_name='staff_receipts',
        db_index=True,
    )
    coach = models.ForeignKey(
        Coach,
        on_delete=models.CASCADE,
        related_name='staff_receipts',
        db_index=True,
    )
    staff_invoice = models.ForeignKey(
        StaffInvoice,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='receipts',
        db_index=True,
    )
    coach_payment = models.OneToOneField(
        CoachPayment,
        on_delete=models.CASCADE,
        related_name='receipt',
        db_index=True,
    )
    receipt_number = models.CharField(max_length=100, db_index=True)
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
    )
    payment_method = models.CharField(
        max_length=20,
        choices=Receipt.PaymentMethod.choices,
    )
    payment_date = models.DateField(default=timezone.localdate)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'tenant_staff_receipts'
        ordering = ['-payment_date', '-created_at']
        indexes = [
            models.Index(fields=['academy', 'receipt_number']),
            models.Index(fields=['academy', 'coach']),
            models.Index(fields=['academy', 'payment_date']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['academy', 'receipt_number'],
                name='unique_staff_receipt_number_per_academy',
            )
        ]

    def __str__(self):
        return f"{self.receipt_number} - {self.amount}"

    def clean(self):
        if self.coach_id and self.academy_id and self.coach.academy_id != self.academy_id:
            raise ValidationError({'coach': 'Coach must belong to the same academy.'})
        if self.coach_payment_id and self.coach_id and self.coach_payment.coach_id != self.coach_id:
            raise ValidationError({'coach_payment': 'Coach payment must be for the same coach.'})

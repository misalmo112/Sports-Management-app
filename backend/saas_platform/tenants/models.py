from django.db import models
from django.conf import settings
from django.utils import timezone
import uuid
from decimal import Decimal
from django.core.validators import MinValueValidator, MaxValueValidator
from shared.tenancy.schema import build_schema_name


class Academy(models.Model):
    """Core tenant entity for a sports academy."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, db_index=True)
    
    # Contact Information
    email = models.EmailField()
    phone = models.CharField(max_length=20, blank=True)
    website = models.URLField(blank=True)
    
    # Address
    address_line1 = models.CharField(max_length=255, blank=True)
    address_line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100, blank=True)
    timezone = models.CharField(max_length=50, default='UTC')
    currency = models.CharField(max_length=3, default='USD')

    # Student billing (tenant-level defaults)
    # When enabled, all student invoices will automatically apply this tax rate
    # to the net amount (subtotal - discount).
    global_tax_enabled = models.BooleanField(default=False, db_index=True)
    global_tax_rate_percent = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[
            MinValueValidator(Decimal('0.00')),
            MaxValueValidator(Decimal('100.00')),
        ],
    )
    
    # Onboarding Status
    onboarding_completed = models.BooleanField(default=False, db_index=True)
    
    # Status
    is_active = models.BooleanField(default=True, db_index=True)

    # Schema name for schema-based tenancy (Postgres)
    schema_name = models.CharField(
        max_length=63,
        unique=True,
        null=True,
        blank=True,
        db_index=True
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'academies'
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['onboarding_completed', 'is_active']),
        ]
        verbose_name = 'Academy'
        verbose_name_plural = 'Academies'
    
    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.schema_name:
            self.schema_name = build_schema_name(self.id)
        return super().save(*args, **kwargs)


class OnboardingState(models.Model):
    """Tracks onboarding wizard progress for an academy."""
    
    id = models.AutoField(primary_key=True)
    academy = models.OneToOneField(
        Academy,
        on_delete=models.CASCADE,
        related_name='onboarding_state'
    )
    
    # Current Step (1-6)
    # 1: Academy Profile
    # 2: Location
    # 3: Sports
    # 4: Age Categories
    # 5: Terms
    # 6: Pricing
    current_step = models.IntegerField(default=1, db_index=True)
    
    # Completion Status
    is_completed = models.BooleanField(default=False, db_index=True)
    
    # Concurrency Control
    # Prevents multiple admins from running wizard simultaneously
    locked_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='locked_onboarding_states'
    )
    locked_at = models.DateTimeField(null=True, blank=True)
    
    # Completion Tracking
    completed_by_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='completed_onboarding_states'
    )
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Step Completion Flags (for validation)
    step_1_completed = models.BooleanField(default=False)  # Profile
    step_2_completed = models.BooleanField(default=False)  # Location
    step_3_completed = models.BooleanField(default=False)  # Sports
    step_4_completed = models.BooleanField(default=False)  # Age Categories
    step_5_completed = models.BooleanField(default=False)  # Terms
    step_6_completed = models.BooleanField(default=False)  # Pricing

    # Per-step timestamps (analytics)
    step_1_completed_at = models.DateTimeField(null=True, blank=True)
    step_2_completed_at = models.DateTimeField(null=True, blank=True)
    step_3_completed_at = models.DateTimeField(null=True, blank=True)
    step_4_completed_at = models.DateTimeField(null=True, blank=True)
    step_5_completed_at = models.DateTimeField(null=True, blank=True)
    step_6_completed_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'onboarding_states'
        indexes = [
            models.Index(fields=['academy', 'is_completed']),
            models.Index(fields=['current_step']),
        ]
        verbose_name = 'Onboarding State'
        verbose_name_plural = 'Onboarding States'
    
    def __str__(self):
        return f"Onboarding for {self.academy.name} - Step {self.current_step}"
    
    def is_locked(self):
        """Check if onboarding is currently locked."""
        if not self.locked_by or not self.locked_at:
            return False
        
        # Check if lock has expired (30 minutes)
        lock_timeout = timezone.timedelta(minutes=30)
        if timezone.now() - self.locked_at > lock_timeout:
            return False
        
        return True
    
    def is_locked_by_user(self, user):
        """Check if onboarding is locked by a specific user."""
        if not self.is_locked():
            return False
        if not user:
            return False
        if self.locked_by_id and getattr(user, "id", None) == self.locked_by_id:
            return True
        locked_email = (getattr(self.locked_by, "email", "") or "").strip().lower()
        user_email = (getattr(user, "email", "") or "").strip().lower()
        return bool(locked_email and user_email and locked_email == user_email)


class AcademyWhatsAppConfig(models.Model):
    """Per-academy WhatsApp Business API configuration (platform layer)."""

    academy = models.OneToOneField(
        Academy,
        on_delete=models.CASCADE,
        related_name='whatsapp_config',
        db_index=True,
    )

    is_enabled = models.BooleanField(default=False, db_index=True)
    send_on_invoice_created = models.BooleanField(default=True)
    send_on_receipt_created = models.BooleanField(default=True)

    phone_number_id = models.CharField(max_length=64, blank=True)
    access_token_encrypted = models.TextField(blank=True)  # Fernet-encrypted token
    waba_id = models.CharField(max_length=64, blank=True)

    invoice_template_name = models.CharField(max_length=128, default='academy_invoice_created')
    receipt_template_name = models.CharField(max_length=128, default='academy_receipt_issued')
    template_language = models.CharField(max_length=16, default='en')

    verified = models.BooleanField(default=False)

    configured_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        on_delete=models.SET_NULL,
        related_name='configured_whatsapp_configs',
    )
    configured_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'platform_academy_whatsapp_config'
        verbose_name = 'Academy WhatsApp Configuration'
        verbose_name_plural = 'Academy WhatsApp Configurations'

    def __str__(self):
        return f"WhatsApp config for {self.academy.name}"

"""
Tenant models for onboarding wizard.

These models store academy-specific reference data created during onboarding:
- Location: Venues/facilities
- Sport: Sports offered by the academy
- AgeCategory: Age groups for organizing classes
- Term: Semesters/periods for organizing classes
- PricingItem: Pricing options for classes/programs
"""
from django.db import models
from django.core.validators import MinValueValidator
from saas_platform.tenants.models import Academy


class OnboardingChecklistState(models.Model):
    """
    Soft-gated setup checklist state (post-activation).

    This is intentionally separate from the activation wizard steps:
    - Activation is enforced via Academy.onboarding_completed + OnboardingState
    - Checklist is guidance for roster readiness and does not block APIs
    """

    id = models.AutoField(primary_key=True)
    academy = models.OneToOneField(
        Academy,
        on_delete=models.CASCADE,
        related_name="onboarding_checklist_state",
    )

    # Roster-readiness oriented checklist items
    members_imported = models.BooleanField(default=False)
    members_imported_at = models.DateTimeField(null=True, blank=True)
    staff_invited = models.BooleanField(default=False)
    staff_invited_at = models.DateTimeField(null=True, blank=True)
    first_program_created = models.BooleanField(default=False)
    first_program_created_at = models.DateTimeField(null=True, blank=True)
    age_categories_configured = models.BooleanField(default=False)
    age_categories_configured_at = models.DateTimeField(null=True, blank=True)
    attendance_defaults_configured = models.BooleanField(default=False)
    attendance_defaults_configured_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tenant_onboarding_checklist_state"
        indexes = [
            models.Index(fields=["academy"]),
        ]
        verbose_name = "Onboarding Checklist State"
        verbose_name_plural = "Onboarding Checklist States"

    def __str__(self):
        return f"OnboardingChecklistState({self.academy_id})"


class Location(models.Model):
    """Venue/facility location for an academy."""
    
    id = models.AutoField(primary_key=True)
    academy = models.ForeignKey(
        Academy,
        on_delete=models.CASCADE,
        related_name='locations'
    )
    
    name = models.CharField(max_length=255)
    
    # Address
    address_line1 = models.CharField(max_length=255, blank=True)
    address_line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100, blank=True)
    
    phone = models.CharField(max_length=20, blank=True)
    capacity = models.PositiveIntegerField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tenant_locations'
        unique_together = [['academy', 'name']]
        indexes = [
            models.Index(fields=['academy', 'name']),
        ]
        verbose_name = 'Location'
        verbose_name_plural = 'Locations'
    
    def __str__(self):
        return f"{self.name} ({self.academy.name})"


class Sport(models.Model):
    """Sport offered by an academy."""
    
    id = models.AutoField(primary_key=True)
    academy = models.ForeignKey(
        Academy,
        on_delete=models.CASCADE,
        related_name='sports'
    )
    
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    age_min = models.PositiveIntegerField(null=True, blank=True)
    age_max = models.PositiveIntegerField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tenant_sports'
        unique_together = [['academy', 'name']]
        indexes = [
            models.Index(fields=['academy', 'name']),
        ]
        verbose_name = 'Sport'
        verbose_name_plural = 'Sports'
    
    def __str__(self):
        return f"{self.name} ({self.academy.name})"
    
    def clean(self):
        """Validate age range."""
        from django.core.exceptions import ValidationError
        if self.age_min is not None and self.age_max is not None:
            if self.age_max <= self.age_min:
                raise ValidationError({
                    'age_max': 'Age max must be greater than age min.'
                })


class AgeCategory(models.Model):
    """Age category for organizing classes and programs."""
    
    id = models.AutoField(primary_key=True)
    academy = models.ForeignKey(
        Academy,
        on_delete=models.CASCADE,
        related_name='age_categories'
    )
    
    name = models.CharField(max_length=255)
    age_min = models.PositiveIntegerField()
    age_max = models.PositiveIntegerField()
    description = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tenant_age_categories'
        unique_together = [['academy', 'name']]
        indexes = [
            models.Index(fields=['academy', 'name']),
        ]
        verbose_name = 'Age Category'
        verbose_name_plural = 'Age Categories'
    
    def __str__(self):
        return f"{self.name} ({self.academy.name})"
    
    def clean(self):
        """Validate age range."""
        from django.core.exceptions import ValidationError
        if self.age_max <= self.age_min:
            raise ValidationError({
                'age_max': 'Age max must be greater than age min.'
            })


class Term(models.Model):
    """Term/semester/period for organizing classes and enrollments."""
    
    id = models.AutoField(primary_key=True)
    academy = models.ForeignKey(
        Academy,
        on_delete=models.CASCADE,
        related_name='terms'
    )
    
    name = models.CharField(max_length=255)
    start_date = models.DateField()
    end_date = models.DateField()
    description = models.TextField(blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tenant_terms'
        unique_together = [['academy', 'name', 'start_date']]
        indexes = [
            models.Index(fields=['academy', 'name']),
            models.Index(fields=['academy', 'start_date']),
        ]
        verbose_name = 'Term'
        verbose_name_plural = 'Terms'
    
    def __str__(self):
        return f"{self.name} ({self.academy.name})"
    
    def clean(self):
        """Validate date range."""
        from django.core.exceptions import ValidationError
        if self.end_date <= self.start_date:
            raise ValidationError({
                'end_date': 'End date must be after start date.'
            })


class PricingItem(models.Model):
    """Pricing item for classes and programs."""
    
    class DurationType(models.TextChoices):
        MONTHLY = 'MONTHLY', 'Monthly'
        WEEKLY = 'WEEKLY', 'Weekly'
        SESSION = 'SESSION', 'Session'
        CUSTOM = 'CUSTOM', 'Custom'
    
    id = models.AutoField(primary_key=True)
    academy = models.ForeignKey(
        Academy,
        on_delete=models.CASCADE,
        related_name='pricing_items'
    )
    
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    duration_type = models.CharField(
        max_length=20,
        choices=DurationType.choices
    )
    duration_value = models.PositiveIntegerField(
        validators=[MinValueValidator(1)]
    )
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(0)]
    )
    currency = models.CharField(max_length=3, default='USD')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tenant_pricing_items'
        unique_together = [['academy', 'name', 'duration_type']]
        indexes = [
            models.Index(fields=['academy', 'name']),
        ]
        verbose_name = 'Pricing Item'
        verbose_name_plural = 'Pricing Items'
    
    def __str__(self):
        return f"{self.name} ({self.academy.name})"

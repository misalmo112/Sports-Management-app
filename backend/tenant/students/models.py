from django.db import models
from django.core.validators import EmailValidator
from saas_platform.tenants.models import Academy


class Parent(models.Model):
    """Parent/Guardian model for students."""
    
    academy = models.ForeignKey(
        Academy,
        on_delete=models.CASCADE,
        related_name='parents',
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
    phone_numbers = models.JSONField(default=list, blank=True)
    
    # Address
    address_line1 = models.CharField(max_length=255, blank=True)
    address_line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=100, blank=True)
    
    # Status
    is_active = models.BooleanField(default=True, db_index=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tenant_parents'
        indexes = [
            models.Index(fields=['academy', 'email']),
            models.Index(fields=['academy', 'is_active']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['academy', 'email'],
                name='unique_parent_email_per_academy'
            )
        ]
        verbose_name = 'Parent'
        verbose_name_plural = 'Parents'
        ordering = ['last_name', 'first_name']
    
    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.email})"
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


class Student(models.Model):
    """Student model for academy participants."""
    
    class Gender(models.TextChoices):
        MALE = 'MALE', 'Male'
        FEMALE = 'FEMALE', 'Female'
        OTHER = 'OTHER', 'Other'
        PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY', 'Prefer not to say'
    
    academy = models.ForeignKey(
        Academy,
        on_delete=models.CASCADE,
        related_name='students',
        db_index=True
    )
    
    # Parent Relationship
    parent = models.ForeignKey(
        'Parent',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='children',
        db_index=True
    )
    
    # Personal Information
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(
        max_length=20,
        choices=Gender.choices,
        blank=True
    )
    
    # Contact Information (optional, may use parent's)
    email = models.EmailField(max_length=255, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    
    # Emirates ID (format: XXX-XXXX-XXXXXXXX)
    emirates_id = models.CharField(max_length=20, blank=True, null=True)
    
    # Emergency Contact
    emergency_contact_name = models.CharField(max_length=255, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    emergency_contact_relationship = models.CharField(max_length=100, blank=True)
    
    # Medical Information
    medical_notes = models.TextField(blank=True)
    allergies = models.TextField(blank=True)
    
    # Status
    is_active = models.BooleanField(default=True, db_index=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'tenant_students'
        indexes = [
            models.Index(fields=['academy', 'parent']),
            models.Index(fields=['academy', 'is_active']),
            models.Index(fields=['academy', 'last_name', 'first_name']),
        ]
        verbose_name = 'Student'
        verbose_name_plural = 'Students'
        ordering = ['last_name', 'first_name']
    
    def __str__(self):
        return f"{self.first_name} {self.last_name}"
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
    
    @property
    def age(self):
        """Calculate age from date_of_birth."""
        if not self.date_of_birth:
            return None
        from datetime import date
        today = date.today()
        return today.year - self.date_of_birth.year - (
            (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
        )

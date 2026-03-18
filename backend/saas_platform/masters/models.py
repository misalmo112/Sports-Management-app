"""
Platform master data: Currency, Timezone, and ExchangeRate.
Single source of truth; tenant masters API and academy validation read from here.
"""
from decimal import Decimal
from django.db import models
from django.utils import timezone


class Currency(models.Model):
    """Currency code and display name (platform-wide)."""

    id = models.AutoField(primary_key=True)
    code = models.CharField(max_length=3, unique=True, db_index=True)
    name = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    sort_order = models.PositiveIntegerField(default=0, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'platform_currencies'
        ordering = ['sort_order', 'code']
        verbose_name = 'Currency'
        verbose_name_plural = 'Currencies'

    def __str__(self):
        return f"{self.code}" + (f" ({self.name})" if self.name else "")


class Timezone(models.Model):
    """Timezone identifier (e.g. America/New_York) for platform/academies."""

    id = models.AutoField(primary_key=True)
    code = models.CharField(max_length=63, unique=True, db_index=True)
    name = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    sort_order = models.PositiveIntegerField(default=0, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'platform_timezones'
        ordering = ['sort_order', 'code']
        verbose_name = 'Timezone'
        verbose_name_plural = 'Timezones'

    def __str__(self):
        return self.code


class Country(models.Model):
    """Country master (platform-wide, ISO alpha-3 code)."""

    id = models.AutoField(primary_key=True)
    code = models.CharField(max_length=3, unique=True, db_index=True)
    name = models.CharField(max_length=100)
    phone_code = models.CharField(max_length=10, blank=True)
    region = models.CharField(max_length=50, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    sort_order = models.PositiveIntegerField(default=0, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'platform_countries'
        ordering = ['sort_order', 'name']
        verbose_name = 'Country'
        verbose_name_plural = 'Countries'

    def __str__(self):
        return f"{self.code} ({self.name})"


class ExchangeRate(models.Model):
    """Exchange rate from a base currency to a target currency for a given date (synced from Frankfurter)."""

    base_currency = models.CharField(max_length=3, db_index=True)
    currency = models.CharField(max_length=3, db_index=True)
    rate = models.DecimalField(max_digits=20, decimal_places=8)
    date = models.DateField(db_index=True)
    fetched_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'platform_exchange_rates'
        ordering = ['-date', 'base_currency', 'currency']
        verbose_name = 'Exchange rate'
        verbose_name_plural = 'Exchange rates'
        constraints = [
            models.UniqueConstraint(
                fields=['base_currency', 'currency', 'date'],
                name='platform_exchange_rates_unique_base_currency_date',
            ),
        ]

    def __str__(self):
        return f"{self.base_currency} -> {self.currency} = {self.rate} ({self.date})"

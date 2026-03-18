"""
Tests for masters sync services (Frankfurter and WorldTimeAPI) with mocked HTTP.
"""
from datetime import date
from decimal import Decimal
from unittest.mock import patch, MagicMock

from django.test import TestCase

from saas_platform.masters.models import Currency, ExchangeRate, Timezone
from saas_platform.masters import services


class FrankfurterCurrenciesSyncTests(TestCase):
    """Test sync_currencies_from_frankfurter with mocked requests."""

    @patch("saas_platform.masters.services.requests.get")
    def test_sync_currencies_creates_and_updates(self, mock_get):
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {
                "USD": "US Dollar",
                "EUR": "Euro",
            },
        )
        mock_get.return_value.raise_for_status = MagicMock()

        services.sync_currencies_from_frankfurter()

        self.assertEqual(Currency.objects.count(), 2)
        usd = Currency.objects.get(code="USD")
        self.assertEqual(usd.name, "US Dollar")
        self.assertTrue(usd.is_active)
        eur = Currency.objects.get(code="EUR")
        self.assertEqual(eur.name, "Euro")

    @patch("saas_platform.masters.services.requests.get")
    def test_sync_currencies_does_not_remove_existing(self, mock_get):
        Currency.objects.create(code="LEGACY", name="Legacy", is_active=True, sort_order=0)
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {"USD": "US Dollar"},
        )
        mock_get.return_value.raise_for_status = MagicMock()

        services.sync_currencies_from_frankfurter()

        self.assertTrue(Currency.objects.filter(code="LEGACY").exists())
        self.assertTrue(Currency.objects.filter(code="USD").exists())

    @patch("saas_platform.masters.services.requests.get")
    def test_sync_currencies_updates_name(self, mock_get):
        Currency.objects.create(code="USD", name="Old", is_active=True, sort_order=0)
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {"USD": "US Dollar"},
        )
        mock_get.return_value.raise_for_status = MagicMock()

        services.sync_currencies_from_frankfurter()

        usd = Currency.objects.get(code="USD")
        self.assertEqual(usd.name, "US Dollar")


class FrankfurterRatesSyncTests(TestCase):
    """Test sync_exchange_rates_from_frankfurter with mocked requests."""

    @patch("saas_platform.masters.services.requests.get")
    def test_sync_rates_stores_latest(self, mock_get):
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {
                "base": "EUR",
                "date": "2024-01-15",
                "rates": {"USD": 1.08, "GBP": 0.85},
            },
        )
        mock_get.return_value.raise_for_status = MagicMock()

        services.sync_exchange_rates_from_frankfurter()

        self.assertEqual(ExchangeRate.objects.filter(base_currency="EUR").count(), 2)
        usd_rate = ExchangeRate.objects.get(base_currency="EUR", currency="USD")
        self.assertEqual(usd_rate.rate, Decimal("1.08"))
        self.assertEqual(str(usd_rate.date), "2024-01-15")

    @patch("saas_platform.masters.services.requests.get")
    def test_sync_rates_updates_same_date(self, mock_get):
        ExchangeRate.objects.create(
            base_currency="EUR",
            currency="USD",
            rate=Decimal("1.00"),
            date=date(2024, 1, 15),
        )
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: {
                "base": "EUR",
                "date": "2024-01-15",
                "rates": {"USD": 1.09},
            },
        )
        mock_get.return_value.raise_for_status = MagicMock()

        services.sync_exchange_rates_from_frankfurter()

        self.assertEqual(ExchangeRate.objects.filter(base_currency="EUR", currency="USD").count(), 1)
        usd_rate = ExchangeRate.objects.get(base_currency="EUR", currency="USD")
        self.assertEqual(usd_rate.rate, Decimal("1.09"))


class WorldTimeAPISyncTests(TestCase):
    """Test sync_timezones_from_worldtimeapi with mocked requests."""

    @patch("saas_platform.masters.services.requests.get")
    def test_sync_timezones_adds_new(self, mock_get):
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: ["Europe/London", "America/New_York"],
        )
        mock_get.return_value.raise_for_status = MagicMock()

        services.sync_timezones_from_worldtimeapi()

        self.assertEqual(Timezone.objects.count(), 2)
        self.assertTrue(Timezone.objects.filter(code="Europe/London").exists())
        self.assertTrue(Timezone.objects.filter(code="America/New_York").exists())

    @patch("saas_platform.masters.services.requests.get")
    def test_sync_timezones_does_not_remove_existing(self, mock_get):
        Timezone.objects.create(code="UTC", name="UTC", is_active=True, sort_order=0)
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: ["Europe/London"],
        )
        mock_get.return_value.raise_for_status = MagicMock()

        services.sync_timezones_from_worldtimeapi()

        self.assertTrue(Timezone.objects.filter(code="UTC").exists())
        self.assertTrue(Timezone.objects.filter(code="Europe/London").exists())

    @patch("saas_platform.masters.services.requests.get")
    def test_sync_timezones_no_duplicates(self, mock_get):
        Timezone.objects.create(code="Europe/London", name="London", is_active=True, sort_order=0)
        mock_get.return_value = MagicMock(
            status_code=200,
            json=lambda: ["Europe/London", "America/New_York"],
        )
        mock_get.return_value.raise_for_status = MagicMock()

        services.sync_timezones_from_worldtimeapi()

        self.assertEqual(Timezone.objects.filter(code="Europe/London").count(), 1)
        self.assertEqual(Timezone.objects.count(), 2)

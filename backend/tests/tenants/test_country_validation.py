from django.test import TestCase
from rest_framework import serializers

from saas_platform.masters.models import Country
from saas_platform.tenants.serializers import AcademyCreateSerializer


class AcademyCountryValidationTests(TestCase):
    def setUp(self):
        Country.objects.create(code="ARE", name="United Arab Emirates", is_active=True)
        Country.objects.create(code="USA", name="United States of America", is_active=False)

    def test_accepts_valid_active_country_code(self):
        data = {
            "name": "Valid Country Academy",
            "email": "academy@example.com",
            "country": "ARE",
            "address_line1": "123 Test St",
            "phone": "+12345678901",
        }
        serializer = AcademyCreateSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertEqual(serializer.validated_data["country"], "ARE")

    def test_rejects_non_alpha3_country_value(self):
        data = {
            "name": "Bad Country Academy",
            "email": "academy@example.com",
            "country": "AE",
            "address_line1": "123 Test St",
            "phone": "+12345678901",
        }
        serializer = AcademyCreateSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("country", serializer.errors)
        self.assertEqual(
            serializer.errors["country"][0],
            "Country must be a 3-letter ISO alpha-3 code.",
        )

    def test_rejects_inactive_country_code(self):
        data = {
            "name": "Inactive Country Academy",
            "email": "academy@example.com",
            "country": "USA",
            "address_line1": "123 Test St",
            "phone": "+12345678901",
        }
        serializer = AcademyCreateSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("country", serializer.errors)
        self.assertEqual(serializer.errors["country"][0], "Unsupported country code.")


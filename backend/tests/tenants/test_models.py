from django.test import TestCase
from saas_platform.tenants.models import Academy


class AcademyModelTest(TestCase):
    """Test Academy model."""
    
    def setUp(self):
        self.academy_data = {
            'name': 'Elite Sports Academy',
            'slug': 'elite-sports',
            'email': 'contact@elite.com',
            'phone': '+1234567890',
            'website': 'https://elite.com',
            'address_line1': '123 Main St',
            'city': 'New York',
            'state': 'NY',
            'postal_code': '10001',
            'country': 'USA',
            'timezone': 'America/New_York'
        }
    
    def test_create_academy(self):
        """Test creating an academy."""
        academy = Academy.objects.create(**self.academy_data)
        self.assertEqual(academy.name, 'Elite Sports Academy')
        self.assertEqual(academy.slug, 'elite-sports')
        self.assertEqual(academy.email, 'contact@elite.com')
        self.assertFalse(academy.onboarding_completed)
        self.assertTrue(academy.is_active)
    
    def test_academy_str(self):
        """Test academy string representation."""
        academy = Academy.objects.create(**self.academy_data)
        self.assertEqual(str(academy), 'Elite Sports Academy')
    
    def test_academy_unique_slug(self):
        """Test that academy slug must be unique."""
        Academy.objects.create(**self.academy_data)
        with self.assertRaises(Exception):  # IntegrityError
            Academy.objects.create(**self.academy_data)
    
    def test_academy_uuid_primary_key(self):
        """Test that academy uses UUID as primary key."""
        import uuid
        academy = Academy.objects.create(**self.academy_data)
        self.assertIsNotNone(academy.id)
        self.assertIsInstance(academy.id, uuid.UUID)  # UUID is a UUID object

from datetime import date

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase
from django.contrib.auth import get_user_model
from saas_platform.tenants.models import Academy
from tenant.coaches.models import Coach, StaffPaySchedule

User = get_user_model()


class CoachModelTest(TestCase):
    """Test Coach model."""
    
    def setUp(self):
        self.academy = Academy.objects.create(
            name="Test Academy",
            slug="test-academy",
            email="test@academy.com"
        )
    
    def test_create_coach(self):
        """Test creating a coach."""
        coach = Coach.objects.create(
            academy=self.academy,
            first_name="Mike",
            last_name="Coach",
            email="mike@example.com",
            specialization="Soccer"
        )
        self.assertEqual(coach.full_name, "Mike Coach")
        self.assertTrue(coach.is_active)
        self.assertEqual(coach.academy, self.academy)
    
    def test_coach_email_uniqueness_per_academy(self):
        """Test email uniqueness per academy."""
        Coach.objects.create(
            academy=self.academy,
            first_name="Mike",
            last_name="Coach",
            email="mike@example.com"
        )
        
        # Same email in same academy should fail
        with self.assertRaises(Exception):
            Coach.objects.create(
                academy=self.academy,
                first_name="John",
                last_name="Coach",
                email="mike@example.com"
            )
    
    def test_coach_with_user(self):
        """Test creating coach linked to user."""
        user = User.objects.create_user(
            email="coach@example.com",
            password="testpass123",
            role=User.Role.COACH,
            academy=self.academy
        )
        
        coach = Coach.objects.create(
            academy=self.academy,
            user=user,
            first_name="Mike",
            last_name="Coach",
            email="mike@example.com"
        )
        self.assertEqual(coach.user, user)
    
    def test_soft_delete(self):
        """Test soft delete functionality."""
        coach = Coach.objects.create(
            academy=self.academy,
            first_name="Mike",
            last_name="Coach",
            email="mike@example.com"
        )
        
        coach.is_active = False
        coach.save()
        
        self.assertFalse(coach.is_active)
        self.assertIn(coach, Coach.objects.all())
        self.assertNotIn(coach, Coach.objects.filter(is_active=True))


class StaffPayScheduleModelTest(TestCase):
    def setUp(self):
        self.academy = Academy.objects.create(
            name="Schedule Academy",
            slug="schedule-academy",
            email="schedule@academy.com",
        )
        self.coach = Coach.objects.create(
            academy=self.academy,
            first_name="Sara",
            last_name="Coach",
            email="sara@example.com",
        )

    def test_session_without_sessions_per_cycle_raises_validation_error(self):
        schedule = StaffPaySchedule(
            academy=self.academy,
            coach=self.coach,
            billing_type=StaffPaySchedule.BillingType.SESSION,
            cycle_start_date=date(2026, 1, 1),
        )
        with self.assertRaises(ValidationError):
            schedule.full_clean()

    def test_monthly_without_billing_day_raises_validation_error(self):
        schedule = StaffPaySchedule(
            academy=self.academy,
            coach=self.coach,
            billing_type=StaffPaySchedule.BillingType.MONTHLY,
            cycle_start_date=date(2026, 1, 1),
        )
        with self.assertRaises(ValidationError):
            schedule.full_clean()

    def test_weekly_with_invalid_billing_day_of_week_raises_validation_error(self):
        schedule = StaffPaySchedule(
            academy=self.academy,
            coach=self.coach,
            billing_type=StaffPaySchedule.BillingType.WEEKLY,
            billing_day_of_week=7,
            cycle_start_date=date(2026, 1, 1),
        )
        with self.assertRaises(ValidationError):
            schedule.full_clean()

    def test_unique_constraint_prevents_duplicate_monthly_schedule_per_coach(self):
        StaffPaySchedule.objects.create(
            academy=self.academy,
            coach=self.coach,
            billing_type=StaffPaySchedule.BillingType.MONTHLY,
            amount='1000.00',
            billing_day=5,
            cycle_start_date=date(2026, 1, 1),
        )
        with self.assertRaises(IntegrityError):
            StaffPaySchedule.objects.create(
                academy=self.academy,
                coach=self.coach,
                billing_type=StaffPaySchedule.BillingType.MONTHLY,
                amount='1200.00',
                billing_day=10,
                cycle_start_date=date(2026, 1, 1),
            )

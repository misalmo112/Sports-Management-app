from datetime import date
from decimal import Decimal
import os
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone

from saas_platform.finance.tasks import sync_payments_to_xero
from saas_platform.subscriptions.models import (
    PaymentMethod,
    Plan,
    PlatformPayment,
    Subscription,
    SubscriptionStatus,
)
from saas_platform.tenants.models import Academy


class SyncPaymentsToXeroTaskTestCase(TestCase):
    def setUp(self) -> None:
        self.plan = Plan.objects.create(
            name="Xero Sync Plan",
            slug="xero-sync-plan",
            price_monthly=Decimal("99.00"),
            currency="USD",
            limits_json={"max_students": 100, "storage_bytes": 10737418240},
            is_active=True,
            is_public=True,
        )

        self.academy = Academy.objects.create(
            name="Xero Sync Academy",
            slug="xero-sync-academy",
            email="xero-sync-academy@example.com",
        )

        self.subscription = Subscription.objects.create(
            academy=self.academy,
            plan=self.plan,
            status=SubscriptionStatus.ACTIVE,
            is_current=True,
            start_at=timezone.now(),
        )

    def create_payment(self, *, synced_at=None) -> PlatformPayment:
        return PlatformPayment.objects.create(
            subscription=self.subscription,
            academy=self.academy,
            amount=Decimal("120.00"),
            currency="USD",
            payment_method=PaymentMethod.BANK_TRANSFER,
            payment_date=date(2025, 3, 10),
            synced_at=synced_at,
        )

    def _patch_xero_env(self, *, client_id: str | None, client_secret: str | None):
        # Treat empty strings as "missing" since XeroClient checks truthiness.
        return patch.dict(
            os.environ,
            {
                "XERO_CLIENT_ID": client_id or "",
                "XERO_CLIENT_SECRET": client_secret or "",
            },
            clear=False,
        )

    def test_missing_xero_client_id_logs_warning_and_skips_without_retry(self):
        self.create_payment()
        with self.assertLogs("saas_platform.finance.tasks", level="WARNING") as cm, self._patch_xero_env(
            client_id=None, client_secret="xero-secret"
        ):
            sync_payments_to_xero()

        joined = "\n".join(cm.output)
        self.assertIn("Xero sync skipped", joined)
        self.assertIn("XERO_CLIENT_ID", joined)

    def test_missing_xero_client_secret_logs_warning_and_skips_without_retry(self):
        self.create_payment()
        with self.assertLogs("saas_platform.finance.tasks", level="WARNING") as cm, self._patch_xero_env(
            client_id="xero-id", client_secret=None
        ):
            sync_payments_to_xero()

        joined = "\n".join(cm.output)
        self.assertIn("Xero sync skipped", joined)
        self.assertIn("XERO_CLIENT_SECRET", joined)

    def test_credentials_present_but_create_invoice_exception_retries(self):
        self.create_payment()
        with self._patch_xero_env(client_id="xero-id", client_secret="xero-secret"), patch(
            "saas_platform.finance.tasks.XeroClient.create_invoice",
            side_effect=RuntimeError("Boom"),
        ), patch.object(
            sync_payments_to_xero,
            "retry",
            wraps=sync_payments_to_xero.retry,
        ) as retry_mock:
            with self.assertRaises(RuntimeError) as exc:
                sync_payments_to_xero()

        self.assertIn("Boom", str(exc.exception))
        retry_mock.assert_called()

    def test_create_invoice_not_implemented_does_not_autoretry(self):
        self.create_payment()
        with self._patch_xero_env(client_id="xero-id", client_secret="xero-secret"), patch(
            "saas_platform.finance.tasks.XeroClient.create_invoice",
            side_effect=NotImplementedError("Xero OAuth2 client not yet implemented."),
        ), patch.object(
            sync_payments_to_xero,
            "retry",
            wraps=sync_payments_to_xero.retry,
        ) as retry_mock:
            with self.assertRaises(NotImplementedError):
                sync_payments_to_xero()

        retry_mock.assert_not_called()

    def test_already_synced_payments_are_skipped_unconditionally(self):
        payment = self.create_payment(synced_at=timezone.now())

        with self._patch_xero_env(client_id="xero-id", client_secret="xero-secret"), patch(
            "saas_platform.finance.tasks.XeroClient.create_invoice"
        ) as create_invoice_mock:
            sync_payments_to_xero()

        create_invoice_mock.assert_not_called()
        payment.refresh_from_db()
        self.assertEqual(payment.external_ref, "")
        self.assertIsNotNone(payment.synced_at)

    def test_successful_sync_stamps_external_ref_and_synced_at(self):
        payment = self.create_payment(synced_at=None)

        with self._patch_xero_env(client_id="xero-id", client_secret="xero-secret"), patch(
            "saas_platform.finance.tasks.XeroClient.create_invoice",
            return_value="xero-external-ref-123",
        ):
            sync_payments_to_xero()

        payment.refresh_from_db()
        self.assertEqual(payment.external_ref, "xero-external-ref-123")
        self.assertIsNotNone(payment.synced_at)


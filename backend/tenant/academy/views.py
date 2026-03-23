"""
Views for tenant academy settings.
"""
from rest_framework.generics import RetrieveAPIView, RetrieveUpdateAPIView
from shared.permissions.tenant import IsTenantAdmin
from tenant.academy.serializers import (
    AcademySettingsSerializer,
    AcademyTaxSettingsSerializer,
    AcademySubscriptionSummarySerializer,
    AcademyUsageSummarySerializer,
)


class AcademySettingsView(RetrieveUpdateAPIView):
    required_tenant_module = 'organization-settings'
    serializer_class = AcademySettingsSerializer
    permission_classes = [IsTenantAdmin]

    def get_object(self):
        return self.request.academy


class AcademyTaxSettingsView(RetrieveUpdateAPIView):
    """Retrieve/update academy-wide default student invoice tax settings."""

    required_tenant_module = 'tax-settings'
    serializer_class = AcademyTaxSettingsSerializer
    permission_classes = [IsTenantAdmin]

    def get_object(self):
        return self.request.academy


class AcademySubscriptionView(RetrieveAPIView):
    required_tenant_module = 'academy-settings'
    serializer_class = AcademySubscriptionSummarySerializer
    permission_classes = [IsTenantAdmin]

    def get_object(self):
        return self.request.academy


class AcademyUsageView(RetrieveAPIView):
    required_tenant_module = 'usage-settings'
    serializer_class = AcademyUsageSummarySerializer
    permission_classes = [IsTenantAdmin]

    def get_object(self):
        return self.request.academy

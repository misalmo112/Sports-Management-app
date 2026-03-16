"""
Views for tenant academy settings.
"""
from rest_framework.generics import RetrieveAPIView, RetrieveUpdateAPIView
from shared.permissions.tenant import IsTenantAdmin
from tenant.academy.serializers import (
    AcademySettingsSerializer,
    AcademySubscriptionSummarySerializer,
    AcademyUsageSummarySerializer,
)


class AcademySettingsView(RetrieveUpdateAPIView):
    serializer_class = AcademySettingsSerializer
    permission_classes = [IsTenantAdmin]

    def get_object(self):
        return self.request.academy


class AcademySubscriptionView(RetrieveAPIView):
    serializer_class = AcademySubscriptionSummarySerializer
    permission_classes = [IsTenantAdmin]

    def get_object(self):
        return self.request.academy


class AcademyUsageView(RetrieveAPIView):
    serializer_class = AcademyUsageSummarySerializer
    permission_classes = [IsTenantAdmin]

    def get_object(self):
        return self.request.academy

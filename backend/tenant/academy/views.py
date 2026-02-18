"""
Views for tenant academy settings.
"""
from rest_framework.generics import RetrieveUpdateAPIView
from shared.permissions.tenant import IsTenantAdmin
from tenant.academy.serializers import AcademySettingsSerializer


class AcademySettingsView(RetrieveUpdateAPIView):
    serializer_class = AcademySettingsSerializer
    permission_classes = [IsTenantAdmin]

    def get_object(self):
        return self.request.academy

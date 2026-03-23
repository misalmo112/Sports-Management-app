from django.http import Http404
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from shared.permissions.tenant import IsTenantAdmin
from shared.services.quota import QuotaExceededError
from tenant.bulk_imports.serializers import BulkImportCommitSerializer, BulkImportUploadSerializer
from tenant.bulk_imports.services import SCHEMAS, commit_import, get_import_schema, preview_import


def _validate_dataset_type(dataset_type):
    if dataset_type not in SCHEMAS:
        raise Http404()


class BulkImportSchemaView(generics.GenericAPIView):
    required_tenant_module = 'bulk-actions'
    permission_classes = [IsAuthenticated, IsTenantAdmin]

    def get(self, request, dataset_type):
        _validate_dataset_type(dataset_type)
        return Response(get_import_schema(dataset_type))


class BulkImportPreviewView(generics.GenericAPIView):
    required_tenant_module = 'bulk-actions'
    serializer_class = BulkImportUploadSerializer
    permission_classes = [IsAuthenticated, IsTenantAdmin]

    def post(self, request, dataset_type):
        _validate_dataset_type(dataset_type)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = preview_import(
            dataset_type=dataset_type,
            uploaded_file=serializer.validated_data['file'],
            academy=request.academy,
            user=request.user,
        )
        return Response(result, status=status.HTTP_200_OK)


class BulkImportCommitView(generics.GenericAPIView):
    required_tenant_module = 'bulk-actions'
    serializer_class = BulkImportCommitSerializer
    permission_classes = [IsAuthenticated, IsTenantAdmin]

    def post(self, request, dataset_type):
        _validate_dataset_type(dataset_type)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            result = commit_import(
                dataset_type=dataset_type,
                preview_token=serializer.validated_data['preview_token'],
                academy=request.academy,
                user=request.user,
                request=request,
            )
        except QuotaExceededError as exc:
            return Response(
                {
                    'detail': str(exc),
                    'quota_type': exc.quota_type,
                    'current_usage': exc.current_usage,
                    'limit': exc.limit,
                    'requested': exc.requested,
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        return Response(result, status=status.HTTP_200_OK)

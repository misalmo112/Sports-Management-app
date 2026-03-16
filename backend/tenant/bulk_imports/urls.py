from django.urls import path

from tenant.bulk_imports.views import BulkImportCommitView, BulkImportPreviewView, BulkImportSchemaView


urlpatterns = [
    path('bulk-imports/<str:dataset_type>/schema/', BulkImportSchemaView.as_view(), name='bulk-import-schema'),
    path('bulk-imports/<str:dataset_type>/preview/', BulkImportPreviewView.as_view(), name='bulk-import-preview'),
    path('bulk-imports/<str:dataset_type>/commit/', BulkImportCommitView.as_view(), name='bulk-import-commit'),
]

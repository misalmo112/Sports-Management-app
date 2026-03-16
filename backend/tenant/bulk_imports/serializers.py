from rest_framework import serializers


class BulkImportUploadSerializer(serializers.Serializer):
    """Validate uploaded CSV files used for preview."""

    file = serializers.FileField(required=True)

    def validate_file(self, value):
        name = (value.name or '').lower()
        if not name.endswith('.csv'):
            raise serializers.ValidationError('Please upload a CSV file.')
        if value.size <= 0:
            raise serializers.ValidationError('Uploaded file is empty.')
        return value


class BulkImportCommitSerializer(serializers.Serializer):
    """Validate preview tokens used for commit."""

    preview_token = serializers.CharField(required=True, allow_blank=False)

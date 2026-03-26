from rest_framework import serializers

from tenant.notifications.models import NotificationLog


class NotificationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificationLog
        fields = [
            "channel",
            "status",
            "sent_at",
            "error_detail",
            "recipient_email",
            "recipient_phone",
        ]


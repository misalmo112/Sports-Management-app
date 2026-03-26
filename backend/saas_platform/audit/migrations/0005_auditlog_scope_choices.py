from django.db import migrations, models


def backfill_scope(apps, schema_editor):
    AuditLog = apps.get_model('audit', 'AuditLog')
    AuditLog.objects.filter(scope='').update(scope='PLATFORM')
    AuditLog.objects.filter(scope__isnull=True).update(scope='PLATFORM')


class Migration(migrations.Migration):

    dependencies = [
        ('audit', '0004_resource_type_user'),
    ]

    operations = [
        migrations.AddField(
            model_name='auditlog',
            name='scope',
            field=models.CharField(
                choices=[('PLATFORM', 'Platform'), ('TENANT', 'Tenant')],
                default='PLATFORM',
                db_index=True,
                max_length=10,
            ),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(
                fields=['scope', 'academy', 'created_at'],
                name='audit_logs_scope_academy_created_idx',
            ),
        ),
        migrations.AlterField(
            model_name='auditlog',
            name='action',
            field=models.CharField(
                choices=[
                    ('CREATE', 'Create'),
                    ('UPDATE', 'Update'),
                    ('DELETE', 'Delete'),
                    ('PLAN_CHANGE', 'Plan Change'),
                    ('QUOTA_UPDATE', 'Quota Update'),
                    ('LOGIN', 'Login'),
                    ('LOGOUT', 'Logout'),
                    ('EXPORT', 'Export'),
                    ('ENROLL', 'Enroll'),
                    ('UNENROLL', 'Unenroll'),
                    ('MARK_PAID', 'Mark Paid'),
                    ('INVITE', 'Invite'),
                    ('BULK_DELETE', 'Bulk Delete'),
                ],
                db_index=True,
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name='auditlog',
            name='resource_type',
            field=models.CharField(
                choices=[
                    ('ACADEMY', 'Academy'),
                    ('SUBSCRIPTION', 'Subscription'),
                    ('PLAN', 'Plan'),
                    ('QUOTA', 'Quota'),
                    ('USER', 'User'),
                    ('STUDENT', 'Student'),
                    ('COACH', 'Coach'),
                    ('CLASS', 'Class'),
                    ('ENROLLMENT', 'Enrollment'),
                    ('ATTENDANCE', 'Attendance'),
                    ('INVOICE', 'Invoice'),
                    ('PAYMENT', 'Payment'),
                    ('FACILITY', 'Facility'),
                    ('MEDIA', 'Media'),
                    ('COMMUNICATION', 'Communication'),
                    ('SETTING', 'Setting'),
                ],
                db_index=True,
                max_length=20,
            ),
        ),
        migrations.RunPython(backfill_scope, migrations.RunPython.noop),
    ]

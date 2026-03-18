from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from django.apps import apps
from django.utils import timezone
from django.db.utils import ProgrammingError
import importlib.util
from saas_platform.tenants.models import Academy
from shared.tenancy.schema import build_schema_name, is_valid_schema_name


TENANT_APP_LABELS = [
    'onboarding',
    'students',
    'coaches',
    'classes',
    'attendance',
    'users',
    'billing',
    'facilities',
    'media',
    'communication',
    'academy',
    'masters',
    'overview',
    'reports',
    'quotas',
]

# Representative tables used to detect incomplete tenant schemas per app.
# If a representative table is missing, we clear that app's migration history
# in the schema and allow migrations to recreate it.
REP_TABLE_BY_APP = {
    "onboarding": "tenant_locations",
    "students": "tenant_students",
    "coaches": "tenant_coaches",
    "classes": "tenant_classes",
    "attendance": "tenant_attendance",
    "billing": "tenant_invoices",
    "facilities": "tenant_bills",
    "media": "tenant_media_files",
    "communication": "tenant_complaints",
    "quotas": "tenant_usages",
}

SHARED_APP_LABELS = [
    'contenttypes',
    'auth',
    'sessions',
    'tenants',
    'subscriptions',
]
SHARED_PRE_MIGRATION_LABELS = [
    'contenttypes',
    'auth',
    'sessions',
]
SHARED_DEFERRED_LABELS = [
    'subscriptions',
]


class Command(BaseCommand):
    help = "Run tenant app migrations in a specific schema."

    def add_arguments(self, parser):
        parser.add_argument('--academy', type=str, help='Academy UUID')
        parser.add_argument('--schema', type=str, help='Schema name (optional)')
        parser.add_argument('--apps', nargs='*', help='Override app labels')

    def handle(self, *args, **options):
        if connection.vendor != 'postgresql':
            raise CommandError('Schema migrations are only supported on Postgres.')

        academy_id = options.get('academy')
        schema_name = options.get('schema')
        app_labels = options.get('apps') or TENANT_APP_LABELS

        if academy_id and not schema_name:
            try:
                academy = Academy.objects.get(id=academy_id)
            except Academy.DoesNotExist as exc:
                raise CommandError(f'Academy not found: {academy_id}') from exc
            schema_name = academy.schema_name or build_schema_name(academy.id)

        if not schema_name:
            raise CommandError('Provide --academy or --schema.')

        if not is_valid_schema_name(schema_name):
            raise CommandError(f'Invalid schema name: {schema_name}')

        def set_search_path():
            with connection.cursor() as cursor:
                cursor.execute(
                    f'SET search_path TO {connection.ops.quote_name(schema_name)}, public'
                )

        def run_migrate_for_schema(app_label, fake_initial=False, fake=False):
            original_options = connection.settings_dict.get('OPTIONS', {}).get('options')
            db_options = connection.settings_dict.setdefault('OPTIONS', {})
            if original_options:
                db_options['options'] = f"{original_options} -c search_path={schema_name},public"
            else:
                db_options['options'] = f"-c search_path={schema_name},public"
            connection.close()
            try:
                call_command(
                    'migrate',
                    app_label,
                    database='default',
                    fake_initial=fake_initial,
                    fake=fake,
                    interactive=False,
                    verbosity=options['verbosity']
                )
            finally:
                if original_options is None:
                    db_options.pop('options', None)
                else:
                    db_options['options'] = original_options
                connection.close()

        def insert_shared_migrations(labels):
            if not labels:
                return
            with connection.cursor() as cursor:
                shared_placeholders = ", ".join(["%s"] * len(labels))
                cursor.execute(
                    f"""
                    INSERT INTO {connection.ops.quote_name(schema_name)}.django_migrations (app, name, applied)
                    SELECT app, name, applied
                    FROM public.django_migrations
                    WHERE app IN ({shared_placeholders})
                      AND NOT EXISTS (
                          SELECT 1
                          FROM {connection.ops.quote_name(schema_name)}.django_migrations dm
                          WHERE dm.app = public.django_migrations.app
                            AND dm.name = public.django_migrations.name
                      )
                    """,
                    labels,
                )

        def insert_app_migrations(app_label, name_filter=None, exclude_name=None):
            with connection.cursor() as cursor:
                clauses = ["app = %s"]
                params = [app_label]
                if name_filter:
                    clauses.append("name = %s")
                    params.append(name_filter)
                if exclude_name:
                    clauses.append("name <> %s")
                    params.append(exclude_name)
                where_sql = " AND ".join(clauses)
                cursor.execute(
                    f"""
                    INSERT INTO {connection.ops.quote_name(schema_name)}.django_migrations (app, name, applied)
                    SELECT app, name, applied
                    FROM public.django_migrations
                    WHERE {where_sql}
                      AND NOT EXISTS (
                          SELECT 1
                          FROM {connection.ops.quote_name(schema_name)}.django_migrations dm
                          WHERE dm.app = public.django_migrations.app
                            AND dm.name = public.django_migrations.name
                      )
                    """,
                    params,
                )

        def schema_table_exists(table_name: str) -> bool:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = %s
                      AND table_name = %s
                    LIMIT 1
                    """,
                    [schema_name, table_name],
                )
                return cursor.fetchone() is not None

        set_search_path()
        with connection.cursor() as cursor:
            cursor.execute(
                f"""
                CREATE TABLE IF NOT EXISTS {connection.ops.quote_name(schema_name)}.django_migrations (
                    id SERIAL PRIMARY KEY,
                    app VARCHAR(255) NOT NULL,
                    name VARCHAR(255) NOT NULL,
                    applied TIMESTAMP WITH TIME ZONE NOT NULL
                )
                """
            )
            tenant_labels = list(app_labels)
            # Keep users migration records even when running a subset like --apps facilities.
            # Downstream tenant apps depend on users being considered already migrated.
            if 'users' not in tenant_labels:
                tenant_labels.append('users')
            shared_labels = list(SHARED_APP_LABELS)
            keep_labels = tenant_labels + shared_labels
            placeholders = ", ".join(["%s"] * len(keep_labels))
            cursor.execute(
                f"""
                DELETE FROM {connection.ops.quote_name(schema_name)}.django_migrations
                WHERE app NOT IN ({placeholders})
                """,
                keep_labels,
            )
            deferred_labels = [
                label for label in ['tenants'] + SHARED_DEFERRED_LABELS
                if label in shared_labels
            ]
            if deferred_labels:
                deferred_placeholders = ", ".join(["%s"] * len(deferred_labels))
                cursor.execute(
                    f"""
                    DELETE FROM {connection.ops.quote_name(schema_name)}.django_migrations
                    WHERE app IN ({deferred_placeholders})
                    """,
                    deferred_labels,
                )

        shared_pre_labels = [
            label
            for label in SHARED_PRE_MIGRATION_LABELS
            if label in SHARED_APP_LABELS
        ]
        shared_other_labels = [
            label
            for label in SHARED_APP_LABELS
            if label not in shared_pre_labels + ['tenants'] + SHARED_DEFERRED_LABELS
        ]
        shared_pre_labels.extend(shared_other_labels)
        insert_shared_migrations(shared_pre_labels)
        insert_app_migrations('tenants', name_filter='0001_initial')

        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = %s
                  AND table_name = %s
                LIMIT 1
                """,
                [schema_name, "tenant_users"],
            )
            schema_has_tenant_users = cursor.fetchone() is not None
            cursor.execute(
                """
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = %s
                  AND table_name LIKE %s
                LIMIT 1
                """,
                [schema_name, "tenant\\_%"],
            )
            schema_has_any_tenant_tables = cursor.fetchone() is not None

        if schema_has_tenant_users:
            # Existing tenant schema: ensure tenant schemas have a complete `tenants.*`
            # migration history recorded before running migrations that may check
            # consistency (e.g. users), since some tenant apps depend on later `tenants`
            # migrations (and may already be applied in this schema).
            insert_app_migrations('tenants', exclude_name='0001_initial')

        if not schema_has_tenant_users:
            # If the tenant schema is missing the core tenant table, ensure we don't
            # accidentally treat it as already migrated just because migration rows
            # were inserted previously (manual repairs, partial runs, etc.).
            # We only clear the `users` app migration history, so we can re-apply
            # users migrations to restore tenant_users without disturbing other apps.
            with connection.cursor() as cursor:
                cursor.execute(
                    f"""
                    DELETE FROM {connection.ops.quote_name(schema_name)}.django_migrations
                    WHERE app = 'users'
                    """,
                )
        else:
            # Existing tenant schemas may already have onboarding tables, but their
            # schema-local django_migrations might be incomplete. Since users migrations
            # can depend on onboarding, ensure onboarding migration rows are present
            # before running `migrate users` to avoid Django trying to recreate tables.
            insert_app_migrations('onboarding')

        def _is_out_of_sync_migration_error(exc: ProgrammingError) -> bool:
            """
            Detect schema drift cases where DB objects already exist but migration
            history is missing/incomplete for this schema.
            """
            root = getattr(exc, "__cause__", None) or exc
            message = str(root).lower()
            return any(
                marker in message
                for marker in (
                    "already exists",
                    "duplicate column",
                    "duplicate table",
                    "duplicate key",
                )
            )

        users_in_plan = 'users' in app_labels
        if users_in_plan:
            # If the password reset token table already exists (historical one-off),
            # ensure the migration row is present so Django doesn't try to recreate it.
            with connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = %s
                      AND table_name = %s
                    LIMIT 1
                    """,
                    [schema_name, "tenant_password_reset_tokens"],
                )
                has_password_reset_table = cursor.fetchone() is not None
            if has_password_reset_table:
                with connection.cursor() as cursor:
                    cursor.execute(
                        f"""
                        INSERT INTO {connection.ops.quote_name(schema_name)}.django_migrations (app, name, applied)
                        SELECT 'users', '0005_password_reset_token', %s
                        WHERE NOT EXISTS (
                            SELECT 1
                            FROM {connection.ops.quote_name(schema_name)}.django_migrations
                            WHERE app = 'users' AND name = '0005_password_reset_token'
                        )
                        """,
                        [timezone.now()],
                    )

            # Do not use fake_initial here. With search_path including `public`,
            # Django can falsely detect tenant_* tables from the public schema
            # and mark initial tenant migrations as applied without creating
            # the tables in the target tenant schema.
            try:
                run_migrate_for_schema(
                    'users',
                    fake_initial=(not schema_has_tenant_users and schema_has_any_tenant_tables),
                    fake=False,
                )
            except ProgrammingError as exc:
                if not _is_out_of_sync_migration_error(exc):
                    raise
                # Keep tenant provisioning resilient when schema objects are present
                # but migration rows are not (historical/manual repairs).
                run_migrate_for_schema('users', fake_initial=False, fake=True)
            users_migrated = True
        else:
            with connection.cursor() as cursor:
                cursor.execute(
                    f"""
                    SELECT 1
                    FROM {connection.ops.quote_name(schema_name)}.django_migrations
                    WHERE app = 'users'
                    LIMIT 1
                    """
                )
                users_migrated = cursor.fetchone() is not None
            if not users_migrated:
                raise CommandError(
                    "Users migrations must be applied before tenant migrations can proceed."
                )

        # For partial migration runs (e.g. --apps facilities), ensure onboarding
        # dependency migrations are marked as present so they are not re-applied.
        if 'onboarding' not in app_labels:
            insert_app_migrations('onboarding')
        if not schema_has_tenant_users:
            # New/incomplete tenant schema: only after `users` is migrated do we insert
            # the rest of `tenants.*` migration history.
            insert_app_migrations('tenants', exclude_name='0001_initial')
        insert_shared_migrations(
            [label for label in SHARED_DEFERRED_LABELS if label in SHARED_APP_LABELS]
        )

        for app_label in [label for label in app_labels if label != 'users']:
            try:
                app_config = apps.get_app_config(app_label)
            except LookupError:
                self.stdout.write(
                    self.style.WARNING(f"Skipping unknown app label: {app_label}")
                )
                continue
            migrations_spec = importlib.util.find_spec(f"{app_config.name}.migrations")
            if migrations_spec is None:
                self.stdout.write(
                    self.style.WARNING(f"Skipping app without migrations: {app_label}")
                )
                continue
            rep_table = REP_TABLE_BY_APP.get(app_label)
            if rep_table and not schema_table_exists(rep_table):
                with connection.cursor() as cursor:
                    cursor.execute(
                        f"""
                        DELETE FROM {connection.ops.quote_name(schema_name)}.django_migrations
                        WHERE app = %s
                        """,
                        [app_label],
                    )
            try:
                run_migrate_for_schema(app_label, fake_initial=False, fake=False)
            except ProgrammingError:
                # If the schema already has the expected tables/columns but migration
                # history is out of sync, re-run as `--fake` to mark migrations applied.
                run_migrate_for_schema(app_label, fake_initial=False, fake=True)

        with connection.cursor() as cursor:
            cursor.execute('SET search_path TO public')

        self.stdout.write(self.style.SUCCESS(f'Migrations applied for schema {schema_name}.'))

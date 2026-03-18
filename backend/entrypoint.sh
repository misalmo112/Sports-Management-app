#!/usr/bin/env sh
set -eu

echo "Waiting for Postgres..."

DB_HOST="${DB_HOST:-postgres}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-sports_academy_dev}"

until pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; do
  sleep 1
done

echo "Running migrations..."
python manage.py migrate --noinput

exec "$@"


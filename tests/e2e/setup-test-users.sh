#!/bin/bash
# Setup script for E2E test users
# Run this before running E2E tests

set -e

echo "=== Setting up E2E Test Users ==="
echo ""

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "Error: docker-compose not found"
    exit 1
fi

# Check if backend container is running
if ! docker-compose ps backend | grep -q "Up"; then
    echo "Error: Backend container is not running"
    echo "Please run: docker-compose up -d"
    exit 1
fi

echo "1. Creating superadmin user..."
echo "   Email: superadmin@test.com"
echo "   Password: SuperAdmin123!"
echo ""
docker-compose exec -T backend python manage.py shell << 'PYTHON'
from django.contrib.auth import get_user_model
from tenant.users.models import User

User = get_user_model()

# Create superadmin if it doesn't exist
if not User.objects.filter(email='superadmin@test.com').exists():
    User.objects.create_superuser(
        email='superadmin@test.com',
        password='SuperAdmin123!'
    )
    print("✓ Superadmin created")
else:
    print("✓ Superadmin already exists")
PYTHON

echo ""
echo "2. Note: Admin, Coach, and Parent users will be created via API"
echo "   when the test academy is created in global setup."
echo ""
echo "3. To create them manually, use the Django shell:"
echo "   docker-compose exec backend python manage.py shell"
echo ""
echo "=== Setup Complete ==="
echo ""
echo "You can now run E2E tests:"
echo "  cd tests/e2e && npm run test:e2e"

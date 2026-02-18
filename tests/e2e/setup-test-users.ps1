# Setup script for E2E test users (PowerShell)
# Run this before running E2E tests

Write-Host "=== Setting up E2E Test Users ===" -ForegroundColor Cyan
Write-Host ""

# Check if docker-compose is available
try {
    docker-compose --version | Out-Null
} catch {
    Write-Host "Error: docker-compose not found" -ForegroundColor Red
    exit 1
}

# Check if backend container is running
$backendStatus = docker-compose ps backend 2>&1
if (-not ($backendStatus -match "Up")) {
    Write-Host "Error: Backend container is not running" -ForegroundColor Red
    Write-Host "Please run: docker-compose up -d" -ForegroundColor Yellow
    exit 1
}

Write-Host "1. Creating superadmin user..." -ForegroundColor Yellow
Write-Host "   Email: superadmin@test.com"
Write-Host "   Password: SuperAdmin123!"
Write-Host ""

$pythonScript = @"
from django.contrib.auth import get_user_model
from tenant.users.models import User

User = get_user_model()

# Create superadmin if it doesn't exist
if not User.objects.filter(email='superadmin@test.com').exists():
    User.objects.create_superuser(
        email='superadmin@test.com',
        password='SuperAdmin123!'
    )
    print('✓ Superadmin created')
else:
    print('✓ Superadmin already exists')
"@

docker-compose exec -T backend python manage.py shell | Out-Null
echo $pythonScript | docker-compose exec -T backend python manage.py shell

Write-Host ""
Write-Host "2. Note: Admin, Coach, and Parent users will be created via API" -ForegroundColor Yellow
Write-Host "   when the test academy is created in global setup."
Write-Host ""
Write-Host "3. To create them manually, use the Django shell:" -ForegroundColor Yellow
Write-Host "   docker-compose exec backend python manage.py shell"
Write-Host ""
Write-Host "=== Setup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "You can now run E2E tests:" -ForegroundColor Cyan
Write-Host "  cd tests/e2e && npm run test:e2e"

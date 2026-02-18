# Run Next Actions - Complete Setup and Verification
# This script performs all immediate next actions in sequence

Write-Host "=== E2E Test Suite - Next Actions ===" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Continue"
$allStepsPassed = $true

# Step 1: Verify Backend Fix Files
Write-Host "Step 1: Verifying Backend Fix Files..." -ForegroundColor Yellow

# Get the project root (two levels up from tests/e2e)
$projectRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$authUrlsPath = Join-Path $projectRoot "backend\tenant\users\auth_urls.py"
$urlsConfigPath = Join-Path $projectRoot "backend\config\urls.py"

$authUrlsExists = Test-Path $authUrlsPath
$urlsConfigUpdated = $false

if (Test-Path $urlsConfigPath) {
    $urlsContent = Get-Content $urlsConfigPath -Raw
    if ($urlsContent -match "auth_urls") {
        $urlsConfigUpdated = $true
    }
}

if ($authUrlsExists -and $urlsConfigUpdated) {
    Write-Host "  ✓ Backend fix files are in place" -ForegroundColor Green
} else {
    Write-Host "  ✗ Backend fix files missing or not updated" -ForegroundColor Red
    if (-not $authUrlsExists) {
        Write-Host "    - Missing: backend/tenant/users/auth_urls.py" -ForegroundColor Yellow
    }
    if (-not $urlsConfigUpdated) {
        Write-Host "    - backend/config/urls.py not updated to use auth_urls" -ForegroundColor Yellow
    }
    $allStepsPassed = $false
}

Write-Host ""

# Step 2: Check Backend Service
Write-Host "Step 2: Checking Backend Service..." -ForegroundColor Yellow

try {
    $backendStatus = docker-compose ps backend 2>&1
    if ($backendStatus -match "Up") {
        Write-Host "  ✓ Backend container is running" -ForegroundColor Green
        
        # Test health endpoint
        try {
            $healthResponse = Invoke-WebRequest -Uri "http://localhost:8000/health/" -Method GET -TimeoutSec 5 -ErrorAction Stop
            if ($healthResponse.StatusCode -eq 200) {
                Write-Host "  ✓ Backend health check passed" -ForegroundColor Green
            }
        } catch {
            Write-Host "  ⚠️  Backend health check failed - backend may need restart" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  ✗ Backend container is not running" -ForegroundColor Red
        Write-Host "    Run: docker-compose up -d" -ForegroundColor Yellow
        $allStepsPassed = $false
    }
} catch {
    Write-Host "  ✗ Could not check backend status" -ForegroundColor Red
    Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Yellow
    $allStepsPassed = $false
}

Write-Host ""

# Step 3: Restart Backend (if needed)
Write-Host "Step 3: Restarting Backend to Load New URL Configuration..." -ForegroundColor Yellow

if ($authUrlsExists -and $urlsConfigUpdated) {
    try {
        Write-Host "  Restarting backend container..." -ForegroundColor Gray
        docker-compose restart backend 2>&1 | Out-Null
        
        Write-Host "  Waiting for backend to be ready..." -ForegroundColor Gray
        Start-Sleep -Seconds 5
        
        # Verify backend is ready
        $maxRetries = 12
        $retryCount = 0
        $backendReady = $false
        
        while ($retryCount -lt $maxRetries) {
            try {
                $healthResponse = Invoke-WebRequest -Uri "http://localhost:8000/health/" -Method GET -TimeoutSec 2 -ErrorAction Stop
                if ($healthResponse.StatusCode -eq 200) {
                    $backendReady = $true
                    break
                }
            } catch {
                # Backend not ready yet
            }
            $retryCount++
            Start-Sleep -Seconds 2
        }
        
        if ($backendReady) {
            Write-Host "  ✓ Backend restarted and ready" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  Backend may not be fully ready yet" -ForegroundColor Yellow
            Write-Host "    Check logs: docker-compose logs backend" -ForegroundColor Gray
        }
    } catch {
        Write-Host "  ⚠️  Could not restart backend: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "    You may need to restart manually: docker-compose restart backend" -ForegroundColor Gray
    }
} else {
    Write-Host "  ⏭️  Skipping - fix files not in place" -ForegroundColor Yellow
}

Write-Host ""

# Step 4: Test Endpoints
Write-Host "Step 4: Testing Backend Endpoints..." -ForegroundColor Yellow

$API_BASE = "http://localhost:8000/api/v1"
$endpointTests = @(
    @{
        Method = "POST"
        Path = "/auth/token/"
        Body = @{ email = "test@test.com"; password = "wrong" } | ConvertTo-Json
        ExpectedStatus = @(400, 401)
        Description = "Login endpoint"
    },
    @{
        Method = "POST"
        Path = "/auth/invite/accept/"
        Body = @{ token = "invalid"; password = "Test123!" } | ConvertTo-Json
        ExpectedStatus = @(400, 404)
        Description = "Invite accept endpoint"
    }
)

$endpointTestsPassed = 0
$endpointTestsTotal = $endpointTests.Count

foreach ($test in $endpointTests) {
    try {
        $headers = @{
            "Content-Type" = "application/json"
            "Accept" = "application/json"
        }
        
        $response = Invoke-WebRequest -Uri "$API_BASE$($test.Path)" `
            -Method $test.Method `
            -Headers $headers `
            -Body $test.Body `
            -ErrorAction Stop
        
        $statusCode = $response.StatusCode
        
        if ($test.ExpectedStatus -contains $statusCode) {
            Write-Host "  ✓ $($test.Description): Status $statusCode (Expected)" -ForegroundColor Green
            $endpointTestsPassed++
        } else {
            Write-Host "  ✗ $($test.Description): Status $statusCode (Expected $($test.ExpectedStatus -join ' or '))" -ForegroundColor Red
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        
        if ($test.ExpectedStatus -contains $statusCode) {
            Write-Host "  ✓ $($test.Description): Status $statusCode (Expected)" -ForegroundColor Green
            $endpointTestsPassed++
        } elseif ($statusCode -eq 404) {
            Write-Host "  ✗ $($test.Description): Status 404 NOT FOUND" -ForegroundColor Red
            Write-Host "    Endpoint may not be accessible - check backend logs" -ForegroundColor Yellow
        } else {
            Write-Host "  ✗ $($test.Description): Status $statusCode (Expected $($test.ExpectedStatus -join ' or '))" -ForegroundColor Red
        }
    }
}

if ($endpointTestsPassed -eq $endpointTestsTotal) {
    Write-Host "  ✓ All endpoints accessible" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Some endpoints returned unexpected status codes" -ForegroundColor Yellow
}

Write-Host ""

# Step 5: Create Test Users
Write-Host "Step 5: Creating Test Users..." -ForegroundColor Yellow

try {
    $pythonScript = @'
from django.contrib.auth import get_user_model
from tenant.users.models import User

User = get_user_model()

# Create superadmin if it doesn't exist
if not User.objects.filter(email='superadmin@test.com').exists():
    try:
        User.objects.create_superuser(
            email='superadmin@test.com',
            password='SuperAdmin123!',
            role='SUPERADMIN'
        )
        print('SUCCESS: Superadmin created')
    except Exception as e:
        print(f'ERROR: {str(e)}')
else:
    print('INFO: Superadmin already exists')
'@

    $output = $pythonScript | docker-compose exec -T backend python manage.py shell 2>&1
    
    if ($output -match "SUCCESS|INFO") {
        Write-Host "  ✓ Superadmin user setup completed" -ForegroundColor Green
    } elseif ($output -match "ERROR") {
        Write-Host "  ⚠️  Error creating superadmin: $output" -ForegroundColor Yellow
    } else {
        Write-Host "  ⚠️  Could not verify superadmin creation" -ForegroundColor Yellow
        Write-Host "    Output: $output" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ⚠️  Could not create test users: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "    You may need to create manually: docker-compose exec backend python manage.py createsuperuser" -ForegroundColor Gray
}

Write-Host ""

# Step 6: Summary and Next Steps
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host ""

if ($allStepsPassed -and $endpointTestsPassed -eq $endpointTestsTotal) {
    Write-Host "✓ All verification steps passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next Steps:" -ForegroundColor Cyan
    Write-Host "  1. Run E2E tests: npm run test:e2e" -ForegroundColor White
    Write-Host "  2. Check test results and address any remaining failures" -ForegroundColor White
} else {
    Write-Host "⚠️  Some steps had issues" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Cyan
    if (-not $authUrlsExists) {
        Write-Host "  - Backend fix file missing - check backend/tenant/users/auth_urls.py" -ForegroundColor White
    }
    if ($endpointTestsPassed -lt $endpointTestsTotal) {
        Write-Host "  - Endpoints returning 404 - restart backend: docker-compose restart backend" -ForegroundColor White
        Write-Host "  - Check logs: docker-compose logs backend" -ForegroundColor White
    }
}

Write-Host ""
Write-Host "To run E2E tests:" -ForegroundColor Cyan
Write-Host "  cd tests/e2e" -ForegroundColor White
Write-Host "  npm run test:smoke      # Quick smoke tests" -ForegroundColor White
Write-Host "  npm run test:e2e        # Full suite" -ForegroundColor White
Write-Host "  npm run test:e2e:security  # Security tests only" -ForegroundColor White
Write-Host ""

# Verify Backend 404 Fix
# Restarts backend and tests if endpoints are now accessible

Write-Host "=== Verifying Backend 404 Fix ===" -ForegroundColor Cyan
Write-Host ""

# Check if docker-compose is available
try {
    docker-compose --version | Out-Null
} catch {
    Write-Host "Error: docker-compose not found" -ForegroundColor Red
    exit 1
}

# Check if backend container exists
$backendStatus = docker-compose ps backend 2>&1
if (-not ($backendStatus -match "backend")) {
    Write-Host "Error: Backend container not found" -ForegroundColor Red
    Write-Host "Please run: docker-compose up -d" -ForegroundColor Yellow
    exit 1
}

Write-Host "1. Checking if auth_urls.py exists..." -ForegroundColor Yellow
if (Test-Path "..\backend\tenant\users\auth_urls.py") {
    Write-Host "   ✓ auth_urls.py found" -ForegroundColor Green
} else {
    Write-Host "   ✗ auth_urls.py not found - fix may not be applied" -ForegroundColor Red
    Write-Host "   Please ensure backend/tenant/users/auth_urls.py exists" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "2. Restarting backend to load new URL configuration..." -ForegroundColor Yellow
docker-compose restart backend

Write-Host "   Waiting for backend to be ready..." -ForegroundColor Gray
Start-Sleep -Seconds 5

# Check if backend is running
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

if (-not $backendReady) {
    Write-Host "   ✗ Backend did not become ready" -ForegroundColor Red
    Write-Host "   Check logs: docker-compose logs backend" -ForegroundColor Yellow
    exit 1
}

Write-Host "   ✓ Backend is ready" -ForegroundColor Green
Write-Host ""

Write-Host "3. Testing endpoints..." -ForegroundColor Yellow
Write-Host ""

$API_BASE = "http://localhost:8000/api/v1"
$tests = @(
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

$allPassed = $true

foreach ($test in $tests) {
    Write-Host "   Testing: $($test.Method) $($test.Path)" -ForegroundColor Cyan
    
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
            Write-Host "      ✓ Status: $statusCode (Expected)" -ForegroundColor Green
        } else {
            Write-Host "      ✗ Status: $statusCode (Unexpected - expected $($test.ExpectedStatus -join ' or '))" -ForegroundColor Red
            $allPassed = $false
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        
        if ($test.ExpectedStatus -contains $statusCode) {
            Write-Host "      ✓ Status: $statusCode (Expected)" -ForegroundColor Green
        } elseif ($statusCode -eq 404) {
            Write-Host "      ✗ Status: 404 NOT FOUND - Endpoint still not accessible" -ForegroundColor Red
            Write-Host "      This indicates the fix may not have been applied or backend needs restart" -ForegroundColor Yellow
            $allPassed = $false
        } else {
            Write-Host "      ✗ Status: $statusCode (Unexpected - expected $($test.ExpectedStatus -join ' or '))" -ForegroundColor Red
            $allPassed = $false
        }
    }
    
    Write-Host ""
}

Write-Host "=== Summary ===" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "✓ All endpoints are accessible and return expected status codes" -ForegroundColor Green
    Write-Host ""
    Write-Host "The fix appears to be working! You can now:" -ForegroundColor Green
    Write-Host "  1. Run E2E tests: npm run test:e2e" -ForegroundColor White
    Write-Host "  2. Create test users: .\setup-test-users.ps1" -ForegroundColor White
} else {
    Write-Host "✗ Some endpoints are still not working correctly" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Check backend logs: docker-compose logs backend" -ForegroundColor White
    Write-Host "  2. Verify auth_urls.py exists: ls backend/tenant/users/auth_urls.py" -ForegroundColor White
    Write-Host "  3. Check URL configuration: cat backend/config/urls.py" -ForegroundColor White
    Write-Host "  4. Verify backend restarted: docker-compose ps backend" -ForegroundColor White
}

Write-Host ""

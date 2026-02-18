# Backend Endpoint Verification Script
# Tests if backend endpoints are accessible and return expected status codes

Write-Host "=== Backend Endpoint Verification ===" -ForegroundColor Cyan
Write-Host ""

$API_BASE = "http://localhost:8000/api/v1"
$endpoints = @(
    @{
        Method = "POST"
        Path = "/auth/token/"
        Body = @{ email = "test@test.com"; password = "wrong" } | ConvertTo-Json
        ExpectedStatus = @(400, 401)
        Description = "Login endpoint (should return 400/401 for invalid credentials)"
    },
    @{
        Method = "POST"
        Path = "/auth/invite/accept/"
        Body = @{ token = "invalid"; password = "Test123!" } | ConvertTo-Json
        ExpectedStatus = @(400, 404)
        Description = "Invite accept endpoint (should return 400 for invalid token or 404 if not configured)"
    },
    @{
        Method = "GET"
        Path = "/tenant/overview/"
        Body = $null
        ExpectedStatus = @(401, 404)
        Description = "Tenant overview (should return 401 for unauthenticated or 404 if not configured)"
    },
    @{
        Method = "GET"
        Path = "/platform/academies/"
        Body = $null
        ExpectedStatus = @(401, 404)
        Description = "Platform academies (should return 401 for unauthenticated or 404 if not configured)"
    }
)

$allPassed = $true

foreach ($endpoint in $endpoints) {
    Write-Host "Testing: $($endpoint.Method) $($endpoint.Path)" -ForegroundColor Yellow
    Write-Host "  Expected: $($endpoint.ExpectedStatus -join ' or ')" -ForegroundColor Gray
    
    try {
        $headers = @{
            "Content-Type" = "application/json"
            "Accept" = "application/json"
        }
        
        if ($endpoint.Method -eq "POST") {
            $response = Invoke-WebRequest -Uri "$API_BASE$($endpoint.Path)" `
                -Method POST `
                -Headers $headers `
                -Body $endpoint.Body `
                -ErrorAction SilentlyContinue
        } else {
            $response = Invoke-WebRequest -Uri "$API_BASE$($endpoint.Path)" `
                -Method GET `
                -Headers $headers `
                -ErrorAction SilentlyContinue
        }
        
        $statusCode = $response.StatusCode
        
        if ($endpoint.ExpectedStatus -contains $statusCode) {
            Write-Host "  ✓ Status: $statusCode (Expected)" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Status: $statusCode (Unexpected - expected $($endpoint.ExpectedStatus -join ' or '))" -ForegroundColor Red
            $allPassed = $false
        }
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        
        if ($endpoint.ExpectedStatus -contains $statusCode) {
            Write-Host "  ✓ Status: $statusCode (Expected)" -ForegroundColor Green
        } else {
            Write-Host "  ✗ Status: $statusCode (Unexpected - expected $($endpoint.ExpectedStatus -join ' or '))" -ForegroundColor Red
            Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
            $allPassed = $false
        }
    }
    
    Write-Host ""
}

Write-Host "=== Summary ===" -ForegroundColor Cyan
if ($allPassed) {
    Write-Host "✓ All endpoints returned expected status codes" -ForegroundColor Green
} else {
    Write-Host "✗ Some endpoints returned unexpected status codes" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "1. Verify backend is running: docker-compose ps" -ForegroundColor White
    Write-Host "2. Check backend logs: docker-compose logs backend" -ForegroundColor White
    Write-Host "3. Verify URL routing in backend/config/urls.py" -ForegroundColor White
    Write-Host "4. Test health endpoint: curl http://localhost:8000/health/" -ForegroundColor White
}

Write-Host ""

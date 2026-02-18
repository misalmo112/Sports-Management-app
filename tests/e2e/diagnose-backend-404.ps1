# Backend 404 Diagnostic Script
# Investigates why endpoints return 404 instead of 401/400

Write-Host "=== Backend 404 Diagnostic ===" -ForegroundColor Cyan
Write-Host ""

$API_BASE = "http://localhost:8000"
$endpoints = @(
    @{
        Method = "GET"
        Path = "/health/"
        Description = "Health check (should work)"
    },
    @{
        Method = "GET"
        Path = "/api/v1/auth/token/"
        Description = "Login endpoint GET (should return 405 Method Not Allowed)"
    },
    @{
        Method = "POST"
        Path = "/api/v1/auth/token/"
        Body = @{ email = "test@test.com"; password = "wrong" } | ConvertTo-Json
        Description = "Login endpoint POST (should return 400/401)"
    },
    @{
        Method = "POST"
        Path = "/api/v1/auth/token"
        Body = @{ email = "test@test.com"; password = "wrong" } | ConvertTo-Json
        Description = "Login endpoint POST without trailing slash (should redirect or 404)"
    },
    @{
        Method = "POST"
        Path = "/api/v1/auth/invite/accept/"
        Body = @{ token = "invalid"; password = "Test123!" } | ConvertTo-Json
        Description = "Invite accept endpoint (should return 400/404)"
    },
    @{
        Method = "GET"
        Path = "/api/v1/tenant/overview/"
        Description = "Tenant overview (should return 401/404)"
    },
    @{
        Method = "GET"
        Path = "/api/v1/platform/academies/"
        Description = "Platform academies (should return 401/404)"
    }
)

Write-Host "Testing endpoints..." -ForegroundColor Yellow
Write-Host ""

foreach ($endpoint in $endpoints) {
    Write-Host "Testing: $($endpoint.Method) $($endpoint.Path)" -ForegroundColor Cyan
    Write-Host "  $($endpoint.Description)" -ForegroundColor Gray
    
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
                -ErrorAction Stop
        } else {
            $response = Invoke-WebRequest -Uri "$API_BASE$($endpoint.Path)" `
                -Method GET `
                -Headers $headers `
                -ErrorAction Stop
        }
        
        $statusCode = $response.StatusCode
        Write-Host "  Status: $statusCode" -ForegroundColor $(if ($statusCode -ge 200 -and $statusCode -lt 300) { "Green" } elseif ($statusCode -ge 400 -and $statusCode -lt 500) { "Yellow" } else { "Red" })
        
        # Try to get response body
        try {
            $body = $response.Content | ConvertFrom-Json
            Write-Host "  Response: $($body | ConvertTo-Json -Compress)" -ForegroundColor Gray
        } catch {
            Write-Host "  Response: $($response.Content)" -ForegroundColor Gray
        }
        
    } catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $statusDescription = $_.Exception.Response.StatusDescription
        
        Write-Host "  Status: $statusCode $statusDescription" -ForegroundColor $(if ($statusCode -eq 404) { "Red" } elseif ($statusCode -ge 400 -and $statusCode -lt 500) { "Yellow" } else { "Red" })
        
        # Try to get error response body
        try {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            $reader.Close()
            Write-Host "  Error Response: $responseBody" -ForegroundColor Gray
        } catch {
            Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Gray
        }
        
        # Check if it's a 404
        if ($statusCode -eq 404) {
            Write-Host "  ⚠️  404 NOT FOUND - Endpoint may not exist or URL pattern doesn't match" -ForegroundColor Red
        }
    }
    
    Write-Host ""
}

Write-Host "=== Analysis ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "If endpoints return 404:" -ForegroundColor Yellow
Write-Host "1. Check Django URL routing:" -ForegroundColor White
Write-Host "   - backend/config/urls.py should include 'api/v1/auth/' path" -ForegroundColor Gray
Write-Host "   - backend/tenant/users/urls.py should have 'token/' and 'invite/accept/' paths" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Check if backend is running:" -ForegroundColor White
Write-Host "   docker-compose ps backend" -ForegroundColor Gray
Write-Host "   docker-compose logs backend | Select-String -Pattern 'token|auth|404'" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Test Django URL patterns:" -ForegroundColor White
Write-Host "   docker-compose exec backend python manage.py show_urls | Select-String -Pattern 'auth|token'" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Check for trailing slash issues:" -ForegroundColor White
Write-Host "   Django may require trailing slashes - try both /token/ and /token" -ForegroundColor Gray
Write-Host ""

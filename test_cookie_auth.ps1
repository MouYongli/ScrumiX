# PowerShell script to test cookie-based authentication

$baseUrl = "http://localhost:8000"

Write-Host "🧪 Testing Cookie Authentication" -ForegroundColor Green
Write-Host "=" * 50

# Test 1: Health check
Write-Host "🔍 Testing server health..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get
    Write-Host "✅ Server is running: $($healthResponse.message)" -ForegroundColor Green
}
catch {
    Write-Host "❌ Server not accessible. Make sure FastAPI is running on $baseUrl" -ForegroundColor Red
    exit 1
}

# Test 2: Check if verification endpoint is accessible (should fail without auth)
Write-Host "`n🔍 Testing verification endpoint (should fail)..." -ForegroundColor Yellow
try {
    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    $verifyResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/verify" -Method Get -WebSession $session
    Write-Host "❌ Verification should have failed (no authentication)" -ForegroundColor Red
}
catch {
    if ($_.Exception.Response.StatusCode -eq "Unauthorized") {
        Write-Host "✅ Verification correctly requires authentication" -ForegroundColor Green
    }
    else {
        Write-Host "❌ Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Test 3: Test Keycloak OAuth endpoints
Write-Host "`n🔑 Testing Keycloak OAuth endpoints..." -ForegroundColor Yellow
try {
    $authUrlResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/oauth/keycloak/authorize?origin=login" -Method Get
    Write-Host "✅ Keycloak authorization endpoint working!" -ForegroundColor Green
    Write-Host "   Authorization URL generated successfully" -ForegroundColor Green
}
catch {
    Write-Host "❌ Keycloak authorization endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: Test login (you'll need a test user)
Write-Host "`n🔐 To test login, you need a user account." -ForegroundColor Yellow
Write-Host "You can register a test user or use an existing one." -ForegroundColor Yellow
Write-Host "Note: Keycloak authentication will now use secure HTTP-only cookies!" -ForegroundColor Cyan

$email = Read-Host "Enter test email (or press Enter to skip login test)"
if ($email) {
    $password = Read-Host "Enter password" -AsSecureString
    $plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($password))
    
    try {
        $loginData = @{
            email = $email
            password = $plainPassword
            remember_me = $true
        } | ConvertTo-Json
        
        $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
        $loginResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/login" -Method Post -Body $loginData -ContentType "application/json" -WebSession $session
        
        Write-Host "✅ Login successful for $($loginResponse.user.email)!" -ForegroundColor Green
        Write-Host "   Cookies set: $($session.Cookies.Count)" -ForegroundColor Green
        
        # Test authenticated request
        Write-Host "`n🔍 Testing authenticated request with cookies..." -ForegroundColor Yellow
        try {
            $meResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/me" -Method Get -WebSession $session
            Write-Host "✅ Authenticated request successful!" -ForegroundColor Green
            Write-Host "   Current user: $($meResponse.email)" -ForegroundColor Green
            
            # Test verification endpoint with cookies
            Write-Host "`n🔍 Testing verification endpoint with cookies..." -ForegroundColor Yellow
            $verifyResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/verify" -Method Get -WebSession $session
            Write-Host "✅ Verification successful!" -ForegroundColor Green
            Write-Host "   Session cookie present: $($verifyResponse.has_session_cookie)" -ForegroundColor Green
            Write-Host "   Refresh cookie present: $($verifyResponse.has_refresh_cookie)" -ForegroundColor Green
            Write-Host "   Environment: $($verifyResponse.cookie_settings.environment)" -ForegroundColor Green
            Write-Host "   Secure cookies: $($verifyResponse.cookie_settings.secure)" -ForegroundColor Green
            
            # Test logout
            Write-Host "`n🚪 Testing logout..." -ForegroundColor Yellow
            $logoutResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/logout" -Method Post -WebSession $session
            Write-Host "✅ Logout successful!" -ForegroundColor Green
            
            # Test post-logout request (should fail)
            Write-Host "`n🔒 Testing post-logout request (should fail)..." -ForegroundColor Yellow
            try {
                $postLogoutResponse = Invoke-RestMethod -Uri "$baseUrl/api/v1/auth/me" -Method Get -WebSession $session
                Write-Host "❌ Post-logout request should have failed" -ForegroundColor Red
            }
            catch {
                if ($_.Exception.Response.StatusCode -eq "Unauthorized") {
                    Write-Host "✅ Post-logout request correctly unauthorized!" -ForegroundColor Green
                }
                else {
                    Write-Host "❌ Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
                }
            }
            
        }
        catch {
            Write-Host "❌ Authenticated request failed: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    catch {
        Write-Host "❌ Login failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n🎉 Cookie authentication testing complete!" -ForegroundColor Green
Write-Host "If all tests passed, your cookie session management is working correctly." -ForegroundColor Green 
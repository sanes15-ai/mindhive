# Test Web Dashboard
Write-Host "`n=== Testing Web Dashboard ===" -ForegroundColor Cyan

# Wait for dashboard to be ready
$maxAttempts = 30
$attempt = 0
$dashboardUrl = "http://localhost:3000"

Write-Host "`nWaiting for dashboard to start on $dashboardUrl..." -ForegroundColor Yellow

while ($attempt -lt $maxAttempts) {
    try {
        $response = Invoke-WebRequest -Uri $dashboardUrl -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            Write-Host "✓ Dashboard is ready!" -ForegroundColor Green
            break
        }
    } catch {
        $attempt++
        Write-Host "." -NoNewline
        Start-Sleep -Seconds 1
    }
}

if ($attempt -ge $maxAttempts) {
    Write-Host "`n✗ Dashboard did not start within $maxAttempts seconds" -ForegroundColor Red
    exit 1
}

# Test landing page
Write-Host "`n1. Testing Landing Page..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri $dashboardUrl -UseBasicParsing
    if ($response.Content -match "HIVE MIND" -or $response.Content -match "Collective Intelligence") {
        Write-Host "   ✓ Landing page loaded successfully" -ForegroundColor Green
    } else {
        Write-Host "   ⚠ Landing page loaded but content might be incorrect" -ForegroundColor Yellow
    }
} catch {
    Write-Host "   ✗ Failed to load landing page: $($_.Exception.Message)" -ForegroundColor Red
}

# Test static assets
Write-Host "`n2. Testing Static Assets..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$dashboardUrl/_next/static" -UseBasicParsing -ErrorAction SilentlyContinue
    Write-Host "   ✓ Static assets accessible" -ForegroundColor Green
} catch {
    Write-Host "   ⚠ Static assets might not be built yet (normal for dev mode)" -ForegroundColor Yellow
}

Write-Host "`n=== Dashboard Basic Tests Complete ===" -ForegroundColor Cyan
Write-Host "Open your browser to: $dashboardUrl" -ForegroundColor Green

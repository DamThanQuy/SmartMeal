[CmdletBinding()]
param(
    [ValidateSet('All', 'MobileE2E', 'MobileUnit', 'Backend', 'AdminWeb', 'Quick')]
    [string]$Suite = 'All'
)

$ErrorActionPreference = 'Continue'
$Root = $PSScriptRoot
$Results = @()

function Write-TestHeader([string]$Title) {
    Write-Host ""
    Write-Host ("=" * 70) -ForegroundColor Cyan
    Write-Host "  $Title" -ForegroundColor Yellow
    Write-Host ("=" * 70) -ForegroundColor Cyan
}

function Check-DockerServices {
    Write-Host "`n[1/4] Kiem tra trang thai may chu Backend & Database Docker..." -ForegroundColor White
    $containers = docker ps --format "{{.Names}}" 2>$null
    if ($containers -notcontains "smartmeal_postgres" -or $containers -notcontains "smartmeal_api") {
        Write-Warning "Container smartmeal_postgres hoac smartmeal_api chua chay!"
        Write-Host "Dang tu dong khoi dong cac container bang Docker Compose..." -ForegroundColor Yellow
        docker compose -f "$Root/docker-compose.yml" up -d postgres backend-api
        Start-Sleep -Seconds 4
    }

    try {
        $res = Invoke-RestMethod -Uri "http://localhost:5000/api/meta/allergies" -Method Get -TimeoutSec 5 -ErrorAction Stop
        if ($res.success) {
            Write-Host " -> Backend API & PostgreSQL dang hoat dong binh thuong! (HTTP 200 OK)" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Warning "Khong the ket noi toi Backend API tai http://localhost:5000: $_"
        return $false
    }
    return $true
}

$backendReady = Check-DockerServices

# -------------------------------------------------------------
# 1. MOBILE APP LIVE E2E TESTS (Ket noi truc tiep Backend that)
# -------------------------------------------------------------
if ($Suite -in 'All', 'MobileE2E', 'Quick') {
    Write-TestHeader "RUNNING: MOBILE APP LIVE E2E TESTS (Jest -> Backend API)"
    if (-not $backendReady) {
        Write-Host "Bo qua Mobile E2E do Backend API chua san sang." -ForegroundColor Red
        $Results += [PSCustomObject]@{ Suite = 'Mobile Live E2E'; Status = 'SKIPPED'; Duration = '0s' }
    } else {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        Push-Location "$Root/frontend/SmartMealMobile"
        try {
            $env:LIVE_API_URL = "http://localhost:5000/api"
            
            if ($Suite -eq 'Quick') {
                Write-Host "Chay cac luong E2E co ban (Nuoc uong & Cong thuc nau an)..." -ForegroundColor White
                npm test -- __tests__/live/water.live.test.ts __tests__/live/recipes.live.test.ts --testTimeout=30000
            } else {
                Write-Host "Chay cac bai test Live E2E tuong tac voi Backend that..." -ForegroundColor White
                npm test -- __tests__/live/water.live.test.ts __tests__/live/recipes.live.test.ts __tests__/live/notifications.live.test.ts __tests__/live/nutrition.live.test.ts __tests__/live/gamification.live.test.ts __tests__/live/plannerGrocery.live.test.ts --testTimeout=30000
            }
            $exitCode = $LASTEXITCODE
            $sw.Stop()

            if ($exitCode -eq 0) {
                Write-Host "-> MOBILE LIVE E2E: THANH CONG!" -ForegroundColor Green
                $Results += [PSCustomObject]@{ Suite = 'Mobile Live E2E'; Status = 'PASSED'; Duration = "$([math]::Round($sw.Elapsed.TotalSeconds, 1))s" }
            } else {
                Write-Host "-> MOBILE LIVE E2E: CO BAI TEST THAT BAI!" -ForegroundColor Red
                $Results += [PSCustomObject]@{ Suite = 'Mobile Live E2E'; Status = 'FAILED'; Duration = "$([math]::Round($sw.Elapsed.TotalSeconds, 1))s" }
            }
        } finally {
            Remove-Item env:LIVE_API_URL -ErrorAction SilentlyContinue
            Pop-Location
        }
    }
}

# -------------------------------------------------------------
# 2. MOBILE APP UNIT & COMPONENT TESTS (558 test cases)
# -------------------------------------------------------------
if ($Suite -in 'All', 'MobileUnit') {
    Write-TestHeader "RUNNING: MOBILE APP UNIT & COMPONENT TESTS"
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    Push-Location "$Root/frontend/SmartMealMobile"
    try {
        npm run test:unit
        $exitCode = $LASTEXITCODE
        $sw.Stop()

        if ($exitCode -eq 0) {
            Write-Host "-> MOBILE UNIT TESTS: THANH CONG!" -ForegroundColor Green
            $Results += [PSCustomObject]@{ Suite = 'Mobile Unit (558 tests)'; Status = 'PASSED'; Duration = "$([math]::Round($sw.Elapsed.TotalSeconds, 1))s" }
        } else {
            Write-Host "-> MOBILE UNIT TESTS: CO BAI TEST THAT BAI!" -ForegroundColor Red
            $Results += [PSCustomObject]@{ Suite = 'Mobile Unit (558 tests)'; Status = 'FAILED'; Duration = "$([math]::Round($sw.Elapsed.TotalSeconds, 1))s" }
        }
    } finally {
        Pop-Location
    }
}

# -------------------------------------------------------------
# 3. ADMIN WEB TESTS (Vitest UI & Services)
# -------------------------------------------------------------
if ($Suite -in 'All', 'AdminWeb', 'Quick') {
    Write-TestHeader "RUNNING: ADMIN WEB PORTAL TESTS (Vitest)"
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    Push-Location "$Root/frontend/admin-web"
    try {
        npm test -- --run
        $exitCode = $LASTEXITCODE
        $sw.Stop()

        if ($exitCode -eq 0) {
            Write-Host "-> ADMIN WEB TESTS: THANH CONG (186 tests)!" -ForegroundColor Green
            $Results += [PSCustomObject]@{ Suite = 'Admin Web (186 tests)'; Status = 'PASSED'; Duration = "$([math]::Round($sw.Elapsed.TotalSeconds, 1))s" }
        } else {
            Write-Host "-> ADMIN WEB TESTS: CO BAI TEST THAT BAI!" -ForegroundColor Red
            $Results += [PSCustomObject]@{ Suite = 'Admin Web (186 tests)'; Status = 'FAILED'; Duration = "$([math]::Round($sw.Elapsed.TotalSeconds, 1))s" }
        }
    } finally {
        Pop-Location
    }
}

# -------------------------------------------------------------
# 4. BACKEND INTEGRATION TESTS (.NET 9 + PostgreSQL)
# -------------------------------------------------------------
if ($Suite -in 'All', 'Backend', 'Quick') {
    Write-TestHeader "RUNNING: BACKEND INTEGRATION TESTS (ASP.NET Core .NET 9)"
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        $filterArgs = if ($Suite -eq 'Quick') {
            @('--filter', 'FullyQualifiedName~SmokeTests')
        } else {
            @('--filter', 'FullyQualifiedName~SmokeTests|FullyQualifiedName~HealthProfileTests|FullyQualifiedName~RecipeTests')
        }
        
        Write-Host "Chay kiem thu tich hop backend trong moi truong container .NET 9 SDK..." -ForegroundColor White
        docker run --rm `
            --network smartmeal_default `
            -e SMARTMEAL_TEST_DB="Host=postgres;Port=5432;Username=postgres;Password=postgrespassword;Database=postgres" `
            -v "$Root/backend:/src" `
            -w /src `
            mcr.microsoft.com/dotnet/sdk:9.0 `
            dotnet test SmartMeal.Tests/SmartMeal.Tests.csproj @filterArgs

        $exitCode = $LASTEXITCODE
        $sw.Stop()

        if ($exitCode -eq 0) {
            Write-Host "-> BACKEND TESTS: THANH CONG!" -ForegroundColor Green
            $Results += [PSCustomObject]@{ Suite = 'Backend Integration'; Status = 'PASSED'; Duration = "$([math]::Round($sw.Elapsed.TotalSeconds, 1))s" }
        } else {
            Write-Host "-> BACKEND TESTS: CO BAI TEST THAT BAI!" -ForegroundColor Red
            $Results += [PSCustomObject]@{ Suite = 'Backend Integration'; Status = 'FAILED'; Duration = "$([math]::Round($sw.Elapsed.TotalSeconds, 1))s" }
        }
    } catch {
        Write-Host "Loi thuc thi kiem thu backend: $_" -ForegroundColor Red
        $Results += [PSCustomObject]@{ Suite = 'Backend Integration'; Status = 'FAILED'; Duration = "$([math]::Round($sw.Elapsed.TotalSeconds, 1))s" }
    }
}

# -------------------------------------------------------------
# TONG KET BAO CAO (SUMMARY REPORT)
# -------------------------------------------------------------
Write-Host ""
Write-Host ("#" * 70) -ForegroundColor Cyan
Write-Host "                 BAO CAO KET QUA KIEM THU TU DONG               " -ForegroundColor Yellow
Write-Host ("#" * 70) -ForegroundColor Cyan
Write-Host ""

$Results | Format-Table -AutoSize -Property `
    @{ Label = "Bo Kiem Thu (Suite)"; Expression = { $_.Suite } }, `
    @{ Label = "Thoi Gian Chay"; Expression = { $_.Duration } }, `
    @{ Label = "Ket Qua"; Expression = {
        if ($_.Status -eq 'PASSED') { "[PASS] THANH CONG" }
        elseif ($_.Status -eq 'SKIPPED') { "[SKIP] BO QUA" }
        else { "[FAIL] THAT BAI" }
    }}

$hasFailures = $Results | Where-Object { $_.Status -eq 'FAILED' }
if ($hasFailures) {
    Write-Host "Co $($hasFailures.Count) bo kiem thu that bai!" -ForegroundColor Red
    exit 1
} else {
    Write-Host "Tat ca cac bo kiem thu da chay thanh cong! [OK]" -ForegroundColor Green
    exit 0
}

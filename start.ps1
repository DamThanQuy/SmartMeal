# ==============================================================
# SMARTMEAL ALL-IN-ONE RUNNER (Local + Cloudflare Tunnel)
# ==============================================================
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "         🥗 SMARTMEAL - ALL-IN-ONE RUNNER                  " -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Kiem tra PostgreSQL Service
Write-Host "`n[1/5] Kiem tra Co so du lieu PostgreSQL..." -ForegroundColor Yellow
$pgService = Get-Service -Name "postgresql-x64-18" -ErrorAction SilentlyContinue
if ($pgService) {
    if ($pgService.Status -ne "Running") {
        Write-Host "  -> Dang khoi dong PostgreSQL service..." -ForegroundColor Gray
        Start-Service postgresql-x64-18
    }
    Write-Host "  [OK] PostgreSQL dang hoat dong (Port 5432)" -ForegroundColor Green
} else {
    Write-Host "  [!] Khong tim thay service postgresql-x64-18, gia dinh PostgreSQL da duoc chay." -ForegroundColor Gray
}

# 2. Tim Cloudflared
$cloudflaredCmd = $null
$cmd = Get-Command cloudflared -ErrorAction SilentlyContinue
if ($cmd) {
    $cloudflaredCmd = $cmd.Source
} else {
    $defaultPath = "C:\Program Files (x86)\cloudflared\cloudflared.exe"
    if (Test-Path $defaultPath) {
        $cloudflaredCmd = $defaultPath
    } else {
        Write-Host "  [Loi] Khong tim thay cloudflared.exe! Vui long cai dat qua winget install Cloudflare.cloudflared" -ForegroundColor Red
        exit 1
    }
}

# 3. Giai phong port 5000 & 8081 neu dang bi chiem dung
$existing5000 = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($existing5000) {
    Write-Host "  -> Giai phong port 5000 (PID: $existing5000)..." -ForegroundColor Gray
    Stop-Process -Id $existing5000 -Force -ErrorAction SilentlyContinue
}

$tempDir = [System.IO.Path]::GetTempPath()
$backendLog = Join-Path $tempDir "sm_backend_$PID.log"
$cfApiLog   = Join-Path $tempDir "sm_cf_api_$PID.log"
$cfMetroLog = Join-Path $tempDir "sm_cf_metro_$PID.log"

$pBackend = $null
$pCfApi   = $null
$pCfMetro = $null

try {
    # 4. Khoi dong Backend API (.NET 9)
    Write-Host "`n[2/5] Khoi dong Backend API (.NET 9)..." -ForegroundColor Yellow
    $pBackend = Start-Process -FilePath "dotnet" `
        -ArgumentList "run --project backend\SmartMeal.API --launch-profile http" `
        -WorkingDirectory $PSScriptRoot `
        -RedirectStandardOutput $backendLog `
        -RedirectStandardError "$backendLog.err" `
        -PassThru -WindowStyle Hidden

    Write-Host "  -> Dang cho Backend san sang tren port 5000..." -ForegroundColor Gray
    $backendReady = $false
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 1
        try {
            $resp = Invoke-WebRequest -Uri "http://localhost:5000/swagger/index.html" -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($resp.StatusCode -eq 200) {
                $backendReady = $true
                break
            }
        } catch { }
    }

    if (-not $backendReady) {
        Write-Host "  [Loi] Backend API khong khoi dong kip thoi gian cho. Xem log tai: $backendLog" -ForegroundColor Red
        exit 1
    }
    Write-Host "  [OK] Backend API da san sang tai http://localhost:5000" -ForegroundColor Green

    # 5. Khoi dong Cloudflare Tunnel cho Backend API (Port 5000)
    Write-Host "`n[3/5] Tao Cloudflare Tunnel cho Backend API (Port 5000)..." -ForegroundColor Yellow
    $pCfApi = Start-Process -FilePath $cloudflaredCmd `
        -ArgumentList "tunnel --url http://localhost:5000" `
        -RedirectStandardError $cfApiLog `
        -PassThru -WindowStyle Hidden

    $apiUrl = $null
    for ($i = 0; $i -lt 25; $i++) {
        Start-Sleep -Seconds 1
        if (Test-Path $cfApiLog) {
            $logContent = Get-Content $cfApiLog -Raw -ErrorAction SilentlyContinue
            if ($logContent -match "(https://[a-zA-Z0-9-]+\.trycloudflare\.com)") {
                $apiUrl = $matches[1]
                break
            }
        }
    }

    if (-not $apiUrl) {
        Write-Host "  [Loi] Khong the lay Cloudflare URL cho Backend. Xem log tai: $cfApiLog" -ForegroundColor Red
        exit 1
    }
    Write-Host "  [OK] Backend API Tunnel: $apiUrl" -ForegroundColor Green

    # Cap nhat vao file .env cua mobile
    $mobileEnvPath = Join-Path $PSScriptRoot "frontend\SmartMealMobile\.env"
    if (Test-Path $mobileEnvPath) {
        $envContent = Get-Content $mobileEnvPath -Raw
        $newEnvContent = $envContent -replace 'EXPO_PUBLIC_API_URL=https://[^\r\n]+', "EXPO_PUBLIC_API_URL=$apiUrl/api"
        Set-Content -Path $mobileEnvPath -Value $newEnvContent -NoNewline
        Write-Host "  [OK] Da tu dong cap nhat EXPO_PUBLIC_API_URL trong frontend/SmartMealMobile/.env" -ForegroundColor Green
    }

    # 6. Khoi dong Cloudflare Tunnel cho Expo Metro (Port 8081)
    Write-Host "`n[4/5] Tao Cloudflare Tunnel cho Expo Go (Port 8081)..." -ForegroundColor Yellow
    $pCfMetro = Start-Process -FilePath $cloudflaredCmd `
        -ArgumentList "tunnel --url http://localhost:8081" `
        -RedirectStandardError $cfMetroLog `
        -PassThru -WindowStyle Hidden

    $metroUrl = $null
    for ($i = 0; $i -lt 25; $i++) {
        Start-Sleep -Seconds 1
        if (Test-Path $cfMetroLog) {
            $logContent = Get-Content $cfMetroLog -Raw -ErrorAction SilentlyContinue
            if ($logContent -match "(https://[a-zA-Z0-9-]+\.trycloudflare\.com)") {
                $metroUrl = $matches[1]
                break
            }
        }
    }

    if (-not $metroUrl) {
        Write-Host "  [Loi] Khong the lay Cloudflare URL cho Metro. Xem log tai: $cfMetroLog" -ForegroundColor Red
        exit 1
    }
    $metroHost = $metroUrl -replace "^https?://", ""
    Write-Host "  [OK] Expo Metro Tunnel: $metroUrl" -ForegroundColor Green
    Write-Host "  [OK] Deep Link Expo Go: exp://$metroHost" -ForegroundColor Cyan

    # 7. Khoi chay Expo Dev Server
    Write-Host "`n============================================================" -ForegroundColor Cyan
    Write-Host "  🎉 HE THONG DA SAN SANG DE KET NOI!" -ForegroundColor Green
    Write-Host "  - Swagger UI: $apiUrl/swagger" -ForegroundColor White
    Write-Host "  - Expo Go URL: exp://$metroHost" -ForegroundColor White
    Write-Host "  - Nhan Ctrl+C de dung toan bo he thong cung mot luc." -ForegroundColor Yellow
    Write-Host "============================================================`n" -ForegroundColor Cyan

    $env:EXPO_PACKAGER_PROXY_URL = $metroUrl
    Set-Location (Join-Path $PSScriptRoot "frontend\SmartMealMobile")
    npx expo start -c

} finally {
    Write-Host "`nDang dung toan bo tien trinh dang chay ngam..." -ForegroundColor Yellow
    if ($pBackend -and !$pBackend.HasExited) { Stop-Process -Id $pBackend.Id -Force -ErrorAction SilentlyContinue }
    if ($pCfApi -and !$pCfApi.HasExited) { Stop-Process -Id $pCfApi.Id -Force -ErrorAction SilentlyContinue }
    if ($pCfMetro -and !$pCfMetro.HasExited) { Stop-Process -Id $pCfMetro.Id -Force -ErrorAction SilentlyContinue }
    Remove-Item $backendLog, "$backendLog.err", $cfApiLog, $cfMetroLog -ErrorAction SilentlyContinue
    Write-Host "[OK] Da giai phong toan bo he thong sach se!" -ForegroundColor Green
}

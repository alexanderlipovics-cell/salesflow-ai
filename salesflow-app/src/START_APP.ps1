# ═══════════════════════════════════════════════════════════════════════════
# START APP - Backend + Frontend
# ═══════════════════════════════════════════════════════════════════════════

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $scriptPath "src\backend"
$frontendPath = $scriptPath

Write-Host "🚀 Starte Sales Flow App..." -ForegroundColor Cyan
Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════
# BACKEND
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "📦 Starte Backend..." -ForegroundColor Yellow
$backendCommand = "cd '$backendPath'; python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCommand
Start-Sleep -Seconds 2

# ═══════════════════════════════════════════════════════════════════════════
# FRONTEND
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "📱 Starte Frontend..." -ForegroundColor Yellow
$frontendCommand = "cd '$frontendPath'; npm start"
Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCommand

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "✅ APP GESTARTET!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Backend:  http://127.0.0.1:8000" -ForegroundColor Cyan
Write-Host "📱 Frontend: Expo Dev Server (siehe neues Fenster)" -ForegroundColor Cyan
Write-Host ""
Write-Host "🔍 Zwei neue PowerShell-Fenster wurden geöffnet:" -ForegroundColor Yellow
Write-Host "   1. Backend Server" -ForegroundColor White
Write-Host "   2. Frontend (Expo)" -ForegroundColor White
Write-Host ""
Write-Host "💡 Tipp: Drücke 'w' im Expo-Fenster für Web-Version" -ForegroundColor Yellow
Write-Host ""


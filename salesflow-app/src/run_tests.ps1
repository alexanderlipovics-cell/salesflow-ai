# ═══════════════════════════════════════════════════════════════════════════
# KOMPLETTES SYSTEM-TEST RUNNER (PowerShell)
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "═══════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🧪 KOMPLETTES SYSTEM-TEST" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Prüfe ob Backend läuft
Write-Host "🔍 Prüfe Backend..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8001/api/v1/health" -Method GET -TimeoutSec 5 -ErrorAction Stop
    Write-Host "✅ Backend läuft auf Port 8001" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend läuft NICHT!" -ForegroundColor Red
    Write-Host "   Starte Backend: cd backend; python -m uvicorn app.main:app --host 0.0.0.0 --port 8001" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "🧪 Starte Python Tests..." -ForegroundColor Yellow
Write-Host ""

# Python Tests
$token = $env:SUPABASE_TOKEN
if (-not $token) {
    Write-Host "⚠️  Kein SUPABASE_TOKEN gesetzt" -ForegroundColor Yellow
    Write-Host "   Setze: `$env:SUPABASE_TOKEN = 'YOUR_TOKEN'" -ForegroundColor Gray
    Write-Host "   Oder: python test_complete_system.py YOUR_TOKEN" -ForegroundColor Gray
    Write-Host ""
    python test_complete_system.py
} else {
    python test_complete_system.py $token
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ Tests abgeschlossen" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Nächste Schritte:" -ForegroundColor Yellow
Write-Host "   1. Prüfe Ergebnisse oben" -ForegroundColor White
Write-Host "   2. Führe manuelle Frontend-Tests durch (siehe test_frontend_manual.md)" -ForegroundColor White
Write-Host "   3. Wenn alles OK: Altes Backend löschen (cleanup_old_backend.ps1)" -ForegroundColor White
Write-Host ""


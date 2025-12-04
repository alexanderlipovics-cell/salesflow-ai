# ═══════════════════════════════════════════════════════════════════════════
# RESTART ALL - Backend + Frontend
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "🔄 Starte alles neu..." -ForegroundColor Cyan
Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════
# 1. BACKEND
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "📦 Backend Dependencies aktualisieren..." -ForegroundColor Yellow
cd src/backend

if (Test-Path requirements.txt) {
    pip install -r requirements.txt --quiet
    Write-Host "✅ Backend Dependencies aktualisiert" -ForegroundColor Green
} else {
    Write-Host "⚠️  requirements.txt nicht gefunden" -ForegroundColor Yellow
}

cd ../..

# ═══════════════════════════════════════════════════════════════════════════
# 2. FRONTEND
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "📦 Frontend Dependencies aktualisieren..." -ForegroundColor Yellow
npm install --silent
Write-Host "✅ Frontend Dependencies aktualisiert" -ForegroundColor Green

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ ALLES AKTUALISIERT!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚀 Starte jetzt:" -ForegroundColor Yellow
Write-Host ""
Write-Host "Terminal 1 (Backend):" -ForegroundColor Cyan
Write-Host "  cd src/backend" -ForegroundColor White
Write-Host "  python -m uvicorn app.main:app --reload" -ForegroundColor White
Write-Host ""
Write-Host "Terminal 2 (Frontend):" -ForegroundColor Cyan
Write-Host "  npm start" -ForegroundColor White
Write-Host ""
Write-Host "ODER verwende die Start-Scripts:" -ForegroundColor Yellow
Write-Host "  .\START_BACKEND.ps1" -ForegroundColor White
Write-Host "  .\START_FRONTEND.ps1" -ForegroundColor White
Write-Host ""


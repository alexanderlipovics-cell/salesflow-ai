# ═══════════════════════════════════════════════════════════════════════════
# BACKEND START - EINFACHE VERSION
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "🚀 Starte Backend..." -ForegroundColor Cyan

# Ins Backend-Verzeichnis wechseln
$backendPath = Join-Path $PSScriptRoot "src\backend"

if (-not (Test-Path $backendPath)) {
    Write-Host "❌ Backend-Verzeichnis nicht gefunden: $backendPath" -ForegroundColor Red
    exit 1
}

Set-Location $backendPath
Write-Host "📂 Verzeichnis: $(Get-Location)" -ForegroundColor Yellow

# Prüfe ob app/main.py existiert
if (-not (Test-Path "app\main.py")) {
    Write-Host "❌ app/main.py nicht gefunden!" -ForegroundColor Red
    exit 1
}

# PYTHONPATH setzen
$env:PYTHONPATH = $backendPath

# Starte Backend
Write-Host "✅ Starte Backend auf http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "📚 Docs: http://127.0.0.1:8000/docs" -ForegroundColor Cyan
Write-Host ""

python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000


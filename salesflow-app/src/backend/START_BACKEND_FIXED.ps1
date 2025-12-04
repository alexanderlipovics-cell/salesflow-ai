# ═══════════════════════════════════════════════════════════════════════════
# BACKEND START - FIXED VERSION
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "🚀 Starte Backend..." -ForegroundColor Cyan

# WICHTIG: Muss im src/backend Verzeichnis ausgeführt werden
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

Write-Host "📂 Arbeitsverzeichnis: $(Get-Location)" -ForegroundColor Yellow

# Prüfe ob Python verfügbar ist
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    Write-Host "❌ Python nicht gefunden! Bitte Python installieren." -ForegroundColor Red
    exit 1
}

# Prüfe ob app/main.py existiert
if (-not (Test-Path "app/main.py")) {
    Write-Host "❌ app/main.py nicht gefunden!" -ForegroundColor Red
    Write-Host "   Bitte im src/backend Verzeichnis ausführen." -ForegroundColor Yellow
    exit 1
}

# Prüfe ob requirements.txt existiert
if (Test-Path "requirements.txt") {
    Write-Host "📦 Prüfe Dependencies..." -ForegroundColor Yellow
    # Optional: pip install -r requirements.txt --quiet
}

# Starte Backend
Write-Host "✅ Starte Backend auf http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "📚 Docs: http://127.0.0.1:8000/docs" -ForegroundColor Cyan
Write-Host ""

# WICHTIG: Muss im src/backend Verzeichnis sein, damit "app.main:app" funktioniert
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000


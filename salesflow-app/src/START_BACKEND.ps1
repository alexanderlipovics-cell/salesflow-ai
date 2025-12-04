# ═══════════════════════════════════════════════════════════════════════════
# BACKEND START SCRIPT
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "🚀 Starte Backend..." -ForegroundColor Cyan

cd src/backend

# Prüfe ob Python verfügbar ist
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    Write-Host "❌ Python nicht gefunden! Bitte Python installieren." -ForegroundColor Red
    exit 1
}

# Prüfe ob Dependencies installiert sind
if (-not (Test-Path "venv")) {
    Write-Host "📦 Erstelle Virtual Environment..." -ForegroundColor Yellow
    python -m venv venv
}

# Aktiviere Virtual Environment
Write-Host "🔧 Aktiviere Virtual Environment..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1

# Installiere Dependencies
Write-Host "📦 Installiere Dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt

# Starte Backend
Write-Host "✅ Starte Backend auf http://127.0.0.1:8000" -ForegroundColor Green
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000


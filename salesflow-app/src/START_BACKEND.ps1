# ═══════════════════════════════════════════════════════════════════════════
# BACKEND START SCRIPT
# ═══════════════════════════════════════════════════════════════════════════

Write-Host "🚀 Starte Backend..." -ForegroundColor Cyan

# WICHTIG: Ins Backend-Verzeichnis wechseln
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$backendPath = Join-Path $scriptPath "src\backend"

if (-not (Test-Path $backendPath)) {
    Write-Host "❌ Backend-Verzeichnis nicht gefunden: $backendPath" -ForegroundColor Red
    exit 1
}

Set-Location $backendPath
Write-Host "📂 Arbeitsverzeichnis: $(Get-Location)" -ForegroundColor Yellow

# Prüfe ob app/main.py existiert
if (-not (Test-Path "app\main.py")) {
    Write-Host "❌ app/main.py nicht gefunden!" -ForegroundColor Red
    Write-Host "   Aktuelles Verzeichnis: $(Get-Location)" -ForegroundColor Yellow
    exit 1
}

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
Write-Host "📚 Docs: http://127.0.0.1:8000/docs" -ForegroundColor Cyan
Write-Host ""

# WICHTIG: Muss im src/backend Verzeichnis sein, damit "app.main:app" funktioniert
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000


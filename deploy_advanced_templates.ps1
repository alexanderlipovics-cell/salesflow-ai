# ╔════════════════════════════════════════════════════════════════╗
# ║  ADVANCED FOLLOW-UP TEMPLATES DEPLOYMENT SCRIPT               ║
# ║  PowerShell Script für Windows                                 ║
# ╚════════════════════════════════════════════════════════════════╝

Write-Host "🚀 ADVANCED FOLLOW-UP TEMPLATES DEPLOYMENT" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-Not (Test-Path ".env")) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host "Please create .env file with SUPABASE_URL and SUPABASE_KEY" -ForegroundColor Yellow
    exit 1
}

# Load environment variables
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
}

$SUPABASE_URL = $env:SUPABASE_URL
$SUPABASE_KEY = $env:SUPABASE_KEY
$OPENAI_API_KEY = $env:OPENAI_API_KEY

if (-Not $SUPABASE_URL -or -Not $SUPABASE_KEY) {
    Write-Host "❌ SUPABASE_URL or SUPABASE_KEY not found in .env" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Environment variables loaded" -ForegroundColor Green
Write-Host ""

# ═══════════════════════════════════════════════════════════════
# PHASE 1: DATABASE MIGRATION
# ═══════════════════════════════════════════════════════════════

Write-Host "📊 PHASE 1: Database Migration" -ForegroundColor Cyan
Write-Host "-------------------------------" -ForegroundColor Cyan

$SQL_FILE = "backend/database/advanced_templates_migration.sql"

if (-Not (Test-Path $SQL_FILE)) {
    Write-Host "❌ SQL file not found: $SQL_FILE" -ForegroundColor Red
    exit 1
}

Write-Host "📄 SQL file found: $SQL_FILE" -ForegroundColor Green
Write-Host ""

Write-Host "⚠️  WICHTIG: Du musst das SQL-Script manuell in Supabase ausführen!" -ForegroundColor Yellow
Write-Host ""
Write-Host "Schritte:" -ForegroundColor White
Write-Host "1. Öffne Supabase Dashboard: $SUPABASE_URL" -ForegroundColor White
Write-Host "2. Gehe zu SQL Editor" -ForegroundColor White
Write-Host "3. Öffne die Datei: $SQL_FILE" -ForegroundColor White
Write-Host "4. Kopiere den Inhalt und führe ihn aus" -ForegroundColor White
Write-Host ""

$response = Read-Host "Hast du das SQL-Script ausgeführt? (y/n)"
if ($response -ne "y") {
    Write-Host "❌ Deployment abgebrochen" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Database Migration abgeschlossen" -ForegroundColor Green
Write-Host ""

# ═══════════════════════════════════════════════════════════════
# PHASE 2: BACKEND DEPENDENCIES
# ═══════════════════════════════════════════════════════════════

Write-Host "📦 PHASE 2: Backend Dependencies" -ForegroundColor Cyan
Write-Host "--------------------------------" -ForegroundColor Cyan

# Check if OpenAI package is installed
$pythonCmd = "python"
if (Get-Command python3 -ErrorAction SilentlyContinue) {
    $pythonCmd = "python3"
}

Write-Host "Checking OpenAI package..." -ForegroundColor White
& $pythonCmd -m pip show openai > $null 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "📦 Installing OpenAI package..." -ForegroundColor Yellow
    & $pythonCmd -m pip install openai --break-system-packages
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ OpenAI package installed" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to install OpenAI package" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ OpenAI package already installed" -ForegroundColor Green
}

Write-Host ""

# ═══════════════════════════════════════════════════════════════
# PHASE 3: OPENAI API KEY CHECK
# ═══════════════════════════════════════════════════════════════

Write-Host "🔑 PHASE 3: OpenAI API Key Check" -ForegroundColor Cyan
Write-Host "---------------------------------" -ForegroundColor Cyan

if (-Not $OPENAI_API_KEY) {
    Write-Host "⚠️  OPENAI_API_KEY nicht in .env gefunden!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "GPT Auto-Complete funktioniert NICHT ohne API Key!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Bitte füge folgende Zeile zur .env hinzu:" -ForegroundColor White
    Write-Host "OPENAI_API_KEY=sk-..." -ForegroundColor White
    Write-Host ""
    
    $response = Read-Host "Trotzdem fortfahren? (y/n)"
    if ($response -ne "y") {
        Write-Host "❌ Deployment abgebrochen" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ OPENAI_API_KEY gefunden" -ForegroundColor Green
}

Write-Host ""

# ═══════════════════════════════════════════════════════════════
# PHASE 4: RESTART BACKEND
# ═══════════════════════════════════════════════════════════════

Write-Host "🔄 PHASE 4: Backend Restart" -ForegroundColor Cyan
Write-Host "----------------------------" -ForegroundColor Cyan

Write-Host "Bitte starte den Backend Server neu:" -ForegroundColor White
Write-Host ""
Write-Host "cd backend" -ForegroundColor Yellow
Write-Host "python main.py" -ForegroundColor Yellow
Write-Host ""
Write-Host "Oder mit uvicorn:" -ForegroundColor White
Write-Host "uvicorn main:app --reload --host 0.0.0.0 --port 8000" -ForegroundColor Yellow
Write-Host ""

# ═══════════════════════════════════════════════════════════════
# PHASE 5: VERIFICATION
# ═══════════════════════════════════════════════════════════════

Write-Host "✅ PHASE 5: Verification" -ForegroundColor Cyan
Write-Host "------------------------" -ForegroundColor Cyan
Write-Host ""

Write-Host "Nach dem Backend-Neustart, teste die API:" -ForegroundColor White
Write-Host ""
Write-Host "1. Health Check:" -ForegroundColor White
Write-Host "   curl http://localhost:8000/api/followup-templates/health" -ForegroundColor Yellow
Write-Host ""
Write-Host "2. List Templates:" -ForegroundColor White
Write-Host "   curl http://localhost:8000/api/followup-templates/list" -ForegroundColor Yellow
Write-Host ""
Write-Host "3. Get Channels:" -ForegroundColor White
Write-Host "   curl http://localhost:8000/api/followup-templates/meta/channels" -ForegroundColor Yellow
Write-Host ""

Write-Host "=============================================" -ForegroundColor Green
Write-Host "🎉 DEPLOYMENT ABGESCHLOSSEN!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""

Write-Host "Nächste Schritte:" -ForegroundColor White
Write-Host "1. Backend neu starten" -ForegroundColor White
Write-Host "2. Frontend-App öffnen und Templates Manager nutzen" -ForegroundColor White
Write-Host "3. Erstes Template erstellen" -ForegroundColor White
Write-Host "4. GPT Auto-Complete testen" -ForegroundColor White
Write-Host ""

Write-Host "📚 Dokumentation: backend/database/ADVANCED_TEMPLATES_README.md" -ForegroundColor Cyan
Write-Host ""


# ╔════════════════════════════════════════════════════════════════════════════╗
# ║  🚀 SALES FLOW AI - ALLE PROMPTS AKTIVIEREN                               ║
# ║  Führt die komplette Einrichtung des AI-Prompts-Systems durch             ║
# ╚════════════════════════════════════════════════════════════════════════════╝

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🚀 SALES FLOW AI - ALLE PROMPTS AKTIVIEREN                      ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Pfad zum Backend
$BACKEND_PATH = "$PSScriptRoot\backend"
$ENV_FILE = "$BACKEND_PATH\.env"
$ENV_TEMPLATE = "$BACKEND_PATH\env.template.complete"

# ═══════════════════════════════════════════════════════════════════════════
# STEP 1: .env Datei prüfen
# ═══════════════════════════════════════════════════════════════════════════
Write-Host "📋 STEP 1: Prüfe .env Datei..." -ForegroundColor Yellow

if (-not (Test-Path $ENV_FILE)) {
    Write-Host "   ⚠️  .env Datei nicht gefunden!" -ForegroundColor Red
    Write-Host ""
    Write-Host "   👉 Bitte erstelle die .env Datei:" -ForegroundColor White
    Write-Host "      1. Kopiere: backend\env.template.complete" -ForegroundColor Gray
    Write-Host "      2. Benenne um zu: backend\.env" -ForegroundColor Gray
    Write-Host "      3. Füge deine API-Keys ein:" -ForegroundColor Gray
    Write-Host "         - SUPABASE_URL" -ForegroundColor DarkGray
    Write-Host "         - SUPABASE_KEY" -ForegroundColor DarkGray
    Write-Host "         - DATABASE_URL" -ForegroundColor DarkGray
    Write-Host "         - OPENAI_API_KEY" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "   📂 Öffne Template:" -ForegroundColor Cyan
    Write-Host "      notepad `"$ENV_TEMPLATE`"" -ForegroundColor White
    Write-Host ""
    
    # Öffne das Template
    Start-Process notepad $ENV_TEMPLATE
    
    Write-Host "   ❌ Skript gestoppt. Erstelle zuerst die .env Datei!" -ForegroundColor Red
    Read-Host "   Drücke ENTER zum Beenden"
    exit 1
} else {
    Write-Host "   ✅ .env Datei gefunden!" -ForegroundColor Green
}

# ═══════════════════════════════════════════════════════════════════════════
# STEP 2: Dependencies prüfen
# ═══════════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "📋 STEP 2: Prüfe Python Dependencies..." -ForegroundColor Yellow

Set-Location $BACKEND_PATH

# Prüfe ob venv existiert
if (Test-Path "$BACKEND_PATH\venv") {
    Write-Host "   ✅ Virtual Environment gefunden!" -ForegroundColor Green
    & "$BACKEND_PATH\venv\Scripts\Activate.ps1"
} else {
    Write-Host "   ⚠️  Erstelle Virtual Environment..." -ForegroundColor Yellow
    python -m venv venv
    & "$BACKEND_PATH\venv\Scripts\Activate.ps1"
}

# Installiere Dependencies
Write-Host "   📦 Installiere Requirements..." -ForegroundColor Yellow
pip install -r requirements.txt -q

Write-Host "   ✅ Dependencies installiert!" -ForegroundColor Green

# ═══════════════════════════════════════════════════════════════════════════
# STEP 3: SQL Migration Information
# ═══════════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "📋 STEP 3: Datenbank-Migration (AI Prompts)" -ForegroundColor Yellow
Write-Host ""
Write-Host "   🗄️  Führe die SQL-Migration in Supabase aus:" -ForegroundColor White
Write-Host ""
Write-Host "   1. Öffne Supabase Dashboard → SQL Editor" -ForegroundColor Gray
Write-Host "   2. Kopiere den Inhalt aus:" -ForegroundColor Gray
Write-Host "      backend\database\ai_prompts_migration.sql" -ForegroundColor Cyan
Write-Host "   3. Führe das SQL aus" -ForegroundColor Gray
Write-Host ""
Write-Host "   📂 Öffne SQL-Datei:" -ForegroundColor Yellow

$SQL_FILE = "$BACKEND_PATH\database\ai_prompts_migration.sql"
Write-Host "      notepad `"$SQL_FILE`"" -ForegroundColor White

# Öffne die SQL-Datei
Start-Process notepad $SQL_FILE

Write-Host ""
Write-Host "   ℹ️  Diese Migration erstellt:" -ForegroundColor Cyan
Write-Host "      - Tabelle: ai_prompts (12 Standard-Prompts)" -ForegroundColor Gray
Write-Host "      - Tabelle: ai_prompt_executions (Logging)" -ForegroundColor Gray

# ═══════════════════════════════════════════════════════════════════════════
# STEP 4: Backend starten
# ═══════════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "📋 STEP 4: Backend starten..." -ForegroundColor Yellow
Write-Host ""
Write-Host "   🚀 Starte Backend auf Port 8000..." -ForegroundColor White
Write-Host ""
Write-Host "   Führe folgenden Befehl aus:" -ForegroundColor Gray
Write-Host "   cd backend" -ForegroundColor Cyan
Write-Host "   .\venv\Scripts\Activate.ps1" -ForegroundColor Cyan
Write-Host "   python -m uvicorn app.main:app --reload --port 8000" -ForegroundColor Cyan
Write-Host ""

# ═══════════════════════════════════════════════════════════════════════════
# ZUSAMMENFASSUNG
# ═══════════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ VORBEREITUNG ABGESCHLOSSEN!                                  ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 NÄCHSTE SCHRITTE:" -ForegroundColor White
Write-Host ""
Write-Host "   1️⃣  .env Datei mit echten API-Keys ausfüllen" -ForegroundColor Yellow
Write-Host "   2️⃣  SQL-Migration in Supabase ausführen" -ForegroundColor Yellow
Write-Host "   3️⃣  Backend starten:" -ForegroundColor Yellow
Write-Host "       cd backend && python -m uvicorn app.main:app --reload --port 8000" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 VERFÜGBARE AI-PROMPTS:" -ForegroundColor Magenta
Write-Host ""
Write-Host "   🛡️  Einwand-Behandlung:" -ForegroundColor White
Write-Host "       - Objection: Preis" -ForegroundColor Gray
Write-Host "       - Objection: Zeit" -ForegroundColor Gray
Write-Host ""
Write-Host "   📈 Upselling:" -ForegroundColor White
Write-Host "       - Upsell nach Erfolg" -ForegroundColor Gray
Write-Host ""
Write-Host "   🎯 Coaching:" -ForegroundColor White
Write-Host "       - Meeting Prep (DISG)" -ForegroundColor Gray
Write-Host "       - Tagesfokus (Daily Check-in)" -ForegroundColor Gray
Write-Host "       - Win Probability Analyse" -ForegroundColor Gray
Write-Host ""
Write-Host "   📧 Follow-up:" -ForegroundColor White
Write-Host "       - Proposal Follow-Up" -ForegroundColor Gray
Write-Host "       - Lead Reaktivierung" -ForegroundColor Gray
Write-Host ""
Write-Host "   🚀 Lead-Gen:" -ForegroundColor White
Write-Host "       - Demo Einladung (BANT)" -ForegroundColor Gray
Write-Host "       - Referral Request" -ForegroundColor Gray
Write-Host "       - FAQ-Antwort" -ForegroundColor Gray
Write-Host "       - Social DM Akquise" -ForegroundColor Gray
Write-Host ""
Write-Host "🤖 SYSTEM-PROMPTS (automatisch aktiv):" -ForegroundColor Magenta
Write-Host ""
Write-Host "   - AI Coach System Prompt" -ForegroundColor Gray
Write-Host "   - Deal-Medic System Prompt" -ForegroundColor Gray
Write-Host "   - Neuro-Profiler System Prompt" -ForegroundColor Gray
Write-Host "   - Feuerlöscher (L.E.A.F.) System Prompt" -ForegroundColor Gray
Write-Host "   - Compliance Filter Prompt" -ForegroundColor Gray
Write-Host "   - Memory Extraction Prompt" -ForegroundColor Gray
Write-Host "   - Team-Chief System Prompt" -ForegroundColor Gray
Write-Host "   - CHIEF Coaching Prompts (DE/EN)" -ForegroundColor Gray
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════" -ForegroundColor DarkGray
Write-Host ""

Read-Host "Drücke ENTER zum Beenden"


# ============================================================================
# SALES FLOW AI - TITANIUM LAUNCHER v1.0
# ============================================================================
# Purpose: Safe and professional backend setup
# Features:
#   - Creates isolated venv (system Python stays clean)
#   - Checks for .env file (prevents runtime errors)
#   - Installs dependencies safely
#   - Reminds about SQL schema fix
#   - Launches Titanium Import Engine
# ============================================================================

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "🤖 SALES FLOW AI - TITANIUM SETUP" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# ============================================================================
# 1. ENVIRONMENT CHECK
# ============================================================================
Write-Host "🔍 Checking prerequisites..." -ForegroundColor Yellow

if (-not (Test-Path ".env")) {
    Write-Host "❌ ERROR: No .env file found!" -ForegroundColor Red
    Write-Host "   Please create a .env file with:" -ForegroundColor Red
    Write-Host "   - SUPABASE_URL=your-url-here" -ForegroundColor Red
    Write-Host "   - SUPABASE_KEY=your-key-here" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✅ .env file found" -ForegroundColor Green

# Check Python
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR: Python not found!" -ForegroundColor Red
    Write-Host "   Please install Python 3.10 or 3.11" -ForegroundColor Red
    Write-Host "   Download: https://www.python.org/downloads/" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# ============================================================================
# 2. VIRTUAL ENVIRONMENT (Safety First)
# ============================================================================
if (-not (Test-Path "venv")) {
    Write-Host ""
    Write-Host "📦 Creating safe Python environment (venv)..." -ForegroundColor Yellow
    python -m venv venv
    Write-Host "✅ Virtual environment created" -ForegroundColor Green
} else {
    Write-Host "✅ Virtual environment already exists" -ForegroundColor Green
}

# ============================================================================
# 3. DEPENDENCIES
# ============================================================================
Write-Host ""
Write-Host "⬇️  Installing dependencies in venv..." -ForegroundColor Yellow
Write-Host "   (This may take a minute...)" -ForegroundColor Gray

try {
    .\venv\Scripts\python.exe -m pip install --upgrade pip --quiet
    .\venv\Scripts\python.exe -m pip install -r requirements.txt --quiet
    Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR: Failed to install dependencies!" -ForegroundColor Red
    Write-Host "   Check if requirements.txt exists" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# ============================================================================
# 4. DATABASE SCHEMA REMINDER
# ============================================================================
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "⚠️  DATABASE CHECK:" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host ""
Write-Host "Have you executed 'fix_schema_titanium.sql' in Supabase?" -ForegroundColor Yellow
Write-Host ""
Write-Host "Location: backend/db/fix_schema_titanium.sql" -ForegroundColor Cyan
Write-Host ""
Write-Host "If YES: Press ENTER to continue" -ForegroundColor Green
Write-Host "If NO:  Press CTRL+C to abort and run the SQL first" -ForegroundColor Red
Write-Host ""

Read-Host

# ============================================================================
# 5. LAUNCH IMPORT ENGINE
# ============================================================================
Write-Host ""
Write-Host "🚀 Starting Titanium Import Engine..." -ForegroundColor Green
Write-Host ""

try {
    .\venv\Scripts\python.exe scripts/titanium_import.py
    
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "✅ SETUP COMPLETED SUCCESSFULLY" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "💎 Your backend is now ready for AI integration." -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🔒 IMPORTANT: Set up RLS policies before going live!" -ForegroundColor Yellow
    Write-Host "   (Row Level Security in Supabase)" -ForegroundColor Yellow
    Write-Host ""
    
} catch {
    Write-Host ""
    Write-Host "❌ ERROR: Import failed!" -ForegroundColor Red
    Write-Host "   Check the error messages above" -ForegroundColor Red
    Write-Host ""
}

Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")


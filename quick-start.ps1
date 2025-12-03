# ⚡ Sales Flow AI - Quick Start Script
# Automatisiert die wichtigsten Setup-Schritte

Write-Host "🚀 Sales Flow AI - Quick Start" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check Prerequisites
Write-Host "📋 Checking Prerequisites..." -ForegroundColor Yellow

$nodeVersion = node --version 2>$null
if ($nodeVersion) {
    Write-Host "✅ Node.js: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js not found. Please install Node.js 18+" -ForegroundColor Red
    exit 1
}

$npmVersion = npm --version 2>$null
if ($npmVersion) {
    Write-Host "✅ npm: $npmVersion" -ForegroundColor Green
} else {
    Write-Host "❌ npm not found" -ForegroundColor Red
    exit 1
}

$pythonVersion = python --version 2>$null
if ($pythonVersion) {
    Write-Host "✅ Python: $pythonVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Python not found. Please install Python 3.10+" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 1: Frontend Setup
Write-Host "📦 Step 1: Installing Frontend Dependencies..." -ForegroundColor Yellow
Set-Location salesflow-ai

if (Test-Path "node_modules") {
    Write-Host "⚠️  node_modules already exists. Skipping npm install." -ForegroundColor Yellow
} else {
    npm install
    Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
}

# Install additional dependencies
Write-Host "📦 Installing additional dependencies..." -ForegroundColor Yellow
npm install framer-motion zustand @tanstack/react-query class-variance-authority tailwind-merge

Write-Host ""

# Step 2: Backend Setup
Write-Host "🐍 Step 2: Setting up Backend..." -ForegroundColor Yellow
Set-Location ..\backend

if (Test-Path "venv") {
    Write-Host "⚠️  venv already exists. Skipping virtual environment creation." -ForegroundColor Yellow
} else {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
    Write-Host "✅ Virtual environment created" -ForegroundColor Green
}

Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1

if (Test-Path "requirements.txt") {
    Write-Host "Installing Python dependencies..." -ForegroundColor Yellow
    pip install -r requirements.txt
    Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
} else {
    Write-Host "⚠️  requirements.txt not found" -ForegroundColor Yellow
}

Write-Host ""

# Step 3: Environment Files Check
Write-Host "🔐 Step 3: Checking Environment Files..." -ForegroundColor Yellow
Set-Location ..\salesflow-ai

if (Test-Path ".env") {
    Write-Host "✅ Frontend .env exists" -ForegroundColor Green
    Write-Host "⚠️  Please verify your API keys in .env" -ForegroundColor Yellow
} else {
    Write-Host "❌ Frontend .env not found" -ForegroundColor Red
    Write-Host "📝 Creating .env template..." -ForegroundColor Yellow
    
    @"
# Sales Flow AI - Frontend Environment Variables

# API Configuration
VITE_API_BASE_URL=/api

# Supabase Configuration
VITE_SUPABASE_URL=https://lncwvbhcafkdorypnpnz.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY_HERE

# OpenAI (für Edge Functions)
VITE_OPENAI_API_KEY=sk-YOUR_OPENAI_KEY_HERE
"@ | Out-File -FilePath ".env" -Encoding UTF8
    
    Write-Host "✅ .env template created. Please fill in your API keys!" -ForegroundColor Green
}

Set-Location ..\backend

if (Test-Path ".env") {
    Write-Host "✅ Backend .env exists" -ForegroundColor Green
    Write-Host "⚠️  Please verify your API keys in .env" -ForegroundColor Yellow
} else {
    Write-Host "❌ Backend .env not found" -ForegroundColor Red
    Write-Host "📝 Creating .env template..." -ForegroundColor Yellow
    
    @"
# Sales Flow AI Backend - Environment Variables

# OpenAI API Configuration
OPENAI_API_KEY=sk-YOUR_OPENAI_KEY_HERE

# Supabase Configuration
SUPABASE_URL=https://lncwvbhcafkdorypnpnz.supabase.co
SUPABASE_KEY=YOUR_ANON_KEY_HERE
SUPABASE_SERVICE_KEY=YOUR_SERVICE_ROLE_KEY_HERE

# Server Configuration
PORT=8000
HOST=0.0.0.0

# Environment
ENVIRONMENT=development
DEBUG=True
BACKEND_PORT=8000
"@ | Out-File -FilePath ".env" -Encoding UTF8
    
    Write-Host "✅ .env template created. Please fill in your API keys!" -ForegroundColor Green
}

Write-Host ""

# Step 4: Database Schema Check
Write-Host "🗄️  Step 4: Database Schema Check..." -ForegroundColor Yellow
Set-Location ..

if (Test-Path "backend\db\schema_multi_language_core.sql") {
    Write-Host "✅ Multi-Language Core Schema found" -ForegroundColor Green
    Write-Host "📝 Next step: Execute schema in Supabase SQL Editor" -ForegroundColor Yellow
    Write-Host "   File: backend\db\schema_multi_language_core.sql" -ForegroundColor Cyan
} else {
    Write-Host "❌ Schema file not found" -ForegroundColor Red
}

Write-Host ""

# Summary
Write-Host "✅ Quick Start Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Fill in API keys in .env files" -ForegroundColor White
Write-Host "2. Execute database schema in Supabase SQL Editor" -ForegroundColor White
Write-Host "3. Run 'npm run dev' in salesflow-ai folder" -ForegroundColor White
Write-Host "4. Run backend: cd backend && .\venv\Scripts\Activate.ps1 && python -m uvicorn app.main:app --reload" -ForegroundColor White
Write-Host ""
Write-Host "📚 Full documentation: ZERO_TOUCH_INSTALLATION.md" -ForegroundColor Cyan
Write-Host ""


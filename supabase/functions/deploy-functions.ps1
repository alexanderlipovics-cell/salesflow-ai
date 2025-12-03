# 🚀 Supabase Functions Deployment Script
# Automatisiertes Deploy für assess-cure und predict-churn

Write-Host "🚀 Deploying Supabase Functions..." -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Supabase CLI not found!" -ForegroundColor Red
    Write-Host "   Install with: npm install -g supabase" -ForegroundColor Yellow
    Write-Host "   Or: scoop install supabase" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Supabase CLI found" -ForegroundColor Green

# Navigate to project root
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location $projectRoot

Write-Host "📂 Project root: $projectRoot" -ForegroundColor Cyan
Write-Host ""

# Verify files exist
Write-Host "🔍 Verifying files..." -ForegroundColor Cyan

if (-not (Test-Path "supabase\functions\assess-cure\index.ts")) {
    Write-Host "❌ assess-cure\index.ts not found!" -ForegroundColor Red
    Write-Host "   Expected: $projectRoot\supabase\functions\assess-cure\index.ts" -ForegroundColor Yellow
    exit 1
}

if (-not (Test-Path "supabase\functions\predict-churn\index.ts")) {
    Write-Host "❌ predict-churn\index.ts not found!" -ForegroundColor Red
    Write-Host "   Expected: $projectRoot\supabase\functions\predict-churn\index.ts" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ All files found" -ForegroundColor Green
Write-Host ""

# Check extensions
Write-Host "🔍 Checking file extensions..." -ForegroundColor Cyan

$assessCure = Get-Item "supabase\functions\assess-cure\index.ts"
$predictChurn = Get-Item "supabase\functions\predict-churn\index.ts"

$hasError = $false

if ($assessCure.Extension -ne ".ts") {
    Write-Host "⚠️  WARNING: assess-cure\index.ts has wrong extension: $($assessCure.Extension)" -ForegroundColor Yellow
    Write-Host "   Expected: .ts" -ForegroundColor Yellow
    Write-Host "   Fix: Rename to index.ts (remove .txt if present)" -ForegroundColor Yellow
    Write-Host ""
    $hasError = $true
} else {
    Write-Host "✅ assess-cure\index.ts: Extension OK (.ts)" -ForegroundColor Green
}

if ($predictChurn.Extension -ne ".ts") {
    Write-Host "⚠️  WARNING: predict-churn\index.ts has wrong extension: $($predictChurn.Extension)" -ForegroundColor Yellow
    Write-Host "   Expected: .ts" -ForegroundColor Yellow
    Write-Host "   Fix: Rename to index.ts (remove .txt if present)" -ForegroundColor Yellow
    Write-Host ""
    $hasError = $true
} else {
    Write-Host "✅ predict-churn\index.ts: Extension OK (.ts)" -ForegroundColor Green
}

if ($hasError) {
    Write-Host ""
    Write-Host "❌ Please fix file extensions before deploying!" -ForegroundColor Red
    Write-Host ""
    Write-Host "How to fix:" -ForegroundColor Yellow
    Write-Host "1. Open Windows Explorer" -ForegroundColor Yellow
    Write-Host "2. View Tab → Check 'File name extensions'" -ForegroundColor Yellow
    Write-Host "3. Rename index.ts.txt → index.ts" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

Write-Host ""

# Check if project is linked
Write-Host "🔗 Checking Supabase project link..." -ForegroundColor Cyan

$linkCheck = supabase status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Project not linked to Supabase" -ForegroundColor Yellow
    Write-Host "   Run: supabase link --project-ref YOUR_PROJECT_REF" -ForegroundColor Yellow
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 1
    }
} else {
    Write-Host "✅ Project linked" -ForegroundColor Green
}

Write-Host ""
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host ""

# Deploy Function 1
Write-Host "📦 Deploying assess-cure..." -ForegroundColor Cyan
Write-Host ""

supabase functions deploy assess-cure

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ assess-cure deployment failed!" -ForegroundColor Red
    Write-Host "   Check error messages above" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "✅ assess-cure deployed successfully!" -ForegroundColor Green
Write-Host ""

# Wait a bit
Start-Sleep -Seconds 2

# Deploy Function 2
Write-Host "📦 Deploying predict-churn..." -ForegroundColor Cyan
Write-Host ""

supabase functions deploy predict-churn

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ predict-churn deployment failed!" -ForegroundColor Red
    Write-Host "   Check error messages above" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "✅ predict-churn deployed successfully!" -ForegroundColor Green
Write-Host ""

# Success!
Write-Host "=" * 70 -ForegroundColor Green
Write-Host "🎉 All functions deployed successfully!" -ForegroundColor Green
Write-Host "=" * 70 -ForegroundColor Green
Write-Host ""

Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Check Supabase Dashboard → Edge Functions" -ForegroundColor Yellow
Write-Host "2. Test functions via API" -ForegroundColor Yellow
Write-Host "3. Monitor logs in Supabase Dashboard" -ForegroundColor Yellow
Write-Host ""


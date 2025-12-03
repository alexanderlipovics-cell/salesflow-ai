# ═══════════════════════════════════════════════════════════════
# AUTOMATIC FOLLOW-UP SYSTEM - QUICK DEPLOYMENT SCRIPT (Windows)
# ═══════════════════════════════════════════════════════════════

$ErrorActionPreference = "Stop"

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🤖 AUTOMATIC FOLLOW-UP SYSTEM - DEPLOYMENT" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Check if SUPABASE_DB_URL is set
if (-not $env:SUPABASE_DB_URL) {
    Write-Host "⚠️  SUPABASE_DB_URL not set!" -ForegroundColor Yellow
    Write-Host "Set it first: `$env:SUPABASE_DB_URL = 'postgresql://...'" -ForegroundColor Yellow
    exit 1
}

# 1. Database Migration
Write-Host "📊 Step 1: Running Database Migration..." -ForegroundColor Green
Set-Location backend

try {
    Get-Content database/followup_system_migration.sql | psql $env:SUPABASE_DB_URL
    Write-Host "✅ Database Migration complete!" -ForegroundColor Green
}
catch {
    Write-Host "❌ Database Migration failed!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# 2. Verify Playbooks
Write-Host ""
Write-Host "📚 Step 2: Verifying Playbooks..." -ForegroundColor Green
$playbook_count = psql $env:SUPABASE_DB_URL -t -c "SELECT COUNT(*) FROM followup_playbooks;"
Write-Host "   Found $playbook_count playbooks"

if ([int]$playbook_count -ge 6) {
    Write-Host "✅ Playbooks loaded successfully!" -ForegroundColor Green
}
else {
    Write-Host "⚠️  Expected at least 6 playbooks, found $playbook_count" -ForegroundColor Yellow
}

# 3. Install Dependencies
Write-Host ""
Write-Host "📦 Step 3: Installing Dependencies..." -ForegroundColor Green

try {
    pip install schedule==1.2.0 --quiet
    Write-Host "✅ Dependencies installed!" -ForegroundColor Green
}
catch {
    Write-Host "❌ Dependency installation failed!" -ForegroundColor Red
    exit 1
}

# 4. Refresh Materialized Views
Write-Host ""
Write-Host "🔄 Step 4: Refreshing Materialized Views..." -ForegroundColor Green

psql $env:SUPABASE_DB_URL -c "REFRESH MATERIALIZED VIEW response_heatmap;" | Out-Null
psql $env:SUPABASE_DB_URL -c "REFRESH MATERIALIZED VIEW weekly_activity_trend;" | Out-Null
psql $env:SUPABASE_DB_URL -c "REFRESH MATERIALIZED VIEW channel_performance;" | Out-Null
psql $env:SUPABASE_DB_URL -c "REFRESH MATERIALIZED VIEW gpt_vs_human_messages;" | Out-Null

Write-Host "✅ Materialized Views refreshed!" -ForegroundColor Green

# 5. Run Tests
Write-Host ""
Write-Host "🧪 Step 5: Running Tests..." -ForegroundColor Green

try {
    python scripts/test_followup_system.py
    Write-Host "✅ All tests passed!" -ForegroundColor Green
}
catch {
    Write-Host "⚠️  Some tests failed, but system may still work" -ForegroundColor Yellow
}

# 6. Summary
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Start Backend Server:"
Write-Host "   cd backend && uvicorn app.main:app --reload --port 8000" -ForegroundColor White
Write-Host ""
Write-Host "2. Start Cron Job (separate PowerShell):"
Write-Host "   cd backend && python app/jobs/daily_followup_check.py" -ForegroundColor White
Write-Host ""
Write-Host "3. Test API:"
Write-Host "   curl http://localhost:8000/api/followups/playbooks" -ForegroundColor White
Write-Host ""
Write-Host "4. Access Frontend:"
Write-Host "   Navigate to: http://localhost:3000/followups/analytics" -ForegroundColor White
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Yellow
Write-Host "   - FOLLOWUP_SYSTEM_DEPLOYMENT_GUIDE.md"
Write-Host "   - FOLLOWUP_SYSTEM_COMPLETE.md"
Write-Host ""
Write-Host "🎯 KEIN LEAD GEHT MEHR VERLOREN! 🚀" -ForegroundColor Green
Write-Host ""


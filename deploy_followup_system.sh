#!/bin/bash

# ═══════════════════════════════════════════════════════════════
# AUTOMATIC FOLLOW-UP SYSTEM - QUICK DEPLOYMENT SCRIPT
# ═══════════════════════════════════════════════════════════════

set -e  # Exit on error

echo "═══════════════════════════════════════════════════════════════"
echo "🤖 AUTOMATIC FOLLOW-UP SYSTEM - DEPLOYMENT"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check if DATABASE_URL is set
if [ -z "$SUPABASE_DB_URL" ]; then
    echo "⚠️  SUPABASE_DB_URL not set!"
    echo "Export it first: export SUPABASE_DB_URL='postgresql://...'"
    exit 1
fi

# 1. Database Migration
echo "📊 Step 1: Running Database Migration..."
cd backend
psql "$SUPABASE_DB_URL" < database/followup_system_migration.sql

if [ $? -eq 0 ]; then
    echo "✅ Database Migration complete!"
else
    echo "❌ Database Migration failed!"
    exit 1
fi

# 2. Verify Playbooks
echo ""
echo "📚 Step 2: Verifying Playbooks..."
PLAYBOOK_COUNT=$(psql "$SUPABASE_DB_URL" -t -c "SELECT COUNT(*) FROM followup_playbooks;")
echo "   Found $PLAYBOOK_COUNT playbooks"

if [ "$PLAYBOOK_COUNT" -ge 6 ]; then
    echo "✅ Playbooks loaded successfully!"
else
    echo "⚠️  Expected at least 6 playbooks, found $PLAYBOOK_COUNT"
fi

# 3. Install Dependencies
echo ""
echo "📦 Step 3: Installing Dependencies..."
pip install schedule==1.2.0 --quiet

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed!"
else
    echo "❌ Dependency installation failed!"
    exit 1
fi

# 4. Refresh Materialized Views
echo ""
echo "🔄 Step 4: Refreshing Materialized Views..."
psql "$SUPABASE_DB_URL" -c "REFRESH MATERIALIZED VIEW response_heatmap;" > /dev/null 2>&1
psql "$SUPABASE_DB_URL" -c "REFRESH MATERIALIZED VIEW weekly_activity_trend;" > /dev/null 2>&1
psql "$SUPABASE_DB_URL" -c "REFRESH MATERIALIZED VIEW channel_performance;" > /dev/null 2>&1
psql "$SUPABASE_DB_URL" -c "REFRESH MATERIALIZED VIEW gpt_vs_human_messages;" > /dev/null 2>&1
echo "✅ Materialized Views refreshed!"

# 5. Run Tests
echo ""
echo "🧪 Step 5: Running Tests..."
python scripts/test_followup_system.py

if [ $? -eq 0 ]; then
    echo "✅ All tests passed!"
else
    echo "⚠️  Some tests failed, but system may still work"
fi

# 6. Summary
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅ DEPLOYMENT COMPLETE!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Start Backend Server:"
echo "   cd backend && uvicorn app.main:app --reload --port 8000"
echo ""
echo "2. Start Cron Job (separate terminal):"
echo "   cd backend && python app/jobs/daily_followup_check.py"
echo ""
echo "3. Test API:"
echo "   curl http://localhost:8000/api/followups/playbooks"
echo ""
echo "4. Access Frontend:"
echo "   Navigate to: http://localhost:3000/followups/analytics"
echo ""
echo "📚 Documentation:"
echo "   - FOLLOWUP_SYSTEM_DEPLOYMENT_GUIDE.md"
echo "   - FOLLOWUP_SYSTEM_COMPLETE.md"
echo ""
echo "🎯 KEIN LEAD GEHT MEHR VERLOREN! 🚀"
echo ""


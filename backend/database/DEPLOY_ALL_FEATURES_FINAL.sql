-- =====================================================
-- SALES FLOW AI - COMPLETE DEPLOYMENT
-- All 4 Enterprise Features
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\echo ''
\echo '🚀 =========================================='
\echo '🚀  SALES FLOW AI - DEPLOYING ALL FEATURES'
\echo '🚀 =========================================='
\echo ''

-- =====================================================
-- 1. EMAIL INTEGRATION
-- =====================================================

\echo '📧 Installing Email Integration...'

\ir migrations/001_email_integration.sql

\echo '✅ Email Integration installed!'
\echo ''

-- =====================================================
-- 2. IMPORT/EXPORT SYSTEM
-- =====================================================

\echo '📊 Installing Import/Export System...'

\ir migrations/002_import_export.sql

\echo '✅ Import/Export System installed!'
\echo ''

-- =====================================================
-- 3. GAMIFICATION SYSTEM
-- =====================================================

\echo '🎮 Installing Gamification System...'

\ir migrations/003_gamification.sql

\echo '✅ Gamification System installed!'
\echo ''

-- =====================================================
-- 4. LEAD ENRICHMENT SYSTEM
-- =====================================================

\echo '🔍 Installing Lead Enrichment System...'

\ir migrations/004_lead_enrichment.sql

\echo '✅ Lead Enrichment System installed!'
\echo ''

-- =====================================================
-- VERIFICATION
-- =====================================================

\echo '🔍 Verifying installation...'

SELECT 
    'Email Integration' as feature,
    COUNT(*) as tables
FROM information_schema.tables
WHERE table_name IN ('oauth_states', 'email_accounts', 'email_messages', 'email_attachments')

UNION ALL

SELECT 
    'Import/Export' as feature,
    COUNT(*) as tables
FROM information_schema.tables
WHERE table_name IN ('import_jobs', 'export_jobs', 'duplicate_detection_cache')

UNION ALL

SELECT 
    'Gamification' as feature,
    COUNT(*) as tables
FROM information_schema.tables
WHERE table_name IN ('badges', 'user_achievements', 'daily_streaks', 'leaderboard_entries', 'squad_challenges', 'challenge_entries')

UNION ALL

SELECT 
    'Lead Enrichment' as feature,
    COUNT(*) as tables
FROM information_schema.tables
WHERE table_name IN ('lead_enrichment_jobs', 'enriched_data_cache', 'api_usage_log');

-- Badge count
SELECT COUNT(*) as total_default_badges FROM badges;

\echo ''
\echo '🎉 =========================================='
\echo '🎉  DEPLOYMENT COMPLETE!'
\echo '🎉 =========================================='
\echo ''
\echo '📊 Statistics:'
\echo '  - Total Tables: 16'
\echo '  - Default Badges: 15'
\echo '  - API Endpoints: 32'
\echo ''
\echo '📋 Next Steps:'
\echo '1. Set environment variables (OAuth, API keys)'
\echo '2. Register routes in main.py'
\echo '3. Start server: uvicorn app.main:app --reload'
\echo '4. Test features: http://localhost:8000/docs'
\echo ''
\echo '📚 Documentation:'
\echo '  - ALL_FEATURES_SUMMARY.md'
\echo '  - FEATURE_DEPLOYMENT_GUIDE.md'
\echo '  - GAMIFICATION_COMPLETE.md'
\echo '  - LEAD_ENRICHMENT_COMPLETE.md'
\echo ''
\echo '🚀 Ready to launch!'
\echo ''


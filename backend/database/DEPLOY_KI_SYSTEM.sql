-- ============================================================================
-- SALES FLOW AI - COMPLETE KI SYSTEM DEPLOYMENT
-- Single-File Deployment für alle KI-Komponenten
-- Version: 1.0.0 | Created: 2024-12-01
-- ============================================================================
-- 
-- DEPLOYMENT INSTRUCTIONS:
-- 1. Backup your database first!
-- 2. Run: psql -U your_user -d salesflow_db -f DEPLOY_KI_SYSTEM.sql
-- 3. Verify: SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public';
-- 4. Test: SELECT * FROM recommend_followup_actions('your-user-uuid', 5);
-- 
-- ============================================================================

\echo '============================================================================'
\echo 'SALES FLOW AI - KI SYSTEM DEPLOYMENT STARTED'
\echo '============================================================================'

-- Enable extensions
\echo 'Step 1: Enabling extensions...'
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
\echo '✓ Extensions enabled'

-- Import core tables
\echo 'Step 2: Creating core tables...'
\i ki_core_tables.sql
\echo '✓ Core tables created'

-- Import RPC functions
\echo 'Step 3: Creating RPC functions...'
\i ki_rpc_functions.sql
\echo '✓ RPC functions created'

-- Import materialized views
\echo 'Step 4: Creating materialized views...'
\i ki_materialized_views.sql
\echo '✓ Materialized views created'

-- Import triggers and automation
\echo 'Step 5: Setting up triggers and automation...'
\i ki_triggers_automation.sql
\echo '✓ Triggers configured'

-- Initial view refresh
\echo 'Step 6: Initial view refresh...'
REFRESH MATERIALIZED VIEW CONCURRENTLY view_leads_scored;
REFRESH MATERIALIZED VIEW CONCURRENTLY view_followups_scored;
REFRESH MATERIALIZED VIEW CONCURRENTLY view_conversion_microsteps;
REFRESH MATERIALIZED VIEW CONCURRENTLY view_personality_insights;
\echo '✓ Views refreshed'

-- Verify deployment
\echo ''
\echo '============================================================================'
\echo 'VERIFICATION'
\echo '============================================================================'

-- Count tables
SELECT 'Total Tables Created: ' || COUNT(*)::TEXT 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'bant_assessments',
    'personality_profiles',
    'lead_context_summaries',
    'ai_recommendations',
    'compliance_logs',
    'lead_embeddings',
    'success_patterns',
    'playbook_executions',
    'ai_coaching_sessions',
    'channel_performance_metrics'
);

-- Count functions
SELECT 'Total RPC Functions: ' || COUNT(*)::TEXT 
FROM pg_proc 
WHERE proname IN (
    'generate_disg_recommendations',
    'update_lead_memory',
    'log_ai_output_compliance',
    'recommend_followup_actions',
    'get_best_contact_window',
    'get_lead_intelligence',
    'create_ai_recommendation'
);

-- Count views
SELECT 'Total Materialized Views: ' || COUNT(*)::TEXT 
FROM pg_matviews 
WHERE schemaname = 'public'
AND matviewname LIKE 'view_%';

-- Count triggers
SELECT 'Total Triggers: ' || COUNT(*)::TEXT 
FROM pg_trigger 
WHERE tgname LIKE 'trigger_%';

\echo ''
\echo '============================================================================'
\echo '✅ DEPLOYMENT COMPLETE!'
\echo '============================================================================'
\echo ''
\echo 'Next Steps:'
\echo '1. Test RPC: SELECT * FROM recommend_followup_actions(''your-user-id'', 5);'
\echo '2. Check logs: SELECT * FROM compliance_logs ORDER BY checked_at DESC LIMIT 10;'
\echo '3. View analytics: SELECT * FROM view_leads_scored LIMIT 10;'
\echo '4. Integrate with FastAPI backend'
\echo ''
\echo 'Documentation: See KI_SYSTEM_README.md'
\echo '============================================================================'


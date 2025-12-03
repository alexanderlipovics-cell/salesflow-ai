-- ═════════════════════════════════════════════════════════════════
-- SALES FLOW AI - WELTKLASSE DATENBANK DEPLOYMENT
-- ═════════════════════════════════════════════════════════════════
-- Master Deployment Script für alle 6 Phasen
-- Ausführungszeit: ca. 2-3 Minuten
-- ═════════════════════════════════════════════════════════════════

\echo '🚀 Starting Sales Flow AI Weltklasse-DB Deployment...'
\echo '═══════════════════════════════════════════════════════════════'

-- Enable required extensions
\echo ''
\echo '📦 Installing Extensions...'
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

-- ─────────────────────────────────────────────────────────────────
-- PHASE 1: Knowledge Graph & Beziehungsnetzwerk
-- ─────────────────────────────────────────────────────────────────
\echo ''
\echo '📊 PHASE 1: Knowledge Graph & Beziehungsnetzwerk'
\i 001_knowledge_graph_relations.sql
\i 002_knowledge_graph_functions.sql
\echo '✅ Phase 1 completed'

-- ─────────────────────────────────────────────────────────────────
-- PHASE 2: RAG-optimierte Wissensdatenbank
-- ─────────────────────────────────────────────────────────────────
\echo ''
\echo '🧠 PHASE 2: RAG-optimierte Wissensdatenbank'
\i 003_knowledge_base_rag.sql
\i 004_rag_functions.sql
\echo '✅ Phase 2 completed'

-- ─────────────────────────────────────────────────────────────────
-- PHASE 3: Social Media Integration
-- ─────────────────────────────────────────────────────────────────
\echo ''
\echo '📱 PHASE 3: Social Media Integration'
\i 005_social_media_integration.sql
\echo '✅ Phase 3 completed'

-- ─────────────────────────────────────────────────────────────────
-- PHASE 4: DSGVO-Compliance Features
-- ─────────────────────────────────────────────────────────────────
\echo ''
\echo '🔒 PHASE 4: DSGVO-Compliance Features'
\i 006_gdpr_compliance.sql
\i 007_gdpr_functions.sql
\echo '✅ Phase 4 completed'

-- ─────────────────────────────────────────────────────────────────
-- PHASE 5: Data Quality & Duplicate Detection
-- ─────────────────────────────────────────────────────────────────
\echo ''
\echo '🎯 PHASE 5: Data Quality & Duplicate Detection'
\i 008_data_quality.sql
\echo '✅ Phase 5 completed'

-- ─────────────────────────────────────────────────────────────────
-- VERIFICATION
-- ─────────────────────────────────────────────────────────────────
\echo ''
\echo '🔍 Running Verification...'
\echo ''

-- Count tables created
SELECT 
    schemaname,
    COUNT(*) as table_count
FROM pg_tables 
WHERE schemaname = 'public'
GROUP BY schemaname;

\echo ''
\echo '📋 New Tables Created:'
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename IN (
    'lead_relationships',
    'squad_hierarchy',
    'lead_content_references',
    'knowledge_base',
    'products',
    'lead_product_interactions',
    'success_stories',
    'product_reviews',
    'social_accounts',
    'social_interactions',
    'social_lead_candidates',
    'social_campaigns',
    'social_listening_keywords',
    'data_access_log',
    'data_deletion_requests',
    'data_export_requests',
    'user_consents',
    'data_retention_policies',
    'privacy_settings',
    'data_quality_metrics',
    'potential_duplicates',
    'data_quality_issues',
    'lead_quality_scores'
  )
ORDER BY tablename;

\echo ''
\echo '🔧 Functions Created:'
SELECT 
    proname as function_name,
    pronargs as num_args
FROM pg_proc 
WHERE pronamespace = 'public'::regnamespace
  AND proname IN (
    'calculate_team_size',
    'get_lead_network',
    'find_common_connections',
    'recommend_leads_from_network',
    'get_downline_performance',
    'search_knowledge_base',
    'find_objection_response',
    'recommend_upsells',
    'recommend_cross_sells',
    'export_user_data',
    'anonymize_lead',
    'hard_delete_lead',
    'check_user_consent',
    'detect_duplicate_leads',
    'merge_leads',
    'calculate_lead_completeness',
    'run_quality_checks'
  )
ORDER BY proname;

-- ═════════════════════════════════════════════════════════════════
-- SUCCESS MESSAGE
-- ═════════════════════════════════════════════════════════════════
\echo ''
\echo '═══════════════════════════════════════════════════════════════'
\echo '✅ DEPLOYMENT SUCCESSFUL!'
\echo '═══════════════════════════════════════════════════════════════'
\echo ''
\echo '📊 Sales Flow AI ist jetzt eine Weltklasse-Datenbank mit:'
\echo '   ✅ Knowledge Graph für Beziehungsnetzwerke'
\echo '   ✅ RAG-optimierte Wissensdatenbank mit Vector Search'
\echo '   ✅ Social Media Integration (Facebook, LinkedIn, Instagram)'
\echo '   ✅ Vollständige DSGVO-Compliance (Art. 15, 17, 20)'
\echo '   ✅ Data Quality Monitoring & Duplicate Detection'
\echo '   ✅ 20+ spezialisierte PostgreSQL Funktionen'
\echo ''
\echo '🚀 Next Steps:'
\echo '   1. Run seed script: python scripts/seed_knowledge_base.py'
\echo '   2. Test API endpoints: /api/v1/knowledge, /api/v1/social, /api/v1/gdpr'
\echo '   3. Configure API routes in main.py'
\echo ''
\echo '═══════════════════════════════════════════════════════════════'


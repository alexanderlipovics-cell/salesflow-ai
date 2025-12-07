-- ============================================================================
-- 🔍 VOLLSTÄNDIGE TABELLEN-PRÜFUNG - SalesFlow AI
-- ============================================================================
-- Dieses Skript prüft, welche Tabellen aus den Migrations bereits existieren
-- und welche noch fehlen.
-- 
-- Führen Sie dieses Skript im Supabase SQL Editor aus.
-- ============================================================================

-- ============================================================================
-- 1. ALLE ERWARTETEN TABELLEN (aus Migrations)
-- ============================================================================

WITH expected_tables AS (
    SELECT table_name, category, priority
    FROM (VALUES
        -- Core Tables
        ('leads', 'Core', 'HIGH'),
        ('users', 'Core', 'HIGH'),
        ('contacts', 'Core', 'HIGH'),
        
        -- Message & Communication
        ('message_events', 'Communication', 'HIGH'),
        ('dm_conversations', 'Communication', 'HIGH'),
        ('dm_messages', 'Communication', 'HIGH'),
        ('dm_sequence_templates', 'Communication', 'MEDIUM'),
        ('dm_automation_rules', 'Communication', 'MEDIUM'),
        ('platform_connections', 'Communication', 'MEDIUM'),
        
        -- Follow-up & Tasks
        ('followup_tasks', 'Follow-up', 'HIGH'),
        
        -- Autopilot V2
        ('autopilot_jobs', 'Autopilot', 'HIGH'),
        ('autopilot_settings', 'Autopilot', 'HIGH'),
        ('rate_limit_counters', 'Autopilot', 'HIGH'),
        ('ab_test_experiments', 'Autopilot', 'MEDIUM'),
        ('ab_test_results', 'Autopilot', 'MEDIUM'),
        ('channel_credentials', 'Autopilot', 'MEDIUM'),
        
        -- Lead Generation (Non Plus Ultra)
        ('lead_verifications', 'Lead Gen', 'HIGH'),
        ('lead_enrichments', 'Lead Gen', 'HIGH'),
        ('lead_intents', 'Lead Gen', 'MEDIUM'),
        ('lead_sources', 'Lead Gen', 'MEDIUM'),
        ('web_tracking_events', 'Lead Gen', 'MEDIUM'),
        ('social_engagement_events', 'Lead Gen', 'MEDIUM'),
        ('sales_rep_profiles', 'Lead Gen', 'MEDIUM'),
        ('lead_assignments', 'Lead Gen', 'MEDIUM'),
        ('outreach_templates', 'Lead Gen', 'MEDIUM'),
        ('outreach_queue', 'Lead Gen', 'MEDIUM'),
        
        -- Collective Intelligence
        ('user_learning_profile', 'CI', 'LOW'),
        ('user_session_cache', 'CI', 'LOW'),
        ('rlhf_feedback_sessions', 'CI', 'LOW'),
        ('training_data_pool', 'CI', 'LOW'),
        ('privacy_audit_log', 'CI', 'LOW'),
        ('global_model_registry', 'CI', 'LOW'),
        ('knowledge_graph_nodes', 'CI', 'LOW'),
        ('knowledge_graph_edges', 'CI', 'LOW'),
        ('global_insights', 'CI', 'LOW'),
        ('rag_retrieval_log', 'CI', 'LOW'),
        ('response_styling_templates', 'CI', 'LOW'),
        ('learning_opt_out_requests', 'CI', 'LOW'),
        ('model_performance_tracking', 'CI', 'LOW'),
        ('bias_mitigation_log', 'CI', 'LOW'),
        
        -- CRM & Notes
        ('crm_notes', 'CRM', 'HIGH'),
        
        -- Templates & Performance
        ('template_performance', 'Templates', 'MEDIUM'),
        ('sales_scenarios', 'Templates', 'MEDIUM'),
        ('sales_content', 'Templates', 'MEDIUM'),
        
        -- Analytics & Dashboard
        ('dashboard_need_help_reps', 'Analytics', 'MEDIUM'),
        
        -- OAuth & Webhooks
        ('oauth_tokens', 'Integration', 'MEDIUM'),
        ('webhook_subscriptions', 'Integration', 'MEDIUM'),
        ('webhook_events_log', 'Integration', 'MEDIUM'),
        ('email_sync_state', 'Integration', 'MEDIUM'),
        ('whatsapp_business_config', 'Integration', 'MEDIUM'),
        ('realtime_message_queue', 'Integration', 'MEDIUM'),
        
        -- Email Marketing
        ('email_campaigns', 'Marketing', 'MEDIUM'),
        ('email_sends', 'Marketing', 'MEDIUM'),
        
        -- Consent & Privacy
        ('consent_records', 'Privacy', 'HIGH'),
        ('cookie_categories', 'Privacy', 'MEDIUM'),
        
        -- Deployment & Ops
        ('deployment_runs', 'Ops', 'LOW')
    ) AS t(table_name, category, priority)
)
SELECT 
    et.table_name,
    et.category,
    et.priority,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_name = et.table_name
        ) THEN '✅ Existiert'
        ELSE '❌ FEHLT'
    END as status,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_name = et.table_name
        ) THEN NULL
        ELSE (
            SELECT 'Migration: ' || string_agg(filename, ', ')
            FROM (
                SELECT DISTINCT filename
                FROM (
                    VALUES
                        ('20251205_create_message_events.sql', 'message_events'),
                        ('20251129_create_followup_tasks_table.sql', 'followup_tasks'),
                        ('20251205_create_autopilot_settings.sql', 'autopilot_settings'),
                        ('20251205_create_crm_notes.sql', 'crm_notes'),
                        ('20251205_NON_PLUS_ULTRA_lead_generation.sql', 'lead_verifications,lead_enrichments,lead_intents,lead_sources,web_tracking_events,social_engagement_events,sales_rep_profiles,lead_assignments,outreach_templates,outreach_queue'),
                        ('20251205_NON_PLUS_ULTRA_collective_intelligence.sql', 'user_learning_profile,user_session_cache,rlhf_feedback_sessions,training_data_pool,privacy_audit_log,global_model_registry,knowledge_graph_nodes,knowledge_graph_edges,global_insights,rag_retrieval_log,response_styling_templates,learning_opt_out_requests,model_performance_tracking,bias_mitigation_log'),
                        ('20251206_IDPS_dm_persistence_system.sql', 'dm_conversations,dm_messages,dm_sequence_templates,dm_automation_rules,platform_connections'),
                        ('20251206_oauth_webhooks_realtime.sql', 'oauth_tokens,webhook_subscriptions,webhook_events_log,email_sync_state,whatsapp_business_config,realtime_message_queue'),
                        ('20251206_create_email_marketing_tables.sql', 'email_campaigns,email_sends'),
                        ('20251206_create_consent_tables.sql', 'consent_records,cookie_categories'),
                        ('20251206_create_deployment_runs_table.sql', 'deployment_runs'),
                        ('20251129_create_template_performance.sql', 'template_performance'),
                        ('20251129_create_sales_scenarios_table.sql', 'sales_scenarios'),
                        ('20251130_create_sales_content_waterfall.sql', 'sales_content'),
                        ('20251201_dashboard_need_help_reps.sql', 'dashboard_need_help_reps')
                ) AS migrations(filename, tables)
                WHERE et.table_name = ANY(string_to_array(tables, ','))
            ) sub
        )
    END as migration_hint
FROM expected_tables et
ORDER BY 
    CASE et.priority 
        WHEN 'HIGH' THEN 1 
        WHEN 'MEDIUM' THEN 2 
        WHEN 'LOW' THEN 3 
    END,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_name = et.table_name
        ) THEN 1
        ELSE 0
    END,
    et.category,
    et.table_name;

-- ============================================================================
-- 2. ZUSAMMENFASSUNG
-- ============================================================================

SELECT 
    '📊 ZUSAMMENFASSUNG' as report_type,
    COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = et.table_name
    )) as vorhanden,
    COUNT(*) FILTER (WHERE NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = et.table_name
    )) as fehlen,
    COUNT(*) as gesamt,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = et.table_name
        )) / COUNT(*), 
        1
    ) as prozent_vorhanden
FROM (
    SELECT table_name FROM (VALUES
        ('leads'), ('users'), ('contacts'), ('message_events'), ('dm_conversations'),
        ('dm_messages'), ('followup_tasks'), ('autopilot_jobs'), ('autopilot_settings'),
        ('rate_limit_counters'), ('lead_verifications'), ('lead_enrichments'),
        ('crm_notes'), ('consent_records')
    ) AS t(table_name)
) et;

-- ============================================================================
-- 3. FEHLENDE HIGH-PRIORITY TABELLEN (sollten sofort erstellt werden)
-- ============================================================================

SELECT 
    '🔴 FEHLENDE HIGH-PRIORITY TABELLEN' as report_type,
    table_name,
    category
FROM (
    SELECT table_name, category, priority
    FROM (VALUES
        ('leads', 'Core', 'HIGH'),
        ('users', 'Core', 'HIGH'),
        ('contacts', 'Core', 'HIGH'),
        ('message_events', 'Communication', 'HIGH'),
        ('followup_tasks', 'Follow-up', 'HIGH'),
        ('autopilot_jobs', 'Autopilot', 'HIGH'),
        ('autopilot_settings', 'Autopilot', 'HIGH'),
        ('rate_limit_counters', 'Autopilot', 'HIGH'),
        ('lead_verifications', 'Lead Gen', 'HIGH'),
        ('lead_enrichments', 'Lead Gen', 'HIGH'),
        ('crm_notes', 'CRM', 'HIGH'),
        ('consent_records', 'Privacy', 'HIGH')
    ) AS t(table_name, category, priority)
) et
WHERE NOT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = et.table_name
)
ORDER BY category, table_name;

-- ============================================================================
-- 4. ALLE VORHANDENEN TABELLEN (zum Vergleich)
-- ============================================================================

SELECT 
    '📋 ALLE VORHANDENEN TABELLEN' as report_type,
    table_name,
    (SELECT COUNT(*) 
     FROM information_schema.columns 
     WHERE table_schema = 'public' 
       AND table_name = t.table_name) as spalten_anzahl
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;


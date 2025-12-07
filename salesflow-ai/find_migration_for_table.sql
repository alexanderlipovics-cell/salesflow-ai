-- ============================================================================
-- 🔍 FIND MIGRATION FOR TABLE
-- ============================================================================
-- Gibt dir die Migration-Datei für eine fehlende Tabelle
-- ============================================================================

-- Beispiel: Finde Migration für 'message_events'
-- Ersetze 'message_events' mit deiner fehlenden Tabelle

WITH table_migration_map AS (
    SELECT 
        table_name,
        migration_file,
        file_path
    FROM (VALUES
        ('message_events', '20251205_create_message_events.sql', 'supabase/migrations/'),
        ('followup_tasks', '20251129_create_followup_tasks_table.sql', 'supabase/migrations/'),
        ('crm_notes', '20251205_create_crm_notes.sql', 'supabase/migrations/'),
        ('autopilot_settings', '20251205_create_autopilot_settings.sql', 'supabase/migrations/'),
        ('dm_conversations', '20251206_IDPS_dm_persistence_system.sql', 'supabase/migrations/'),
        ('dm_messages', '20251206_IDPS_dm_persistence_system.sql', 'supabase/migrations/'),
        ('lead_verifications', '20251205_NON_PLUS_ULTRA_lead_generation.sql', 'supabase/migrations/'),
        ('lead_enrichments', '20251205_NON_PLUS_ULTRA_lead_generation.sql', 'supabase/migrations/'),
        ('consent_records', '20251206_create_consent_tables.sql', 'supabase/migrations/'),
        ('autopilot_jobs', 'step3_autopilot_v2_tables.sql', 'sql/'),
        ('rate_limit_counters', 'step3_autopilot_v2_tables.sql', 'sql/'),
        ('ab_test_experiments', 'step3_autopilot_v2_tables.sql', 'sql/'),
        ('template_performance', '20251129_create_template_performance.sql', 'supabase/migrations/'),
        ('sales_scenarios', '20251129_create_sales_scenarios_table.sql', 'supabase/migrations/'),
        ('sales_content', '20251130_create_sales_content_waterfall.sql', 'supabase/migrations/')
    ) AS t(table_name, migration_file, file_path)
)
SELECT 
    tmm.table_name,
    tmm.migration_file,
    tmm.file_path || tmm.migration_file as full_path,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = tmm.table_name
        ) THEN '✅ Existiert bereits'
        ELSE '❌ FEHLT - Migration ausführen!'
    END as status
FROM table_migration_map tmm
WHERE tmm.table_name = 'message_events'  -- ← HIER DEINE TABELLE EINGEBEN
ORDER BY status, table_name;


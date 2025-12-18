-- ============================================================================
-- KRITISCHE TABELLEN PRÜFUNG (Autopilot V2)
-- ============================================================================
-- Führen Sie dieses Skript aus, um zu sehen, welche kritischen Tabellen
-- für Autopilot V2 noch fehlen.
-- ============================================================================

-- Kritische Tabellen für Autopilot V2
SELECT 
    critical_table as table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_name = critical_table
        ) THEN '✅ Existiert'
        ELSE '❌ FEHLT - Migration nötig!'
    END as status
FROM (VALUES 
    ('users'),
    ('token_blacklist'),
    ('message_events'),
    ('autopilot_jobs'),
    ('rate_limit_counters'),
    ('ab_test_experiments'),
    ('ab_test_results'),
    ('channel_credentials'),
    ('autopilot_settings'),
    ('contacts')
) AS critical_tables(critical_table)
ORDER BY 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_name = critical_table
        ) THEN 1
        ELSE 0
    END,
    critical_table;

-- ============================================================================
-- CONTACTS TABELLE - Autopilot V2 Felder prüfen
-- ============================================================================

SELECT 
    column_name,
    data_type,
    CASE 
        WHEN column_name IN ('timezone', 'best_contact_time', 'preferred_channel', 'opt_out_channels')
        THEN '✅ Autopilot V2 Feld'
        ELSE 'ℹ️ Standard Feld'
    END as status
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'contacts'
ORDER BY 
    CASE WHEN column_name IN ('timezone', 'best_contact_time', 'preferred_channel', 'opt_out_channels') THEN 0 ELSE 1 END,
    ordinal_position;


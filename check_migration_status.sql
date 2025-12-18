-- ============================================================================
-- MIGRATION STATUS CHECK
-- ============================================================================
-- Führen Sie dieses Skript im Supabase SQL Editor aus, um zu prüfen,
-- welche Tabellen bereits existieren.
-- ============================================================================

-- 1. Alle Tabellen auflisten
SELECT 
    '📋 ALLE TABELLEN' as check_type,
    table_name,
    '✅ Existiert' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. Kritische Tabellen für Autopilot V2 prüfen
SELECT 
    '🔴 KRITISCHE TABELLEN (Autopilot V2)' as check_type,
    critical_table as table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_name = critical_table
        ) THEN '✅ Existiert'
        ELSE '❌ FEHLT'
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
ORDER BY status DESC, critical_table;

-- 3. Prüfen ob contacts Tabelle erweitert wurde (Autopilot V2 Felder)
SELECT 
    '🟡 CONTACTS TABELLE - Autopilot V2 Felder' as check_type,
    column_name,
    data_type,
    CASE 
        WHEN column_name IN ('timezone', 'best_contact_time', 'preferred_channel', 'opt_out_channels')
        THEN '✅ Existiert'
        ELSE 'ℹ️ Standard Feld'
    END as status
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'contacts'
ORDER BY ordinal_position;

-- 4. Indizes prüfen (Performance)
SELECT 
    '🟢 PERFORMANCE INDIZES' as check_type,
    indexname,
    tablename,
    '✅ Existiert' as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- 5. Funktionen prüfen
SELECT 
    '🔵 FUNKTIONEN' as check_type,
    routine_name,
    '✅ Existiert' as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;


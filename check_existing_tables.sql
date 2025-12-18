-- ============================================================================
-- PRÜFUNG: Welche Autopilot V2 Tabellen existieren bereits?
-- ============================================================================

-- Prüfe welche Tabellen existieren
SELECT 
    'Tabellen Status' as check_type,
    table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_name = t.table_name
        ) THEN '✅ Existiert'
        ELSE '❌ Fehlt'
    END as status
FROM (VALUES 
    ('autopilot_jobs'),
    ('rate_limit_counters'),
    ('ab_test_experiments'),
    ('ab_test_results'),
    ('channel_credentials')
) AS t(table_name)
ORDER BY status DESC, table_name;

-- Prüfe ob ab_test_experiments die richtige Struktur hat
SELECT 
    'ab_test_experiments Struktur' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'ab_test_experiments'
ORDER BY ordinal_position;

-- Prüfe ob ab_test_results die richtige Struktur hat
SELECT 
    'ab_test_results Struktur' as check_type,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'ab_test_results'
ORDER BY ordinal_position;


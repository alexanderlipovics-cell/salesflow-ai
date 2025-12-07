-- ============================================================================
-- ⚡ SCHNELLE PRÜFUNG: Fehlende Tabellen
-- ============================================================================
-- Einfache Version - zeigt nur fehlende Tabellen
-- ============================================================================

-- Fehlende HIGH-Priority Tabellen
SELECT 
    '❌ FEHLT' as status,
    table_name,
    'HIGH' as priority,
    category
FROM (VALUES
    ('leads', 'Core'),
    ('users', 'Core'),
    ('contacts', 'Core'),
    ('message_events', 'Communication'),
    ('followup_tasks', 'Follow-up'),
    ('autopilot_jobs', 'Autopilot'),
    ('autopilot_settings', 'Autopilot'),
    ('rate_limit_counters', 'Autopilot'),
    ('lead_verifications', 'Lead Gen'),
    ('lead_enrichments', 'Lead Gen'),
    ('crm_notes', 'CRM'),
    ('consent_records', 'Privacy')
) AS expected(table_name, category)
WHERE NOT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name = expected.table_name
)
ORDER BY category, table_name;

-- Zusammenfassung
SELECT 
    '📊 ZUSAMMENFASSUNG' as info,
    COUNT(*) FILTER (WHERE NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = expected.table_name
    )) as fehlende_tabellen,
    COUNT(*) as erwartete_tabellen
FROM (VALUES
    ('leads'), ('users'), ('contacts'), ('message_events'), 
    ('followup_tasks'), ('autopilot_jobs'), ('autopilot_settings'),
    ('rate_limit_counters'), ('lead_verifications'), ('lead_enrichments'),
    ('crm_notes'), ('consent_records')
) AS expected(table_name);


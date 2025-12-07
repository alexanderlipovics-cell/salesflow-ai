-- ============================================================================
-- ✅ PRÜFUNG: Kritische Tabellen vorhanden?
-- ============================================================================
-- Prüft ob alle HIGH-Priority Tabellen in deiner Datenbank existieren
-- ============================================================================

SELECT 
    table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = t.table_name
        ) THEN '✅ Vorhanden'
        ELSE '❌ FEHLT'
    END as status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = t.table_name
        ) THEN (
            SELECT COUNT(*)::text || ' Spalten'
            FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = t.table_name
        )
        ELSE 'N/A'
    END as details
FROM (VALUES
    -- Core Tables
    ('leads'),
    ('users'),
    ('contacts'),
    
    -- Communication
    ('message_events'),
    ('dm_conversations'),
    ('dm_messages'),
    
    -- Follow-up
    ('followup_tasks'),
    
    -- Autopilot
    ('autopilot_jobs'),
    ('autopilot_settings'),
    ('rate_limit_counters'),
    
    -- Lead Generation
    ('lead_verifications'),
    ('lead_enrichments'),
    ('lead_assignments'),
    ('sales_rep_profiles'),
    
    -- CRM
    ('crm_notes'),
    
    -- Privacy
    ('consent_records')
) AS t(table_name)
ORDER BY 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = t.table_name
        ) THEN 0
        ELSE 1
    END,
    table_name;

-- ============================================================================
-- 📊 ZUSAMMENFASSUNG
-- ============================================================================

SELECT 
    '📊 ZUSAMMENFASSUNG' as info,
    COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = t.table_name
    )) as vorhanden,
    COUNT(*) FILTER (WHERE NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = t.table_name
    )) as fehlen,
    COUNT(*) as gesamt,
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = t.table_name
        )) / COUNT(*), 
        1
    ) || '%' as prozent_vorhanden
FROM (VALUES
    ('leads'), ('users'), ('contacts'), ('message_events'), 
    ('dm_conversations'), ('followup_tasks'), ('autopilot_jobs'),
    ('autopilot_settings'), ('rate_limit_counters'), ('lead_verifications'),
    ('lead_enrichments'), ('crm_notes'), ('consent_records')
) AS t(table_name);


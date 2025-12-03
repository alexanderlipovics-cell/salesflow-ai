-- ============================================================================
-- DEPLOY PULSE TRACKER & BEHAVIORAL INTELLIGENCE v2.0
-- ============================================================================
-- 
-- AUSFÜHRUNGSREIHENFOLGE:
-- 1. Diese Datei in Supabase SQL Editor ausführen
-- 2. Ghost Buster Seeds via Python Script ausführen:
--    python -m backend.app.seeds.ghost_buster_seed
--
-- FEATURES:
-- ✅ Message Status Tracking (sent → seen → replied/ghosted)
-- ✅ Auto-Check-in Scheduling (24h nach Senden)
-- ✅ Ghost-Buster Strategien & Templates
-- ✅ Behavioral Intelligence (Mood, Engagement, Decision, Trust)
-- ✅ Conversion Funnel mit Datenqualitäts-Score
-- ✅ Intent Correction für lernendes System
-- ✅ Verbesserte RLS Policies (B2B-ready)
-- ============================================================================

-- Führe die Haupt-Migration aus
\i 20251209_pulse_tracker_v2.sql

-- ============================================================================
-- VERIFIZIERUNG
-- ============================================================================

-- Prüfe ob alle Tabellen existieren
DO $$
DECLARE
    missing_tables TEXT := '';
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'pulse_outreach_messages') THEN
        missing_tables := missing_tables || 'pulse_outreach_messages, ';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'lead_behavior_profiles') THEN
        missing_tables := missing_tables || 'lead_behavior_profiles, ';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'conversion_funnel_daily') THEN
        missing_tables := missing_tables || 'conversion_funnel_daily, ';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'ghost_buster_templates') THEN
        missing_tables := missing_tables || 'ghost_buster_templates, ';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'intent_corrections') THEN
        missing_tables := missing_tables || 'intent_corrections, ';
    END IF;
    
    IF missing_tables != '' THEN
        RAISE EXCEPTION 'Fehlende Tabellen: %', missing_tables;
    ELSE
        RAISE NOTICE '✅ Alle Pulse Tracker Tabellen erfolgreich erstellt!';
    END IF;
END $$;

-- Prüfe ob alle Funktionen existieren
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_proc WHERE proname = 'auto_infer_stale_outreach') THEN
        RAISE EXCEPTION 'Funktion auto_infer_stale_outreach fehlt!';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_proc WHERE proname = 'bulk_update_checkin_status') THEN
        RAISE EXCEPTION 'Funktion bulk_update_checkin_status fehlt!';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_proc WHERE proname = 'get_accurate_funnel') THEN
        RAISE EXCEPTION 'Funktion get_accurate_funnel fehlt!';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_proc WHERE proname = 'get_pending_checkins_prioritized') THEN
        RAISE EXCEPTION 'Funktion get_pending_checkins_prioritized fehlt!';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_proc WHERE proname = 'get_ghost_leads') THEN
        RAISE EXCEPTION 'Funktion get_ghost_leads fehlt!';
    END IF;
    
    RAISE NOTICE '✅ Alle Pulse Tracker Funktionen erfolgreich erstellt!';
END $$;

-- ============================================================================
-- DEMO DATA (Optional - für Testing)
-- ============================================================================

-- Füge System Ghost-Buster Templates ein falls nicht via Python Seed
INSERT INTO ghost_buster_templates (name, template_text, template_text_short, strategy, tone, works_for_mood, works_for_decision, days_since_ghost, is_system, language)
SELECT 'Verschreckt?', 
       'Hey {name}, hab ich dich mit der letzten Nachricht komplett verschreckt? 😅',
       'Hey, hab ich dich verschreckt?',
       'ghost_buster'::follow_up_strategy,
       'humorous',
       ARRAY['positive', 'neutral', 'cautious']::contact_mood[],
       ARRAY['undecided', 'deferred']::decision_tendency[],
       3,
       true,
       'de'
WHERE NOT EXISTS (
    SELECT 1 FROM ghost_buster_templates WHERE name = 'Verschreckt?' AND is_system = true
);

INSERT INTO ghost_buster_templates (name, template_text, template_text_short, strategy, tone, works_for_mood, works_for_decision, days_since_ghost, is_system, language)
SELECT 'Takeaway Soft', 
       'Hey {name}, ich merke das Timing passt gerade nicht. Kein Stress! Wenn sich was ändert, weißt du wo du mich findest 🙂',
       'Timing passt nicht, meld dich wenn sichs ändert!',
       'takeaway'::follow_up_strategy,
       'caring',
       ARRAY['stressed', 'cautious']::contact_mood[],
       ARRAY['deferred', 'leaning_no']::decision_tendency[],
       7,
       true,
       'de'
WHERE NOT EXISTS (
    SELECT 1 FROM ghost_buster_templates WHERE name = 'Takeaway Soft' AND is_system = true
);

INSERT INTO ghost_buster_templates (name, template_text, template_text_short, strategy, tone, works_for_mood, works_for_decision, days_since_ghost, is_system, language)
SELECT '9-Word-Email', 
       'Hey {name}, bist du noch interessiert an {topic}?',
       'Noch interessiert?',
       'ghost_buster'::follow_up_strategy,
       'direct',
       ARRAY['neutral', 'cautious', 'stressed']::contact_mood[],
       ARRAY['undecided', 'leaning_no']::decision_tendency[],
       7,
       true,
       'de'
WHERE NOT EXISTS (
    SELECT 1 FROM ghost_buster_templates WHERE name = '9-Word-Email' AND is_system = true
);

-- Cross-Channel Strategies
INSERT INTO cross_channel_strategies (primary_channel, alternative_channel, action_description, template_text, timing_description, is_active)
SELECT 'instagram_dm', 'instagram_comment', 
       'Kommentiere unter letztem Post',
       'Hey! Hab dir gerade eine DM geschickt, ist manchmal im Spam 😊',
       'Nach 48h ohne Öffnung',
       true
WHERE NOT EXISTS (
    SELECT 1 FROM cross_channel_strategies WHERE primary_channel = 'instagram_dm' AND alternative_channel = 'instagram_comment'
);

RAISE NOTICE '✅ Demo-Daten eingefügt!';

-- ============================================================================
-- CRON JOB SETUP (Für Auto-Inference)
-- ============================================================================

-- In Supabase können Cron-Jobs über pg_cron eingerichtet werden:
-- SELECT cron.schedule(
--     'auto-infer-stale-outreach',    -- Job Name
--     '0 6 * * *',                    -- Täglich um 6:00 Uhr
--     'SELECT auto_infer_stale_outreach()'
-- );

-- ============================================================================
-- ABSCHLUSS
-- ============================================================================

SELECT '
╔════════════════════════════════════════════════════════════════════════════╗
║  PULSE TRACKER v2.0 ERFOLGREICH DEPLOYED! 🚀                              ║
╠════════════════════════════════════════════════════════════════════════════╣
║                                                                            ║
║  NÄCHSTE SCHRITTE:                                                         ║
║                                                                            ║
║  1. Backend starten:                                                       ║
║     uvicorn backend.app.main:app --reload --port 8000                     ║
║                                                                            ║
║  2. Ghost Buster Templates seeden:                                         ║
║     python -m backend.app.seeds.ghost_buster_seed                         ║
║                                                                            ║
║  3. API Docs prüfen:                                                       ║
║     http://localhost:8000/docs#/pulse-tracker                             ║
║                                                                            ║
║  4. Cron Job für Auto-Inference einrichten (optional):                    ║
║     SELECT auto_infer_stale_outreach() - Täglich um 6:00 Uhr              ║
║                                                                            ║
╚════════════════════════════════════════════════════════════════════════════╝
' AS deployment_status;


-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  SALES FLOW AI - COMPLETE DEPLOYMENT SCRIPT                                ║
-- ║  Alle Migrations in einer Datei für Supabase SQL Editor                   ║
-- ╚════════════════════════════════════════════════════════════════════════════╝
--
-- DEPLOYMENT-REIHENFOLGE:
-- 1. 003_power_up_system.sql    (Company Intelligence, Objections, etc.)
-- 2. 004_complete_rls_policies.sql (RLS für alle Tabellen)
-- 3. 005_follow_up_tasks_table.sql (Follow-up Tasks)
-- 4. 006_auto_reminder_system.sql (Auto-Reminder Trigger)
-- 5. 007_coaching_prompts.sql    (AI Coaching Prompts)
-- 6. 008_objection_brain_lead_scoring.sql (Objection Brain & Lead Scoring)
-- 7. 008_proposal_reminder_system.sql (Proposal Reminders)
-- 8. 009_daily_flow_system.sql   (Daily Flow Agent)
-- 9. 010_personality_contact_plans.sql (DISG & No-Lead-Left-Behind)
--
-- ANLEITUNG:
-- 1. Öffne Supabase Dashboard → SQL Editor
-- 2. Kopiere den Inhalt der einzelnen Migrations
-- 3. Führe sie in der Reihenfolge aus
-- 4. Prüfe die Output-Messages
--
-- ============================================================================

-- ============================================================================
-- SCHRITT 1: Prüfe ob Basis-Tabellen existieren
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔══════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  SALES FLOW AI - DEPLOYMENT CHECK                            ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  
  -- Check for users table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads') THEN
    RAISE NOTICE '✅ leads table exists';
  ELSE
    RAISE NOTICE '❌ leads table NOT FOUND - Create base tables first!';
  END IF;
  
  -- Check auth
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    RAISE NOTICE '✅ auth.users exists';
  ELSE
    RAISE NOTICE '⚠️  auth.users not found (normal for fresh Supabase)';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '📋 Führe folgende Migrations in Reihenfolge aus:';
  RAISE NOTICE '   1. 003_power_up_system.sql';
  RAISE NOTICE '   2. 004_complete_rls_policies.sql';
  RAISE NOTICE '   3. 005_follow_up_tasks_table.sql';
  RAISE NOTICE '   4. 006_auto_reminder_system.sql';
  RAISE NOTICE '   5. 007_coaching_prompts.sql';
  RAISE NOTICE '   6. 008_objection_brain_lead_scoring.sql';
  RAISE NOTICE '   7. 008_proposal_reminder_system.sql';
  RAISE NOTICE '   8. 009_daily_flow_system.sql';
  RAISE NOTICE '   9. 010_personality_contact_plans.sql  ← NEU: DISG & Contact Plans';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Tipp: Kopiere jede Datei einzeln in den SQL Editor';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- QUICK VERIFICATION QUERIES
-- ============================================================================

-- Nach dem Deployment diese Queries ausführen um zu verifizieren:

/*
-- 1. Alle Tabellen mit RLS prüfen
SELECT tablename, rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. Reminder Rules prüfen
SELECT name, trigger_type, days_threshold, task_priority 
FROM reminder_rules 
WHERE is_active = true;

-- 3. Coaching Prompts prüfen
SELECT key, name, category 
FROM ai_coaching_prompts 
WHERE is_active = true;

-- 4. DISG Personality Profiles prüfen
SELECT lead_id, dominant_style, confidence, messages_analyzed
FROM lead_personality_profiles
LIMIT 5;

-- 5. Contact Plans prüfen
SELECT cp.lead_id, c.name, cp.next_contact_at, cp.next_channel, cp.plan_type
FROM contact_plans cp
JOIN contacts c ON c.id = cp.lead_id
WHERE cp.is_active = true
LIMIT 10;

-- 6. Contact Plan Stats prüfen
SELECT * FROM view_contact_plan_stats;

-- 7. Follow-up Tasks Struktur prüfen
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'follow_up_tasks'
ORDER BY ordinal_position;
*/

-- ============================================================================
-- DEPLOYMENT COMPLETE MESSAGE
-- ============================================================================

SELECT '🚀 Deployment-Check abgeschlossen. Führe die einzelnen Migration-Dateien aus!' as message;


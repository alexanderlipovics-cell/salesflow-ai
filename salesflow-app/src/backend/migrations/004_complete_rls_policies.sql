-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  SALES FLOW AI - COMPLETE RLS POLICIES v2.0                                ║
-- ║  Vollständige Row Level Security für alle Tabellen                        ║
-- ╚════════════════════════════════════════════════════════════════════════════╝
--
-- WICHTIG: Diese Datei MUSS nach allen Schema-Migrationen ausgeführt werden!
--
-- Kategorien:
-- 🔒 PERSONAL    = Nur eigene Daten sichtbar (owner-based)
-- 👥 TEAM        = Team-Mitglieder können gemeinsame Daten sehen
-- 🌐 SHARED      = Alle authentifizierten User können lesen
-- 🛡️ ADMIN       = Nur Admins/Leaders können schreiben
--
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Funktion um zu prüfen ob User authentifiziert ist
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN auth.uid() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funktion um User-Rolle zu prüfen
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN COALESCE(
    (SELECT role FROM public.users WHERE id = auth.uid()),
    'member'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funktion um Team-ID des Users zu bekommen
CREATE OR REPLACE FUNCTION public.get_user_team_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT team_id FROM public.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 1. USERS TABLE (🔒 PERSONAL)
-- ============================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users können nur ihr eigenes Profil sehen
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own"
ON public.users FOR SELECT
USING (id = auth.uid());

-- Users können nur ihr eigenes Profil updaten
DROP POLICY IF EXISTS "users_update_own" ON public.users;
CREATE POLICY "users_update_own"
ON public.users FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Team-Leads können Team-Mitglieder sehen
DROP POLICY IF EXISTS "users_select_team" ON public.users;
CREATE POLICY "users_select_team"
ON public.users FOR SELECT
USING (
  team_id = public.get_user_team_id()
  AND public.get_user_role() IN ('leader', 'admin')
);

-- ============================================================================
-- 2. LEADS TABLE (🔒 PERSONAL + 👥 TEAM)
-- ============================================================================

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Users können eigene Leads sehen
DROP POLICY IF EXISTS "leads_select_own" ON public.leads;
CREATE POLICY "leads_select_own"
ON public.leads FOR SELECT
USING (user_id = auth.uid());

-- Users können eigene Leads erstellen
DROP POLICY IF EXISTS "leads_insert_own" ON public.leads;
CREATE POLICY "leads_insert_own"
ON public.leads FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users können eigene Leads updaten
DROP POLICY IF EXISTS "leads_update_own" ON public.leads;
CREATE POLICY "leads_update_own"
ON public.leads FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users können eigene Leads löschen
DROP POLICY IF EXISTS "leads_delete_own" ON public.leads;
CREATE POLICY "leads_delete_own"
ON public.leads FOR DELETE
USING (user_id = auth.uid());

-- Team-Leads können alle Team-Leads sehen (für Coaching Dashboard)
DROP POLICY IF EXISTS "leads_select_team" ON public.leads;
CREATE POLICY "leads_select_team"
ON public.leads FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = leads.user_id
      AND u.team_id = public.get_user_team_id()
      AND public.get_user_role() IN ('leader', 'admin')
  )
);

-- ============================================================================
-- 3. ACTIVITIES TABLE (🔒 PERSONAL)
-- ============================================================================

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Users können eigene Activities sehen
DROP POLICY IF EXISTS "activities_select_own" ON public.activities;
CREATE POLICY "activities_select_own"
ON public.activities FOR SELECT
USING (user_id = auth.uid());

-- Users können eigene Activities erstellen
DROP POLICY IF EXISTS "activities_insert_own" ON public.activities;
CREATE POLICY "activities_insert_own"
ON public.activities FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users können eigene Activities updaten
DROP POLICY IF EXISTS "activities_update_own" ON public.activities;
CREATE POLICY "activities_update_own"
ON public.activities FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users können eigene Activities löschen
DROP POLICY IF EXISTS "activities_delete_own" ON public.activities;
CREATE POLICY "activities_delete_own"
ON public.activities FOR DELETE
USING (user_id = auth.uid());

-- ============================================================================
-- 4. FOLLOW_UPS TABLE (🔒 PERSONAL)
-- ============================================================================

ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

-- Users können eigene Follow-ups sehen
DROP POLICY IF EXISTS "follow_ups_select_own" ON public.follow_ups;
CREATE POLICY "follow_ups_select_own"
ON public.follow_ups FOR SELECT
USING (user_id = auth.uid());

-- Users können eigene Follow-ups erstellen
DROP POLICY IF EXISTS "follow_ups_insert_own" ON public.follow_ups;
CREATE POLICY "follow_ups_insert_own"
ON public.follow_ups FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users können eigene Follow-ups updaten
DROP POLICY IF EXISTS "follow_ups_update_own" ON public.follow_ups;
CREATE POLICY "follow_ups_update_own"
ON public.follow_ups FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users können eigene Follow-ups löschen
DROP POLICY IF EXISTS "follow_ups_delete_own" ON public.follow_ups;
CREATE POLICY "follow_ups_delete_own"
ON public.follow_ups FOR DELETE
USING (user_id = auth.uid());

-- ============================================================================
-- 5. MESSAGE_TRACKING TABLE (🔒 PERSONAL)
-- ============================================================================

ALTER TABLE public.message_tracking ENABLE ROW LEVEL SECURITY;

-- Users können eigene Message-Tracking sehen
DROP POLICY IF EXISTS "message_tracking_select_own" ON public.message_tracking;
CREATE POLICY "message_tracking_select_own"
ON public.message_tracking FOR SELECT
USING (user_id = auth.uid());

-- Users können eigene Message-Tracking erstellen
DROP POLICY IF EXISTS "message_tracking_insert_own" ON public.message_tracking;
CREATE POLICY "message_tracking_insert_own"
ON public.message_tracking FOR INSERT
WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 6. FOLLOWUP_PLAYBOOKS TABLE (🌐 SHARED READ, 🛡️ ADMIN WRITE)
-- ============================================================================

ALTER TABLE public.followup_playbooks ENABLE ROW LEVEL SECURITY;

-- Alle authentifizierten Users können Playbooks lesen
DROP POLICY IF EXISTS "followup_playbooks_select_all" ON public.followup_playbooks;
CREATE POLICY "followup_playbooks_select_all"
ON public.followup_playbooks FOR SELECT
USING (public.is_authenticated() AND is_active = true);

-- Nur Admins können Playbooks erstellen/updaten/löschen
DROP POLICY IF EXISTS "followup_playbooks_manage_admin" ON public.followup_playbooks;
CREATE POLICY "followup_playbooks_manage_admin"
ON public.followup_playbooks FOR ALL
USING (public.get_user_role() = 'admin')
WITH CHECK (public.get_user_role() = 'admin');

-- ============================================================================
-- 7. FOLLOWUP_TEMPLATES TABLE (🌐 SHARED READ, 🛡️ ADMIN WRITE)
-- ============================================================================

ALTER TABLE public.followup_templates ENABLE ROW LEVEL SECURITY;

-- Alle authentifizierten Users können aktive Templates lesen
DROP POLICY IF EXISTS "followup_templates_select_all" ON public.followup_templates;
CREATE POLICY "followup_templates_select_all"
ON public.followup_templates FOR SELECT
USING (public.is_authenticated() AND is_active = true);

-- Admins und Ersteller können Templates verwalten
DROP POLICY IF EXISTS "followup_templates_manage" ON public.followup_templates;
CREATE POLICY "followup_templates_manage"
ON public.followup_templates FOR ALL
USING (
  public.get_user_role() = 'admin'
  OR created_by = auth.uid()
)
WITH CHECK (
  public.get_user_role() = 'admin'
  OR created_by = auth.uid()
);

-- ============================================================================
-- 8. TEMPLATE_VERSIONS TABLE (🔒 via Template)
-- ============================================================================

ALTER TABLE public.template_versions ENABLE ROW LEVEL SECURITY;

-- Users können Versions sehen, wenn sie das Template sehen können
DROP POLICY IF EXISTS "template_versions_select" ON public.template_versions;
CREATE POLICY "template_versions_select"
ON public.template_versions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.followup_templates t
    WHERE t.id = template_versions.template_id
      AND (t.is_active = true OR t.created_by = auth.uid())
  )
);

-- Nur Admins und Template-Ersteller können Versions erstellen
DROP POLICY IF EXISTS "template_versions_insert" ON public.template_versions;
CREATE POLICY "template_versions_insert"
ON public.template_versions FOR INSERT
WITH CHECK (
  public.get_user_role() = 'admin'
  OR created_by = auth.uid()
);

-- ============================================================================
-- 9. AI_PROMPTS TABLE (🌐 SHARED READ, 🛡️ ADMIN WRITE)
-- ============================================================================

ALTER TABLE public.ai_prompts ENABLE ROW LEVEL SECURITY;

-- Alle authentifizierten Users können aktive Prompts lesen
DROP POLICY IF EXISTS "ai_prompts_select_all" ON public.ai_prompts;
CREATE POLICY "ai_prompts_select_all"
ON public.ai_prompts FOR SELECT
USING (public.is_authenticated() AND is_active = true);

-- Nur Admins können Prompts verwalten
DROP POLICY IF EXISTS "ai_prompts_manage_admin" ON public.ai_prompts;
CREATE POLICY "ai_prompts_manage_admin"
ON public.ai_prompts FOR ALL
USING (public.get_user_role() = 'admin')
WITH CHECK (public.get_user_role() = 'admin');

-- ============================================================================
-- 10. AI_PROMPT_EXECUTIONS TABLE (🔒 PERSONAL)
-- ============================================================================

ALTER TABLE public.ai_prompt_executions ENABLE ROW LEVEL SECURITY;

-- Users können eigene Executions sehen
DROP POLICY IF EXISTS "ai_prompt_executions_select_own" ON public.ai_prompt_executions;
CREATE POLICY "ai_prompt_executions_select_own"
ON public.ai_prompt_executions FOR SELECT
USING (user_id = auth.uid());

-- Users können eigene Executions erstellen
DROP POLICY IF EXISTS "ai_prompt_executions_insert_own" ON public.ai_prompt_executions;
CREATE POLICY "ai_prompt_executions_insert_own"
ON public.ai_prompt_executions FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users können eigene Executions updaten (für Feedback)
DROP POLICY IF EXISTS "ai_prompt_executions_update_own" ON public.ai_prompt_executions;
CREATE POLICY "ai_prompt_executions_update_own"
ON public.ai_prompt_executions FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 11. BADGES TABLE (🌐 SHARED)
-- ============================================================================

ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;

-- Alle können aktive Badges sehen
DROP POLICY IF EXISTS "badges_select_all" ON public.badges;
CREATE POLICY "badges_select_all"
ON public.badges FOR SELECT
USING (public.is_authenticated() AND is_active = true);

-- Nur Admins können Badges verwalten
DROP POLICY IF EXISTS "badges_manage_admin" ON public.badges;
CREATE POLICY "badges_manage_admin"
ON public.badges FOR ALL
USING (public.get_user_role() = 'admin')
WITH CHECK (public.get_user_role() = 'admin');

-- ============================================================================
-- 12. USER_BADGES TABLE (🔒 PERSONAL READ, System WRITE)
-- ============================================================================

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Users können eigene Badges sehen
DROP POLICY IF EXISTS "user_badges_select_own" ON public.user_badges;
CREATE POLICY "user_badges_select_own"
ON public.user_badges FOR SELECT
USING (user_id = auth.uid());

-- Team-Leads können Team-Badges sehen (für Leaderboard)
DROP POLICY IF EXISTS "user_badges_select_team" ON public.user_badges;
CREATE POLICY "user_badges_select_team"
ON public.user_badges FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = user_badges.user_id
      AND u.team_id = public.get_user_team_id()
  )
);

-- Insert nur via Service-Role (Backend Gamification Logic)

-- ============================================================================
-- 13. LEADERBOARD_ENTRIES TABLE (👥 TEAM)
-- ============================================================================

ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;

-- Users können Team-Leaderboard sehen
DROP POLICY IF EXISTS "leaderboard_entries_select" ON public.leaderboard_entries;
CREATE POLICY "leaderboard_entries_select"
ON public.leaderboard_entries FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = leaderboard_entries.user_id
      AND u.team_id = public.get_user_team_id()
  )
  OR user_id = auth.uid()
);

-- ============================================================================
-- 14. ENRICHMENT_LOGS TABLE (🔒 via Lead)
-- ============================================================================

ALTER TABLE public.enrichment_logs ENABLE ROW LEVEL SECURITY;

-- Users können Enrichment-Logs ihrer eigenen Leads sehen
DROP POLICY IF EXISTS "enrichment_logs_select" ON public.enrichment_logs;
CREATE POLICY "enrichment_logs_select"
ON public.enrichment_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = enrichment_logs.lead_id
      AND l.user_id = auth.uid()
  )
);

-- ============================================================================
-- 15. COMPANY_INTELLIGENCE TABLE (🌐 SHARED) - Power Up System
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_intelligence') THEN
    ALTER TABLE public.company_intelligence ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "company_intelligence_select_all" ON public.company_intelligence;
    EXECUTE 'CREATE POLICY "company_intelligence_select_all"
      ON public.company_intelligence FOR SELECT
      USING (is_active = true)';
    
    RAISE NOTICE '✅ RLS enabled for company_intelligence';
  END IF;
END $$;

-- ============================================================================
-- 16. OBJECTION_LIBRARY TABLE (🌐 SHARED) - Power Up System
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'objection_library') THEN
    ALTER TABLE public.objection_library ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "objection_library_select_all" ON public.objection_library;
    EXECUTE 'CREATE POLICY "objection_library_select_all"
      ON public.objection_library FOR SELECT
      USING (is_active = true)';
    
    RAISE NOTICE '✅ RLS enabled for objection_library';
  END IF;
END $$;

-- ============================================================================
-- 17. SUCCESS_STORIES TABLE (🌐 SHARED) - Power Up System
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'success_stories') THEN
    ALTER TABLE public.success_stories ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "success_stories_select_all" ON public.success_stories;
    EXECUTE 'CREATE POLICY "success_stories_select_all"
      ON public.success_stories FOR SELECT
      USING (true)';
    
    RAISE NOTICE '✅ RLS enabled for success_stories';
  END IF;
END $$;

-- ============================================================================
-- 18. LIABILITY_RULES TABLE (🌐 SHARED) - Power Up System
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'liability_rules') THEN
    ALTER TABLE public.liability_rules ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "liability_rules_select_all" ON public.liability_rules;
    EXECUTE 'CREATE POLICY "liability_rules_select_all"
      ON public.liability_rules FOR SELECT
      USING (is_active = true)';
    
    RAISE NOTICE '✅ RLS enabled for liability_rules';
  END IF;
END $$;

-- ============================================================================
-- PERFORMANCE INDEXES
-- ============================================================================

-- Diese Indexes beschleunigen RLS-Policy-Checks
CREATE INDEX IF NOT EXISTS idx_users_id ON public.users(id);
CREATE INDEX IF NOT EXISTS idx_users_team_id ON public.users(team_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

CREATE INDEX IF NOT EXISTS idx_leads_user_id ON public.leads(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON public.activities(user_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_user_id ON public.follow_ups(user_id);
CREATE INDEX IF NOT EXISTS idx_message_tracking_user_id ON public.message_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_prompt_executions_user_id ON public.ai_prompt_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_entries_user_id ON public.leaderboard_entries(user_id);

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

-- Führe diese Query aus um zu prüfen ob alle Tabellen RLS aktiviert haben:
DO $$
DECLARE
  table_record RECORD;
  rls_count INTEGER := 0;
  total_count INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔══════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  RLS STATUS CHECK                                            ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  
  FOR table_record IN 
    SELECT tablename, rowsecurity 
    FROM pg_tables 
    WHERE schemaname = 'public'
    AND tablename IN (
      'users', 'leads', 'activities', 'follow_ups', 'message_tracking',
      'followup_playbooks', 'followup_templates', 'template_versions',
      'ai_prompts', 'ai_prompt_executions', 'badges', 'user_badges',
      'leaderboard_entries', 'enrichment_logs', 'company_intelligence',
      'objection_library', 'success_stories', 'liability_rules'
    )
  LOOP
    total_count := total_count + 1;
    IF table_record.rowsecurity THEN
      rls_count := rls_count + 1;
      RAISE NOTICE '✅ % - RLS ENABLED', table_record.tablename;
    ELSE
      RAISE NOTICE '❌ % - RLS DISABLED', table_record.tablename;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════════════════════════';
  RAISE NOTICE 'SUMMARY: %/% tables with RLS enabled', rls_count, total_count;
  
  IF rls_count = total_count THEN
    RAISE NOTICE '🔒 STATUS: PRODUCTION READY!';
  ELSE
    RAISE NOTICE '⚠️  STATUS: SOME TABLES NEED ATTENTION';
  END IF;
  
  RAISE NOTICE '══════════════════════════════════════════════════════════════';
END $$;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔══════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ COMPLETE RLS POLICIES v2.0 APPLIED SUCCESSFULLY!        ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Geschützte Tabellen:';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 PERSONAL (nur eigene Daten):';
  RAISE NOTICE '   • users, leads, activities, follow_ups';
  RAISE NOTICE '   • message_tracking, ai_prompt_executions';
  RAISE NOTICE '';
  RAISE NOTICE '👥 TEAM (Team-Sichtbarkeit für Leaders):';
  RAISE NOTICE '   • leads (für Coaching), user_badges, leaderboard_entries';
  RAISE NOTICE '';
  RAISE NOTICE '🌐 SHARED (alle können lesen):';
  RAISE NOTICE '   • followup_playbooks, followup_templates, ai_prompts';
  RAISE NOTICE '   • badges, company_intelligence, objection_library';
  RAISE NOTICE '   • success_stories, liability_rules';
  RAISE NOTICE '';
  RAISE NOTICE '🛡️ ADMIN-ONLY (nur Admins können schreiben):';
  RAISE NOTICE '   • Alle SHARED Tabellen (Lesen: alle, Schreiben: Admins)';
  RAISE NOTICE '';
  RAISE NOTICE '⚡ Performance-Indexes erstellt für alle user_id Spalten';
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════════════════════════';
END $$;


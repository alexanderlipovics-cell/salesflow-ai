-- =============================================
-- MIGRATION 010: DISG Personality Profiles & Contact Plans
-- =============================================
-- Purpose: No Lead Left Behind System
-- - DISG-basierte Persönlichkeitsprofile
-- - Garantierter nächster Schritt für jeden Lead
-- 
-- Author: Sales Flow AI
-- Date: 2025-12-01
-- =============================================

-- =============================================
-- 1. ENUM TYPES
-- =============================================

-- Decision State: Wo steht der Lead in seiner Entscheidung?
DO $$ BEGIN
  CREATE TYPE decision_state AS ENUM (
    'no_decision',  -- Noch unklar
    'thinking',     -- Denkt nach
    'committed',    -- Hat zugesagt
    'not_now',      -- Jetzt nicht, später vielleicht
    'rejected'      -- Klare Absage
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- DISG Typ
DO $$ BEGIN
  CREATE TYPE disc_style AS ENUM ('D', 'I', 'S', 'G');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Contact Plan Type
DO $$ BEGIN
  CREATE TYPE contact_plan_type AS ENUM (
    'manual_choice',   -- User hat manuell gewählt
    'ai_suggested',    -- AI hat vorgeschlagen, User bestätigt
    'ai_autopilot'     -- AI hat automatisch gesetzt
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- 2. ALTER CONTACTS TABLE - Add decision_state
-- =============================================

ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS decision_state decision_state DEFAULT 'no_decision';

COMMENT ON COLUMN public.contacts.decision_state IS 
  'Entscheidungs-Status des Leads: no_decision, thinking, committed, not_now, rejected';

-- =============================================
-- 3. LEAD PERSONALITY PROFILES (DISG)
-- =============================================

CREATE TABLE IF NOT EXISTS public.lead_personality_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- DISG Scores (0-1)
  disc_d NUMERIC(3,2) NOT NULL DEFAULT 0.25 CHECK (disc_d >= 0 AND disc_d <= 1),
  disc_i NUMERIC(3,2) NOT NULL DEFAULT 0.25 CHECK (disc_i >= 0 AND disc_i <= 1),
  disc_s NUMERIC(3,2) NOT NULL DEFAULT 0.25 CHECK (disc_s >= 0 AND disc_s <= 1),
  disc_g NUMERIC(3,2) NOT NULL DEFAULT 0.25 CHECK (disc_g >= 0 AND disc_g <= 1),
  
  -- Dominanter Stil
  dominant_style disc_style NOT NULL DEFAULT 'S',
  
  -- Wie sicher ist die Einschätzung? (0-1)
  confidence NUMERIC(3,2) NOT NULL DEFAULT 0.5 CHECK (confidence >= 0 AND confidence <= 1),
  
  -- Analyse-Basis
  messages_analyzed INTEGER DEFAULT 0,
  last_analysis_at TIMESTAMPTZ,
  analysis_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(lead_id)
);

COMMENT ON TABLE public.lead_personality_profiles IS 
  'DISG-Persönlichkeitsprofile für Leads - ermöglicht personalisierte Kommunikation';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_personality_lead ON lead_personality_profiles(lead_id);
CREATE INDEX IF NOT EXISTS idx_personality_workspace ON lead_personality_profiles(workspace_id);
CREATE INDEX IF NOT EXISTS idx_personality_style ON lead_personality_profiles(dominant_style);

-- =============================================
-- 4. CONTACT PLANS (Nächster Schritt Garantie)
-- =============================================

CREATE TABLE IF NOT EXISTS public.contact_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Nächster Kontakt
  next_contact_at TIMESTAMPTZ,
  next_channel TEXT NOT NULL DEFAULT 'whatsapp' 
    CHECK (next_channel IN ('whatsapp', 'phone', 'email', 'social', 'meeting')),
  
  -- Verknüpfung zu Playbook (optional)
  next_playbook_id UUID REFERENCES playbooks(id) ON DELETE SET NULL,
  
  -- Wie wurde der Plan erstellt?
  plan_type contact_plan_type NOT NULL DEFAULT 'ai_suggested',
  selected_by_user BOOLEAN NOT NULL DEFAULT false,
  
  -- Begründung der AI
  reasoning TEXT,
  
  -- Vorgeschlagene Nachricht (optional)
  suggested_message TEXT,
  suggested_message_tone TEXT, -- z.B. "empathisch, geduldig"
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  executed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(lead_id) -- Nur EIN aktiver Plan pro Lead
);

COMMENT ON TABLE public.contact_plans IS 
  'Garantiert: Jeder relevante Lead hat einen nächsten Schritt. Keine Leads gehen verloren.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contact_plans_lead ON contact_plans(lead_id);
CREATE INDEX IF NOT EXISTS idx_contact_plans_next ON contact_plans(next_contact_at);
CREATE INDEX IF NOT EXISTS idx_contact_plans_active ON contact_plans(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_contact_plans_user ON contact_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_plans_workspace ON contact_plans(workspace_id);

-- =============================================
-- 5. UPDATED_AT TRIGGERS
-- =============================================

-- Trigger für lead_personality_profiles
CREATE OR REPLACE FUNCTION update_personality_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_personality_updated ON lead_personality_profiles;
CREATE TRIGGER trg_personality_updated
  BEFORE UPDATE ON lead_personality_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_personality_timestamp();

-- Trigger für contact_plans
DROP TRIGGER IF EXISTS trg_contact_plans_updated ON contact_plans;
CREATE TRIGGER trg_contact_plans_updated
  BEFORE UPDATE ON contact_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_personality_timestamp();

-- =============================================
-- 6. RPC: Upsert Personality Profile
-- =============================================

CREATE OR REPLACE FUNCTION public.upsert_personality_profile(
  p_lead_id UUID,
  p_workspace_id UUID,
  p_disc_d NUMERIC,
  p_disc_i NUMERIC,
  p_disc_s NUMERIC,
  p_disc_g NUMERIC,
  p_confidence NUMERIC,
  p_messages_analyzed INTEGER DEFAULT 0,
  p_analysis_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_dominant disc_style;
  v_id UUID;
BEGIN
  -- Determine dominant style
  v_dominant := CASE 
    WHEN p_disc_d >= p_disc_i AND p_disc_d >= p_disc_s AND p_disc_d >= p_disc_g THEN 'D'::disc_style
    WHEN p_disc_i >= p_disc_d AND p_disc_i >= p_disc_s AND p_disc_i >= p_disc_g THEN 'I'::disc_style
    WHEN p_disc_s >= p_disc_d AND p_disc_s >= p_disc_i AND p_disc_s >= p_disc_g THEN 'S'::disc_style
    ELSE 'G'::disc_style
  END;

  INSERT INTO lead_personality_profiles (
    lead_id, workspace_id,
    disc_d, disc_i, disc_s, disc_g,
    dominant_style, confidence,
    messages_analyzed, analysis_notes, last_analysis_at
  )
  VALUES (
    p_lead_id, p_workspace_id,
    p_disc_d, p_disc_i, p_disc_s, p_disc_g,
    v_dominant, p_confidence,
    p_messages_analyzed, p_analysis_notes, NOW()
  )
  ON CONFLICT (lead_id) DO UPDATE SET
    disc_d = EXCLUDED.disc_d,
    disc_i = EXCLUDED.disc_i,
    disc_s = EXCLUDED.disc_s,
    disc_g = EXCLUDED.disc_g,
    dominant_style = EXCLUDED.dominant_style,
    confidence = EXCLUDED.confidence,
    messages_analyzed = lead_personality_profiles.messages_analyzed + EXCLUDED.messages_analyzed,
    analysis_notes = EXCLUDED.analysis_notes,
    last_analysis_at = NOW(),
    updated_at = NOW()
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.upsert_personality_profile IS 
  'Erstellt oder aktualisiert DISG-Profil für einen Lead';

-- =============================================
-- 7. RPC: Upsert Contact Plan
-- =============================================

CREATE OR REPLACE FUNCTION public.upsert_contact_plan(
  p_lead_id UUID,
  p_workspace_id UUID,
  p_user_id UUID,
  p_next_contact_at TIMESTAMPTZ,
  p_next_channel TEXT DEFAULT 'whatsapp',
  p_plan_type contact_plan_type DEFAULT 'ai_suggested',
  p_reasoning TEXT DEFAULT NULL,
  p_suggested_message TEXT DEFAULT NULL,
  p_suggested_message_tone TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO contact_plans (
    lead_id, workspace_id, user_id,
    next_contact_at, next_channel,
    plan_type, reasoning,
    suggested_message, suggested_message_tone
  )
  VALUES (
    p_lead_id, p_workspace_id, p_user_id,
    p_next_contact_at, p_next_channel,
    p_plan_type, p_reasoning,
    p_suggested_message, p_suggested_message_tone
  )
  ON CONFLICT (lead_id) DO UPDATE SET
    next_contact_at = EXCLUDED.next_contact_at,
    next_channel = EXCLUDED.next_channel,
    plan_type = EXCLUDED.plan_type,
    reasoning = EXCLUDED.reasoning,
    suggested_message = EXCLUDED.suggested_message,
    suggested_message_tone = EXCLUDED.suggested_message_tone,
    is_active = true,
    executed_at = NULL,
    updated_at = NOW()
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.upsert_contact_plan IS 
  'Erstellt oder aktualisiert den nächsten Kontaktplan für einen Lead';

-- =============================================
-- 8. RPC: Mark Contact Plan as Executed
-- =============================================

CREATE OR REPLACE FUNCTION public.mark_contact_plan_executed(
  p_lead_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE contact_plans
  SET 
    executed_at = NOW(),
    is_active = false,
    updated_at = NOW()
  WHERE lead_id = p_lead_id
    AND is_active = true;
  
  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION public.mark_contact_plan_executed IS 
  'Markiert den aktuellen Kontaktplan als ausgeführt';

-- =============================================
-- 9. RPC: Get Leads Without Contact Plan (for Background Job)
-- =============================================

CREATE OR REPLACE FUNCTION public.get_leads_without_plan(
  p_workspace_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  lead_id UUID,
  lead_name TEXT,
  lead_status TEXT,
  decision_state decision_state,
  last_contact_at TIMESTAMPTZ,
  days_since_contact INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id AS lead_id,
    c.name AS lead_name,
    c.status AS lead_status,
    c.decision_state,
    c.last_contact_at,
    EXTRACT(DAY FROM NOW() - COALESCE(c.last_contact_at, c.created_at))::INTEGER AS days_since_contact
  FROM contacts c
  LEFT JOIN contact_plans cp ON cp.lead_id = c.id AND cp.is_active = true
  WHERE c.workspace_id = p_workspace_id
    AND c.status IN ('new', 'contacted', 'interested', 'active')
    AND (cp.id IS NULL OR cp.next_contact_at < NOW() - INTERVAL '1 day')
  ORDER BY 
    CASE c.status 
      WHEN 'active' THEN 1 
      WHEN 'interested' THEN 2
      WHEN 'contacted' THEN 3 
      ELSE 4 
    END,
    c.last_contact_at ASC NULLS FIRST
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.get_leads_without_plan IS 
  'Findet Leads ohne aktiven Kontaktplan - für No-Lead-Left-Behind Job';

-- =============================================
-- 10. RPC: Get Leads for Reactivation
-- =============================================

CREATE OR REPLACE FUNCTION public.get_reactivation_candidates(
  p_workspace_id UUID,
  p_days_inactive INTEGER DEFAULT 30,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  lead_id UUID,
  lead_name TEXT,
  lead_status TEXT,
  decision_state decision_state,
  dominant_style disc_style,
  last_contact_at TIMESTAMPTZ,
  days_since_contact INTEGER,
  reactivation_priority INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id AS lead_id,
    c.name AS lead_name,
    c.status AS lead_status,
    c.decision_state,
    COALESCE(lpp.dominant_style, 'S'::disc_style) AS dominant_style,
    c.last_contact_at,
    EXTRACT(DAY FROM NOW() - c.last_contact_at)::INTEGER AS days_since_contact,
    -- Priority: higher = more urgent
    (CASE 
      WHEN c.status = 'interested' THEN 100
      WHEN c.status = 'active' THEN 80
      WHEN c.decision_state = 'thinking' THEN 70
      WHEN c.decision_state = 'not_now' THEN 50
      ELSE 30
    END + 
    LEAST(50, EXTRACT(DAY FROM NOW() - c.last_contact_at)::INTEGER / 2))::INTEGER AS reactivation_priority
  FROM contacts c
  LEFT JOIN lead_personality_profiles lpp ON lpp.lead_id = c.id
  WHERE c.workspace_id = p_workspace_id
    AND c.status NOT IN ('converted', 'won', 'lost')
    AND c.decision_state != 'rejected'
    AND c.last_contact_at < NOW() - (p_days_inactive || ' days')::INTERVAL
  ORDER BY reactivation_priority DESC
  LIMIT p_limit;
END;
$$;

COMMENT ON FUNCTION public.get_reactivation_candidates IS 
  'Findet Leads die reaktiviert werden sollten - sortiert nach Priorität';

-- =============================================
-- 11. RPC: Get Today's Contact Plans
-- =============================================

CREATE OR REPLACE FUNCTION public.get_todays_contact_plans(
  p_user_id UUID,
  p_workspace_id UUID
)
RETURNS TABLE (
  plan_id UUID,
  lead_id UUID,
  lead_name TEXT,
  lead_status TEXT,
  decision_state decision_state,
  dominant_style disc_style,
  next_contact_at TIMESTAMPTZ,
  next_channel TEXT,
  suggested_message TEXT,
  suggested_message_tone TEXT,
  reasoning TEXT,
  is_overdue BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.id AS plan_id,
    c.id AS lead_id,
    c.name AS lead_name,
    c.status AS lead_status,
    c.decision_state,
    COALESCE(lpp.dominant_style, 'S'::disc_style) AS dominant_style,
    cp.next_contact_at,
    cp.next_channel,
    cp.suggested_message,
    cp.suggested_message_tone,
    cp.reasoning,
    (cp.next_contact_at < NOW()) AS is_overdue
  FROM contact_plans cp
  JOIN contacts c ON c.id = cp.lead_id
  LEFT JOIN lead_personality_profiles lpp ON lpp.lead_id = c.id
  WHERE cp.workspace_id = p_workspace_id
    AND cp.user_id = p_user_id
    AND cp.is_active = true
    AND cp.next_contact_at <= NOW() + INTERVAL '1 day'
  ORDER BY 
    CASE WHEN cp.next_contact_at < NOW() THEN 0 ELSE 1 END,
    cp.next_contact_at ASC;
END;
$$;

COMMENT ON FUNCTION public.get_todays_contact_plans IS 
  'Holt alle Kontaktpläne für heute und überfällige - für Daily Flow';

-- =============================================
-- 12. VIEW: Leads with Full Context
-- =============================================

CREATE OR REPLACE VIEW public.view_leads_full_context AS
SELECT 
  c.id,
  c.name,
  c.email,
  c.phone,
  c.status,
  c.decision_state,
  c.assigned_to,
  c.workspace_id,
  c.last_contact_at,
  c.notes,
  c.created_at,
  -- DISG Profile
  lpp.dominant_style,
  lpp.disc_d,
  lpp.disc_i,
  lpp.disc_s,
  lpp.disc_g,
  lpp.confidence AS disc_confidence,
  -- Contact Plan
  cp.next_contact_at,
  cp.next_channel,
  cp.plan_type,
  cp.reasoning AS plan_reasoning,
  cp.suggested_message,
  cp.suggested_message_tone,
  -- Computed
  CASE 
    WHEN cp.next_contact_at IS NULL THEN 'no_plan'
    WHEN cp.next_contact_at < NOW() THEN 'overdue'
    WHEN cp.next_contact_at < NOW() + INTERVAL '1 day' THEN 'today'
    WHEN cp.next_contact_at < NOW() + INTERVAL '7 days' THEN 'this_week'
    ELSE 'later'
  END AS plan_urgency,
  EXTRACT(DAY FROM NOW() - c.last_contact_at)::INTEGER AS days_since_contact
FROM contacts c
LEFT JOIN lead_personality_profiles lpp ON lpp.lead_id = c.id
LEFT JOIN contact_plans cp ON cp.lead_id = c.id AND cp.is_active = true;

COMMENT ON VIEW public.view_leads_full_context IS 
  'Leads mit DISG-Profil und aktivem Kontaktplan - für Dashboard und Daily Flow';

-- =============================================
-- 13. VIEW: Contact Plan Statistics
-- =============================================

CREATE OR REPLACE VIEW public.view_contact_plan_stats AS
SELECT 
  workspace_id,
  COUNT(*) FILTER (WHERE is_active = true) AS active_plans,
  COUNT(*) FILTER (WHERE is_active = true AND next_contact_at < NOW()) AS overdue_plans,
  COUNT(*) FILTER (WHERE is_active = true AND next_contact_at >= NOW() AND next_contact_at < NOW() + INTERVAL '1 day') AS today_plans,
  COUNT(*) FILTER (WHERE is_active = true AND next_contact_at >= NOW() + INTERVAL '1 day' AND next_contact_at < NOW() + INTERVAL '7 days') AS week_plans,
  COUNT(*) FILTER (WHERE executed_at IS NOT NULL AND executed_at >= NOW() - INTERVAL '7 days') AS executed_last_week
FROM contact_plans
GROUP BY workspace_id;

COMMENT ON VIEW public.view_contact_plan_stats IS 
  'Statistiken über Kontaktpläne pro Workspace';

-- =============================================
-- 14. RLS POLICIES
-- =============================================

ALTER TABLE lead_personality_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_plans ENABLE ROW LEVEL SECURITY;

-- Policies für lead_personality_profiles
DROP POLICY IF EXISTS "Users see own workspace profiles" ON lead_personality_profiles;
CREATE POLICY "Users see own workspace profiles" ON lead_personality_profiles
  FOR SELECT USING (workspace_id IN (
    SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users insert own workspace profiles" ON lead_personality_profiles;
CREATE POLICY "Users insert own workspace profiles" ON lead_personality_profiles
  FOR INSERT WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users update own workspace profiles" ON lead_personality_profiles;
CREATE POLICY "Users update own workspace profiles" ON lead_personality_profiles
  FOR UPDATE USING (workspace_id IN (
    SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users delete own workspace profiles" ON lead_personality_profiles;
CREATE POLICY "Users delete own workspace profiles" ON lead_personality_profiles
  FOR DELETE USING (workspace_id IN (
    SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
  ));

-- Policies für contact_plans
DROP POLICY IF EXISTS "Users see own workspace plans" ON contact_plans;
CREATE POLICY "Users see own workspace plans" ON contact_plans
  FOR SELECT USING (workspace_id IN (
    SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users insert own workspace plans" ON contact_plans;
CREATE POLICY "Users insert own workspace plans" ON contact_plans
  FOR INSERT WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users update own workspace plans" ON contact_plans;
CREATE POLICY "Users update own workspace plans" ON contact_plans
  FOR UPDATE USING (workspace_id IN (
    SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users delete own workspace plans" ON contact_plans;
CREATE POLICY "Users delete own workspace plans" ON contact_plans
  FOR DELETE USING (workspace_id IN (
    SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
  ));

-- =============================================
-- 15. GRANTS
-- =============================================

GRANT ALL ON lead_personality_profiles TO authenticated;
GRANT ALL ON contact_plans TO authenticated;
GRANT SELECT ON view_leads_full_context TO authenticated;
GRANT SELECT ON view_contact_plan_stats TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_personality_profile TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_contact_plan TO authenticated;
GRANT EXECUTE ON FUNCTION mark_contact_plan_executed TO authenticated;
GRANT EXECUTE ON FUNCTION get_leads_without_plan TO authenticated;
GRANT EXECUTE ON FUNCTION get_reactivation_candidates TO authenticated;
GRANT EXECUTE ON FUNCTION get_todays_contact_plans TO authenticated;

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

-- Log migration
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 010_personality_contact_plans.sql erfolgreich!';
  RAISE NOTICE '   - ENUM types: decision_state, disc_style, contact_plan_type';
  RAISE NOTICE '   - Tables: lead_personality_profiles, contact_plans';
  RAISE NOTICE '   - Column: contacts.decision_state';
  RAISE NOTICE '   - RPCs: upsert_personality_profile, upsert_contact_plan, mark_contact_plan_executed';
  RAISE NOTICE '   - RPCs: get_leads_without_plan, get_reactivation_candidates, get_todays_contact_plans';
  RAISE NOTICE '   - Views: view_leads_full_context, view_contact_plan_stats';
  RAISE NOTICE '   - RLS policies enabled';
END $$;


-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  SALES FLOW AI - ACTIVITY TRACKING SYSTEM                                 ║
-- ║  Migration 012: Activity Logs für Daily Flow Status                       ║
-- ╚════════════════════════════════════════════════════════════════════════════╝
--
-- Dieses Modul ermöglicht:
--   • Tracking aller Sales-Aktivitäten (Kontakte, Follow-ups, Reaktivierungen)
--   • IST vs. SOLL Vergleich basierend auf User-Zielen
--   • Daily Flow Status Berechnung
--   • CHIEF AI Integration Vorbereitung
--
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. ACTIVITY TYPES ENUM
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE activity_type AS ENUM (
    'new_contact',      -- Neuer Erstkontakt
    'followup',         -- Follow-up mit bestehendem Kontakt
    'reactivation',     -- Alter Kontakt reaktiviert
    'call',             -- Telefonat
    'message',          -- Nachricht gesendet
    'meeting',          -- Meeting/Termin
    'presentation',     -- Präsentation gehalten
    'close_won',        -- Deal gewonnen
    'close_lost',       -- Deal verloren
    'referral'          -- Empfehlung erhalten
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE activity_channel AS ENUM (
    'whatsapp',
    'instagram',
    'facebook',
    'telegram',
    'phone',
    'email',
    'zoom',
    'in_person',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. USER DAILY FLOW TARGETS TABLE
-- ═══════════════════════════════════════════════════════════════════════════
-- Diese Tabelle speichert die täglichen/wöchentlichen Zielwerte pro User

CREATE TABLE IF NOT EXISTS public.user_daily_flow_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Company/Context Support
  company_id TEXT NOT NULL DEFAULT 'default',
  
  -- Tägliche Ziele
  daily_new_contacts INTEGER DEFAULT 8,
  daily_followups INTEGER DEFAULT 6,
  daily_reactivations INTEGER DEFAULT 2,
  
  -- Wöchentliche Ziele (automatisch berechnet oder manuell)
  weekly_new_contacts INTEGER DEFAULT 40,
  weekly_followups INTEGER DEFAULT 30,
  weekly_reactivations INTEGER DEFAULT 10,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Ein User hat nur eine aktive Config pro Company
  UNIQUE(user_id, company_id)
);

COMMENT ON TABLE public.user_daily_flow_targets IS 'Tägliche und wöchentliche Aktivitätsziele pro User';

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_user_daily_flow_targets_user 
  ON user_daily_flow_targets(user_id, company_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. ACTIVITY LOGS TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Bezug zu Lead/Contact (optional)
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  
  -- Firma-Bezug (für Multi-Company Support)
  company_id TEXT NOT NULL DEFAULT 'default',
  
  -- Activity Details
  activity_type activity_type NOT NULL,
  channel activity_channel,
  
  -- Optionale Details
  title TEXT,                           -- z.B. "Follow-up mit Max"
  notes TEXT,                           -- Notizen
  duration_minutes INTEGER,             -- Dauer (für Calls/Meetings)
  
  -- Outcome (für Tracking)
  outcome TEXT CHECK (outcome IN ('positive', 'neutral', 'negative', 'pending')),
  
  -- Metadata
  meta JSONB DEFAULT '{}'::JSONB,
  
  -- Timestamps
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- Wann passierte die Aktivität
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.activity_logs IS 
  'Trackt alle Sales-Aktivitäten für Daily Flow Status und Analytics';

-- Indexes für schnelle Aggregation
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_date 
  ON activity_logs(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_company_date 
  ON activity_logs(user_id, company_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_type 
  ON activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_lead 
  ON activity_logs(lead_id) WHERE lead_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. TRIGGER: Auto-Update updated_at
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_activity_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_activity_logs_updated_at ON public.activity_logs;
CREATE TRIGGER trigger_activity_logs_updated_at
  BEFORE UPDATE ON public.activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_activity_logs_updated_at();

CREATE OR REPLACE FUNCTION update_user_daily_flow_targets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_daily_flow_targets_updated_at ON public.user_daily_flow_targets;
CREATE TRIGGER trigger_user_daily_flow_targets_updated_at
  BEFORE UPDATE ON public.user_daily_flow_targets
  FOR EACH ROW
  EXECUTE FUNCTION update_user_daily_flow_targets_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. RPC: Log Activity
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.log_activity(
  p_user_id UUID,
  p_company_id TEXT DEFAULT 'default',
  p_activity_type TEXT DEFAULT 'new_contact',
  p_channel TEXT DEFAULT NULL,
  p_lead_id UUID DEFAULT NULL,
  p_title TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_duration_minutes INTEGER DEFAULT NULL,
  p_outcome TEXT DEFAULT NULL,
  p_occurred_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO activity_logs (
    user_id, company_id,
    activity_type, channel,
    lead_id,
    title, notes, duration_minutes, outcome,
    occurred_at
  )
  VALUES (
    p_user_id, p_company_id,
    p_activity_type::activity_type,
    p_channel::activity_channel,
    p_lead_id,
    p_title, p_notes, p_duration_minutes, p_outcome,
    p_occurred_at
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.log_activity IS 
  'Erstellt einen neuen Activity Log Eintrag';

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. RPC: Get Daily Activity Counts
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_daily_activity_counts(
  p_user_id UUID,
  p_company_id TEXT DEFAULT 'default',
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  activity_type TEXT,
  count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.activity_type::TEXT,
    COUNT(*)::BIGINT
  FROM activity_logs a
  WHERE a.user_id = p_user_id
    AND a.company_id = p_company_id
    AND a.occurred_at >= p_date::TIMESTAMPTZ
    AND a.occurred_at < (p_date + INTERVAL '1 day')::TIMESTAMPTZ
  GROUP BY a.activity_type;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. RPC: Get Weekly Activity Counts
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_weekly_activity_counts(
  p_user_id UUID,
  p_company_id TEXT DEFAULT 'default',
  p_week_start DATE DEFAULT NULL  -- NULL = aktuelle Woche (Montag)
)
RETURNS TABLE (
  activity_type TEXT,
  count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start DATE;
  v_week_end DATE;
BEGIN
  -- Berechne Wochenstart (Montag)
  IF p_week_start IS NULL THEN
    v_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
  ELSE
    v_week_start := p_week_start;
  END IF;
  
  v_week_end := v_week_start + INTERVAL '7 days';
  
  RETURN QUERY
  SELECT 
    a.activity_type::TEXT,
    COUNT(*)::BIGINT
  FROM activity_logs a
  WHERE a.user_id = p_user_id
    AND a.company_id = p_company_id
    AND a.occurred_at >= v_week_start::TIMESTAMPTZ
    AND a.occurred_at < v_week_end::TIMESTAMPTZ
  GROUP BY a.activity_type;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. RPC: Get Daily Flow Status (Haupt-RPC)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_daily_flow_status(
  p_user_id UUID,
  p_company_id TEXT DEFAULT 'default',
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_targets RECORD;
  v_week_start DATE;
  v_result JSONB;
  v_status_level TEXT;
  v_avg_ratio NUMERIC;
  v_daily_new_contacts NUMERIC;
  v_daily_followups NUMERIC;
  v_daily_reactivations NUMERIC;
  v_weekly_new_contacts NUMERIC;
  v_weekly_followups NUMERIC;
  v_weekly_reactivations NUMERIC;
BEGIN
  -- 1. Targets laden
  SELECT * INTO v_targets
  FROM user_daily_flow_targets
  WHERE user_id = p_user_id
    AND company_id = p_company_id
    AND is_active = true
  LIMIT 1;
  
  -- Falls keine Targets vorhanden, Default-Werte verwenden
  IF v_targets IS NULL THEN
    -- Default-Targets erstellen
    INSERT INTO user_daily_flow_targets (user_id, company_id)
    VALUES (p_user_id, p_company_id)
    ON CONFLICT (user_id, company_id) DO NOTHING;
    
    SELECT * INTO v_targets
    FROM user_daily_flow_targets
    WHERE user_id = p_user_id
      AND company_id = p_company_id
    LIMIT 1;
  END IF;
  
  -- 2. Wochenstart berechnen (Montag)
  v_week_start := DATE_TRUNC('week', p_date)::DATE;
  
  -- 3. Tages-Counts aggregieren
  SELECT COALESCE(SUM(CASE WHEN activity_type = 'new_contact' THEN 1 ELSE 0 END), 0),
         COALESCE(SUM(CASE WHEN activity_type = 'followup' THEN 1 ELSE 0 END), 0),
         COALESCE(SUM(CASE WHEN activity_type = 'reactivation' THEN 1 ELSE 0 END), 0)
  INTO v_daily_new_contacts, v_daily_followups, v_daily_reactivations
  FROM activity_logs
  WHERE user_id = p_user_id
    AND company_id = p_company_id
    AND occurred_at >= p_date::TIMESTAMPTZ
    AND occurred_at < (p_date + INTERVAL '1 day')::TIMESTAMPTZ;
  
  -- 4. Wochen-Counts aggregieren
  SELECT COALESCE(SUM(CASE WHEN activity_type = 'new_contact' THEN 1 ELSE 0 END), 0),
         COALESCE(SUM(CASE WHEN activity_type = 'followup' THEN 1 ELSE 0 END), 0),
         COALESCE(SUM(CASE WHEN activity_type = 'reactivation' THEN 1 ELSE 0 END), 0)
  INTO v_weekly_new_contacts, v_weekly_followups, v_weekly_reactivations
  FROM activity_logs
  WHERE user_id = p_user_id
    AND company_id = p_company_id
    AND occurred_at >= v_week_start::TIMESTAMPTZ
    AND occurred_at < (v_week_start + INTERVAL '7 days')::TIMESTAMPTZ;
  
  -- 5. Status Level berechnen
  v_avg_ratio := (
    CASE WHEN v_targets.daily_new_contacts > 0 
         THEN v_daily_new_contacts / v_targets.daily_new_contacts 
         ELSE 1 END +
    CASE WHEN v_targets.daily_followups > 0 
         THEN v_daily_followups / v_targets.daily_followups 
         ELSE 1 END +
    CASE WHEN v_targets.daily_reactivations > 0 
         THEN v_daily_reactivations / v_targets.daily_reactivations 
         ELSE 1 END
  ) / 3.0;
  
  IF v_avg_ratio >= 1.1 THEN
    v_status_level := 'ahead';
  ELSIF v_avg_ratio >= 0.85 THEN
    v_status_level := 'on_track';
  ELSIF v_avg_ratio >= 0.5 THEN
    v_status_level := 'slightly_behind';
  ELSE
    v_status_level := 'behind';
  END IF;
  
  -- 6. Result zusammenbauen
  v_result := jsonb_build_object(
    'date', p_date::TEXT,
    'company_id', p_company_id,
    'status_level', v_status_level,
    'avg_ratio', ROUND(v_avg_ratio::NUMERIC, 2),
    'daily', jsonb_build_object(
      'new_contacts', jsonb_build_object(
        'done', v_daily_new_contacts,
        'target', v_targets.daily_new_contacts,
        'ratio', CASE WHEN v_targets.daily_new_contacts > 0 
                      THEN ROUND((v_daily_new_contacts / v_targets.daily_new_contacts)::NUMERIC, 2)
                      ELSE 1 END
      ),
      'followups', jsonb_build_object(
        'done', v_daily_followups,
        'target', v_targets.daily_followups,
        'ratio', CASE WHEN v_targets.daily_followups > 0 
                      THEN ROUND((v_daily_followups / v_targets.daily_followups)::NUMERIC, 2)
                      ELSE 1 END
      ),
      'reactivations', jsonb_build_object(
        'done', v_daily_reactivations,
        'target', v_targets.daily_reactivations,
        'ratio', CASE WHEN v_targets.daily_reactivations > 0 
                      THEN ROUND((v_daily_reactivations / v_targets.daily_reactivations)::NUMERIC, 2)
                      ELSE 1 END
      )
    ),
    'weekly', jsonb_build_object(
      'new_contacts', jsonb_build_object(
        'done', v_weekly_new_contacts,
        'target', v_targets.weekly_new_contacts,
        'ratio', CASE WHEN v_targets.weekly_new_contacts > 0 
                      THEN ROUND((v_weekly_new_contacts / v_targets.weekly_new_contacts)::NUMERIC, 2)
                      ELSE 1 END
      ),
      'followups', jsonb_build_object(
        'done', v_weekly_followups,
        'target', v_targets.weekly_followups,
        'ratio', CASE WHEN v_targets.weekly_followups > 0 
                      THEN ROUND((v_weekly_followups / v_targets.weekly_followups)::NUMERIC, 2)
                      ELSE 1 END
      ),
      'reactivations', jsonb_build_object(
        'done', v_weekly_reactivations,
        'target', v_targets.weekly_reactivations,
        'ratio', CASE WHEN v_targets.weekly_reactivations > 0 
                      THEN ROUND((v_weekly_reactivations / v_targets.weekly_reactivations)::NUMERIC, 2)
                      ELSE 1 END
      )
    ),
    'week_start', v_week_start::TEXT
  );
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_daily_flow_status IS 
  'Berechnet den kompletten Daily Flow Status für einen User';

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. RPC: Get Recent Activities
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_recent_activities(
  p_user_id UUID,
  p_company_id TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  activity_type TEXT,
  channel TEXT,
  lead_id UUID,
  lead_name TEXT,
  title TEXT,
  notes TEXT,
  outcome TEXT,
  occurred_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.activity_type::TEXT,
    a.channel::TEXT,
    a.lead_id,
    l.name AS lead_name,
    a.title,
    a.notes,
    a.outcome,
    a.occurred_at
  FROM activity_logs a
  LEFT JOIN leads l ON l.id = a.lead_id
  WHERE a.user_id = p_user_id
    AND (p_company_id IS NULL OR a.company_id = p_company_id)
  ORDER BY a.occurred_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. RPC: Update Daily Flow Targets
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.update_daily_flow_targets(
  p_user_id UUID,
  p_company_id TEXT DEFAULT 'default',
  p_daily_new_contacts INTEGER DEFAULT NULL,
  p_daily_followups INTEGER DEFAULT NULL,
  p_daily_reactivations INTEGER DEFAULT NULL,
  p_weekly_new_contacts INTEGER DEFAULT NULL,
  p_weekly_followups INTEGER DEFAULT NULL,
  p_weekly_reactivations INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  INSERT INTO user_daily_flow_targets (
    user_id, company_id,
    daily_new_contacts, daily_followups, daily_reactivations,
    weekly_new_contacts, weekly_followups, weekly_reactivations
  )
  VALUES (
    p_user_id, p_company_id,
    COALESCE(p_daily_new_contacts, 8),
    COALESCE(p_daily_followups, 6),
    COALESCE(p_daily_reactivations, 2),
    COALESCE(p_weekly_new_contacts, 40),
    COALESCE(p_weekly_followups, 30),
    COALESCE(p_weekly_reactivations, 10)
  )
  ON CONFLICT (user_id, company_id) DO UPDATE SET
    daily_new_contacts = COALESCE(p_daily_new_contacts, user_daily_flow_targets.daily_new_contacts),
    daily_followups = COALESCE(p_daily_followups, user_daily_flow_targets.daily_followups),
    daily_reactivations = COALESCE(p_daily_reactivations, user_daily_flow_targets.daily_reactivations),
    weekly_new_contacts = COALESCE(p_weekly_new_contacts, user_daily_flow_targets.weekly_new_contacts),
    weekly_followups = COALESCE(p_weekly_followups, user_daily_flow_targets.weekly_followups),
    weekly_reactivations = COALESCE(p_weekly_reactivations, user_daily_flow_targets.weekly_reactivations),
    updated_at = NOW();
  
  SELECT jsonb_build_object(
    'user_id', user_id,
    'company_id', company_id,
    'daily_new_contacts', daily_new_contacts,
    'daily_followups', daily_followups,
    'daily_reactivations', daily_reactivations,
    'weekly_new_contacts', weekly_new_contacts,
    'weekly_followups', weekly_followups,
    'weekly_reactivations', weekly_reactivations
  ) INTO v_result
  FROM user_daily_flow_targets
  WHERE user_id = p_user_id AND company_id = p_company_id;
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.update_daily_flow_targets IS 
  'Aktualisiert die Daily Flow Targets für einen User';

-- ═══════════════════════════════════════════════════════════════════════════
-- 11. TRIGGER: Auto-log on Lead Status Change
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.auto_log_lead_activity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activity_type activity_type;
  v_company_id TEXT;
BEGIN
  -- Bestimme Activity Type basierend auf Status-Änderung
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'contacted' THEN v_activity_type := 'new_contact';
      WHEN 'active' THEN v_activity_type := 'followup';
      WHEN 'won' THEN v_activity_type := 'close_won';
      WHEN 'lost' THEN v_activity_type := 'close_lost';
      ELSE v_activity_type := NULL;
    END CASE;
    
    IF v_activity_type IS NOT NULL THEN
      -- Default company_id verwenden
      v_company_id := 'default';
      
      INSERT INTO activity_logs (
        user_id, company_id,
        lead_id, activity_type,
        title, occurred_at
      )
      VALUES (
        NEW.user_id, v_company_id,
        NEW.id, v_activity_type,
        'Status: ' || NEW.status, NOW()
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger auf leads Tabelle (falls vorhanden)
DROP TRIGGER IF EXISTS trg_auto_log_lead_activity ON leads;
CREATE TRIGGER trg_auto_log_lead_activity
  AFTER UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION auto_log_lead_activity();

-- ═══════════════════════════════════════════════════════════════════════════
-- 12. RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_logs_select_own" ON activity_logs;
CREATE POLICY "activity_logs_select_own"
ON activity_logs FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "activity_logs_insert_own" ON activity_logs;
CREATE POLICY "activity_logs_insert_own"
ON activity_logs FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "activity_logs_update_own" ON activity_logs;
CREATE POLICY "activity_logs_update_own"
ON activity_logs FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "activity_logs_delete_own" ON activity_logs;
CREATE POLICY "activity_logs_delete_own"
ON activity_logs FOR DELETE
USING (user_id = auth.uid());

ALTER TABLE user_daily_flow_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "targets_select_own" ON user_daily_flow_targets;
CREATE POLICY "targets_select_own"
ON user_daily_flow_targets FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "targets_insert_own" ON user_daily_flow_targets;
CREATE POLICY "targets_insert_own"
ON user_daily_flow_targets FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "targets_update_own" ON user_daily_flow_targets;
CREATE POLICY "targets_update_own"
ON user_daily_flow_targets FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "targets_delete_own" ON user_daily_flow_targets;
CREATE POLICY "targets_delete_own"
ON user_daily_flow_targets FOR DELETE
USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════
-- 13. GRANTS
-- ═══════════════════════════════════════════════════════════════════════════

GRANT ALL ON activity_logs TO authenticated;
GRANT ALL ON user_daily_flow_targets TO authenticated;
GRANT EXECUTE ON FUNCTION log_activity TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_activity_counts TO authenticated;
GRANT EXECUTE ON FUNCTION get_weekly_activity_counts TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_flow_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_activities TO authenticated;
GRANT EXECUTE ON FUNCTION update_daily_flow_targets TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- SUCCESS MESSAGE
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔══════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ ACTIVITY TRACKING SYSTEM INSTALLED SUCCESSFULLY!        ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Created Tables:';
  RAISE NOTICE '   • activity_logs (Activity Tracking)';
  RAISE NOTICE '   • user_daily_flow_targets (Ziele pro User)';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Created Functions:';
  RAISE NOTICE '   • log_activity() - Aktivität loggen';
  RAISE NOTICE '   • get_daily_activity_counts() - Tages-Statistiken';
  RAISE NOTICE '   • get_weekly_activity_counts() - Wochen-Statistiken';
  RAISE NOTICE '   • get_daily_flow_status() - Kompletter Status';
  RAISE NOTICE '   • get_recent_activities() - Letzte Aktivitäten';
  RAISE NOTICE '   • update_daily_flow_targets() - Ziele aktualisieren';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 RLS enabled - users can only access their own data';
  RAISE NOTICE '';
END $$;


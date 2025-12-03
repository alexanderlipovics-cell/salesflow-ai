-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  SALES FLOW AI - AUTO-REMINDER SYSTEM v2.0                                 ║
-- ║  Automatische Follow-up Erzeugung für Mobile App                           ║
-- ╚════════════════════════════════════════════════════════════════════════════╝
--
-- 🎯 ZIEL: Automatisch Follow-up Tasks erstellen wenn:
--    1. Lead hat Status `proposal_sent` + keine Antwort seit 3+ Tagen
--    2. Lead hat hohe Priorität + kein Kontakt seit 5+ Tagen
--    3. Lead wurde lange nicht kontaktiert (7+ Tage)
--
-- 📋 FEATURES:
--    - Konfigurierbare Reminder-Regeln
--    - Intelligente Duplikat-Vermeidung
--    - Automatische Prioritäts-Berechnung
--    - Trigger bei Lead-Änderungen
--    - Scheduled Job für regelmäßige Checks
--
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. REMINDER RULES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.reminder_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Rule Definition
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'proposal_no_reply',    -- Angebot ohne Antwort
    'high_priority_cold',   -- Wichtiger Lead wird kalt
    'general_inactivity',   -- Allgemeine Inaktivität
    'meeting_followup',     -- Nach Meeting Follow-up
    'nurture_check'         -- Nurture-Lead Check-in
  )),
  
  -- Conditions
  lead_status TEXT,                        -- Optional: Nur für bestimmten Status
  lead_priority TEXT,                      -- Optional: Nur für bestimmte Priorität
  days_threshold INTEGER NOT NULL DEFAULT 3, -- Tage bis Trigger
  
  -- Generated Task
  task_priority TEXT NOT NULL DEFAULT 'high' CHECK (task_priority IN ('low', 'medium', 'high', 'urgent')),
  task_action TEXT NOT NULL DEFAULT 'follow_up',
  task_title_template TEXT NOT NULL,
  task_description_template TEXT,
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.reminder_rules IS 'Definiert Regeln für automatische Follow-up Erstellung';

-- ============================================================================
-- 2. AUTO REMINDER LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.auto_reminder_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES public.reminder_rules(id) ON DELETE SET NULL,
  task_id UUID REFERENCES public.follow_up_tasks(id) ON DELETE SET NULL,
  
  -- Trigger Info
  trigger_type TEXT NOT NULL,
  trigger_reason TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN (
    'created', 'completed', 'dismissed', 'superseded'
  )),
  
  -- Timestamps
  triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

COMMENT ON TABLE public.auto_reminder_log IS 'Loggt alle automatisch erstellten Reminders';

-- ============================================================================
-- 3. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_reminder_rules_active 
  ON public.reminder_rules(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_reminder_rules_trigger 
  ON public.reminder_rules(trigger_type);

CREATE INDEX IF NOT EXISTS idx_auto_reminder_log_lead 
  ON public.auto_reminder_log(lead_id);

CREATE INDEX IF NOT EXISTS idx_auto_reminder_log_status 
  ON public.auto_reminder_log(status);

CREATE INDEX IF NOT EXISTS idx_auto_reminder_log_trigger 
  ON public.auto_reminder_log(trigger_type, triggered_at);

-- ============================================================================
-- 4. FUNCTION: check_lead_needs_reminder
-- Prüft ob ein Lead einen automatischen Reminder braucht
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_lead_needs_reminder(p_lead_id UUID)
RETURNS TABLE (
  needs_reminder BOOLEAN,
  trigger_type TEXT,
  rule_id UUID,
  days_inactive INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead RECORD;
  v_rule RECORD;
  v_days_since_contact INTEGER;
  v_existing_reminder INTEGER;
BEGIN
  -- Lead-Daten holen
  SELECT 
    l.*,
    COALESCE(
      EXTRACT(DAY FROM NOW() - l.last_contact)::INTEGER,
      EXTRACT(DAY FROM NOW() - l.updated_at)::INTEGER,
      999
    ) AS days_inactive
  INTO v_lead
  FROM leads l
  WHERE l.id = p_lead_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::TEXT, NULL::UUID, 0;
    RETURN;
  END IF;
  
  v_days_since_contact := v_lead.days_inactive;
  
  -- Prüfe jede aktive Regel
  FOR v_rule IN 
    SELECT * FROM reminder_rules 
    WHERE is_active = true 
    ORDER BY 
      CASE task_priority 
        WHEN 'urgent' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        ELSE 4 
      END
  LOOP
    -- Prüfe ob bereits ein aktiver Reminder existiert
    SELECT COUNT(*) INTO v_existing_reminder
    FROM auto_reminder_log arl
    WHERE arl.lead_id = p_lead_id
      AND arl.trigger_type = v_rule.trigger_type
      AND arl.status = 'created'
      AND arl.triggered_at > NOW() - INTERVAL '7 days';
    
    IF v_existing_reminder > 0 THEN
      CONTINUE; -- Skip diese Regel
    END IF;
    
    -- REGEL 1: Proposal ohne Antwort
    IF v_rule.trigger_type = 'proposal_no_reply' THEN
      IF v_lead.status = 'proposal_sent' 
         AND v_days_since_contact >= v_rule.days_threshold 
      THEN
        RETURN QUERY SELECT true, v_rule.trigger_type, v_rule.id, v_days_since_contact;
        RETURN;
      END IF;
    
    -- REGEL 2: High Priority wird kalt
    ELSIF v_rule.trigger_type = 'high_priority_cold' THEN
      IF v_lead.priority IN ('high', 'urgent')
         AND v_lead.status NOT IN ('won', 'lost', 'nurture')
         AND v_days_since_contact >= v_rule.days_threshold
      THEN
        RETURN QUERY SELECT true, v_rule.trigger_type, v_rule.id, v_days_since_contact;
        RETURN;
      END IF;
    
    -- REGEL 3: Allgemeine Inaktivität
    ELSIF v_rule.trigger_type = 'general_inactivity' THEN
      IF v_lead.status NOT IN ('won', 'lost')
         AND v_days_since_contact >= v_rule.days_threshold
      THEN
        RETURN QUERY SELECT true, v_rule.trigger_type, v_rule.id, v_days_since_contact;
        RETURN;
      END IF;
    
    -- REGEL 4: Nurture Check-in
    ELSIF v_rule.trigger_type = 'nurture_check' THEN
      IF v_lead.status = 'nurture'
         AND v_days_since_contact >= v_rule.days_threshold
      THEN
        RETURN QUERY SELECT true, v_rule.trigger_type, v_rule.id, v_days_since_contact;
        RETURN;
      END IF;
    END IF;
  END LOOP;
  
  -- Kein Reminder nötig
  RETURN QUERY SELECT false, NULL::TEXT, NULL::UUID, v_days_since_contact;
END;
$$;

COMMENT ON FUNCTION public.check_lead_needs_reminder IS 'Prüft ob ein Lead einen automatischen Reminder braucht';

-- ============================================================================
-- 5. FUNCTION: create_auto_reminder
-- Erstellt automatisch einen Follow-up Task
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_auto_reminder(
  p_lead_id UUID,
  p_rule_id UUID,
  p_trigger_type TEXT,
  p_days_inactive INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead RECORD;
  v_rule RECORD;
  v_task_id UUID;
  v_log_id UUID;
  v_task_title TEXT;
  v_task_description TEXT;
BEGIN
  -- Lead-Daten holen
  SELECT * INTO v_lead FROM leads WHERE id = p_lead_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead nicht gefunden: %', p_lead_id;
  END IF;
  
  -- Regel-Daten holen
  SELECT * INTO v_rule FROM reminder_rules WHERE id = p_rule_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Regel nicht gefunden: %', p_rule_id;
  END IF;
  
  -- Title und Description generieren
  v_task_title := v_rule.task_title_template;
  v_task_title := REPLACE(v_task_title, '{lead_name}', COALESCE(v_lead.name, 'Lead'));
  v_task_title := REPLACE(v_task_title, '{days}', p_days_inactive::TEXT);
  v_task_title := REPLACE(v_task_title, '{status}', COALESCE(v_lead.status, 'unbekannt'));
  
  v_task_description := COALESCE(v_rule.task_description_template, '');
  v_task_description := REPLACE(v_task_description, '{lead_name}', COALESCE(v_lead.name, 'Lead'));
  v_task_description := REPLACE(v_task_description, '{company}', COALESCE(v_lead.company, ''));
  v_task_description := REPLACE(v_task_description, '{days}', p_days_inactive::TEXT);
  
  -- Follow-up Task erstellen
  INSERT INTO follow_up_tasks (
    user_id,
    lead_id,
    lead_name,
    action,
    description,
    due_date,
    priority,
    completed
  ) VALUES (
    v_lead.user_id,
    p_lead_id,
    v_lead.name,
    v_rule.task_action,
    v_task_title || CASE WHEN v_task_description != '' THEN E'\n' || v_task_description ELSE '' END,
    CURRENT_DATE + 1, -- Morgen fällig
    v_rule.task_priority,
    false
  )
  RETURNING id INTO v_task_id;
  
  -- Log-Eintrag erstellen
  INSERT INTO auto_reminder_log (
    lead_id,
    rule_id,
    task_id,
    trigger_type,
    trigger_reason,
    metadata
  ) VALUES (
    p_lead_id,
    p_rule_id,
    v_task_id,
    p_trigger_type,
    'Auto-created after ' || p_days_inactive || ' days inactivity',
    jsonb_build_object(
      'days_inactive', p_days_inactive,
      'lead_status', v_lead.status,
      'lead_priority', v_lead.priority,
      'rule_name', v_rule.name
    )
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_task_id;
END;
$$;

COMMENT ON FUNCTION public.create_auto_reminder IS 'Erstellt automatisch einen Follow-up Task basierend auf einer Regel';

-- ============================================================================
-- 6. FUNCTION: process_all_leads_for_reminders
-- Batch-Verarbeitung aller Leads (für Scheduled Jobs)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.process_all_leads_for_reminders()
RETURNS TABLE (
  processed_count INTEGER,
  reminders_created INTEGER,
  created_tasks UUID[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead RECORD;
  v_check RECORD;
  v_processed INTEGER := 0;
  v_created INTEGER := 0;
  v_task_id UUID;
  v_tasks UUID[] := ARRAY[]::UUID[];
BEGIN
  -- Alle aktiven Leads durchgehen
  FOR v_lead IN 
    SELECT id FROM leads 
    WHERE status NOT IN ('won', 'lost')
  LOOP
    v_processed := v_processed + 1;
    
    -- Prüfen ob Reminder nötig
    SELECT * INTO v_check FROM check_lead_needs_reminder(v_lead.id);
    
    IF v_check.needs_reminder THEN
      -- Reminder erstellen
      v_task_id := create_auto_reminder(
        v_lead.id,
        v_check.rule_id,
        v_check.trigger_type,
        v_check.days_inactive
      );
      
      v_created := v_created + 1;
      v_tasks := array_append(v_tasks, v_task_id);
    END IF;
  END LOOP;
  
  RETURN QUERY SELECT v_processed, v_created, v_tasks;
END;
$$;

COMMENT ON FUNCTION public.process_all_leads_for_reminders IS 'Verarbeitet alle Leads und erstellt automatische Reminders';

-- ============================================================================
-- 7. TRIGGER: Auto-check bei Lead-Änderungen
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_check_lead_reminder()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_check RECORD;
  v_task_id UUID;
BEGIN
  -- Nur bei relevanten Änderungen prüfen
  IF TG_OP = 'INSERT' OR (
    TG_OP = 'UPDATE' AND (
      OLD.status IS DISTINCT FROM NEW.status OR
      OLD.priority IS DISTINCT FROM NEW.priority OR
      OLD.last_contact IS DISTINCT FROM NEW.last_contact
    )
  ) THEN
    -- Reminder-Check
    SELECT * INTO v_check FROM check_lead_needs_reminder(NEW.id);
    
    IF v_check.needs_reminder THEN
      -- Reminder erstellen
      v_task_id := create_auto_reminder(
        NEW.id,
        v_check.rule_id,
        v_check.trigger_type,
        v_check.days_inactive
      );
      
      RAISE NOTICE 'Auto-Reminder erstellt: Task % für Lead %', v_task_id, NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger erstellen
DROP TRIGGER IF EXISTS trigger_lead_reminder_check ON public.leads;

CREATE TRIGGER trigger_lead_reminder_check
  AFTER INSERT OR UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_check_lead_reminder();

COMMENT ON TRIGGER trigger_lead_reminder_check ON public.leads IS 'Prüft automatisch ob Reminders erstellt werden sollen';

-- ============================================================================
-- 8. DEFAULT REMINDER RULES
-- ============================================================================

INSERT INTO public.reminder_rules (
  name, 
  trigger_type, 
  lead_status, 
  days_threshold, 
  task_priority, 
  task_action,
  task_title_template, 
  task_description_template
) VALUES 
  -- Regel 1: Proposal ohne Antwort (3 Tage)
  (
    'Angebot ohne Antwort',
    'proposal_no_reply',
    'proposal_sent',
    3,
    'high',
    'call',
    '📋 Nachfassen: {lead_name} - Keine Antwort seit {days} Tagen',
    'Das Angebot wurde vor {days} Tagen gesendet. Zeit für einen freundlichen Reminder-Anruf.'
  ),
  
  -- Regel 2: High Priority wird kalt (5 Tage)
  (
    'Wichtiger Lead wird kalt',
    'high_priority_cold',
    NULL,
    5,
    'urgent',
    'call',
    '🔥 DRINGEND: {lead_name} braucht Aufmerksamkeit!',
    'High-Priority Lead seit {days} Tagen ohne Kontakt. Sofort handeln!'
  ),
  
  -- Regel 3: Allgemeine Inaktivität (7 Tage)
  (
    'Lead-Inaktivität',
    'general_inactivity',
    NULL,
    7,
    'medium',
    'message',
    '💬 Check-in: {lead_name} melden',
    'Kein Kontakt seit {days} Tagen. Zeit für einen kurzen Check-in.'
  ),
  
  -- Regel 4: Nurture Check-in (14 Tage)
  (
    'Nurture Lead Check-in',
    'nurture_check',
    'nurture',
    14,
    'low',
    'email',
    '🌱 Nurture: {lead_name} kontaktieren',
    'Nurture-Lead seit {days} Tagen nicht kontaktiert. Value-Content senden.'
  )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 9. RLS POLICIES
-- ============================================================================

ALTER TABLE public.reminder_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_reminder_log ENABLE ROW LEVEL SECURITY;

-- Reminder Rules: Alle können lesen, nur Admins schreiben
DROP POLICY IF EXISTS "reminder_rules_read_all" ON public.reminder_rules;
CREATE POLICY "reminder_rules_read_all" ON public.reminder_rules
  FOR SELECT
  USING (is_active = true);

-- Auto Reminder Log: User sieht nur eigene
DROP POLICY IF EXISTS "auto_reminder_log_own" ON public.auto_reminder_log;
CREATE POLICY "auto_reminder_log_own" ON public.auto_reminder_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM leads l
      WHERE l.id = auto_reminder_log.lead_id
        AND l.user_id = auth.uid()
    )
  );

-- ============================================================================
-- 10. HELPER VIEWS
-- ============================================================================

-- View: Pending Auto-Reminders
CREATE OR REPLACE VIEW public.v_pending_auto_reminders AS
SELECT 
  arl.id AS log_id,
  arl.lead_id,
  l.name AS lead_name,
  l.status AS lead_status,
  l.priority AS lead_priority,
  arl.task_id,
  ft.description AS task_description,
  ft.due_date AS task_due_date,
  arl.trigger_type,
  arl.trigger_reason,
  arl.triggered_at,
  rr.name AS rule_name
FROM auto_reminder_log arl
JOIN leads l ON l.id = arl.lead_id
JOIN reminder_rules rr ON rr.id = arl.rule_id
LEFT JOIN follow_up_tasks ft ON ft.id = arl.task_id
WHERE arl.status = 'created'
ORDER BY arl.triggered_at DESC;

COMMENT ON VIEW public.v_pending_auto_reminders IS 'Zeigt alle offenen automatischen Reminders';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔══════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ AUTO-REMINDER SYSTEM v2.0 DEPLOYED SUCCESSFULLY!        ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Erstellt:';
  RAISE NOTICE '   • 2 Tables: reminder_rules, auto_reminder_log';
  RAISE NOTICE '   • 4 Functions: check, create, process_all, trigger';
  RAISE NOTICE '   • 1 Trigger: Automatische Prüfung bei Lead-Änderungen';
  RAISE NOTICE '   • 4 Default-Regeln für typische Szenarien';
  RAISE NOTICE '   • 1 View: v_pending_auto_reminders';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Standard-Regeln:';
  RAISE NOTICE '   1. Proposal ohne Antwort → 3 Tage → High Priority Call';
  RAISE NOTICE '   2. High-Priority Lead kalt → 5 Tage → Urgent Call';
  RAISE NOTICE '   3. Allgemeine Inaktivität → 7 Tage → Medium Message';
  RAISE NOTICE '   4. Nurture Check-in → 14 Tage → Low Email';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Das System ist jetzt aktiv!';
  RAISE NOTICE '';
  RAISE NOTICE '📌 Nützliche Befehle:';
  RAISE NOTICE '   • Alle Leads prüfen: SELECT * FROM process_all_leads_for_reminders();';
  RAISE NOTICE '   • Offene Reminders: SELECT * FROM v_pending_auto_reminders;';
  RAISE NOTICE '   • Regeln anzeigen: SELECT * FROM reminder_rules WHERE is_active;';
  RAISE NOTICE '';
END $$;


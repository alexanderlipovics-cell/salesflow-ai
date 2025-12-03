-- ============================================================================
-- MIGRATION 021: CHAT IMPORT DEAL STATES & PENDING ACTIONS
-- Erweiterte Lead-Verwaltung mit Deal-Tracking und Pending Actions
-- ============================================================================

-- ===================
-- DEAL STATE ENUM
-- ===================

DO $$ BEGIN
  CREATE TYPE deal_state AS ENUM (
    'none',              -- Noch kein Deal-Thema
    'considering',       -- Überlegt
    'pending_payment',   -- Zahlung zugesagt, noch nicht eingegangen
    'paid',              -- Bezahlt
    'on_hold',           -- Verschoben
    'cancelled'          -- Storniert
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE pending_action_type AS ENUM (
    'follow_up',         -- Allgemeines Follow-up
    'check_payment',     -- Zahlung prüfen
    'call',              -- Telefonat
    'send_info',         -- Infos senden
    'reactivation',      -- Reaktivierung
    'close',             -- Abschluss versuchen
    'wait_for_lead'      -- Warten auf Lead-Reaktion
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE action_status AS ENUM (
    'pending',           -- Offen
    'completed',         -- Erledigt
    'skipped',           -- Übersprungen
    'snoozed'            -- Verschoben
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===================
-- ERWEITERE LEADS TABELLE
-- ===================

-- Füge neue Spalten zu leads hinzu
ALTER TABLE leads 
  ADD COLUMN IF NOT EXISTS deal_state deal_state DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS deal_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS payment_expected_date DATE,
  ADD COLUMN IF NOT EXISTS payment_received_date DATE,
  ADD COLUMN IF NOT EXISTS import_source TEXT,
  ADD COLUMN IF NOT EXISTS import_reference TEXT,
  ADD COLUMN IF NOT EXISTS conversation_summary TEXT,
  ADD COLUMN IF NOT EXISTS last_contact_summary TEXT,
  ADD COLUMN IF NOT EXISTS last_contact_direction TEXT CHECK (last_contact_direction IN ('inbound', 'outbound'));

COMMENT ON COLUMN leads.deal_state IS 
  'Aktueller Deal-Status: none, considering, pending_payment, paid, on_hold, cancelled';
COMMENT ON COLUMN leads.deal_amount IS 
  'Erwarteter oder tatsächlicher Deal-Betrag';
COMMENT ON COLUMN leads.conversation_summary IS 
  'KI-generierte Zusammenfassung der gesamten Konversation';

-- ===================
-- CHAT IMPORTS TABELLE
-- ===================

CREATE TABLE IF NOT EXISTS chat_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Input
  raw_text TEXT NOT NULL,
  detected_channel TEXT,
  
  -- AI Analysis
  ai_analysis JSONB,
  confidence_score NUMERIC(3,2),
  
  -- Ergebnis
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  action_taken TEXT CHECK (action_taken IN ('lead_created', 'lead_updated', 'discarded')),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE chat_imports IS 
  'Log aller Chat-Imports mit KI-Analyse-Ergebnissen';

-- Index für schnelle Suche
CREATE INDEX IF NOT EXISTS idx_chat_imports_user ON chat_imports(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_imports_lead ON chat_imports(lead_id);

-- ===================
-- LEAD PENDING ACTIONS
-- ===================

CREATE TABLE IF NOT EXISTS lead_pending_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  action_type pending_action_type NOT NULL,
  action_reason TEXT,         -- "Zahlung zugesagt am X"
  
  due_date DATE NOT NULL,
  due_time TIME,
  
  -- Vorgeschlagener Text
  suggested_message TEXT,
  
  -- Status
  status action_status DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  snoozed_until DATE,
  
  -- Priorität (1 = höchste)
  priority INTEGER DEFAULT 2 CHECK (priority BETWEEN 1 AND 5),
  
  -- Notizen
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE lead_pending_actions IS 
  'Ausstehende Aktionen für Leads (Follow-ups, Zahlungsprüfungen, etc.)';

-- Wichtige Indexes
CREATE INDEX IF NOT EXISTS idx_pending_actions_user_due ON lead_pending_actions(user_id, due_date, status)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_pending_actions_lead ON lead_pending_actions(lead_id);
CREATE INDEX IF NOT EXISTS idx_pending_actions_type ON lead_pending_actions(action_type) WHERE status = 'pending';

-- ===================
-- VIEWS
-- ===================

-- View für Today's Actions (für Daily Flow)
CREATE OR REPLACE VIEW today_pending_actions AS
SELECT 
  pa.*,
  l.first_name as lead_first_name,
  l.last_name as lead_last_name,
  COALESCE(l.first_name, '') || ' ' || COALESCE(l.last_name, '') as lead_name,
  l.social_handle as lead_handle,
  l.channel as lead_channel,
  l.status as lead_status,
  l.temperature as lead_temperature,
  l.deal_state as lead_deal_state,
  l.deal_amount as lead_deal_amount
FROM lead_pending_actions pa
JOIN leads l ON pa.lead_id = l.id
WHERE pa.status = 'pending'
  AND pa.due_date <= CURRENT_DATE;

-- View für Payment Checks
CREATE OR REPLACE VIEW pending_payment_leads AS
SELECT 
  l.*,
  COALESCE(l.first_name, '') || ' ' || COALESCE(l.last_name, '') as full_name,
  pa.due_date as check_due_date,
  pa.suggested_message,
  pa.action_reason,
  CURRENT_DATE - l.payment_expected_date as days_overdue
FROM leads l
LEFT JOIN lead_pending_actions pa ON l.id = pa.lead_id 
  AND pa.action_type = 'check_payment' 
  AND pa.status = 'pending'
WHERE l.deal_state = 'pending_payment';

-- ===================
-- FUNCTIONS
-- ===================

-- Get pending actions for user with lead details
CREATE OR REPLACE FUNCTION get_pending_actions_with_leads(
  p_user_id UUID,
  p_due_date DATE DEFAULT CURRENT_DATE,
  p_action_type pending_action_type DEFAULT NULL,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  lead_id UUID,
  action_type pending_action_type,
  action_reason TEXT,
  due_date DATE,
  due_time TIME,
  suggested_message TEXT,
  priority INTEGER,
  lead_name TEXT,
  lead_handle TEXT,
  lead_channel TEXT,
  lead_status TEXT,
  lead_deal_state deal_state,
  lead_deal_amount NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pa.id,
    pa.lead_id,
    pa.action_type,
    pa.action_reason,
    pa.due_date,
    pa.due_time,
    pa.suggested_message,
    pa.priority,
    COALESCE(l.first_name, '') || ' ' || COALESCE(l.last_name, '') as lead_name,
    l.social_handle as lead_handle,
    l.channel as lead_channel,
    l.status as lead_status,
    l.deal_state as lead_deal_state,
    l.deal_amount as lead_deal_amount
  FROM lead_pending_actions pa
  JOIN leads l ON pa.lead_id = l.id
  WHERE pa.user_id = p_user_id
    AND pa.status = 'pending'
    AND pa.due_date <= p_due_date
    AND (p_action_type IS NULL OR pa.action_type = p_action_type)
  ORDER BY pa.priority ASC, pa.due_date ASC, pa.created_at ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create pending action from chat import
CREATE OR REPLACE FUNCTION create_pending_action(
  p_lead_id UUID,
  p_user_id UUID,
  p_action_type pending_action_type,
  p_due_date DATE,
  p_action_reason TEXT DEFAULT NULL,
  p_suggested_message TEXT DEFAULT NULL,
  p_priority INTEGER DEFAULT 2
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO lead_pending_actions (
    lead_id, user_id, action_type, due_date,
    action_reason, suggested_message, priority
  ) VALUES (
    p_lead_id, p_user_id, p_action_type, p_due_date,
    p_action_reason, p_suggested_message, p_priority
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Complete pending action
CREATE OR REPLACE FUNCTION complete_pending_action(
  p_action_id UUID,
  p_user_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE lead_pending_actions
  SET 
    status = 'completed',
    completed_at = NOW(),
    notes = COALESCE(p_notes, notes),
    updated_at = NOW()
  WHERE id = p_action_id 
    AND user_id = p_user_id
    AND status = 'pending';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Snooze pending action
CREATE OR REPLACE FUNCTION snooze_pending_action(
  p_action_id UUID,
  p_user_id UUID,
  p_snooze_until DATE
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE lead_pending_actions
  SET 
    status = 'snoozed',
    snoozed_until = p_snooze_until,
    due_date = p_snooze_until,
    updated_at = NOW()
  WHERE id = p_action_id 
    AND user_id = p_user_id;
  
  -- Reaktiviere Status wenn Snooze-Datum erreicht
  UPDATE lead_pending_actions
  SET status = 'pending'
  WHERE id = p_action_id 
    AND snoozed_until <= CURRENT_DATE;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get daily action summary
CREATE OR REPLACE FUNCTION get_daily_action_summary(
  p_user_id UUID,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'date', p_date,
    'total_pending', COUNT(*) FILTER (WHERE status = 'pending' AND due_date <= p_date),
    'overdue', COUNT(*) FILTER (WHERE status = 'pending' AND due_date < p_date),
    'by_type', jsonb_object_agg(
      action_type::TEXT, 
      count_per_type
    ),
    'payment_checks', COUNT(*) FILTER (WHERE action_type = 'check_payment' AND status = 'pending'),
    'follow_ups', COUNT(*) FILTER (WHERE action_type = 'follow_up' AND status = 'pending'),
    'high_priority', COUNT(*) FILTER (WHERE priority = 1 AND status = 'pending')
  )
  INTO v_result
  FROM (
    SELECT 
      action_type,
      status,
      due_date,
      priority,
      COUNT(*) as count_per_type
    FROM lead_pending_actions
    WHERE user_id = p_user_id
    GROUP BY action_type, status, due_date, priority
  ) sub;
  
  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================
-- RLS POLICIES
-- ===================

ALTER TABLE chat_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_pending_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own chat imports" ON chat_imports;
CREATE POLICY "Users manage own chat imports" ON chat_imports
  FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own pending actions" ON lead_pending_actions;
CREATE POLICY "Users manage own pending actions" ON lead_pending_actions
  FOR ALL USING (user_id = auth.uid());

-- ===================
-- GRANTS
-- ===================

GRANT ALL ON chat_imports TO authenticated;
GRANT ALL ON lead_pending_actions TO authenticated;
GRANT SELECT ON today_pending_actions TO authenticated;
GRANT SELECT ON pending_payment_leads TO authenticated;

GRANT EXECUTE ON FUNCTION get_pending_actions_with_leads TO authenticated;
GRANT EXECUTE ON FUNCTION create_pending_action TO authenticated;
GRANT EXECUTE ON FUNCTION complete_pending_action TO authenticated;
GRANT EXECUTE ON FUNCTION snooze_pending_action TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_action_summary TO authenticated;

-- ===================
-- TRIGGERS
-- ===================

-- Update timestamp trigger
DROP TRIGGER IF EXISTS trigger_pending_actions_updated ON lead_pending_actions;
CREATE TRIGGER trigger_pending_actions_updated
  BEFORE UPDATE ON lead_pending_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_finance_ext_updated_at();

-- Reaktiviere gesnoozete Actions automatisch
CREATE OR REPLACE FUNCTION reactivate_snoozed_actions()
RETURNS TRIGGER AS $$
BEGIN
  -- Diese Funktion wird täglich per Cron aufgerufen
  UPDATE lead_pending_actions
  SET status = 'pending'
  WHERE status = 'snoozed'
    AND snoozed_until <= CURRENT_DATE;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ===================
-- MIGRATION COMPLETE
-- ===================

SELECT 'Migration 021_chat_import_deal_states.sql erfolgreich ausgeführt' AS status;


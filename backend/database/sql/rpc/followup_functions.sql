-- ╔════════════════════════════════════════════════════════════════╗
-- ║  RPC FUNCTIONS - FOLLOW-UP SYSTEM                              ║
-- ╚════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════
-- 1. RENDER TEMPLATE WITH CONTEXT
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION render_template(
  p_template_text TEXT,
  p_context JSONB
)
RETURNS TEXT
AS $$
DECLARE
  v_result TEXT;
  v_key TEXT;
  v_value TEXT;
BEGIN
  v_result := p_template_text;
  
  -- Replace all {{key}} placeholders with values from context
  FOR v_key, v_value IN SELECT * FROM jsonb_each_text(p_context) LOOP
    v_result := REPLACE(v_result, '{{' || v_key || '}}', COALESCE(v_value, ''));
  END LOOP;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION render_template IS 'Renders a template string by replacing {{key}} placeholders with values from JSONB context';

-- ═══════════════════════════════════════════════════════════════
-- 2. GET LEADS NEEDING FOLLOW-UP
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_leads_needing_followup(
  p_days_threshold INTEGER DEFAULT 3,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  lead_id UUID,
  lead_name TEXT,
  lead_email TEXT,
  lead_phone TEXT,
  user_id UUID,
  last_followup TIMESTAMPTZ,
  days_since_last_contact INTEGER,
  bant_score INTEGER,
  status TEXT,
  preferred_channel TEXT,
  recommended_playbook TEXT,
  personality_type TEXT,
  context_summary TEXT
)
AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id AS lead_id,
    l.name AS lead_name,
    l.email AS lead_email,
    l.phone AS lead_phone,
    l.user_id,
    MAX(f.sent_at) AS last_followup,
    EXTRACT(DAY FROM NOW() - COALESCE(MAX(f.sent_at), l.last_contact, l.created_at))::INTEGER AS days_since_last_contact,
    l.bant_score,
    l.status,
    l.preferred_channel,
    CASE
      WHEN l.status = 'proposal_sent' AND EXTRACT(DAY FROM NOW() - COALESCE(MAX(f.sent_at), l.last_contact)) >= 3 THEN 'proposal_no_response'
      WHEN l.promised_action_date IS NOT NULL AND l.promised_action_date < CURRENT_DATE THEN 'callback_missed'
      WHEN EXTRACT(DAY FROM NOW() - COALESCE(MAX(f.sent_at), l.last_contact)) >= 14 AND l.bant_score >= 75 THEN 'inactivity_14d'
      WHEN EXTRACT(DAY FROM NOW() - COALESCE(MAX(f.sent_at), l.last_contact)) >= 30 THEN 'nurture_30d'
      WHEN l.status = 'meeting_scheduled' AND EXTRACT(DAY FROM NOW() - COALESCE(MAX(f.sent_at), l.last_contact)) >= 4 THEN 'ghosted_after_meeting'
      ELSE NULL
    END AS recommended_playbook,
    l.personality_type,
    l.context_summary
  FROM leads l
  LEFT JOIN follow_ups f ON f.lead_id = l.id
  WHERE l.status NOT IN ('won', 'lost')
    AND (p_user_id IS NULL OR l.user_id = p_user_id)
  GROUP BY l.id, l.name, l.email, l.phone, l.user_id, l.bant_score, l.status, l.preferred_channel, l.last_contact, l.created_at, l.promised_action_date, l.personality_type, l.context_summary
  HAVING
    MAX(f.sent_at) IS NULL
    OR EXTRACT(DAY FROM NOW() - MAX(f.sent_at)) >= p_days_threshold
  ORDER BY l.bant_score DESC, days_since_last_contact DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_leads_needing_followup IS 'Returns leads that need follow-up with recommended playbook';

-- ═══════════════════════════════════════════════════════════════
-- 3. GET TEMPLATE BY TRIGGER
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_template_by_trigger(
  p_trigger_key TEXT,
  p_channel TEXT DEFAULT 'email'
)
RETURNS TABLE (
  template_id UUID,
  name TEXT,
  trigger_key TEXT,
  channel TEXT,
  body_template TEXT,
  reminder_template TEXT,
  fallback_template TEXT,
  subject_template TEXT,
  preview_context JSONB
)
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ft.id AS template_id,
    ft.name,
    ft.trigger_key,
    ft.channel,
    ft.body_template,
    ft.reminder_template,
    ft.fallback_template,
    ft.subject_template,
    ft.preview_context
  FROM followup_templates ft
  WHERE ft.trigger_key = p_trigger_key
    AND ft.channel = p_channel
    AND ft.is_active = TRUE
  LIMIT 1;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_template_by_trigger IS 'Gets active template by trigger key and channel';

-- ═══════════════════════════════════════════════════════════════
-- 4. LOG FOLLOW-UP
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION log_followup(
  p_lead_id UUID,
  p_user_id UUID,
  p_channel TEXT,
  p_message TEXT,
  p_subject TEXT DEFAULT NULL,
  p_playbook_id TEXT DEFAULT NULL,
  p_gpt_generated BOOLEAN DEFAULT FALSE
)
RETURNS UUID
AS $$
DECLARE
  v_followup_id UUID;
BEGIN
  INSERT INTO follow_ups (
    lead_id,
    user_id,
    channel,
    message,
    subject,
    playbook_id,
    gpt_generated,
    status,
    sent_at
  ) VALUES (
    p_lead_id,
    p_user_id,
    p_channel,
    p_message,
    p_subject,
    p_playbook_id,
    p_gpt_generated,
    'sent',
    NOW()
  )
  RETURNING id INTO v_followup_id;
  
  -- Also log to message_tracking
  INSERT INTO message_tracking (
    follow_up_id,
    lead_id,
    user_id,
    channel,
    message_type,
    gpt_generated,
    sent_at
  ) VALUES (
    v_followup_id,
    p_lead_id,
    p_user_id,
    p_channel,
    'followup',
    p_gpt_generated,
    NOW()
  );
  
  -- Update lead's last_contact
  UPDATE leads
  SET last_contact = NOW(),
      updated_at = NOW()
  WHERE id = p_lead_id;
  
  RETURN v_followup_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_followup IS 'Logs a follow-up message and updates tracking';

-- ═══════════════════════════════════════════════════════════════
-- 5. GET FOLLOW-UP ANALYTICS
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_followup_analytics(
  p_user_id UUID DEFAULT NULL,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_sent INTEGER,
  total_delivered INTEGER,
  total_opened INTEGER,
  total_responded INTEGER,
  delivery_rate DECIMAL,
  open_rate DECIMAL,
  response_rate DECIMAL,
  avg_response_hours DECIMAL,
  gpt_generated_count INTEGER,
  human_generated_count INTEGER
)
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER AS total_sent,
    COUNT(CASE WHEN mt.delivered_at IS NOT NULL THEN 1 END)::INTEGER AS total_delivered,
    COUNT(CASE WHEN mt.opened_at IS NOT NULL THEN 1 END)::INTEGER AS total_opened,
    COUNT(CASE WHEN mt.responded_at IS NOT NULL THEN 1 END)::INTEGER AS total_responded,
    ROUND(
      100.0 * COUNT(CASE WHEN mt.delivered_at IS NOT NULL THEN 1 END) / NULLIF(COUNT(*), 0),
      2
    ) AS delivery_rate,
    ROUND(
      100.0 * COUNT(CASE WHEN mt.opened_at IS NOT NULL THEN 1 END) / NULLIF(COUNT(*), 0),
      2
    ) AS open_rate,
    ROUND(
      100.0 * COUNT(CASE WHEN mt.responded_at IS NOT NULL THEN 1 END) / NULLIF(COUNT(*), 0),
      2
    ) AS response_rate,
    ROUND(AVG(mt.response_time_hours), 2) AS avg_response_hours,
    COUNT(CASE WHEN mt.gpt_generated = TRUE THEN 1 END)::INTEGER AS gpt_generated_count,
    COUNT(CASE WHEN mt.gpt_generated = FALSE THEN 1 END)::INTEGER AS human_generated_count
  FROM message_tracking mt
  WHERE (p_user_id IS NULL OR mt.user_id = p_user_id)
    AND mt.sent_at >= NOW() - (p_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_followup_analytics IS 'Returns follow-up analytics for user over specified days';

-- ═══════════════════════════════════════════════════════════════
-- 6. SELECT BEST CHANNEL FOR LEAD
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION select_best_channel_for_lead(
  p_lead_id UUID
)
RETURNS TEXT
AS $$
DECLARE
  v_preferred_channel TEXT;
  v_last_active_channel TEXT;
  v_best_performing_channel TEXT;
BEGIN
  -- Get lead preferences
  SELECT preferred_channel, last_active_channel
  INTO v_preferred_channel, v_last_active_channel
  FROM leads
  WHERE id = p_lead_id;
  
  -- Get best performing channel from analytics
  SELECT channel
  INTO v_best_performing_channel
  FROM channel_performance
  ORDER BY response_rate_percent DESC NULLS LAST
  LIMIT 1;
  
  -- Priority: last_active_channel > preferred_channel > best_performing_channel
  RETURN COALESCE(v_last_active_channel, v_preferred_channel, v_best_performing_channel, 'email');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION select_best_channel_for_lead IS 'Selects the best channel for a lead based on preferences and performance';

-- ═══════════════════════════════════════════════════════════════
-- 7. UPDATE LEAD BANT SCORE
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_lead_bant_score(
  p_lead_id UUID,
  p_budget_score INTEGER DEFAULT NULL,
  p_authority_score INTEGER DEFAULT NULL,
  p_need_score INTEGER DEFAULT NULL,
  p_timing_score INTEGER DEFAULT NULL
)
RETURNS TABLE (
  lead_id UUID,
  new_bant_score INTEGER,
  old_bant_score INTEGER
)
AS $$
DECLARE
  v_old_bant INTEGER;
  v_new_bant INTEGER;
BEGIN
  -- Get current BANT score
  SELECT l.bant_score INTO v_old_bant
  FROM leads l
  WHERE l.id = p_lead_id;
  
  -- Update individual scores
  UPDATE leads
  SET
    budget_score = COALESCE(p_budget_score, budget_score),
    authority_score = COALESCE(p_authority_score, authority_score),
    need_score = COALESCE(p_need_score, need_score),
    timing_score = COALESCE(p_timing_score, timing_score),
    updated_at = NOW()
  WHERE id = p_lead_id;
  
  -- Get new BANT score (computed column)
  SELECT l.bant_score INTO v_new_bant
  FROM leads l
  WHERE l.id = p_lead_id;
  
  RETURN QUERY SELECT p_lead_id, v_new_bant, v_old_bant;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_lead_bant_score IS 'Updates BANT score components for a lead';

-- ═══════════════════════════════════════════════════════════════
-- 8. GET PLAYBOOK BY ID
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_playbook_by_id(
  p_playbook_id TEXT
)
RETURNS TABLE (
  playbook_id TEXT,
  name TEXT,
  description TEXT,
  trigger_type TEXT,
  delay_days INTEGER,
  preferred_channels TEXT[],
  message_template TEXT,
  subject_template TEXT,
  category TEXT,
  priority INTEGER
)
AS $$
BEGIN
  RETURN QUERY
  SELECT
    fp.id AS playbook_id,
    fp.name,
    fp.description,
    fp.trigger_type,
    fp.delay_days,
    fp.preferred_channels,
    fp.message_template,
    fp.subject_template,
    fp.category,
    fp.priority
  FROM followup_playbooks fp
  WHERE fp.id = p_playbook_id
    AND fp.is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_playbook_by_id IS 'Gets playbook details by ID';

-- ═══════════════════════════════════════════════════════════════
-- 9. BUILD LEAD CONTEXT
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION build_lead_context(
  p_lead_id UUID
)
RETURNS JSONB
AS $$
DECLARE
  v_context JSONB;
BEGIN
  SELECT jsonb_build_object(
    'lead_id', l.id,
    'name', l.name,
    'first_name', COALESCE(l.first_name, SPLIT_PART(l.name, ' ', 1)),
    'last_name', COALESCE(l.last_name, SPLIT_PART(l.name, ' ', 2)),
    'email', l.email,
    'phone', l.phone,
    'company', l.company,
    'position', l.position,
    'status', l.status,
    'bant_score', l.bant_score,
    'personality_type', l.personality_type,
    'context_summary', l.context_summary,
    'estimated_value', l.estimated_value,
    'last_contact', l.last_contact,
    'days_since_contact', EXTRACT(DAY FROM NOW() - COALESCE(l.last_contact, l.created_at))::INTEGER,
    'promised_action', l.promised_action,
    'promised_date', l.promised_action_date
  )
  INTO v_context
  FROM leads l
  WHERE l.id = p_lead_id;
  
  RETURN v_context;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION build_lead_context IS 'Builds a JSONB context object for template rendering';

-- ═══════════════════════════════════════════════════════════════
-- 10. MARK FOLLOW-UP AS DELIVERED
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION mark_followup_delivered(
  p_followup_id UUID
)
RETURNS BOOLEAN
AS $$
BEGIN
  UPDATE follow_ups
  SET
    status = 'delivered',
    delivered_at = NOW(),
    updated_at = NOW()
  WHERE id = p_followup_id;
  
  UPDATE message_tracking
  SET delivered_at = NOW()
  WHERE follow_up_id = p_followup_id;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_followup_delivered IS 'Marks a follow-up as delivered';

-- ═══════════════════════════════════════════════════════════════
-- 11. MARK FOLLOW-UP AS OPENED
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION mark_followup_opened(
  p_followup_id UUID
)
RETURNS BOOLEAN
AS $$
BEGIN
  UPDATE follow_ups
  SET
    status = 'opened',
    opened_at = NOW(),
    updated_at = NOW()
  WHERE id = p_followup_id
    AND opened_at IS NULL;
  
  UPDATE message_tracking
  SET opened_at = NOW()
  WHERE follow_up_id = p_followup_id
    AND opened_at IS NULL;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_followup_opened IS 'Marks a follow-up as opened';

-- ═══════════════════════════════════════════════════════════════
-- 12. MARK FOLLOW-UP AS REPLIED
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION mark_followup_replied(
  p_followup_id UUID
)
RETURNS BOOLEAN
AS $$
BEGIN
  UPDATE follow_ups
  SET
    status = 'replied',
    responded_at = NOW(),
    updated_at = NOW()
  WHERE id = p_followup_id
    AND responded_at IS NULL;
  
  UPDATE message_tracking
  SET
    responded_at = NOW(),
    was_successful = TRUE
  WHERE follow_up_id = p_followup_id
    AND responded_at IS NULL;
  
  -- Update lead's last_contact
  UPDATE leads
  SET last_contact = NOW()
  WHERE id = (SELECT lead_id FROM follow_ups WHERE id = p_followup_id);
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION mark_followup_replied IS 'Marks a follow-up as replied and updates lead last_contact';


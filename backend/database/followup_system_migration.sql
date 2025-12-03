-- ╔════════════════════════════════════════════════════════════════╗
-- ║  AUTOMATIC FOLLOW-UP SYSTEM                                    ║
-- ║  Message Tracking, Playbooks, Analytics, Smart Triggers        ║
-- ╚════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════
-- 1. FOLLOW-UPS TABLE (Tracking alle Follow-up Nachrichten)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Message Details
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'in_app')),
  message TEXT NOT NULL,
  subject TEXT,                               -- Nur für Email
  
  -- Tracking
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,                   -- WhatsApp/Email delivery confirmation
  opened_at TIMESTAMPTZ,                      -- Email open tracking
  responded_at TIMESTAMPTZ,                   -- Lead hat geantwortet
  
  -- Metadata
  status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'opened', 'replied', 'bounced', 'failed')),
  trigger_type TEXT,                          -- 'proposal_no_response', 'inactivity_14d', etc.
  is_automated BOOLEAN DEFAULT TRUE,
  playbook_id TEXT,                           -- Referenz zu Follow-up Playbook
  
  -- GPT Context
  gpt_generated BOOLEAN DEFAULT FALSE,
  gpt_prompt_used TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_followups_lead ON follow_ups(lead_id);
CREATE INDEX IF NOT EXISTS idx_followups_user ON follow_ups(user_id);
CREATE INDEX IF NOT EXISTS idx_followups_sent ON follow_ups(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_followups_status ON follow_ups(status);
CREATE INDEX IF NOT EXISTS idx_followups_channel ON follow_ups(channel);

COMMENT ON TABLE follow_ups IS 'Tracking aller automatischen und manuellen Follow-up Nachrichten';

-- ═══════════════════════════════════════════════════════════════
-- 2. MESSAGE TRACKING TABLE (Erweiterte Analytics)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS message_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follow_up_id UUID REFERENCES follow_ups(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Message Info
  channel TEXT NOT NULL,
  message_type TEXT,                          -- 'follow_up', 'proposal', 'reminder', 'nurture'
  
  -- Timestamps
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  
  -- Analytics
  response_time_hours INTEGER,                -- Zeit bis Response in Stunden
  was_successful BOOLEAN,                     -- Hat zu Antwort geführt
  
  -- GPT Metadata
  gpt_generated BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_message_tracking_lead ON message_tracking(lead_id);
CREATE INDEX IF NOT EXISTS idx_message_tracking_channel ON message_tracking(channel);
CREATE INDEX IF NOT EXISTS idx_message_tracking_sent ON message_tracking(sent_at DESC);

COMMENT ON TABLE message_tracking IS 'Analytics für Message Performance und Response-Verhalten';

-- ═══════════════════════════════════════════════════════════════
-- 3. FOLLOW-UP PLAYBOOKS TABLE (Wiederverwendbare Templates)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS followup_playbooks (
  id TEXT PRIMARY KEY,                        -- z.B. 'proposal_no_response'
  name TEXT NOT NULL,
  description TEXT,
  
  -- Trigger Conditions
  trigger_type TEXT NOT NULL,
  delay_days INTEGER DEFAULT 3,
  
  -- Channel Strategy
  preferred_channels TEXT[] DEFAULT ARRAY['whatsapp', 'email'],
  
  -- Message Template
  message_template TEXT NOT NULL,             -- Mit {{placeholders}}
  subject_template TEXT,                      -- Nur für Email
  
  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  category TEXT,                              -- 'objection', 'nurture', 'reminder', 'reactivation'
  priority INTEGER DEFAULT 5,                 -- 1-10 (höher = wichtiger)
  
  -- Usage Stats
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2),                  -- % Response Rate
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_playbooks_active ON followup_playbooks(is_active);
CREATE INDEX IF NOT EXISTS idx_playbooks_trigger ON followup_playbooks(trigger_type);

COMMENT ON TABLE followup_playbooks IS 'Wiederverwendbare Follow-up Templates mit Trigger-Logik';

-- ═══════════════════════════════════════════════════════════════
-- 4. SEED: 6 STANDARD FOLLOW-UP PLAYBOOKS
-- ═══════════════════════════════════════════════════════════════

INSERT INTO followup_playbooks (id, name, description, trigger_type, delay_days, preferred_channels, message_template, subject_template, category, priority) VALUES

-- 1. Proposal Sent - No Response
('proposal_no_response', 'Proposal Follow-up', 'Follow-up wenn nach Angebot keine Reaktion', 'proposal_sent', 3, ARRAY['whatsapp', 'email'], 
'Hey {{first_name}}, ich wollte nur kurz hören, wie dir das Angebot gefallen hat. Gibt es noch offene Fragen? Falls du magst, kann ich dir auch ein kurzes Vergleichsbeispiel zeigen.',
'Dein Angebot - noch Fragen?',
'reminder', 8),

-- 2. Verbal Commitment - No Action
('commitment_no_action', 'Zusage ohne Aktion', 'Follow-up bei Zusage ohne weitere Schritte', 'verbal_commitment', 2, ARRAY['whatsapp', 'in_app'],
'Super, dass du starten willst! 🎯 Ich hab dir mal ein Starter-Setup vorbereitet – brauchst du Hilfe bei den ersten Schritten oder soll ich dir ein kleines Video dazu senden?',
NULL,
'reminder', 9),

-- 3. Promised Callback Missed
('callback_missed', 'Verpasster Rückruf', 'Follow-up wenn Lead sich nicht wie versprochen meldet', 'promised_callback', 1, ARRAY['whatsapp', 'in_app'],
'Hey {{first_name}}, du hattest gesagt, du meldest dich um den {{promised_date}}. Kein Stress, ich wollte nur freundlich checken, ob es zeitlich gerade noch passt oder ob ich nochmal was rausschicken darf? 😊',
NULL,
'reminder', 7),

-- 4. Ghosted After Meeting
('ghosted_after_meeting', 'Keine Reaktion nach Meeting', 'Follow-up nach Meeting ohne Antwort', 'meeting_no_response', 4, ARRAY['email', 'whatsapp'],
'Ich wollte nochmal kurz andocken an unser Gespräch – manchmal ist einfach der Alltag dazwischengekommen. Wenn es für dich noch relevant ist, kann ich auch gern nochmal die wichtigsten Punkte zusammenfassen.',
'Kurzes Follow-up zu unserem Gespräch',
'reactivation', 6),

-- 5. Price Objection Silence
('price_objection_silence', 'Preis-Einwand & Funkstille', 'Follow-up nach Preis-Einwand ohne weitere Reaktion', 'objection_price', 3, ARRAY['whatsapp', 'email'],
'Danke nochmal für deine Offenheit beim Thema Preis. Ich hab eine Mini-Analyse gemacht, was andere mit ähnlichem Budget gemacht haben. Darf ich dir ein Beispiel oder einen Ratenplan schicken?',
'Alternative Optionen für dich',
'objection', 7),

-- 6. Long-term Nurture
('nurture_30d', 'Langzeit-Nurturing', 'Follow-up nach 30 Tagen Inaktivität', 'long_inactivity', 30, ARRAY['email'],
'Hi {{first_name}}, nur ein kurzes Update: In der Zwischenzeit hat {{success_story}} den ersten Meilenstein erreicht. Falls es bei dir jetzt besser passt, können wir jederzeit locker einsteigen. 🚀',
'Quick Update - vielleicht interessant für dich',
'nurture', 4)

ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 5. MATERIALIZED VIEWS - ANALYTICS
-- ═══════════════════════════════════════════════════════════════

-- Response Heatmap (Stunde x Wochentag)
DROP MATERIALIZED VIEW IF EXISTS response_heatmap CASCADE;
CREATE MATERIALIZED VIEW response_heatmap AS
SELECT
  channel,
  EXTRACT(DOW FROM responded_at)::INTEGER AS weekday,     -- 0=Sonntag, 1=Montag, ...
  EXTRACT(HOUR FROM responded_at)::INTEGER AS hour,
  COUNT(*) AS response_count
FROM message_tracking
WHERE responded_at IS NOT NULL
GROUP BY channel, weekday, hour
ORDER BY channel, weekday, hour;

CREATE INDEX IF NOT EXISTS idx_response_heatmap_channel ON response_heatmap(channel);

-- Weekly Activity Trend
DROP MATERIALIZED VIEW IF EXISTS weekly_activity_trend CASCADE;
CREATE MATERIALIZED VIEW weekly_activity_trend AS
SELECT
  DATE_TRUNC('week', sent_at) AS week_start,
  COUNT(*) AS message_count,
  channel
FROM message_tracking
GROUP BY week_start, channel
ORDER BY week_start DESC;

-- GPT vs Human Message Distribution
DROP MATERIALIZED VIEW IF EXISTS gpt_vs_human_messages CASCADE;
CREATE MATERIALIZED VIEW gpt_vs_human_messages AS
SELECT
  gpt_generated AS is_gpt,
  COUNT(*) AS message_count,
  channel
FROM message_tracking
GROUP BY gpt_generated, channel;

-- Channel Performance
DROP MATERIALIZED VIEW IF EXISTS channel_performance CASCADE;
CREATE MATERIALIZED VIEW channel_performance AS
SELECT
  channel,
  COUNT(*) AS total_sent,
  COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) AS opened_count,
  COUNT(CASE WHEN responded_at IS NOT NULL THEN 1 END) AS responded_count,
  ROUND(
    100.0 * COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) / NULLIF(COUNT(*), 0),
    2
  ) AS open_rate_percent,
  ROUND(
    100.0 * COUNT(CASE WHEN responded_at IS NOT NULL THEN 1 END) / NULLIF(COUNT(*), 0),
    2
  ) AS response_rate_percent,
  AVG(response_time_hours) AS avg_response_time_hours
FROM message_tracking
GROUP BY channel;

-- ═══════════════════════════════════════════════════════════════
-- 6. RPC FUNCTIONS
-- ═══════════════════════════════════════════════════════════════

-- Get Leads Needing Follow-up
CREATE OR REPLACE FUNCTION get_leads_needing_followup(days_threshold INTEGER DEFAULT 3)
RETURNS TABLE (
  lead_id UUID,
  lead_name TEXT,
  last_followup TIMESTAMPTZ,
  days_since_last_contact INTEGER,
  bant_score INTEGER,
  status TEXT,
  preferred_channel TEXT,
  recommended_playbook TEXT
)
AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id AS lead_id,
    l.name AS lead_name,
    MAX(f.sent_at) AS last_followup,
    EXTRACT(DAY FROM NOW() - COALESCE(MAX(f.sent_at), l.last_contact, l.created_at))::INTEGER AS days_since_last_contact,
    l.bant_score,
    l.status,
    l.preferred_channel,
    CASE
      WHEN l.status = 'proposal_sent' AND EXTRACT(DAY FROM NOW() - COALESCE(MAX(f.sent_at), l.created_at)) >= 3 THEN 'proposal_no_response'
      WHEN l.promised_action_date IS NOT NULL AND l.promised_action_date < NOW() THEN 'callback_missed'
      WHEN EXTRACT(DAY FROM NOW() - COALESCE(MAX(f.sent_at), l.last_contact, l.created_at)) >= 14 AND l.bant_score >= 75 THEN 'ghosted_after_meeting'
      WHEN EXTRACT(DAY FROM NOW() - COALESCE(MAX(f.sent_at), l.last_contact, l.created_at)) >= 30 THEN 'nurture_30d'
      ELSE NULL
    END AS recommended_playbook
  FROM leads l
  LEFT JOIN follow_ups f ON f.lead_id = l.id
  WHERE l.status NOT IN ('won', 'lost')
  GROUP BY l.id, l.name, l.bant_score, l.status, l.preferred_channel, l.last_contact, l.created_at, l.promised_action_date
  HAVING
    MAX(f.sent_at) IS NULL
    OR EXTRACT(DAY FROM NOW() - MAX(f.sent_at)) >= days_threshold;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_leads_needing_followup IS 'Findet Leads die Follow-up brauchen mit empfohlenem Playbook';

-- Get Overdue Follow-ups
CREATE OR REPLACE FUNCTION get_overdue_followups(days_threshold INTEGER DEFAULT 3)
RETURNS TABLE (
  lead_id UUID,
  last_followup TIMESTAMPTZ,
  days_overdue INTEGER
)
AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id AS lead_id,
    MAX(f.sent_at) AS last_followup,
    EXTRACT(DAY FROM NOW() - COALESCE(MAX(f.sent_at), l.created_at))::INTEGER AS days_overdue
  FROM leads l
  LEFT JOIN follow_ups f ON f.lead_id = l.id
  WHERE l.status NOT IN ('won', 'lost')
  GROUP BY l.id, l.created_at
  HAVING
    MAX(f.sent_at) IS NULL
    OR EXTRACT(DAY FROM NOW() - MAX(f.sent_at)) >= days_threshold;
END;
$$ LANGUAGE plpgsql;

-- Select Best Channel for Lead
CREATE OR REPLACE FUNCTION select_best_channel(p_lead_id UUID)
RETURNS TEXT
AS $$
DECLARE
  v_channel TEXT;
  v_phone TEXT;
  v_email TEXT;
  v_last_active_channel TEXT;
BEGIN
  -- Get lead contact info & preferences
  SELECT
    phone,
    email,
    preferred_channel
  INTO v_phone, v_email, v_last_active_channel
  FROM leads
  WHERE id = p_lead_id;
  
  -- Strategy: WhatsApp > Email > In-App
  IF v_last_active_channel = 'whatsapp' AND v_phone IS NOT NULL THEN
    RETURN 'whatsapp';
  ELSIF v_last_active_channel = 'email' AND v_email IS NOT NULL THEN
    RETURN 'email';
  ELSIF v_phone IS NOT NULL THEN
    RETURN 'whatsapp';
  ELSIF v_email IS NOT NULL THEN
    RETURN 'email';
  ELSE
    RETURN 'in_app';
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION select_best_channel IS 'Wählt automatisch besten Kanal basierend auf Lead-Daten';

-- Generate Follow-up Message
CREATE OR REPLACE FUNCTION generate_followup_message(p_lead_id UUID, p_playbook_id TEXT)
RETURNS JSON
AS $$
DECLARE
  v_lead RECORD;
  v_playbook RECORD;
  v_message TEXT;
  v_subject TEXT;
BEGIN
  -- Get lead data
  SELECT
    l.name,
    SPLIT_PART(l.name, ' ', 1) AS first_name,
    l.bant_score,
    l.personality_type,
    l.context_summary,
    l.promised_action_date,
    EXTRACT(DAY FROM NOW() - COALESCE(l.last_contact, l.created_at))::INTEGER AS days_inactive
  INTO v_lead
  FROM leads l
  WHERE l.id = p_lead_id;
  
  -- Get playbook
  SELECT * INTO v_playbook
  FROM followup_playbooks
  WHERE id = p_playbook_id;
  
  -- Replace placeholders in message template
  v_message := v_playbook.message_template;
  v_message := REPLACE(v_message, '{{first_name}}', COALESCE(v_lead.first_name, v_lead.name));
  v_message := REPLACE(v_message, '{{promised_date}}', TO_CHAR(v_lead.promised_action_date, 'DD.MM.'));
  v_message := REPLACE(v_message, '{{days_inactive}}', v_lead.days_inactive::TEXT);
  v_message := REPLACE(v_message, '{{success_story}}', 'Team XY');
  
  -- Replace subject placeholders (if email)
  IF v_playbook.subject_template IS NOT NULL THEN
    v_subject := v_playbook.subject_template;
    v_subject := REPLACE(v_subject, '{{first_name}}', COALESCE(v_lead.first_name, v_lead.name));
  END IF;
  
  -- Return as JSON
  RETURN json_build_object(
    'message', v_message,
    'subject', v_subject,
    'playbook_id', p_playbook_id,
    'preferred_channels', v_playbook.preferred_channels,
    'lead_context', json_build_object(
      'name', v_lead.name,
      'bant_score', v_lead.bant_score,
      'personality_type', v_lead.personality_type,
      'days_inactive', v_lead.days_inactive
    )
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_followup_message IS 'Generiert Follow-up Message aus Playbook mit Lead-Kontext';

-- ═══════════════════════════════════════════════════════════════
-- 7. TRIGGERS - AUTO-UPDATE
-- ═══════════════════════════════════════════════════════════════

-- Auto-update response_time when responded_at is set
CREATE OR REPLACE FUNCTION update_response_time()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.responded_at IS NOT NULL AND OLD.responded_at IS NULL THEN
    NEW.response_time_hours := EXTRACT(EPOCH FROM (NEW.responded_at - NEW.sent_at)) / 3600;
    NEW.was_successful := TRUE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_response_time ON message_tracking;
CREATE TRIGGER trigger_update_response_time
BEFORE UPDATE ON message_tracking
FOR EACH ROW
EXECUTE FUNCTION update_response_time();

-- Auto-update playbook usage_count
CREATE OR REPLACE FUNCTION increment_playbook_usage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.playbook_id IS NOT NULL THEN
    UPDATE followup_playbooks
    SET usage_count = usage_count + 1,
        updated_at = NOW()
    WHERE id = NEW.playbook_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_increment_playbook_usage ON follow_ups;
CREATE TRIGGER trigger_increment_playbook_usage
AFTER INSERT ON follow_ups
FOR EACH ROW
EXECUTE FUNCTION increment_playbook_usage();

-- ═══════════════════════════════════════════════════════════════
-- COMPLETE! ✅
-- ═══════════════════════════════════════════════════════════════

COMMENT ON TABLE follow_ups IS 'Automatic Follow-up System - Core Table';
COMMENT ON TABLE message_tracking IS 'Message Analytics & Performance Tracking';
COMMENT ON TABLE followup_playbooks IS 'Reusable Follow-up Templates with Triggers';


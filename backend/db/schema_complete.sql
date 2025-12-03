-- ═════════════════════════════════════════════════════════════════
-- SALES FLOW AI - COMPLETE SQL SCHEMA
-- ═════════════════════════════════════════════════════════════════
-- Run this once to create all missing tables
-- ═════════════════════════════════════════════════════════════════

-- 1. LEAD SCORING HISTORY
CREATE TABLE IF NOT EXISTS lead_scoring_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL,
  old_score INTEGER,
  new_score INTEGER,
  reasoning JSONB,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. PLAYBOOKS SYSTEM
CREATE TABLE IF NOT EXISTS playbooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT CHECK (trigger_type IN ('manual', 'new_lead', 'status_change')),
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  target_industry TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS playbook_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playbook_id UUID REFERENCES playbooks(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL,
  status TEXT CHECK (status IN ('active', 'completed', 'paused', 'failed')) DEFAULT 'active',
  current_step_index INTEGER DEFAULT 0,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  last_action_date TIMESTAMPTZ,
  next_action_date TIMESTAMPTZ DEFAULT NOW(),
  history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. A/B TESTING SYSTEM
CREATE TABLE IF NOT EXISTS ab_tests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  metric TEXT NOT NULL CHECK (metric IN ('open_rate', 'reply_rate', 'click_rate', 'booking_rate')),
  status TEXT CHECK (status IN ('draft', 'running', 'completed', 'paused')) DEFAULT 'draft',
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  confidence_level DECIMAL DEFAULT 0.0,
  winning_variant_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ab_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_id UUID REFERENCES ab_tests(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_id UUID REFERENCES message_templates(id),
  traffic_split INTEGER DEFAULT 50,
  is_winner BOOLEAN DEFAULT false,
  sent_count INTEGER DEFAULT 0,
  conversion_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ab_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  test_id UUID REFERENCES ab_tests(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES ab_variants(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL,
  event_type TEXT CHECK (event_type IN ('assigned', 'converted')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. AUTOMATED SEQUENCES (Optional - for future)
CREATE TABLE IF NOT EXISTS message_sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_event TEXT CHECK (trigger_event IN ('manual', 'lead_created', 'demo_completed', 'stale_lead')),
  is_active BOOLEAN DEFAULT true,
  target_industry TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sequence_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id UUID REFERENCES message_sequences(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  delay_days INTEGER DEFAULT 0,
  channel TEXT CHECK (channel IN ('email', 'linkedin', 'whatsapp', 'sms', 'call')),
  template_id UUID REFERENCES message_templates(id),
  custom_content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═════════════════════════════════════════════════════════════════
-- 5. ALL INDEXES
-- ═════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_scoring_lead ON lead_scoring_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_playbook_runs_status ON playbook_runs(status);
CREATE INDEX IF NOT EXISTS idx_playbook_runs_next_action ON playbook_runs(next_action_date);
CREATE INDEX IF NOT EXISTS idx_playbook_runs_lead ON playbook_runs(lead_id);
CREATE INDEX IF NOT EXISTS idx_playbooks_active ON playbooks(is_active);
CREATE INDEX IF NOT EXISTS idx_ab_events_test ON ab_events(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_variants_test ON ab_variants(test_id);
CREATE INDEX IF NOT EXISTS idx_sequence_steps_sequence ON sequence_steps(sequence_id);
CREATE INDEX IF NOT EXISTS idx_sequence_steps_order ON sequence_steps(step_order);

-- ═════════════════════════════════════════════════════════════════
-- AUTO-UPDATE TRIGGERS
-- ═════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_playbooks_updated_at 
  BEFORE UPDATE ON playbooks 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_sequences_updated_at 
  BEFORE UPDATE ON message_sequences 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ═════════════════════════════════════════════════════════════════
-- COMMENTS (Documentation)
-- ═════════════════════════════════════════════════════════════════

COMMENT ON TABLE lead_scoring_history IS 'Tracks changes to lead scores over time with reasoning';
COMMENT ON TABLE playbooks IS 'Defines reusable sales playbooks with steps and triggers';
COMMENT ON TABLE playbook_runs IS 'Tracks execution of playbooks for specific leads';
COMMENT ON TABLE ab_tests IS 'A/B test definitions for template optimization';
COMMENT ON TABLE ab_variants IS 'Individual variants within A/B tests';
COMMENT ON TABLE ab_events IS 'Tracks assignment and conversion events for A/B tests';
COMMENT ON TABLE message_sequences IS 'Defines automated message sequences';
COMMENT ON TABLE sequence_steps IS 'Individual steps within message sequences';


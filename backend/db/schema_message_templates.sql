-- ============================================================================
-- Sales Flow AI - Message Templates & Lead Scoring History Schema
-- ============================================================================
-- Run this in your Supabase SQL Editor
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: message_templates
-- Stores reusable message templates for different channels and categories
-- ============================================================================
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_name TEXT NOT NULL,
  category TEXT CHECK (category IN ('cold_outreach', 'follow_up', 'closing', 'referral', 'general')),
  channel TEXT CHECK (channel IN ('email', 'linkedin', 'sms', 'whatsapp')),
  subject_line TEXT,
  body_template TEXT NOT NULL,
  cta TEXT,
  variables JSONB DEFAULT '[]'::jsonb,
  best_send_time TIME,
  expected_response_rate DECIMAL(5,2),
  industry TEXT[],
  personalization_level TEXT CHECK (personalization_level IN ('low', 'medium', 'high')),
  ab_variants JSONB DEFAULT '[]'::jsonb,
  usage_count INTEGER DEFAULT 0,
  avg_response_rate DECIMAL(5,2) DEFAULT 0.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: lead_scoring_history
-- Tracks changes in lead scores over time with reasoning
-- ============================================================================
CREATE TABLE IF NOT EXISTS lead_scoring_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL,
  old_score INTEGER,
  new_score INTEGER,
  reasoning JSONB,
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES for better query performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_templates_category ON message_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_channel ON message_templates(channel);
CREATE INDEX IF NOT EXISTS idx_templates_industry ON message_templates USING GIN(industry);
CREATE INDEX IF NOT EXISTS idx_scoring_lead ON lead_scoring_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_scoring_changed_at ON lead_scoring_history(changed_at DESC);

-- ============================================================================
-- FUNCTION: Update updated_at timestamp automatically
-- ============================================================================
CREATE OR REPLACE FUNCTION update_message_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Auto-update updated_at on message_templates changes
-- ============================================================================
DROP TRIGGER IF EXISTS update_message_templates_timestamp ON message_templates;
CREATE TRIGGER update_message_templates_timestamp
  BEFORE UPDATE ON message_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_message_templates_updated_at();

-- ============================================================================
-- COMMENTS for documentation
-- ============================================================================
COMMENT ON TABLE message_templates IS 'Reusable message templates for different channels and outreach categories';
COMMENT ON TABLE lead_scoring_history IS 'Historical tracking of lead score changes with AI reasoning';

COMMENT ON COLUMN message_templates.category IS 'Template category: cold_outreach, follow_up, closing, referral, general';
COMMENT ON COLUMN message_templates.channel IS 'Communication channel: email, linkedin, sms, whatsapp';
COMMENT ON COLUMN message_templates.variables IS 'JSON array of variable placeholders (e.g., {name}, {company})';
COMMENT ON COLUMN message_templates.ab_variants IS 'JSON array of A/B test variants';
COMMENT ON COLUMN message_templates.personalization_level IS 'How personalized: low, medium, high';

COMMENT ON COLUMN lead_scoring_history.reasoning IS 'JSON object with AI reasoning for score change';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Message Templates & Lead Scoring schema created successfully!';
  RAISE NOTICE '📋 Tables: message_templates, lead_scoring_history';
  RAISE NOTICE '🔍 Indexes: 5 indexes created for performance';
  RAISE NOTICE '⏰ Trigger: Auto-update timestamp enabled';
END $$;


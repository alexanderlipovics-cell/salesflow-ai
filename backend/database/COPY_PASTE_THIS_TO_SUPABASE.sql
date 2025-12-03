-- ============================================================================
-- SALES FLOW AI - COMPLETE DATABASE SETUP
-- ============================================================================
-- 
-- 🎯 PURPOSE: Deploy all database schemas for Sales Flow AI
-- 
-- 📋 CONTENTS:
--    1. Objections Enhancement (psychology_tags, frequency_score)
--    2. Sequences Engine (sequences, sequence_steps, enrollments)
--    3. Revenue Intelligence (views, functions, triggers)
--
-- 🚀 HOW TO USE:
--    1. Copy this ENTIRE file
--    2. Go to: https://supabase.com/dashboard → Your Project → SQL Editor
--    3. Paste & Click "Run"
--    4. Wait for success message
--    5. Then run: python scripts/master_import.py
--
-- ⏱️  EXECUTION TIME: ~10 seconds
-- 
-- ============================================================================


-- ============================================================================
-- PART 1: OBJECTIONS SCHEMA ENHANCEMENTS
-- ============================================================================
-- Adds psychology_tags and frequency_score to objection_library table
-- ============================================================================

DO $$
BEGIN
    -- Add frequency_score column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'objection_library'
        AND column_name = 'frequency_score'
    ) THEN
        ALTER TABLE objection_library ADD COLUMN frequency_score INTEGER DEFAULT 5;
        RAISE NOTICE '✅ Added frequency_score column to objection_library';
    ELSE
        RAISE NOTICE 'ℹ️  frequency_score column already exists';
    END IF;

    -- Add psychology_tags column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'objection_library'
        AND column_name = 'psychology_tags'
    ) THEN
        ALTER TABLE objection_library ADD COLUMN psychology_tags TEXT[] DEFAULT '{}';
        RAISE NOTICE '✅ Added psychology_tags column to objection_library';
    ELSE
        RAISE NOTICE 'ℹ️  psychology_tags column already exists';
    END IF;

    -- Add psychology column if it doesn't exist (for backward compatibility)
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'objection_library'
        AND column_name = 'psychology'
    ) THEN
        ALTER TABLE objection_library ADD COLUMN psychology TEXT;
        RAISE NOTICE '✅ Added psychology column to objection_library';
    ELSE
        RAISE NOTICE 'ℹ️  psychology column already exists';
    END IF;
END $$;

-- Create index on frequency_score if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE indexname = 'idx_objections_frequency'
    ) THEN
        CREATE INDEX idx_objections_frequency ON objection_library(frequency_score DESC);
        RAISE NOTICE '✅ Created index on frequency_score';
    ELSE
        RAISE NOTICE 'ℹ️  Index on frequency_score already exists';
    END IF;
END $$;


-- ============================================================================
-- PART 2: SEQUENCES ENGINE SCHEMA
-- ============================================================================
-- Creates tables for multi-touch sales campaigns
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: sequences
-- Container for multi-touch sales campaigns
-- ============================================================================
CREATE TABLE IF NOT EXISTS sequences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'auto_stage', 'auto_score', 'auto_tag')),
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Analytics fields
  total_enrollments INTEGER DEFAULT 0,
  active_enrollments INTEGER DEFAULT 0,
  completed_enrollments INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0.0
);

-- ============================================================================
-- TABLE: sequence_steps
-- Individual steps within a sequence
-- ============================================================================
CREATE TABLE IF NOT EXISTS sequence_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email', 'linkedin', 'call', 'whatsapp', 'sms', 'task')),
  delay_hours INTEGER DEFAULT 24,
  template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
  task_note TEXT,
  
  -- Analytics per step
  sent_count INTEGER DEFAULT 0,
  opened_count INTEGER DEFAULT 0,
  replied_count INTEGER DEFAULT 0,
  completed_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sequence_id, step_order)
);

-- ============================================================================
-- TABLE: enrollments
-- Tracks which leads are in which sequences
-- ============================================================================
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled', 'unsubscribed')),
  current_step_index INTEGER DEFAULT 0,
  next_action_at TIMESTAMP WITH TIME ZONE,
  
  -- Exit conditions
  exited_reason TEXT,
  interaction_triggered BOOLEAN DEFAULT false,
  meeting_scheduled BOOLEAN DEFAULT false,
  
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  last_action_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(lead_id, sequence_id)
);

-- ============================================================================
-- TABLE: enrollment_history
-- Audit trail for sequence actions
-- ============================================================================
CREATE TABLE IF NOT EXISTS enrollment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  step_id UUID REFERENCES sequence_steps(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  status TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES for Sequences
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_sequences_active ON sequences(is_active);
CREATE INDEX IF NOT EXISTS idx_sequence_steps_sequence ON sequence_steps(sequence_id, step_order);
CREATE INDEX IF NOT EXISTS idx_enrollments_lead ON enrollments(lead_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_sequence ON enrollments(sequence_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_next_action ON enrollments(next_action_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_enrollment_history_enrollment ON enrollment_history(enrollment_id, created_at DESC);

-- ============================================================================
-- VIEW: due_enrollments
-- Enrollments that need action now
-- ============================================================================
CREATE OR REPLACE VIEW due_enrollments AS
SELECT 
  e.*,
  l.name as lead_name,
  l.email as lead_email,
  s.name as sequence_name
FROM enrollments e
JOIN leads l ON e.lead_id = l.id
JOIN sequences s ON e.sequence_id = s.id
WHERE e.status = 'active'
  AND e.next_action_at <= NOW()
ORDER BY e.next_action_at;

-- ============================================================================
-- VIEW: sequence_performance
-- Analytics overview per sequence
-- ============================================================================
CREATE OR REPLACE VIEW sequence_performance AS
SELECT 
  s.id,
  s.name,
  s.total_enrollments,
  s.active_enrollments,
  s.completed_enrollments,
  s.success_rate,
  COUNT(DISTINCT step.id) as total_steps,
  SUM(step.sent_count) as total_sent,
  SUM(step.opened_count) as total_opened,
  SUM(step.replied_count) as total_replied,
  CASE 
    WHEN SUM(step.sent_count) > 0 
    THEN ROUND((SUM(step.replied_count)::DECIMAL / SUM(step.sent_count)) * 100, 2)
    ELSE 0
  END as overall_reply_rate
FROM sequences s
LEFT JOIN sequence_steps step ON s.id = step.sequence_id
GROUP BY s.id;

-- ============================================================================
-- FUNCTION: update_sequence_updated_at
-- Auto-update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_sequence_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: sequence_updated_at
-- ============================================================================
DROP TRIGGER IF EXISTS sequence_updated_at ON sequences;
CREATE TRIGGER sequence_updated_at
  BEFORE UPDATE ON sequences
  FOR EACH ROW
  EXECUTE FUNCTION update_sequence_updated_at();


-- ============================================================================
-- PART 3: REVENUE INTELLIGENCE SCHEMA
-- ============================================================================
-- Extends leads table and creates analytics views
-- ============================================================================

-- ============================================================================
-- EXTEND: leads table with financial data
-- ============================================================================
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deal_value DECIMAL(12,2) DEFAULT 0.00;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS expected_close_date DATE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS win_probability INTEGER DEFAULT 0;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deal_stage TEXT DEFAULT 'discovery';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_activity_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE leads ADD COLUMN IF NOT EXISTS days_in_stage INTEGER DEFAULT 0;

-- Add constraints
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'leads_win_probability_check'
    ) THEN
        ALTER TABLE leads ADD CONSTRAINT leads_win_probability_check 
        CHECK (win_probability >= 0 AND win_probability <= 100);
    END IF;
END $$;

-- ============================================================================
-- INDEXES for Revenue
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_expected_close ON leads(expected_close_date);
CREATE INDEX IF NOT EXISTS idx_leads_deal_value ON leads(deal_value DESC);
CREATE INDEX IF NOT EXISTS idx_leads_win_probability ON leads(win_probability DESC);
CREATE INDEX IF NOT EXISTS idx_leads_last_activity ON leads(last_activity_date DESC);

-- ============================================================================
-- VIEW: revenue_pipeline_summary
-- Aggregate pipeline by stage
-- ============================================================================
CREATE OR REPLACE VIEW revenue_pipeline_summary AS
SELECT
  COALESCE(status, 'unknown') as stage,
  COUNT(id) as count,
  SUM(COALESCE(deal_value, 0)) as total_value,
  AVG(COALESCE(deal_value, 0)) as avg_value,
  MIN(expected_close_date) as next_closing_date,
  SUM(
    CASE 
      WHEN win_probability > 0 
      THEN deal_value * (win_probability / 100.0)
      ELSE deal_value * 0.25
    END
  ) as weighted_value
FROM leads
WHERE status NOT IN ('closed_lost', 'archived')
  AND COALESCE(deal_value, 0) > 0
GROUP BY status
ORDER BY 
  CASE status
    WHEN 'negotiation' THEN 1
    WHEN 'proposal' THEN 2
    WHEN 'qualified' THEN 3
    WHEN 'discovery' THEN 4
    WHEN 'new' THEN 5
    ELSE 6
  END;

-- ============================================================================
-- VIEW: revenue_forecast_monthly
-- Monthly forecast based on expected close dates
-- ============================================================================
CREATE OR REPLACE VIEW revenue_forecast_monthly AS
SELECT
  TO_CHAR(expected_close_date, 'YYYY-MM') as month,
  COUNT(id) as deal_count,
  SUM(COALESCE(deal_value, 0)) as total_pipeline,
  SUM(
    deal_value * (
      CASE 
        WHEN win_probability > 0 THEN win_probability
        WHEN status = 'negotiation' THEN 80
        WHEN status = 'proposal' THEN 50
        WHEN status = 'qualified' THEN 20
        ELSE 5
      END
    ) / 100.0
  ) as weighted_forecast,
  AVG(
    CASE 
      WHEN win_probability > 0 THEN win_probability
      WHEN status = 'negotiation' THEN 80
      WHEN status = 'proposal' THEN 50
      WHEN status = 'qualified' THEN 20
      ELSE 5
    END
  ) as avg_win_probability
FROM leads
WHERE status NOT IN ('closed_won', 'closed_lost', 'archived')
  AND expected_close_date IS NOT NULL
  AND COALESCE(deal_value, 0) > 0
GROUP BY TO_CHAR(expected_close_date, 'YYYY-MM')
ORDER BY month;

-- ============================================================================
-- VIEW: at_risk_deals
-- High-value deals that need attention
-- ============================================================================
CREATE OR REPLACE VIEW at_risk_deals AS
SELECT
  id,
  name,
  company,
  status,
  deal_value,
  expected_close_date,
  win_probability,
  last_activity_date,
  days_in_stage,
  CASE
    WHEN expected_close_date < CURRENT_DATE THEN 'past_close_date'
    WHEN last_activity_date < (NOW() - INTERVAL '14 days') THEN 'no_recent_activity'
    WHEN days_in_stage > 45 THEN 'stagnant'
    WHEN score < 40 AND deal_value > 5000 THEN 'low_score_high_value'
    ELSE 'attention_needed'
  END as risk_reason,
  CASE
    WHEN expected_close_date < CURRENT_DATE THEN 10
    WHEN last_activity_date < (NOW() - INTERVAL '14 days') THEN 8
    WHEN days_in_stage > 45 THEN 7
    WHEN score < 40 AND deal_value > 5000 THEN 9
    ELSE 5
  END as risk_score
FROM leads
WHERE status NOT IN ('closed_won', 'closed_lost', 'archived')
  AND COALESCE(deal_value, 0) > 0
  AND (
    expected_close_date < CURRENT_DATE
    OR last_activity_date < (NOW() - INTERVAL '14 days')
    OR days_in_stage > 45
    OR (score < 40 AND deal_value > 5000)
  )
ORDER BY risk_score DESC, deal_value DESC;

-- ============================================================================
-- VIEW: won_deals_summary
-- Historical won deals analytics
-- ============================================================================
CREATE OR REPLACE VIEW won_deals_summary AS
SELECT
  DATE_TRUNC('month', updated_at) as month,
  COUNT(*) as deals_won,
  SUM(deal_value) as total_revenue,
  AVG(deal_value) as avg_deal_size,
  SUM(deal_value) / NULLIF(COUNT(*), 0) as avg_revenue_per_deal
FROM leads
WHERE status = 'closed_won'
  AND updated_at >= NOW() - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', updated_at)
ORDER BY month DESC;

-- ============================================================================
-- FUNCTION: calculate_deal_health
-- Calculates a 0-100 health score for a deal
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_deal_health(lead_id UUID)
RETURNS TABLE(
  health_score INTEGER,
  risk_factors TEXT[],
  recommendations TEXT[]
) AS $$
DECLARE
  lead_record RECORD;
  score INTEGER := 100;
  risks TEXT[] := '{}';
  recs TEXT[] := '{}';
BEGIN
  -- Fetch lead data
  SELECT * INTO lead_record
  FROM leads
  WHERE id = lead_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lead not found: %', lead_id;
  END IF;
  
  -- Check activity recency
  IF lead_record.last_activity_date < (NOW() - INTERVAL '7 days') THEN
    score := score - 15;
    risks := array_append(risks, 'No activity in 7+ days');
    recs := array_append(recs, 'Schedule immediate follow-up');
  END IF;
  
  IF lead_record.last_activity_date < (NOW() - INTERVAL '14 days') THEN
    score := score - 20;
    risks := array_append(risks, 'No activity in 14+ days');
    recs := array_append(recs, 'Consider re-qualification or pause');
  END IF;
  
  -- Check stage duration
  IF lead_record.days_in_stage > 30 THEN
    score := score - 10;
    risks := array_append(risks, 'Stagnant in stage 30+ days');
    recs := array_append(recs, 'Push for next milestone or close');
  END IF;
  
  IF lead_record.days_in_stage > 60 THEN
    score := score - 15;
    risks := array_append(risks, 'Stagnant in stage 60+ days');
    recs := array_append(recs, 'Escalate or mark as lost');
  END IF;
  
  -- Check close date
  IF lead_record.expected_close_date < CURRENT_DATE THEN
    score := score - 25;
    risks := array_append(risks, 'Past expected close date');
    recs := array_append(recs, 'Re-forecast or close');
  END IF;
  
  -- Check score vs value alignment
  IF lead_record.score < 50 AND lead_record.deal_value > 10000 THEN
    score := score - 20;
    risks := array_append(risks, 'Low score for high-value deal');
    recs := array_append(recs, 'Invest in relationship building');
  END IF;
  
  -- Ensure score doesn't go negative
  IF score < 0 THEN
    score := 0;
  END IF;
  
  RETURN QUERY SELECT score, risks, recs;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: update_last_activity_on_interaction
-- Auto-update last_activity_date when interactions are logged
-- ============================================================================
CREATE OR REPLACE FUNCTION update_lead_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE leads
  SET last_activity_date = NOW()
  WHERE id = NEW.lead_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_last_activity_trigger ON lead_interactions;
CREATE TRIGGER update_last_activity_trigger
  AFTER INSERT ON lead_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_last_activity();


-- ============================================================================
-- 🎉 SETUP COMPLETE!
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '✅ SALES FLOW AI DATABASE SETUP COMPLETE!';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '📊 OBJECTIONS: ✅ psychology_tags, frequency_score added';
  RAISE NOTICE '🔄 SEQUENCES: ✅ 4 tables, 7 indexes, 2 views created';
  RAISE NOTICE '💰 REVENUE: ✅ 7 new columns, 5 indexes, 4 views, 1 function created';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 NEXT STEP: Run data import';
  RAISE NOTICE '   cd backend';
  RAISE NOTICE '   python scripts/master_import.py';
  RAISE NOTICE '';
  RAISE NOTICE '============================================================================';
END $$;


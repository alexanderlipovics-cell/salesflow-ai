-- ============================================================================
-- Sales Flow AI - Sequence Engine Schema
-- ============================================================================
-- Multi-Touch Sales Campaign System mit automatisierten Sequenzen
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: sequences
-- Container für Multi-Touch Kampagnen
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
  
  -- Analytics (denormalized für Performance)
  total_enrollments INTEGER DEFAULT 0,
  active_enrollments INTEGER DEFAULT 0,
  completed_enrollments INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 0.0
);

-- ============================================================================
-- TABLE: sequence_steps
-- Einzelne Steps innerhalb einer Sequence
-- ============================================================================
CREATE TABLE IF NOT EXISTS sequence_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email', 'linkedin', 'call', 'sms', 'whatsapp', 'task', 'wait')),
  delay_hours INTEGER DEFAULT 24,
  
  -- Content (entweder Template ODER direkter Text/Task)
  template_id UUID REFERENCES message_templates(id) ON DELETE SET NULL,
  task_note TEXT,
  
  -- Analytics (denormalized)
  total_sent INTEGER DEFAULT 0,
  total_opened INTEGER DEFAULT 0,
  total_replied INTEGER DEFAULT 0,
  total_completed INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(sequence_id, step_order)
);

-- ============================================================================
-- TABLE: enrollments
-- Tracking welcher Lead in welcher Sequence ist
-- ============================================================================
CREATE TABLE IF NOT EXISTS enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
  
  -- Status Tracking
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled', 'bounced')),
  current_step_order INTEGER DEFAULT 0,
  
  -- Timing
  enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  next_step_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  paused_at TIMESTAMP WITH TIME ZONE,
  
  -- Outcome Tracking
  outcome TEXT CHECK (outcome IN ('meeting_booked', 'reply_received', 'opt_out', 'bounced', 'completed', 'manual_stop')),
  outcome_note TEXT,
  
  -- Analytics
  steps_completed INTEGER DEFAULT 0,
  steps_skipped INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(lead_id, sequence_id)
);

-- ============================================================================
-- TABLE: enrollment_history
-- Detaillierter Log aller Step-Ausführungen
-- ============================================================================
CREATE TABLE IF NOT EXISTS enrollment_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
  step_id UUID NOT NULL REFERENCES sequence_steps(id) ON DELETE CASCADE,
  
  -- Execution Tracking
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'sent', 'opened', 'replied', 'bounced', 'skipped', 'failed')),
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Details
  channel TEXT,
  message_id TEXT,  -- External ID (z.B. Email Provider Message ID)
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES für Performance
-- ============================================================================

-- Sequences
CREATE INDEX IF NOT EXISTS idx_sequences_active ON sequences(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sequences_trigger ON sequences(trigger_type);
CREATE INDEX IF NOT EXISTS idx_sequences_created_by ON sequences(created_by);

-- Sequence Steps
CREATE INDEX IF NOT EXISTS idx_sequence_steps_sequence ON sequence_steps(sequence_id, step_order);
CREATE INDEX IF NOT EXISTS idx_sequence_steps_type ON sequence_steps(type);
CREATE INDEX IF NOT EXISTS idx_sequence_steps_template ON sequence_steps(template_id);

-- Enrollments - KRITISCH FÜR SCHEDULER!
CREATE INDEX IF NOT EXISTS idx_enrollments_next_step ON enrollments(next_step_at) 
  WHERE status = 'active' AND next_step_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_enrollments_lead ON enrollments(lead_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_sequence ON enrollments(sequence_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_active ON enrollments(status, next_step_at) 
  WHERE status = 'active';

-- Enrollment History
CREATE INDEX IF NOT EXISTS idx_enrollment_history_enrollment ON enrollment_history(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_history_step ON enrollment_history(step_id);
CREATE INDEX IF NOT EXISTS idx_enrollment_history_status ON enrollment_history(status);
CREATE INDEX IF NOT EXISTS idx_enrollment_history_executed ON enrollment_history(executed_at DESC);

-- ============================================================================
-- FUNCTIONS: Auto-Update Timestamps
-- ============================================================================
CREATE OR REPLACE FUNCTION update_sequence_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTIONS: Auto-Update Sequence Analytics
-- ============================================================================
CREATE OR REPLACE FUNCTION update_sequence_analytics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update sequence total_enrollments, active_enrollments, etc.
  UPDATE sequences
  SET 
    total_enrollments = (
      SELECT COUNT(*) FROM enrollments WHERE sequence_id = NEW.sequence_id
    ),
    active_enrollments = (
      SELECT COUNT(*) FROM enrollments 
      WHERE sequence_id = NEW.sequence_id AND status = 'active'
    ),
    completed_enrollments = (
      SELECT COUNT(*) FROM enrollments 
      WHERE sequence_id = NEW.sequence_id AND status = 'completed'
    )
  WHERE id = NEW.sequence_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at
DROP TRIGGER IF EXISTS update_sequences_timestamp ON sequences;
CREATE TRIGGER update_sequences_timestamp
  BEFORE UPDATE ON sequences
  FOR EACH ROW
  EXECUTE FUNCTION update_sequence_updated_at();

DROP TRIGGER IF EXISTS update_sequence_steps_timestamp ON sequence_steps;
CREATE TRIGGER update_sequence_steps_timestamp
  BEFORE UPDATE ON sequence_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_sequence_updated_at();

DROP TRIGGER IF EXISTS update_enrollments_timestamp ON enrollments;
CREATE TRIGGER update_enrollments_timestamp
  BEFORE UPDATE ON enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_sequence_updated_at();

-- Auto-update sequence analytics when enrollment changes
DROP TRIGGER IF EXISTS enrollment_analytics_trigger ON enrollments;
CREATE TRIGGER enrollment_analytics_trigger
  AFTER INSERT OR UPDATE OF status ON enrollments
  FOR EACH ROW
  EXECUTE FUNCTION update_sequence_analytics();

-- ============================================================================
-- VIEWS für häufige Queries
-- ============================================================================

-- View: Fällige Enrollments (für Scheduler)
CREATE OR REPLACE VIEW due_enrollments AS
SELECT 
  e.*,
  l.name as lead_name,
  l.email as lead_email,
  s.name as sequence_name,
  ss.step_name,
  ss.type as step_type,
  ss.template_id,
  ss.task_note
FROM enrollments e
JOIN leads l ON e.lead_id = l.id
JOIN sequences s ON e.sequence_id = s.id
JOIN sequence_steps ss ON ss.sequence_id = e.sequence_id 
  AND ss.step_order = e.current_step_order + 1
WHERE 
  e.status = 'active'
  AND e.next_step_at <= NOW()
  AND s.is_active = true
ORDER BY e.next_step_at ASC;

-- View: Sequence Performance Overview
CREATE OR REPLACE VIEW sequence_performance AS
SELECT 
  s.id,
  s.name,
  s.is_active,
  COUNT(DISTINCT e.id) as total_enrollments,
  COUNT(DISTINCT CASE WHEN e.status = 'active' THEN e.id END) as active_count,
  COUNT(DISTINCT CASE WHEN e.status = 'completed' THEN e.id END) as completed_count,
  COUNT(DISTINCT CASE WHEN e.outcome = 'meeting_booked' THEN e.id END) as meetings_booked,
  COUNT(DISTINCT CASE WHEN e.outcome = 'reply_received' THEN e.id END) as replies_received,
  AVG(e.steps_completed) as avg_steps_completed,
  (COUNT(DISTINCT CASE WHEN e.outcome IN ('meeting_booked', 'reply_received') THEN e.id END)::DECIMAL 
    / NULLIF(COUNT(DISTINCT e.id), 0) * 100) as success_rate
FROM sequences s
LEFT JOIN enrollments e ON s.id = e.sequence_id
GROUP BY s.id, s.name, s.is_active;

-- ============================================================================
-- COMMENTS für Dokumentation
-- ============================================================================
COMMENT ON TABLE sequences IS 'Multi-Touch Sales Kampagnen Container';
COMMENT ON TABLE sequence_steps IS 'Einzelne Steps (Email, Call, Task, etc.) innerhalb einer Sequence';
COMMENT ON TABLE enrollments IS 'Tracking welcher Lead in welcher Sequence ist und Status';
COMMENT ON TABLE enrollment_history IS 'Detaillierter Log aller Step-Ausführungen';

COMMENT ON COLUMN sequences.trigger_type IS 'Wie Leads eingeschrieben werden: manual, auto_stage, auto_score, auto_tag';
COMMENT ON COLUMN sequence_steps.delay_hours IS 'Wartezeit nach vorherigem Step in Stunden (Standard: 24h)';
COMMENT ON COLUMN enrollments.next_step_at IS 'Wann der nächste Step ausgeführt werden soll (für Scheduler)';
COMMENT ON COLUMN enrollments.outcome IS 'Final outcome: meeting_booked, reply_received, opt_out, etc.';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Sequence Engine schema created successfully!';
  RAISE NOTICE '📋 Tables: sequences, sequence_steps, enrollments, enrollment_history';
  RAISE NOTICE '🔍 Indexes: 15 indexes created for performance';
  RAISE NOTICE '👁️  Views: due_enrollments, sequence_performance';
  RAISE NOTICE '⏰ Triggers: Auto-update timestamps and analytics';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Next steps:';
  RAISE NOTICE '1. Import sequences: python scripts/import_sequences.py data/sequences_definitions.json';
  RAISE NOTICE '2. Test API: http://localhost:8000/docs';
  RAISE NOTICE '3. Run scheduler: POST /api/sequences/run-scheduler';
END $$;


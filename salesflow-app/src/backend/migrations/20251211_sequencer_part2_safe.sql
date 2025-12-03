-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  SEQUENCER ENGINE - PART 2: INDEXES & RLS (SAFE)                           ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    -- sequences.status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sequences' AND column_name = 'status') THEN
        ALTER TABLE sequences ADD COLUMN status TEXT DEFAULT 'draft';
    END IF;
    
    -- sequence_enrollments.status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sequence_enrollments' AND column_name = 'status') THEN
        ALTER TABLE sequence_enrollments ADD COLUMN status TEXT DEFAULT 'active';
    END IF;
    
    -- sequence_actions.status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sequence_actions' AND column_name = 'status') THEN
        ALTER TABLE sequence_actions ADD COLUMN status TEXT DEFAULT 'pending';
    END IF;
    
    -- sequence_action_queue.status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sequence_action_queue' AND column_name = 'status') THEN
        ALTER TABLE sequence_action_queue ADD COLUMN status TEXT DEFAULT 'pending';
    END IF;
END $$;

-- INDEXES (safe)
CREATE INDEX IF NOT EXISTS idx_sequences_user ON sequences(user_id);
CREATE INDEX IF NOT EXISTS idx_sequence_steps_sequence ON sequence_steps(sequence_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_sequence ON sequence_enrollments(sequence_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON sequence_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_next_step ON sequence_enrollments(next_step_at);
CREATE INDEX IF NOT EXISTS idx_actions_enrollment ON sequence_actions(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_actions_step ON sequence_actions(step_id);
CREATE INDEX IF NOT EXISTS idx_queue_scheduled ON sequence_action_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_email_accounts_user ON email_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_tracking_action ON email_tracking_events(action_id);
CREATE INDEX IF NOT EXISTS idx_daily_stats_sequence ON sequence_daily_stats(sequence_id, stat_date);

-- Now create status indexes
CREATE INDEX IF NOT EXISTS idx_sequences_status ON sequences(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON sequence_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_actions_status ON sequence_actions(status);

-- RLS
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_action_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_daily_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own sequences" ON sequences;
CREATE POLICY "Users manage own sequences" ON sequences FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage sequence steps" ON sequence_steps;
CREATE POLICY "Users manage sequence steps" ON sequence_steps FOR ALL USING (
    EXISTS (SELECT 1 FROM sequences WHERE sequences.id = sequence_steps.sequence_id AND sequences.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users manage enrollments" ON sequence_enrollments;
CREATE POLICY "Users manage enrollments" ON sequence_enrollments FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own actions" ON sequence_actions;
CREATE POLICY "Users view own actions" ON sequence_actions FOR SELECT USING (
    EXISTS (SELECT 1 FROM sequence_enrollments WHERE sequence_enrollments.id = sequence_actions.enrollment_id AND sequence_enrollments.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users manage email accounts" ON email_accounts;
CREATE POLICY "Users manage email accounts" ON email_accounts FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage email templates" ON email_templates;
CREATE POLICY "Users manage email templates" ON email_templates FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users view own stats" ON sequence_daily_stats;
CREATE POLICY "Users view own stats" ON sequence_daily_stats FOR SELECT USING (
    EXISTS (SELECT 1 FROM sequences WHERE sequences.id = sequence_daily_stats.sequence_id AND sequences.user_id = auth.uid())
);

-- Helper Function
CREATE OR REPLACE FUNCTION personalize_content(p_content TEXT, p_variables JSONB) RETURNS TEXT AS $$
DECLARE
    result TEXT := p_content;
    k TEXT;
    v TEXT;
BEGIN
    FOR k, v IN SELECT * FROM jsonb_each_text(p_variables)
    LOOP
        result := REPLACE(result, '{{' || k || '}}', COALESCE(v, ''));
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

SELECT '✅ Part 2: Indexes & RLS created!' AS status;


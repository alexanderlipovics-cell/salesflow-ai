-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  SEQUENCER ENGINE - CLEAN INSTALL                                          ║
-- ║  Droppt alle alten Sequencer-Tabellen und erstellt sie neu                 ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- Drop in reverse order (respecting FKs)
DROP TABLE IF EXISTS email_tracking_events CASCADE;
DROP TABLE IF EXISTS sequence_daily_stats CASCADE;
DROP TABLE IF EXISTS sequence_action_queue CASCADE;
DROP TABLE IF EXISTS sequence_actions CASCADE;
DROP TABLE IF EXISTS sequence_enrollments CASCADE;
DROP TABLE IF EXISTS sequence_steps CASCADE;
DROP TABLE IF EXISTS sequences CASCADE;

-- ============================================================================
-- SEQUENCES (Campaigns)
-- ============================================================================
CREATE TABLE sequences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft',  -- draft, active, paused, completed, archived
    settings JSONB DEFAULT '{
        "timezone": "Europe/Berlin",
        "send_days": ["mon", "tue", "wed", "thu", "fri"],
        "send_hours_start": 9,
        "send_hours_end": 18,
        "max_per_day": 50,
        "stop_on_reply": true,
        "stop_on_bounce": true,
        "track_opens": true,
        "track_clicks": true
    }',
    stats JSONB DEFAULT '{"enrolled": 0, "active": 0, "completed": 0, "replied": 0}',
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    activated_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- SEQUENCE STEPS
-- ============================================================================
CREATE TABLE sequence_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    step_type TEXT NOT NULL,  -- email, linkedin_connect, linkedin_dm, linkedin_inmail, whatsapp, sms, wait, condition
    delay_days INTEGER DEFAULT 0,
    delay_hours INTEGER DEFAULT 0,
    delay_minutes INTEGER DEFAULT 0,
    subject TEXT,
    content TEXT,
    content_html TEXT,
    ab_variant TEXT,
    ab_split_percent INTEGER DEFAULT 50,
    condition_type TEXT,
    condition_step_id UUID,
    platform_settings JSONB DEFAULT '{}',
    stats JSONB DEFAULT '{"sent": 0, "opened": 0, "clicked": 0, "replied": 0}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(sequence_id, step_order)
);

-- ============================================================================
-- SEQUENCE ENROLLMENTS
-- ============================================================================
CREATE TABLE sequence_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID,
    contact_email TEXT,
    contact_name TEXT,
    contact_linkedin_url TEXT,
    contact_phone TEXT,
    variables JSONB DEFAULT '{}',
    status TEXT DEFAULT 'active',  -- active, paused, completed, replied, bounced, unsubscribed, stopped
    current_step INTEGER DEFAULT 0,
    next_step_at TIMESTAMP WITH TIME ZONE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    replied_at TIMESTAMP WITH TIME ZONE,
    stopped_at TIMESTAMP WITH TIME ZONE,
    stop_reason TEXT,
    ab_variant TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- SEQUENCE ACTIONS
-- ============================================================================
CREATE TABLE sequence_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID NOT NULL REFERENCES sequence_enrollments(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES sequence_steps(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending',  -- pending, scheduled, sent, delivered, opened, clicked, replied, bounced, failed
    sent_subject TEXT,
    sent_content TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    replied_at TIMESTAMP WITH TIME ZONE,
    bounced_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    message_id TEXT,
    tracking_id TEXT,
    platform_response JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ACTION QUEUE
-- ============================================================================
CREATE TABLE sequence_action_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID NOT NULL REFERENCES sequence_enrollments(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES sequence_steps(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    priority INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',  -- pending, processing, completed, failed, cancelled
    picked_up_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    worker_id TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- DAILY STATS
-- ============================================================================
CREATE TABLE sequence_daily_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
    stat_date DATE NOT NULL,
    enrolled INTEGER DEFAULT 0,
    sent INTEGER DEFAULT 0,
    delivered INTEGER DEFAULT 0,
    opened INTEGER DEFAULT 0,
    clicked INTEGER DEFAULT 0,
    replied INTEGER DEFAULT 0,
    bounced INTEGER DEFAULT 0,
    unsubscribed INTEGER DEFAULT 0,
    open_rate NUMERIC(5,4) DEFAULT 0,
    click_rate NUMERIC(5,4) DEFAULT 0,
    reply_rate NUMERIC(5,4) DEFAULT 0,
    bounce_rate NUMERIC(5,4) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(sequence_id, stat_date)
);

-- ============================================================================
-- EMAIL TRACKING EVENTS
-- ============================================================================
CREATE TABLE email_tracking_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_id UUID REFERENCES sequence_actions(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,  -- sent, delivered, opened, clicked, bounced, complained, unsubscribed
    ip_address TEXT,
    user_agent TEXT,
    link_url TEXT,
    geo_country TEXT,
    geo_city TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_seq_user ON sequences(user_id);
CREATE INDEX idx_seq_status ON sequences(status);
CREATE INDEX idx_steps_seq ON sequence_steps(sequence_id);
CREATE INDEX idx_enroll_seq ON sequence_enrollments(sequence_id);
CREATE INDEX idx_enroll_user ON sequence_enrollments(user_id);
CREATE INDEX idx_enroll_status ON sequence_enrollments(status);
CREATE INDEX idx_enroll_next ON sequence_enrollments(next_step_at) WHERE status = 'active';
CREATE INDEX idx_actions_enroll ON sequence_actions(enrollment_id);
CREATE INDEX idx_actions_step ON sequence_actions(step_id);
CREATE INDEX idx_actions_status ON sequence_actions(status);
CREATE INDEX idx_queue_scheduled ON sequence_action_queue(scheduled_at) WHERE status = 'pending';
CREATE INDEX idx_tracking_action ON email_tracking_events(action_id);
CREATE INDEX idx_stats_seq ON sequence_daily_stats(sequence_id, stat_date);

-- ============================================================================
-- RLS
-- ============================================================================
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_action_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_tracking_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seq_user_policy" ON sequences FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "steps_user_policy" ON sequence_steps FOR ALL USING (
    EXISTS (SELECT 1 FROM sequences s WHERE s.id = sequence_steps.sequence_id AND s.user_id = auth.uid())
);

CREATE POLICY "enroll_user_policy" ON sequence_enrollments FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "actions_user_policy" ON sequence_actions FOR SELECT USING (
    EXISTS (SELECT 1 FROM sequence_enrollments e WHERE e.id = sequence_actions.enrollment_id AND e.user_id = auth.uid())
);

CREATE POLICY "queue_user_policy" ON sequence_action_queue FOR SELECT USING (
    EXISTS (SELECT 1 FROM sequence_enrollments e WHERE e.id = sequence_action_queue.enrollment_id AND e.user_id = auth.uid())
);

CREATE POLICY "stats_user_policy" ON sequence_daily_stats FOR SELECT USING (
    EXISTS (SELECT 1 FROM sequences s WHERE s.id = sequence_daily_stats.sequence_id AND s.user_id = auth.uid())
);

CREATE POLICY "tracking_user_policy" ON email_tracking_events FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM sequence_actions a 
        JOIN sequence_enrollments e ON e.id = a.enrollment_id 
        WHERE a.id = email_tracking_events.action_id AND e.user_id = auth.uid()
    )
);

-- ============================================================================
-- HELPER FUNCTION
-- ============================================================================
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

SELECT '✅ Sequencer Engine: Clean Install Complete!' AS status;


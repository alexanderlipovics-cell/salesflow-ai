-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  SEQUENCER ENGINE - AUTOMATION SYSTEM                                      ║
-- ║  Multi-Channel Outreach Sequences (Email, LinkedIn, WhatsApp, etc.)        ║
-- ╚════════════════════════════════════════════════════════════════════════════╝
--
-- Konkurrent zu: salesflow.io, lemlist, instantly, etc.
--
-- FEATURES:
-- ✅ Multi-Step Sequences
-- ✅ Multi-Channel (Email, LinkedIn, WhatsApp, SMS)
-- ✅ Conditional Logic (if reply → stop)
-- ✅ A/B Testing
-- ✅ Personalization Variables
-- ✅ Rate Limiting & Scheduling
-- ✅ Analytics & Tracking
-- ============================================================================

-- ============================================================================
-- PHASE 1: CORE TABLES
-- ============================================================================

-- Sequences (Kampagnen/Workflows)
CREATE TABLE IF NOT EXISTS sequences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id),
    
    -- Basic Info
    name TEXT NOT NULL,
    description TEXT,
    
    -- Status
    status TEXT DEFAULT 'draft',  -- draft, active, paused, completed, archived
    
    -- Settings
    settings JSONB DEFAULT '{
        "timezone": "Europe/Berlin",
        "send_days": ["mon", "tue", "wed", "thu", "fri"],
        "send_hours_start": 9,
        "send_hours_end": 18,
        "max_per_day": 50,
        "stop_on_reply": true,
        "stop_on_bounce": true,
        "stop_on_unsubscribe": true,
        "track_opens": true,
        "track_clicks": true
    }',
    
    -- Stats (denormalized for performance)
    stats JSONB DEFAULT '{
        "enrolled": 0,
        "active": 0,
        "completed": 0,
        "replied": 0,
        "bounced": 0,
        "unsubscribed": 0
    }',
    
    -- Tags
    tags TEXT[] DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    activated_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Sequence Steps (einzelne Aktionen in einer Sequenz)
CREATE TABLE IF NOT EXISTS sequence_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
    
    -- Order
    step_order INTEGER NOT NULL,
    
    -- Step Type
    step_type TEXT NOT NULL,  -- email, linkedin_connect, linkedin_dm, linkedin_inmail, whatsapp, sms, wait, condition
    
    -- Timing
    delay_days INTEGER DEFAULT 0,
    delay_hours INTEGER DEFAULT 0,
    delay_minutes INTEGER DEFAULT 0,
    
    -- Content (for message steps)
    subject TEXT,  -- for email
    content TEXT,  -- message body
    content_html TEXT,  -- for email HTML
    
    -- A/B Testing
    ab_variant TEXT,  -- 'A', 'B', or NULL
    ab_split_percent INTEGER DEFAULT 50,  -- for variant A, B gets rest
    
    -- Conditional Logic
    condition_type TEXT,  -- NULL, 'if_no_reply', 'if_opened', 'if_clicked', 'if_accepted'
    condition_step_id UUID REFERENCES sequence_steps(id),  -- which step to check
    
    -- Platform-specific Settings
    platform_settings JSONB DEFAULT '{}',
    -- For LinkedIn: { "connection_note": "...", "inmail_subject": "..." }
    -- For Email: { "from_name": "...", "reply_to": "..." }
    
    -- Stats
    stats JSONB DEFAULT '{
        "sent": 0,
        "delivered": 0,
        "opened": 0,
        "clicked": 0,
        "replied": 0,
        "bounced": 0
    }',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(sequence_id, step_order)
);

-- Sequence Enrollments (Kontakte die in einer Sequenz sind)
CREATE TABLE IF NOT EXISTS sequence_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Contact Info (kann Lead sein oder manuell)
    lead_id UUID REFERENCES leads(id),
    contact_email TEXT,
    contact_name TEXT,
    contact_linkedin_url TEXT,
    contact_phone TEXT,
    
    -- Personalization Variables
    variables JSONB DEFAULT '{}',
    -- { "first_name": "Max", "company": "Acme", "custom_1": "..." }
    
    -- Status
    status TEXT DEFAULT 'active',  -- active, paused, completed, replied, bounced, unsubscribed, stopped
    
    -- Progress
    current_step INTEGER DEFAULT 0,
    next_step_at TIMESTAMP WITH TIME ZONE,
    
    -- Tracking
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    replied_at TIMESTAMP WITH TIME ZONE,
    stopped_at TIMESTAMP WITH TIME ZONE,
    stop_reason TEXT,
    
    -- A/B Assignment
    ab_variant TEXT,  -- 'A' or 'B'
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sequence Actions (ausgeführte Aktionen)
CREATE TABLE IF NOT EXISTS sequence_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID NOT NULL REFERENCES sequence_enrollments(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES sequence_steps(id) ON DELETE CASCADE,
    
    -- Action Info
    action_type TEXT NOT NULL,  -- same as step_type
    
    -- Status
    status TEXT DEFAULT 'pending',  -- pending, scheduled, sent, delivered, opened, clicked, replied, bounced, failed
    
    -- Content (actual sent content after personalization)
    sent_subject TEXT,
    sent_content TEXT,
    
    -- Timing
    scheduled_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    clicked_at TIMESTAMP WITH TIME ZONE,
    replied_at TIMESTAMP WITH TIME ZONE,
    bounced_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    
    -- Error Handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Tracking IDs
    message_id TEXT,  -- email message-id or platform-specific ID
    tracking_id TEXT,  -- for open/click tracking
    
    -- Platform Response
    platform_response JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PHASE 2: EMAIL INTEGRATION
-- ============================================================================

-- Email Accounts (SMTP Credentials)
CREATE TABLE IF NOT EXISTS email_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Account Info
    name TEXT NOT NULL,
    email_address TEXT NOT NULL,
    from_name TEXT,
    reply_to TEXT,
    
    -- Provider
    provider TEXT DEFAULT 'smtp',  -- smtp, sendgrid, mailgun, ses, gmail
    
    -- SMTP Settings
    smtp_host TEXT,
    smtp_port INTEGER DEFAULT 587,
    smtp_username TEXT,
    smtp_password TEXT,  -- encrypted
    smtp_secure BOOLEAN DEFAULT true,
    
    -- API Settings (for providers like SendGrid)
    api_key TEXT,  -- encrypted
    
    -- Rate Limiting
    daily_limit INTEGER DEFAULT 500,
    hourly_limit INTEGER DEFAULT 50,
    sent_today INTEGER DEFAULT 0,
    sent_this_hour INTEGER DEFAULT 0,
    last_reset_daily TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_reset_hourly TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Warmup
    is_warming_up BOOLEAN DEFAULT false,
    warmup_day INTEGER DEFAULT 0,
    warmup_schedule JSONB DEFAULT '[10, 15, 25, 40, 60, 80, 100, 150, 200, 300, 400, 500]',
    
    -- Health
    is_active BOOLEAN DEFAULT true,
    last_sent_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    consecutive_errors INTEGER DEFAULT 0,
    
    -- Verification
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Templates
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id),
    
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,  -- plain text with {{variables}}
    content_html TEXT,  -- HTML version
    
    -- Type
    template_type TEXT DEFAULT 'outreach',  -- outreach, followup, breakup, response
    
    -- Variables used
    variables_used TEXT[] DEFAULT '{}',  -- ['first_name', 'company', ...]
    
    -- Performance
    times_used INTEGER DEFAULT 0,
    open_rate NUMERIC(5,4) DEFAULT 0,
    click_rate NUMERIC(5,4) DEFAULT 0,
    reply_rate NUMERIC(5,4) DEFAULT 0,
    
    -- Tags
    tags TEXT[] DEFAULT '{}',
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Tracking Events
CREATE TABLE IF NOT EXISTS email_tracking_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_id UUID REFERENCES sequence_actions(id) ON DELETE CASCADE,
    
    event_type TEXT NOT NULL,  -- sent, delivered, opened, clicked, bounced, complained, unsubscribed
    
    -- Event Details
    ip_address TEXT,
    user_agent TEXT,
    link_url TEXT,  -- for click events
    
    -- Geolocation (optional)
    geo_country TEXT,
    geo_city TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PHASE 3: SCHEDULING & QUEUE
-- ============================================================================

-- Action Queue (für Scheduler)
CREATE TABLE IF NOT EXISTS sequence_action_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    enrollment_id UUID NOT NULL REFERENCES sequence_enrollments(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES sequence_steps(id) ON DELETE CASCADE,
    
    -- Scheduling
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    priority INTEGER DEFAULT 0,  -- higher = more urgent
    
    -- Status
    status TEXT DEFAULT 'pending',  -- pending, processing, completed, failed, cancelled
    
    -- Processing
    picked_up_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    worker_id TEXT,  -- which worker is processing
    
    -- Retry
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    last_error TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Scheduler Locks (für distributed processing)
CREATE TABLE IF NOT EXISTS scheduler_locks (
    id TEXT PRIMARY KEY,  -- e.g., 'sequence_processor', 'email_sender'
    locked_by TEXT,
    locked_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- PHASE 4: ANALYTICS
-- ============================================================================

-- Sequence Daily Stats (für Charts)
CREATE TABLE IF NOT EXISTS sequence_daily_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
    stat_date DATE NOT NULL,
    
    -- Counts
    enrolled INTEGER DEFAULT 0,
    sent INTEGER DEFAULT 0,
    delivered INTEGER DEFAULT 0,
    opened INTEGER DEFAULT 0,
    clicked INTEGER DEFAULT 0,
    replied INTEGER DEFAULT 0,
    bounced INTEGER DEFAULT 0,
    unsubscribed INTEGER DEFAULT 0,
    
    -- Rates
    open_rate NUMERIC(5,4) DEFAULT 0,
    click_rate NUMERIC(5,4) DEFAULT 0,
    reply_rate NUMERIC(5,4) DEFAULT 0,
    bounce_rate NUMERIC(5,4) DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(sequence_id, stat_date)
);

-- ============================================================================
-- PHASE 5: INDEXES
-- ============================================================================

-- Sequences
CREATE INDEX IF NOT EXISTS idx_sequences_user ON sequences(user_id);
CREATE INDEX IF NOT EXISTS idx_sequences_status ON sequences(status);
CREATE INDEX IF NOT EXISTS idx_sequences_company ON sequences(company_id);

-- Steps
CREATE INDEX IF NOT EXISTS idx_sequence_steps_sequence ON sequence_steps(sequence_id);
CREATE INDEX IF NOT EXISTS idx_sequence_steps_order ON sequence_steps(sequence_id, step_order);

-- Enrollments
CREATE INDEX IF NOT EXISTS idx_enrollments_sequence ON sequence_enrollments(sequence_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON sequence_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON sequence_enrollments(status);
CREATE INDEX IF NOT EXISTS idx_enrollments_next_step ON sequence_enrollments(next_step_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_enrollments_lead ON sequence_enrollments(lead_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_email ON sequence_enrollments(contact_email);

-- Actions
CREATE INDEX IF NOT EXISTS idx_actions_enrollment ON sequence_actions(enrollment_id);
CREATE INDEX IF NOT EXISTS idx_actions_step ON sequence_actions(step_id);
CREATE INDEX IF NOT EXISTS idx_actions_status ON sequence_actions(status);
CREATE INDEX IF NOT EXISTS idx_actions_scheduled ON sequence_actions(scheduled_at) WHERE status = 'scheduled';

-- Queue
CREATE INDEX IF NOT EXISTS idx_queue_scheduled ON sequence_action_queue(scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_queue_status ON sequence_action_queue(status);

-- Email Accounts
CREATE INDEX IF NOT EXISTS idx_email_accounts_user ON email_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_email_accounts_active ON email_accounts(user_id, is_active) WHERE is_active = true;

-- Tracking
CREATE INDEX IF NOT EXISTS idx_tracking_action ON email_tracking_events(action_id);
CREATE INDEX IF NOT EXISTS idx_tracking_type ON email_tracking_events(event_type);

-- Daily Stats
CREATE INDEX IF NOT EXISTS idx_daily_stats_sequence ON sequence_daily_stats(sequence_id, stat_date);

-- ============================================================================
-- PHASE 6: RLS POLICIES
-- ============================================================================

ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_action_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_daily_stats ENABLE ROW LEVEL SECURITY;

-- Sequences
DROP POLICY IF EXISTS "Users can manage own sequences" ON sequences;
CREATE POLICY "Users can manage own sequences" ON sequences
    FOR ALL USING (auth.uid() = user_id);

-- Steps
DROP POLICY IF EXISTS "Users can manage sequence steps" ON sequence_steps;
CREATE POLICY "Users can manage sequence steps" ON sequence_steps
    FOR ALL USING (
        EXISTS (SELECT 1 FROM sequences WHERE sequences.id = sequence_steps.sequence_id AND sequences.user_id = auth.uid())
    );

-- Enrollments
DROP POLICY IF EXISTS "Users can manage enrollments" ON sequence_enrollments;
CREATE POLICY "Users can manage enrollments" ON sequence_enrollments
    FOR ALL USING (auth.uid() = user_id);

-- Actions
DROP POLICY IF EXISTS "Users can view own actions" ON sequence_actions;
CREATE POLICY "Users can view own actions" ON sequence_actions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM sequence_enrollments WHERE sequence_enrollments.id = sequence_actions.enrollment_id AND sequence_enrollments.user_id = auth.uid())
    );

-- Email Accounts
DROP POLICY IF EXISTS "Users can manage email accounts" ON email_accounts;
CREATE POLICY "Users can manage email accounts" ON email_accounts
    FOR ALL USING (auth.uid() = user_id);

-- Email Templates
DROP POLICY IF EXISTS "Users can manage email templates" ON email_templates;
CREATE POLICY "Users can manage email templates" ON email_templates
    FOR ALL USING (auth.uid() = user_id);

-- Queue - Service account access (no user policy, handled by service)

-- Daily Stats
DROP POLICY IF EXISTS "Users can view own stats" ON sequence_daily_stats;
CREATE POLICY "Users can view own stats" ON sequence_daily_stats
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM sequences WHERE sequences.id = sequence_daily_stats.sequence_id AND sequences.user_id = auth.uid())
    );

-- ============================================================================
-- PHASE 7: HELPER FUNCTIONS
-- ============================================================================

-- Function: Personalize content with variables
CREATE OR REPLACE FUNCTION personalize_content(
    content TEXT,
    variables JSONB
) RETURNS TEXT AS $$
DECLARE
    result TEXT := content;
    key TEXT;
    value TEXT;
BEGIN
    FOR key, value IN SELECT * FROM jsonb_each_text(variables)
    LOOP
        result := REPLACE(result, '{{' || key || '}}', COALESCE(value, ''));
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate next step time
CREATE OR REPLACE FUNCTION calculate_next_step_time(
    base_time TIMESTAMP WITH TIME ZONE,
    delay_days INTEGER,
    delay_hours INTEGER,
    delay_minutes INTEGER,
    settings JSONB
) RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
    next_time TIMESTAMP WITH TIME ZONE;
    tz TEXT;
    send_start INTEGER;
    send_end INTEGER;
    next_hour INTEGER;
BEGIN
    tz := COALESCE(settings->>'timezone', 'Europe/Berlin');
    send_start := COALESCE((settings->>'send_hours_start')::INTEGER, 9);
    send_end := COALESCE((settings->>'send_hours_end')::INTEGER, 18);
    
    -- Add delay
    next_time := base_time + 
        (delay_days || ' days')::INTERVAL + 
        (delay_hours || ' hours')::INTERVAL + 
        (delay_minutes || ' minutes')::INTERVAL;
    
    -- Adjust to sending hours
    next_hour := EXTRACT(HOUR FROM next_time AT TIME ZONE tz);
    
    IF next_hour < send_start THEN
        next_time := DATE_TRUNC('day', next_time AT TIME ZONE tz) + (send_start || ' hours')::INTERVAL;
        next_time := next_time AT TIME ZONE tz;
    ELSIF next_hour >= send_end THEN
        next_time := DATE_TRUNC('day', next_time AT TIME ZONE tz) + INTERVAL '1 day' + (send_start || ' hours')::INTERVAL;
        next_time := next_time AT TIME ZONE tz;
    END IF;
    
    -- TODO: Skip weekends based on settings
    
    RETURN next_time;
END;
$$ LANGUAGE plpgsql;

-- Function: Update sequence stats
CREATE OR REPLACE FUNCTION update_sequence_stats(seq_id UUID) RETURNS VOID AS $$
BEGIN
    UPDATE sequences SET
        stats = jsonb_build_object(
            'enrolled', (SELECT COUNT(*) FROM sequence_enrollments se WHERE se.sequence_id = seq_id),
            'active', (SELECT COUNT(*) FROM sequence_enrollments se WHERE se.sequence_id = seq_id AND se.status = 'active'),
            'completed', (SELECT COUNT(*) FROM sequence_enrollments se WHERE se.sequence_id = seq_id AND se.status = 'completed'),
            'replied', (SELECT COUNT(*) FROM sequence_enrollments se WHERE se.sequence_id = seq_id AND se.status = 'replied'),
            'bounced', (SELECT COUNT(*) FROM sequence_enrollments se WHERE se.sequence_id = seq_id AND se.status = 'bounced'),
            'unsubscribed', (SELECT COUNT(*) FROM sequence_enrollments se WHERE se.sequence_id = seq_id AND se.status = 'unsubscribed')
        ),
        updated_at = NOW()
    WHERE id = seq_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update sequence stats on enrollment change
CREATE OR REPLACE FUNCTION trigger_update_sequence_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        PERFORM update_sequence_stats(NEW.sequence_id);
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM update_sequence_stats(OLD.sequence_id);
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_enrollment_stats ON sequence_enrollments;
CREATE TRIGGER trigger_enrollment_stats
    AFTER INSERT OR UPDATE OR DELETE ON sequence_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_sequence_stats();

-- ============================================================================
-- DONE!
-- ============================================================================

SELECT '✅ Sequencer Engine Migration erfolgreich!' AS status;


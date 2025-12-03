-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  SEQUENCER ENGINE - PART 1: TABLES                                         ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- Sequences (Kampagnen/Workflows)
CREATE TABLE IF NOT EXISTS sequences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft',
    settings JSONB DEFAULT '{"timezone": "Europe/Berlin", "send_days": ["mon", "tue", "wed", "thu", "fri"], "send_hours_start": 9, "send_hours_end": 18, "max_per_day": 50, "stop_on_reply": true}',
    stats JSONB DEFAULT '{"enrolled": 0, "active": 0, "completed": 0, "replied": 0}',
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    activated_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Sequence Steps
CREATE TABLE IF NOT EXISTS sequence_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    step_type TEXT NOT NULL,
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
    stats JSONB DEFAULT '{"sent": 0, "delivered": 0, "opened": 0, "clicked": 0, "replied": 0}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(sequence_id, step_order)
);

-- Sequence Enrollments
CREATE TABLE IF NOT EXISTS sequence_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID,
    contact_email TEXT,
    contact_name TEXT,
    contact_linkedin_url TEXT,
    contact_phone TEXT,
    variables JSONB DEFAULT '{}',
    status TEXT DEFAULT 'active',
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

-- Sequence Actions
CREATE TABLE IF NOT EXISTS sequence_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID NOT NULL REFERENCES sequence_enrollments(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES sequence_steps(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
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

-- Email Accounts
CREATE TABLE IF NOT EXISTS email_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email_address TEXT NOT NULL,
    from_name TEXT,
    reply_to TEXT,
    provider TEXT DEFAULT 'smtp',
    smtp_host TEXT,
    smtp_port INTEGER DEFAULT 587,
    smtp_username TEXT,
    smtp_password TEXT,
    smtp_secure BOOLEAN DEFAULT true,
    api_key TEXT,
    daily_limit INTEGER DEFAULT 500,
    hourly_limit INTEGER DEFAULT 50,
    sent_today INTEGER DEFAULT 0,
    sent_this_hour INTEGER DEFAULT 0,
    last_reset_daily TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_reset_hourly TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_warming_up BOOLEAN DEFAULT false,
    warmup_day INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    last_sent_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    consecutive_errors INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Templates
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    content TEXT NOT NULL,
    content_html TEXT,
    template_type TEXT DEFAULT 'outreach',
    variables_used TEXT[] DEFAULT '{}',
    times_used INTEGER DEFAULT 0,
    open_rate NUMERIC(5,4) DEFAULT 0,
    click_rate NUMERIC(5,4) DEFAULT 0,
    reply_rate NUMERIC(5,4) DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Email Tracking Events
CREATE TABLE IF NOT EXISTS email_tracking_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action_id UUID REFERENCES sequence_actions(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    link_url TEXT,
    geo_country TEXT,
    geo_city TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Action Queue
CREATE TABLE IF NOT EXISTS sequence_action_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID NOT NULL REFERENCES sequence_enrollments(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES sequence_steps(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    priority INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    picked_up_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    worker_id TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily Stats
CREATE TABLE IF NOT EXISTS sequence_daily_stats (
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

SELECT '✅ Part 1: Tables created!' AS status;


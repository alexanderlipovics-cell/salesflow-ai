-- Migration: Autopilot Engine V2 - Complete Schema
-- Date: 2025-01-06
-- Description: Multi-Channel, Scheduling, A/B Testing, Rate Limiting

-- ============================================================================
-- 1. CONTACTS TABLE (Extended for Scheduling)
-- ============================================================================

-- Check if contacts table exists, if not create it
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    name VARCHAR(200),
    company VARCHAR(200),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Add new columns for Autopilot V2 (if table exists)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS best_contact_time TIME;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS preferred_channel VARCHAR(50) DEFAULT 'email';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS opt_out_channels TEXT[] DEFAULT '{}';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS linkedin_id VARCHAR(200);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS instagram_id VARCHAR(200);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);

COMMENT ON COLUMN contacts.timezone IS 'IANA timezone (e.g., Europe/Berlin, America/New_York)';
COMMENT ON COLUMN contacts.best_contact_time IS 'Preferred contact time in local timezone (e.g., 14:00:00)';
COMMENT ON COLUMN contacts.opt_out_channels IS 'Channels user opted out from';

-- ============================================================================
-- 2. AUTOPILOT_JOBS TABLE (Scheduled Messages)
-- ============================================================================

CREATE TABLE IF NOT EXISTS autopilot_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    message_event_id UUID,  -- Link to triggering message event
    channel VARCHAR(50) NOT NULL,
    message_text TEXT NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',  -- pending, sending, sent, failed, cancelled
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    last_attempt_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    
    -- A/B Testing
    experiment_id UUID,
    variant_id VARCHAR(10),
    
    -- Metadata
    metadata JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_autopilot_jobs_scheduled 
    ON autopilot_jobs(scheduled_for) 
    WHERE status = 'pending';
    
CREATE INDEX IF NOT EXISTS idx_autopilot_jobs_user_contact 
    ON autopilot_jobs(user_id, contact_id);
    
CREATE INDEX IF NOT EXISTS idx_autopilot_jobs_status 
    ON autopilot_jobs(status);
    
CREATE INDEX IF NOT EXISTS idx_autopilot_jobs_experiment 
    ON autopilot_jobs(experiment_id, variant_id) 
    WHERE experiment_id IS NOT NULL;

COMMENT ON TABLE autopilot_jobs IS 'Scheduled messages for autopilot';
COMMENT ON COLUMN autopilot_jobs.scheduled_for IS 'When to send the message (UTC timestamp)';
COMMENT ON COLUMN autopilot_jobs.status IS 'Job status: pending, sending, sent, failed, cancelled';

-- ============================================================================
-- 3. AUTOPILOT_LOGS TABLE (Audit Trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS autopilot_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    job_id UUID REFERENCES autopilot_jobs(id) ON DELETE SET NULL,
    event_type VARCHAR(100) NOT NULL,
    channel VARCHAR(50),
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_autopilot_logs_user_created 
    ON autopilot_logs(user_id, created_at DESC);
    
CREATE INDEX IF NOT EXISTS idx_autopilot_logs_event_type 
    ON autopilot_logs(event_type);
    
CREATE INDEX IF NOT EXISTS idx_autopilot_logs_job_id 
    ON autopilot_logs(job_id) 
    WHERE job_id IS NOT NULL;

COMMENT ON TABLE autopilot_logs IS 'Audit trail for all autopilot events';
COMMENT ON COLUMN autopilot_logs.event_type IS 'Event type: message_received, suggestion_generated, message_sent, etc.';

-- ============================================================================
-- 4. AB_TEST_EXPERIMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ab_test_experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    variants JSONB NOT NULL,  -- Array of variants
    target_metric VARCHAR(100) NOT NULL,  -- reply_rate, conversion_rate, response_time
    traffic_split JSONB,  -- {"A": 0.33, "B": 0.33, "C": 0.34}
    status VARCHAR(50) DEFAULT 'active',  -- active, paused, completed
    winner_variant VARCHAR(10),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ab_experiments_status 
    ON ab_test_experiments(status);
    
CREATE INDEX IF NOT EXISTS idx_ab_experiments_created_by 
    ON ab_test_experiments(created_by);

COMMENT ON TABLE ab_test_experiments IS 'A/B test experiments for message templates';
COMMENT ON COLUMN ab_test_experiments.variants IS 'JSON array of variants: [{"id": "A", "template": "..."}]';

-- ============================================================================
-- 5. AB_TEST_RESULTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ab_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID NOT NULL REFERENCES ab_test_experiments(id) ON DELETE CASCADE,
    variant_id VARCHAR(10) NOT NULL,
    message_event_id UUID,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    metric_name VARCHAR(100) NOT NULL,  -- sent, opened, replied, converted
    metric_value FLOAT DEFAULT 1.0,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ab_results_experiment 
    ON ab_test_results(experiment_id, variant_id);
    
CREATE INDEX IF NOT EXISTS idx_ab_results_created 
    ON ab_test_results(created_at DESC);
    
CREATE INDEX IF NOT EXISTS idx_ab_results_metric 
    ON ab_test_results(experiment_id, metric_name);

COMMENT ON TABLE ab_test_results IS 'Metrics for A/B test experiments';
COMMENT ON COLUMN ab_test_results.metric_name IS 'Metric type: sent, opened, replied, converted';

-- ============================================================================
-- 6. RATE_LIMIT_COUNTERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS rate_limit_counters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    contact_id UUID,
    channel VARCHAR(50) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    count INT DEFAULT 0,
    last_increment_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_rate_limit UNIQUE(user_id, contact_id, channel, date)
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_user_date 
    ON rate_limit_counters(user_id, date);
    
CREATE INDEX IF NOT EXISTS idx_rate_limit_contact_channel 
    ON rate_limit_counters(contact_id, channel, date);

COMMENT ON TABLE rate_limit_counters IS 'Daily message counters for rate limiting';

-- ============================================================================
-- 7. CHANNEL_CREDENTIALS TABLE (API Keys/Tokens per User)
-- ============================================================================

CREATE TABLE IF NOT EXISTS channel_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    channel VARCHAR(50) NOT NULL,
    credentials JSONB NOT NULL,  -- Encrypted API keys/tokens
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    
    CONSTRAINT unique_user_channel UNIQUE(user_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_channel_credentials_user 
    ON channel_credentials(user_id);
    
CREATE INDEX IF NOT EXISTS idx_channel_credentials_channel 
    ON channel_credentials(channel);

COMMENT ON TABLE channel_credentials IS 'User-specific API credentials for external channels';
COMMENT ON COLUMN channel_credentials.credentials IS 'Encrypted JSON with API keys/tokens';

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at on contacts
CREATE OR REPLACE FUNCTION update_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS contacts_updated_at ON contacts;
CREATE TRIGGER contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_contacts_updated_at();

-- Auto-update updated_at on autopilot_jobs
CREATE OR REPLACE FUNCTION update_autopilot_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS autopilot_jobs_updated_at ON autopilot_jobs;
CREATE TRIGGER autopilot_jobs_updated_at
    BEFORE UPDATE ON autopilot_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_autopilot_jobs_updated_at();

-- ============================================================================
-- CLEANUP FUNCTIONS
-- ============================================================================

-- Cleanup old completed jobs (keep for 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_autopilot_jobs()
RETURNS void AS $$
BEGIN
    DELETE FROM autopilot_jobs 
    WHERE status IN ('sent', 'cancelled', 'failed')
      AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Cleanup old rate limit counters (keep for 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits()
RETURNS void AS $$
BEGIN
    DELETE FROM rate_limit_counters 
    WHERE date < CURRENT_DATE - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE autopilot_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE autopilot_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_credentials ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own data
CREATE POLICY contacts_select_own ON contacts
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY contacts_insert_own ON contacts
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY contacts_update_own ON contacts
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY contacts_delete_own ON contacts
    FOR DELETE USING (user_id = auth.uid());

-- Similar policies for other tables
CREATE POLICY autopilot_jobs_all_own ON autopilot_jobs
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY autopilot_logs_select_own ON autopilot_logs
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY ab_experiments_all_own ON ab_test_experiments
    FOR ALL USING (created_by = auth.uid());

CREATE POLICY ab_results_select_own ON ab_test_results
    FOR SELECT USING (
        experiment_id IN (
            SELECT id FROM ab_test_experiments WHERE created_by = auth.uid()
        )
    );

CREATE POLICY rate_limits_all_own ON rate_limit_counters
    FOR ALL USING (user_id = auth.uid());

CREATE POLICY channel_creds_all_own ON channel_credentials
    FOR ALL USING (user_id = auth.uid());

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify all tables created
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
--   AND table_name IN ('contacts', 'autopilot_jobs', 'autopilot_logs', 
--                      'ab_test_experiments', 'ab_test_results', 
--                      'rate_limit_counters', 'channel_credentials');

-- ============================================================================
-- SAMPLE DATA (Development Only)
-- ============================================================================

-- Add sample contact with timezone
-- INSERT INTO contacts (user_id, name, email, phone, timezone, best_contact_time, preferred_channel)
-- VALUES (
--     'demo-user',
--     'Max Mustermann',
--     'max@example.com',
--     '+49123456789',
--     'Europe/Berlin',
--     '14:00:00'::time,
--     'whatsapp'
-- );

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- DROP TABLE IF EXISTS channel_credentials CASCADE;
-- DROP TABLE IF EXISTS rate_limit_counters CASCADE;
-- DROP TABLE IF EXISTS ab_test_results CASCADE;
-- DROP TABLE IF EXISTS ab_test_experiments CASCADE;
-- DROP TABLE IF EXISTS autopilot_logs CASCADE;
-- DROP TABLE IF EXISTS autopilot_jobs CASCADE;
-- DROP FUNCTION IF EXISTS cleanup_old_autopilot_jobs CASCADE;
-- DROP FUNCTION IF EXISTS cleanup_old_rate_limits CASCADE;


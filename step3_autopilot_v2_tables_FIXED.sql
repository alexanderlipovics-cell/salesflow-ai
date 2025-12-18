-- ============================================================================
-- SCHRITT 3: Autopilot V2 Tabellen erstellen (FIXED VERSION)
-- ============================================================================
-- Diese Version behandelt den Fall, dass Tabellen bereits existieren
-- ============================================================================

-- Prüfung: Existiert message_events Tabelle? (wird benötigt)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_name = 'message_events'
    ) THEN
        RAISE EXCEPTION '❌ FEHLER: message_events Tabelle existiert nicht! Führen Sie zuerst step2_message_events.sql aus.';
    END IF;
END $$;

-- ============================================================================
-- 1. AUTOPILOT JOBS (Scheduled Messages)
-- ============================================================================

CREATE TABLE IF NOT EXISTS autopilot_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    contact_id UUID NOT NULL,
    message_event_id UUID REFERENCES message_events(id),
    
    -- Message Details
    channel TEXT NOT NULL,
    message_text TEXT NOT NULL,
    
    -- Scheduling
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    
    -- Status & Retry Logic
    status TEXT NOT NULL DEFAULT 'pending',  -- pending, sending, sent, failed, cancelled
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    error_message TEXT,
    last_attempt_at TIMESTAMPTZ,
    
    -- A/B Testing
    experiment_id UUID,
    variant_id TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT autopilot_jobs_status_check CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'cancelled'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_autopilot_jobs_scheduled 
    ON autopilot_jobs(scheduled_for) 
    WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_autopilot_jobs_user ON autopilot_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_autopilot_jobs_contact ON autopilot_jobs(contact_id);
CREATE INDEX IF NOT EXISTS idx_autopilot_jobs_status ON autopilot_jobs(status);
CREATE INDEX IF NOT EXISTS idx_autopilot_jobs_created ON autopilot_jobs(created_at DESC);

-- ============================================================================
-- 2. RATE LIMIT COUNTERS (Anti-Spam)
-- ============================================================================

CREATE TABLE IF NOT EXISTS rate_limit_counters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    contact_id UUID NOT NULL,
    channel TEXT NOT NULL,
    date DATE NOT NULL,
    count INT NOT NULL DEFAULT 0,
    last_increment_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Unique constraint: One counter per user/contact/channel/day
    UNIQUE(user_id, contact_id, channel, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rate_limit_date ON rate_limit_counters(date);
CREATE INDEX IF NOT EXISTS idx_rate_limit_user_contact ON rate_limit_counters(user_id, contact_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_channel ON rate_limit_counters(channel);

-- ============================================================================
-- 3. A/B TEST EXPERIMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS ab_test_experiments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'active',  -- active, paused, completed
    
    -- Variants (JSON array)
    variants JSONB NOT NULL,  -- [{id: 'A', template: '...', name: '...'}, ...]
    traffic_split JSONB NOT NULL DEFAULT '{}',  -- {A: 0.5, B: 0.5}
    
    -- Target Metric
    target_metric TEXT NOT NULL,  -- reply_rate, conversion_rate, open_rate
    
    -- Context (where to use)
    context TEXT,  -- objection_handler, follow_up, cold_outreach, etc.
    
    -- Sample Size
    min_sample_size INT NOT NULL DEFAULT 30,
    
    -- Metadata
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    winner_variant_id TEXT,
    
    -- Constraints
    CONSTRAINT ab_experiments_status_check CHECK (status IN ('draft', 'active', 'paused', 'completed'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ab_experiments_status ON ab_test_experiments(status);
CREATE INDEX IF NOT EXISTS idx_ab_experiments_context ON ab_test_experiments(context);
CREATE INDEX IF NOT EXISTS idx_ab_experiments_created_by ON ab_test_experiments(created_by);

-- ============================================================================
-- 4. A/B TEST RESULTS (Metrics Tracking)
-- ============================================================================

-- Lösche Tabelle falls sie existiert (um sauber neu zu erstellen)
DROP TABLE IF EXISTS ab_test_results CASCADE;

-- Erstelle Tabelle neu
CREATE TABLE ab_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id UUID NOT NULL REFERENCES ab_test_experiments(id) ON DELETE CASCADE,
    variant_id TEXT NOT NULL,
    
    -- Message Link
    message_event_id UUID REFERENCES message_events(id),
    autopilot_job_id UUID REFERENCES autopilot_jobs(id),
    contact_id UUID NOT NULL,
    
    -- Metric
    metric_name TEXT NOT NULL,  -- sent, opened, replied, converted, clicked
    metric_value FLOAT NOT NULL DEFAULT 1.0,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT ab_results_metric_check CHECK (metric_name IN ('sent', 'opened', 'replied', 'converted', 'clicked'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ab_results_experiment ON ab_test_results(experiment_id);
CREATE INDEX IF NOT EXISTS idx_ab_results_variant ON ab_test_results(experiment_id, variant_id);
CREATE INDEX IF NOT EXISTS idx_ab_results_metric ON ab_test_results(metric_name);
CREATE INDEX IF NOT EXISTS idx_ab_results_contact ON ab_test_results(contact_id);

-- ============================================================================
-- 5. CHANNEL CREDENTIALS (Secure Storage for API Keys)
-- ============================================================================

CREATE TABLE IF NOT EXISTS channel_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    channel TEXT NOT NULL,
    
    -- Credentials (encrypted in production!)
    credentials JSONB NOT NULL,  -- {api_key: '...', phone_id: '...', etc.}
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_verified_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    
    -- Unique constraint
    UNIQUE(user_id, channel)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_channel_creds_user ON channel_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_creds_channel ON channel_credentials(channel);

-- ============================================================================
-- UPDATE TRIGGERS
-- ============================================================================

-- Auto-update updated_at on autopilot_jobs
CREATE OR REPLACE FUNCTION update_autopilot_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_autopilot_jobs_updated_at ON autopilot_jobs;

CREATE TRIGGER trigger_autopilot_jobs_updated_at
    BEFORE UPDATE ON autopilot_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_autopilot_jobs_updated_at();

-- Auto-update updated_at on channel_credentials
DROP TRIGGER IF EXISTS trigger_channel_credentials_updated_at ON channel_credentials;

CREATE TRIGGER trigger_channel_credentials_updated_at
    BEFORE UPDATE ON channel_credentials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE autopilot_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limit_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_credentials ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own data
-- Drop existing policies first (if they exist)
DROP POLICY IF EXISTS autopilot_jobs_user_own ON autopilot_jobs;
DROP POLICY IF EXISTS rate_limit_counters_user_own ON rate_limit_counters;
DROP POLICY IF EXISTS ab_experiments_user_own ON ab_test_experiments;
DROP POLICY IF EXISTS ab_results_user_own ON ab_test_results;
DROP POLICY IF EXISTS channel_credentials_user_own ON channel_credentials;

-- Create policies
CREATE POLICY autopilot_jobs_user_own ON autopilot_jobs
    FOR ALL
    USING (user_id = auth.uid());

CREATE POLICY rate_limit_counters_user_own ON rate_limit_counters
    FOR ALL
    USING (user_id = auth.uid());

CREATE POLICY ab_experiments_user_own ON ab_test_experiments
    FOR ALL
    USING (created_by = auth.uid());

CREATE POLICY ab_results_user_own ON ab_test_results
    FOR ALL
    USING (contact_id IN (
        SELECT id FROM contacts WHERE user_id = auth.uid()
    ));

CREATE POLICY channel_credentials_user_own ON channel_credentials
    FOR ALL
    USING (user_id = auth.uid());

-- ============================================================================
-- CLEANUP FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_rate_limit_counters()
RETURNS void AS $$
BEGIN
    -- Delete counters older than 30 days
    DELETE FROM rate_limit_counters 
    WHERE date < CURRENT_DATE - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_old_autopilot_jobs()
RETURNS void AS $$
BEGIN
    -- Delete sent/failed jobs older than 90 days
    DELETE FROM autopilot_jobs 
    WHERE status IN ('sent', 'failed', 'cancelled')
      AND created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE autopilot_jobs IS 'Scheduled autopilot messages waiting to be sent';
COMMENT ON TABLE rate_limit_counters IS 'Daily message counters for rate limiting';
COMMENT ON TABLE ab_test_experiments IS 'A/B test experiments for template optimization';
COMMENT ON TABLE ab_test_results IS 'Metrics tracking for A/B tests';
COMMENT ON TABLE channel_credentials IS 'Encrypted API credentials for messaging channels';

-- ============================================================================
-- SCHEMA CACHE RELOAD
-- ============================================================================

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Prüfen ob alle Tabellen erstellt wurden
SELECT 
    table_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
              AND table_name = t.table_name
        ) THEN '✅ Erstellt'
        ELSE '❌ Fehlt'
    END as status
FROM (VALUES 
    ('autopilot_jobs'),
    ('rate_limit_counters'),
    ('ab_test_experiments'),
    ('ab_test_results'),
    ('channel_credentials')
) AS t(table_name);


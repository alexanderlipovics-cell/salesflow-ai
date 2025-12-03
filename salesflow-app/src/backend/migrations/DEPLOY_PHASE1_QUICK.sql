-- ═══════════════════════════════════════════════════════════════════════════════
-- SALES FLOW AI - PHASE 1 QUICK DEPLOYMENT
-- Kopiere dieses SQL in den Supabase SQL Editor und führe es aus
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. SCHEDULED_JOBS - Background Job Queue
CREATE TABLE IF NOT EXISTS scheduled_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    user_id UUID,
    job_type VARCHAR(100) NOT NULL,
    job_name VARCHAR(255),
    payload JSONB NOT NULL DEFAULT '{}',
    run_at TIMESTAMPTZ NOT NULL,
    priority INT DEFAULT 5,
    status VARCHAR(50) DEFAULT 'pending',
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    last_error TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    execution_time_ms INT,
    result JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    parent_job_id UUID,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_rule VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_status_run_at 
    ON scheduled_jobs(status, run_at) 
    WHERE status IN ('pending', 'retrying');

CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_user_id ON scheduled_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_job_type ON scheduled_jobs(job_type);

ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own jobs" ON scheduled_jobs;
CREATE POLICY "Users can view their own jobs" ON scheduled_jobs
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own jobs" ON scheduled_jobs;
CREATE POLICY "Users can create their own jobs" ON scheduled_jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own jobs" ON scheduled_jobs;
CREATE POLICY "Users can update their own jobs" ON scheduled_jobs
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all jobs" ON scheduled_jobs;
CREATE POLICY "Service role can manage all jobs" ON scheduled_jobs
    FOR ALL USING (auth.role() = 'service_role');


-- 2. AI_INTERACTIONS - AI Call Logging
CREATE TABLE IF NOT EXISTS ai_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    user_id UUID,
    lead_id UUID,
    deal_id UUID,
    session_id UUID,
    skill_name VARCHAR(100) NOT NULL,
    skill_version VARCHAR(20) DEFAULT '1.0',
    prompt_version VARCHAR(20) DEFAULT '1.0',
    provider VARCHAR(50) NOT NULL,
    model VARCHAR(100) NOT NULL,
    temperature FLOAT,
    request_summary TEXT,
    request_payload JSONB,
    response_summary TEXT,
    response_payload JSONB,
    latency_ms INT,
    tokens_in INT,
    tokens_out INT,
    tokens_total INT GENERATED ALWAYS AS (COALESCE(tokens_in, 0) + COALESCE(tokens_out, 0)) STORED,
    cost_usd DECIMAL(10, 6),
    used_in_message BOOLEAN DEFAULT FALSE,
    outcome_status VARCHAR(50) DEFAULT 'unknown',
    outcome_updated_at TIMESTAMPTZ,
    user_rating INT,
    user_feedback TEXT,
    error_type VARCHAR(100),
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_ai_interactions_user_id ON ai_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_skill_name ON ai_interactions(skill_name);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_created_at ON ai_interactions(created_at DESC);

ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own AI interactions" ON ai_interactions;
CREATE POLICY "Users can view their own AI interactions" ON ai_interactions
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create AI interactions" ON ai_interactions;
CREATE POLICY "Users can create AI interactions" ON ai_interactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own AI interactions" ON ai_interactions;
CREATE POLICY "Users can update their own AI interactions" ON ai_interactions
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all AI interactions" ON ai_interactions;
CREATE POLICY "Service role can manage all AI interactions" ON ai_interactions
    FOR ALL USING (auth.role() = 'service_role');


-- 3. FEATURE_FLAGS - Plan-based Feature Control
CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    user_id UUID,
    plan_name VARCHAR(50) DEFAULT 'free',
    flags JSONB NOT NULL DEFAULT '{
        "autopilot": false,
        "sequences": false,
        "aura_dashboard": false,
        "ghost_buster": true,
        "live_assist": false,
        "voice_features": false,
        "team_features": false,
        "custom_branding": false,
        "api_access": false,
        "white_label": false,
        "priority_support": false,
        "advanced_analytics": false,
        "vertical_playbooks": false,
        "compliance_check": true,
        "ai_skill_limit": 100,
        "leads_limit": 100,
        "team_members_limit": 1
    }',
    monthly_ai_calls_limit INT DEFAULT 1000,
    monthly_ai_calls_used INT DEFAULT 0,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    subscription_status VARCHAR(50) DEFAULT 'inactive',
    trial_ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_company_id ON feature_flags(company_id);
CREATE INDEX IF NOT EXISTS idx_feature_flags_user_id ON feature_flags(user_id);

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their feature flags" ON feature_flags;
CREATE POLICY "Users can view their feature flags" ON feature_flags
    FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role can manage feature flags" ON feature_flags;
CREATE POLICY "Service role can manage feature flags" ON feature_flags
    FOR ALL USING (auth.role() = 'service_role');


-- 4. COMPANY_SETTINGS - Locale & Preferences
CREATE TABLE IF NOT EXISTS company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID UNIQUE,
    locale VARCHAR(10) DEFAULT 'de-DE',
    timezone VARCHAR(50) DEFAULT 'Europe/Berlin',
    default_currency VARCHAR(3) DEFAULT 'EUR',
    date_format VARCHAR(20) DEFAULT 'DD.MM.YYYY',
    time_format VARCHAR(10) DEFAULT '24h',
    number_format VARCHAR(20) DEFAULT 'de',
    ai_language VARCHAR(10) DEFAULT 'de',
    ai_tone VARCHAR(50) DEFAULT 'professional',
    primary_vertical VARCHAR(50) DEFAULT 'network_marketing',
    company_color_primary VARCHAR(7),
    company_color_secondary VARCHAR(7),
    logo_url TEXT,
    compliance_level VARCHAR(20) DEFAULT 'standard',
    require_compliance_check BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their company settings" ON company_settings;
CREATE POLICY "Users can view their company settings" ON company_settings
    FOR SELECT USING (auth.role() = 'service_role' OR auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Service role can manage company settings" ON company_settings;
CREATE POLICY "Service role can manage company settings" ON company_settings
    FOR ALL USING (auth.role() = 'service_role');


-- 5. TEMPLATE_METRICS - For Data Flywheel
CREATE TABLE IF NOT EXISTS template_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL,
    user_id UUID,
    sent_count INT DEFAULT 0,
    reply_count INT DEFAULT 0,
    meeting_count INT DEFAULT 0,
    deal_count INT DEFAULT 0,
    avg_response_time_hours FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_template_metrics_template_id ON template_metrics(template_id);
CREATE INDEX IF NOT EXISTS idx_template_metrics_user_id ON template_metrics(user_id);

ALTER TABLE template_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their template metrics" ON template_metrics;
CREATE POLICY "Users can view their template metrics" ON template_metrics
    FOR ALL USING (auth.uid() = user_id OR auth.role() = 'service_role');


-- 6. USER_INTEGRATIONS - For Integration Layer
CREATE TABLE IF NOT EXISTS user_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    provider VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'not_connected',
    connected_at TIMESTAMPTZ,
    last_sync_at TIMESTAMPTZ,
    error_message TEXT,
    account_info JSONB,
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_user_integrations_user_id ON user_integrations(user_id);

ALTER TABLE user_integrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their integrations" ON user_integrations;
CREATE POLICY "Users can manage their integrations" ON user_integrations
    FOR ALL USING (auth.uid() = user_id OR auth.role() = 'service_role');


-- 7. OAUTH_STATES - For OAuth Flow
CREATE TABLE IF NOT EXISTS oauth_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state VARCHAR(255) UNIQUE NOT NULL,
    user_id UUID NOT NULL,
    provider VARCHAR(50) NOT NULL,
    redirect_uri TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '10 minutes'
);

CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON oauth_states(state);


-- 8. HELPER FUNCTIONS
CREATE OR REPLACE FUNCTION get_pending_jobs(
    p_limit INT DEFAULT 10,
    p_job_types TEXT[] DEFAULT NULL
)
RETURNS SETOF scheduled_jobs
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    UPDATE scheduled_jobs
    SET 
        status = 'running',
        started_at = NOW(),
        attempts = attempts + 1,
        updated_at = NOW()
    WHERE id IN (
        SELECT id FROM scheduled_jobs
        WHERE status IN ('pending', 'retrying')
          AND run_at <= NOW()
          AND attempts < max_attempts
          AND (p_job_types IS NULL OR job_type = ANY(p_job_types))
        ORDER BY priority ASC, run_at ASC
        LIMIT p_limit
        FOR UPDATE SKIP LOCKED
    )
    RETURNING *;
END;
$$;

CREATE OR REPLACE FUNCTION complete_job(
    p_job_id UUID,
    p_result JSONB DEFAULT NULL
)
RETURNS scheduled_jobs
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_job scheduled_jobs;
BEGIN
    UPDATE scheduled_jobs
    SET 
        status = 'completed',
        completed_at = NOW(),
        execution_time_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000,
        result = p_result,
        updated_at = NOW()
    WHERE id = p_job_id
    RETURNING * INTO v_job;
    
    RETURN v_job;
END;
$$;

CREATE OR REPLACE FUNCTION fail_job(
    p_job_id UUID,
    p_error TEXT
)
RETURNS scheduled_jobs
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_job scheduled_jobs;
BEGIN
    UPDATE scheduled_jobs
    SET 
        status = CASE 
            WHEN attempts < max_attempts THEN 'retrying' 
            ELSE 'failed' 
        END,
        last_error = p_error,
        completed_at = NOW(),
        execution_time_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000,
        updated_at = NOW()
    WHERE id = p_job_id
    RETURNING * INTO v_job;
    
    RETURN v_job;
END;
$$;


-- 9. UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_scheduled_jobs_updated_at ON scheduled_jobs;
CREATE TRIGGER update_scheduled_jobs_updated_at
    BEFORE UPDATE ON scheduled_jobs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_feature_flags_updated_at ON feature_flags;
CREATE TRIGGER update_feature_flags_updated_at
    BEFORE UPDATE ON feature_flags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_company_settings_updated_at ON company_settings;
CREATE TRIGGER update_company_settings_updated_at
    BEFORE UPDATE ON company_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_template_metrics_updated_at ON template_metrics;
CREATE TRIGGER update_template_metrics_updated_at
    BEFORE UPDATE ON template_metrics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_integrations_updated_at ON user_integrations;
CREATE TRIGGER update_user_integrations_updated_at
    BEFORE UPDATE ON user_integrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- 10. DEFAULT DATA
INSERT INTO feature_flags (company_id, user_id, plan_name, flags)
VALUES (NULL, NULL, 'free', '{
    "autopilot": false,
    "sequences": false,
    "aura_dashboard": false,
    "ghost_buster": true,
    "live_assist": false,
    "voice_features": false,
    "team_features": false,
    "custom_branding": false,
    "api_access": false,
    "white_label": false,
    "priority_support": false,
    "advanced_analytics": false,
    "vertical_playbooks": false,
    "compliance_check": true,
    "ai_skill_limit": 100,
    "leads_limit": 100,
    "team_members_limit": 1
}'::JSONB)
ON CONFLICT DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════════
-- ✅ MIGRATION COMPLETE
-- ═══════════════════════════════════════════════════════════════════════════════
SELECT 'Phase 1 Migration erfolgreich!' as status;


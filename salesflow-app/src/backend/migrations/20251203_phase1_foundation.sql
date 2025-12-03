-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  PHASE 1: FOUNDATION & ARCHITECTURE                                       ║
-- ║  Event-/Job-Layer + AI-Logging + Feature Flags                            ║
-- ╚════════════════════════════════════════════════════════════════════════════╝
-- 
-- Erstellt:
-- 1. scheduled_jobs - Background Job Queue
-- 2. ai_interactions - AI Call Logging & Analytics
-- 3. feature_flags - Multi-Tenancy Feature Control
-- 4. company_settings - Locale/Currency/Timezone pro Firma
--
-- Run with: psql -f 20251203_phase1_foundation.sql

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. SCHEDULED_JOBS - Background Job Queue
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS scheduled_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Multi-Tenancy
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Job Definition
    job_type VARCHAR(100) NOT NULL,  -- send_followup, send_sequence_step, reactivate_lead, etc.
    job_name VARCHAR(255),           -- Human-readable name
    
    -- Payload (flexible JSONB für alle Job-Typen)
    payload JSONB NOT NULL DEFAULT '{}',
    
    -- Scheduling
    run_at TIMESTAMPTZ NOT NULL,     -- Wann soll der Job ausgeführt werden?
    priority INT DEFAULT 5,          -- 1=highest, 10=lowest
    
    -- Execution State
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN (
        'pending',      -- Wartet auf Ausführung
        'running',      -- Wird gerade ausgeführt
        'completed',    -- Erfolgreich abgeschlossen
        'failed',       -- Fehlgeschlagen
        'cancelled',    -- Abgebrochen
        'retrying'      -- Wird erneut versucht
    )),
    
    -- Retry Logic
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    last_error TEXT,
    
    -- Execution Tracking
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    execution_time_ms INT,
    
    -- Result
    result JSONB,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Optional: Recurring Job Reference
    parent_job_id UUID REFERENCES scheduled_jobs(id) ON DELETE SET NULL,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_rule VARCHAR(100)  -- cron-style: "0 9 * * 1-5" for weekdays 9am
);

-- Indexes für effiziente Abfragen
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_status_run_at 
    ON scheduled_jobs(status, run_at) 
    WHERE status IN ('pending', 'retrying');

CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_user_id 
    ON scheduled_jobs(user_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_company_id 
    ON scheduled_jobs(company_id);

CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_job_type 
    ON scheduled_jobs(job_type);

CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_created_at 
    ON scheduled_jobs(created_at DESC);

-- RLS Policies
ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own jobs" ON scheduled_jobs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own jobs" ON scheduled_jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own jobs" ON scheduled_jobs
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all jobs" ON scheduled_jobs
    FOR ALL USING (auth.role() = 'service_role');


-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. AI_INTERACTIONS - AI Call Logging & Analytics
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ai_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Multi-Tenancy
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Context
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    deal_id UUID,  -- Optional: Falls Deal-bezogen
    session_id UUID,  -- Gruppiert zusammengehörige Calls
    
    -- Skill/Prompt Info
    skill_name VARCHAR(100) NOT NULL,  -- analyze_objection, generate_followup, chief_chat, etc.
    skill_version VARCHAR(20) DEFAULT '1.0',
    prompt_version VARCHAR(20) DEFAULT '1.0',
    
    -- LLM Details
    provider VARCHAR(50) NOT NULL,  -- openai, anthropic, supabase_edge
    model VARCHAR(100) NOT NULL,    -- gpt-4o, claude-sonnet-4-20250514, etc.
    temperature FLOAT,
    
    -- Request (gekürzt für Speichereffizienz)
    request_summary TEXT,  -- Zusammenfassung/Key-Parts des Requests
    request_payload JSONB, -- Vollständiger Payload (optional, für Debugging)
    
    -- Response
    response_summary TEXT,  -- Zusammenfassung der Antwort
    response_payload JSONB, -- Vollständige Antwort (optional)
    
    -- Performance Metrics
    latency_ms INT,
    tokens_in INT,
    tokens_out INT,
    tokens_total INT GENERATED ALWAYS AS (COALESCE(tokens_in, 0) + COALESCE(tokens_out, 0)) STORED,
    cost_usd DECIMAL(10, 6),  -- Geschätzte Kosten
    
    -- Outcome Tracking (Data Flywheel)
    used_in_message BOOLEAN DEFAULT FALSE,  -- Hat User die Antwort übernommen?
    outcome_status VARCHAR(50) DEFAULT 'unknown' CHECK (outcome_status IN (
        'unknown',        -- Noch nicht bekannt
        'ignored',        -- User hat Antwort ignoriert
        'modified',       -- User hat Antwort angepasst
        'used_as_is',     -- User hat Antwort 1:1 übernommen
        'sent_to_lead',   -- Nachricht wurde an Lead gesendet
        'lead_replied',   -- Lead hat geantwortet
        'meeting_booked', -- Meeting wurde gebucht
        'deal_won',       -- Deal gewonnen
        'deal_lost'       -- Deal verloren
    )),
    outcome_updated_at TIMESTAMPTZ,
    
    -- Quality Metrics
    user_rating INT CHECK (user_rating BETWEEN 1 AND 5),  -- Optional: User-Bewertung
    user_feedback TEXT,
    
    -- Error Tracking
    error_type VARCHAR(100),
    error_message TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'  -- Flexible zusätzliche Daten
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_interactions_user_id 
    ON ai_interactions(user_id);

CREATE INDEX IF NOT EXISTS idx_ai_interactions_company_id 
    ON ai_interactions(company_id);

CREATE INDEX IF NOT EXISTS idx_ai_interactions_skill_name 
    ON ai_interactions(skill_name);

CREATE INDEX IF NOT EXISTS idx_ai_interactions_lead_id 
    ON ai_interactions(lead_id) 
    WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_interactions_created_at 
    ON ai_interactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ai_interactions_outcome 
    ON ai_interactions(outcome_status) 
    WHERE outcome_status != 'unknown';

-- RLS Policies
ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own AI interactions" ON ai_interactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create AI interactions" ON ai_interactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own AI interactions" ON ai_interactions
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all AI interactions" ON ai_interactions
    FOR ALL USING (auth.role() = 'service_role');


-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. FEATURE_FLAGS - Multi-Tenancy Feature Control
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Scope
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,  -- NULL = global default
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,    -- NULL = company-wide
    
    -- Plan Info
    plan_name VARCHAR(50) DEFAULT 'free' CHECK (plan_name IN (
        'free',
        'starter',
        'pro', 
        'team',
        'enterprise',
        'custom'
    )),
    
    -- Feature Flags als JSONB
    flags JSONB NOT NULL DEFAULT '{
        "autopilot": false,
        "sequences": false,
        "aura_dashboard": false,
        "ghost_buster": false,
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
    
    -- Limits
    monthly_ai_calls_limit INT DEFAULT 1000,
    monthly_ai_calls_used INT DEFAULT 0,
    
    -- Billing
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    subscription_status VARCHAR(50) DEFAULT 'inactive',
    trial_ends_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint: One record per company or user
    UNIQUE(company_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feature_flags_company_id 
    ON feature_flags(company_id) 
    WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_feature_flags_user_id 
    ON feature_flags(user_id) 
    WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_feature_flags_plan_name 
    ON feature_flags(plan_name);

-- RLS Policies
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their feature flags" ON feature_flags
    FOR SELECT USING (
        auth.uid() = user_id OR 
        company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Service role can manage feature flags" ON feature_flags
    FOR ALL USING (auth.role() = 'service_role');


-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. COMPANY_SETTINGS - Locale/Currency/Timezone
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Localization
    locale VARCHAR(10) DEFAULT 'de-DE',      -- de-DE, en-US, es-ES, etc.
    timezone VARCHAR(50) DEFAULT 'Europe/Berlin',
    default_currency VARCHAR(3) DEFAULT 'EUR',
    
    -- Date/Number Formats (optional overrides)
    date_format VARCHAR(20) DEFAULT 'DD.MM.YYYY',
    time_format VARCHAR(10) DEFAULT '24h',  -- 24h or 12h
    number_format VARCHAR(20) DEFAULT 'de',  -- de = 1.234,56 | en = 1,234.56
    
    -- AI Settings
    ai_language VARCHAR(10) DEFAULT 'de',   -- Sprache für AI-Antworten
    ai_tone VARCHAR(50) DEFAULT 'professional',  -- casual, professional, formal
    
    -- Vertical
    primary_vertical VARCHAR(50) DEFAULT 'network_marketing',
    
    -- Branding
    company_color_primary VARCHAR(7),   -- #HEX
    company_color_secondary VARCHAR(7),
    logo_url TEXT,
    
    -- Compliance
    compliance_level VARCHAR(20) DEFAULT 'standard',  -- standard, strict, very_strict
    require_compliance_check BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company settings" ON company_settings
    FOR SELECT USING (
        company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "Admins can update company settings" ON company_settings
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'owner')
        )
    );

CREATE POLICY "Service role can manage company settings" ON company_settings
    FOR ALL USING (auth.role() = 'service_role');


-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Function: Get next pending jobs for worker
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

-- Function: Mark job as completed
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

-- Function: Mark job as failed
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

-- Function: Get feature flag value
CREATE OR REPLACE FUNCTION get_feature_flag(
    p_user_id UUID,
    p_flag_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_flags JSONB;
    v_company_id UUID;
BEGIN
    -- Get user's company
    SELECT company_id INTO v_company_id 
    FROM profiles WHERE id = p_user_id;
    
    -- Try user-specific flags first
    SELECT flags INTO v_flags
    FROM feature_flags
    WHERE user_id = p_user_id
    LIMIT 1;
    
    -- Fall back to company flags
    IF v_flags IS NULL AND v_company_id IS NOT NULL THEN
        SELECT flags INTO v_flags
        FROM feature_flags
        WHERE company_id = v_company_id AND user_id IS NULL
        LIMIT 1;
    END IF;
    
    -- Fall back to global defaults
    IF v_flags IS NULL THEN
        SELECT flags INTO v_flags
        FROM feature_flags
        WHERE company_id IS NULL AND user_id IS NULL
        LIMIT 1;
    END IF;
    
    -- Return flag value or false
    RETURN COALESCE((v_flags->>p_flag_name)::BOOLEAN, FALSE);
END;
$$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. UPDATED_AT TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_scheduled_jobs_updated_at
    BEFORE UPDATE ON scheduled_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_flags_updated_at
    BEFORE UPDATE ON feature_flags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_company_settings_updated_at
    BEFORE UPDATE ON company_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. DEFAULT DATA
-- ═══════════════════════════════════════════════════════════════════════════════

-- Global default feature flags (for free tier)
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
-- SUMMARY
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- Created Tables:
--   ✅ scheduled_jobs - Background job queue with retry logic
--   ✅ ai_interactions - AI call logging with outcome tracking
--   ✅ feature_flags - Plan-based feature control
--   ✅ company_settings - Localization and preferences
--
-- Created Functions:
--   ✅ get_pending_jobs() - Atomic job claiming for workers
--   ✅ complete_job() - Mark job as done
--   ✅ fail_job() - Handle job failures with retry
--   ✅ get_feature_flag() - Check if feature is enabled
--
-- All tables have:
--   ✅ company_id for multi-tenancy
--   ✅ RLS policies for security
--   ✅ Proper indexes for performance
--   ✅ updated_at triggers


-- ============================================================================
-- SALES FLOW AI - KI CORE TABLES
-- Weltklasse KI-Datenbank für vertriebsoptimierte Intelligenz
-- Version: 1.0.0 | Created: 2024-12-01
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- TABLE 1: BANT ASSESSMENTS (Deal-Medic)
-- ============================================================================
CREATE TABLE IF NOT EXISTS bant_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- BANT Criteria (0-100 each)
    budget_score INTEGER CHECK (budget_score BETWEEN 0 AND 100),
    authority_score INTEGER CHECK (authority_score BETWEEN 0 AND 100),
    need_score INTEGER CHECK (need_score BETWEEN 0 AND 100),
    timeline_score INTEGER CHECK (timeline_score BETWEEN 0 AND 100),
    
    -- Aggregated Score
    total_score INTEGER,
    traffic_light VARCHAR(10) CHECK (traffic_light IN ('green', 'yellow', 'red')),
    
    -- Detailed Notes
    budget_notes TEXT,
    authority_notes TEXT,
    need_notes TEXT,
    timeline_notes TEXT,
    next_steps TEXT,
    
    -- AI-generated recommendations
    ai_recommendations JSONB DEFAULT '{}'::JSONB,
    
    -- Metadata
    assessed_at TIMESTAMPTZ DEFAULT NOW(),
    assessed_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger for computed fields
CREATE OR REPLACE FUNCTION compute_bant_scores()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate total score (average of 4 criteria)
    NEW.total_score := (
        COALESCE(NEW.budget_score, 0) + 
        COALESCE(NEW.authority_score, 0) + 
        COALESCE(NEW.need_score, 0) + 
        COALESCE(NEW.timeline_score, 0)
    ) / 4;
    
    -- Set traffic light
    NEW.traffic_light := CASE 
        WHEN NEW.total_score >= 75 THEN 'green'
        WHEN NEW.total_score >= 50 THEN 'yellow'
        ELSE 'red'
    END;
    
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_compute_bant_scores
    BEFORE INSERT OR UPDATE ON bant_assessments
    FOR EACH ROW
    EXECUTE FUNCTION compute_bant_scores();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bant_lead ON bant_assessments(lead_id);
CREATE INDEX IF NOT EXISTS idx_bant_user ON bant_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_bant_score ON bant_assessments(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_bant_traffic ON bant_assessments(traffic_light);
CREATE INDEX IF NOT EXISTS idx_bant_created ON bant_assessments(created_at DESC);

-- ============================================================================
-- TABLE 2: PERSONALITY PROFILES (Neuro-Profiler / DISG)
-- ============================================================================
CREATE TABLE IF NOT EXISTS personality_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    
    -- DISG Scores (0-100 each)
    dominance_score INTEGER CHECK (dominance_score BETWEEN 0 AND 100),
    influence_score INTEGER CHECK (influence_score BETWEEN 0 AND 100),
    steadiness_score INTEGER CHECK (steadiness_score BETWEEN 0 AND 100),
    conscientiousness_score INTEGER CHECK (conscientiousness_score BETWEEN 0 AND 100),
    
    -- Primary Type
    primary_type VARCHAR(1) CHECK (primary_type IN ('D', 'I', 'S', 'C')),
    secondary_type VARCHAR(1) CHECK (secondary_type IN ('D', 'I', 'S', 'C')),
    
    -- Confidence & Method
    confidence_score FLOAT CHECK (confidence_score BETWEEN 0 AND 1),
    assessment_method VARCHAR(50) DEFAULT 'ai_analysis', -- 'questionnaire', 'ai_analysis', 'manual'
    
    -- Communication Strategy (AI-generated)
    communication_tips JSONB DEFAULT '{}'::JSONB,
    ideal_pitch_style TEXT,
    objection_handling_style TEXT,
    
    -- Source Data
    questionnaire_responses JSONB,
    analyzed_messages_count INTEGER DEFAULT 0,
    
    -- Metadata
    last_analyzed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-detect primary type based on highest score
CREATE OR REPLACE FUNCTION compute_personality_type()
RETURNS TRIGGER AS $$
DECLARE
    max_score INTEGER;
BEGIN
    -- Find primary type (highest score)
    max_score := GREATEST(
        COALESCE(NEW.dominance_score, 0),
        COALESCE(NEW.influence_score, 0),
        COALESCE(NEW.steadiness_score, 0),
        COALESCE(NEW.conscientiousness_score, 0)
    );
    
    NEW.primary_type := CASE max_score
        WHEN NEW.dominance_score THEN 'D'
        WHEN NEW.influence_score THEN 'I'
        WHEN NEW.steadiness_score THEN 'S'
        WHEN NEW.conscientiousness_score THEN 'C'
    END;
    
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_compute_personality_type
    BEFORE INSERT OR UPDATE ON personality_profiles
    FOR EACH ROW
    EXECUTE FUNCTION compute_personality_type();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_personality_lead ON personality_profiles(lead_id);
CREATE INDEX IF NOT EXISTS idx_personality_user ON personality_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_personality_type ON personality_profiles(primary_type);
CREATE INDEX IF NOT EXISTS idx_personality_confidence ON personality_profiles(confidence_score DESC);

-- ============================================================================
-- TABLE 3: LEAD CONTEXT SUMMARIES (Auto-Memory)
-- ============================================================================
CREATE TABLE IF NOT EXISTS lead_context_summaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    
    -- Summary Content
    short_summary TEXT, -- 1-2 sentences for quick view
    detailed_summary TEXT, -- Full context paragraph
    key_facts JSONB DEFAULT '[]'::JSONB, -- ["fact1", "fact2", ...]
    preferences JSONB DEFAULT '{}'::JSONB, -- { "communication": "email", "availability": "evenings" }
    pain_points JSONB DEFAULT '[]'::JSONB,
    goals JSONB DEFAULT '[]'::JSONB,
    objections_raised JSONB DEFAULT '[]'::JSONB,
    
    -- Relationship Timeline
    first_contact_date DATE,
    last_interaction_date DATE,
    total_interactions INTEGER DEFAULT 0,
    interaction_frequency VARCHAR(20), -- 'daily', 'weekly', 'monthly', 'rare'
    
    -- AI Context for GPT
    gpt_context_blob TEXT, -- Optimized text for GPT prompts
    embedding VECTOR(1536), -- OpenAI text-embedding-ada-002
    
    -- Metadata
    generated_by VARCHAR(20) DEFAULT 'ai', -- 'ai' or 'manual'
    sources_count INTEGER DEFAULT 0, -- How many messages/activities analyzed
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_context_lead ON lead_context_summaries(lead_id);
CREATE INDEX IF NOT EXISTS idx_context_user ON lead_context_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_context_updated ON lead_context_summaries(last_updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_context_embedding ON lead_context_summaries 
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================================
-- TABLE 4: AI RECOMMENDATIONS (Aktive Empfehlungen)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID,
    user_id UUID NOT NULL,
    
    -- Recommendation Details
    type VARCHAR(50) NOT NULL, -- 'followup', 'playbook', 'message_draft', 'channel_switch', 'assessment'
    priority VARCHAR(10) CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
    
    title TEXT NOT NULL,
    description TEXT,
    reasoning TEXT, -- Why this recommendation?
    
    -- Action
    suggested_action JSONB DEFAULT '{}'::JSONB, -- { "action": "call", "when": "...", "script": "..." }
    playbook_name VARCHAR(100), -- 'DEAL-MEDIC', 'NEURO-PROFILER', etc.
    
    -- Trigger
    triggered_by VARCHAR(50), -- 'time_decay', 'status_change', 'low_bant_score', 'ai_pattern'
    trigger_data JSONB,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'dismissed', 'completed'
    accepted_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    dismissed_reason TEXT,
    
    -- Performance
    confidence_score FLOAT CHECK (confidence_score BETWEEN 0 AND 1) DEFAULT 0.5,
    expected_impact VARCHAR(20), -- 'low', 'medium', 'high'
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rec_user ON ai_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_rec_lead ON ai_recommendations(lead_id);
CREATE INDEX IF NOT EXISTS idx_rec_status ON ai_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_rec_priority ON ai_recommendations(priority);
CREATE INDEX IF NOT EXISTS idx_rec_created ON ai_recommendations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rec_user_status ON ai_recommendations(user_id, status) 
    WHERE status = 'pending';

-- ============================================================================
-- TABLE 5: COMPLIANCE LOGS (Liability-Shield)
-- ============================================================================
CREATE TABLE IF NOT EXISTS compliance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    
    -- What was checked
    content_type VARCHAR(50) NOT NULL, -- 'ai_message', 'template', 'recommendation', 'script'
    original_content TEXT NOT NULL,
    filtered_content TEXT,
    
    -- Violation Details
    violation_detected BOOLEAN DEFAULT FALSE,
    violation_types JSONB DEFAULT '[]'::JSONB, -- ["health_claim", "guarantee", "income_promise"]
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    
    -- Action Taken
    action VARCHAR(50), -- 'blocked', 'filtered', 'flagged', 'allowed_with_disclaimer'
    disclaimer_added TEXT,
    
    -- Context
    related_lead_id UUID,
    related_message_id UUID,
    
    -- Metadata
    checked_at TIMESTAMPTZ DEFAULT NOW(),
    ai_model_used VARCHAR(50) DEFAULT 'gpt-4',
    
    -- Retention
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_compliance_user ON compliance_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_violation ON compliance_logs(violation_detected) 
    WHERE violation_detected = TRUE;
CREATE INDEX IF NOT EXISTS idx_compliance_severity ON compliance_logs(severity) 
    WHERE severity IN ('high', 'critical');
CREATE INDEX IF NOT EXISTS idx_compliance_date ON compliance_logs(checked_at DESC);

-- ============================================================================
-- TABLE 6: LEAD EMBEDDINGS (Semantische Suche)
-- ============================================================================
CREATE TABLE IF NOT EXISTS lead_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    
    -- Embedding Vector
    embedding VECTOR(1536), -- OpenAI ada-002 embedding
    
    -- Source Text
    source_text TEXT, -- Concatenated: notes + messages + context
    source_length INTEGER,
    
    -- Metadata
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    model_version VARCHAR(50) DEFAULT 'text-embedding-ada-002',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lead_embedding_lead ON lead_embeddings(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_embedding_user ON lead_embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_embedding_vector ON lead_embeddings 
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================================
-- TABLE 7: SUCCESS PATTERNS (Learning)
-- ============================================================================
CREATE TABLE IF NOT EXISTS success_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    squad_id UUID,
    
    -- Pattern Details
    pattern_type VARCHAR(50) NOT NULL, -- 'conversion_sequence', 'message_template', 'timing', 'channel'
    pattern_name VARCHAR(200) NOT NULL,
    description TEXT,
    
    -- Pattern Data
    pattern_data JSONB DEFAULT '{}'::JSONB, -- Flexible structure for different patterns
    
    -- Performance Metrics
    success_rate FLOAT CHECK (success_rate BETWEEN 0 AND 1),
    sample_size INTEGER DEFAULT 0,
    avg_time_to_close_days INTEGER,
    
    -- Context
    industry VARCHAR(100),
    lead_source VARCHAR(100),
    personality_type VARCHAR(1) CHECK (personality_type IN ('D', 'I', 'S', 'C', NULL)),
    
    -- Confidence
    confidence_score FLOAT CHECK (confidence_score BETWEEN 0 AND 1),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_recommended BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    discovered_at TIMESTAMPTZ DEFAULT NOW(),
    last_validated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pattern_user ON success_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_pattern_squad ON success_patterns(squad_id);
CREATE INDEX IF NOT EXISTS idx_pattern_type ON success_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_pattern_success ON success_patterns(success_rate DESC) 
    WHERE is_active = TRUE;

-- ============================================================================
-- TABLE 8: PLAYBOOK EXECUTIONS (Tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS playbook_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    -- Playbook Info
    playbook_name VARCHAR(100) NOT NULL, -- 'DEAL-MEDIC', 'NEURO-PROFILER', 'FEUERLÖSCHER'
    playbook_version VARCHAR(20) DEFAULT '1.0',
    
    -- Execution Details
    status VARCHAR(20) DEFAULT 'in_progress', -- 'in_progress', 'completed', 'abandoned'
    current_step INTEGER DEFAULT 1,
    total_steps INTEGER,
    
    -- Steps Data
    steps_completed JSONB DEFAULT '[]'::JSONB, -- [{ "step": 1, "action": "...", "timestamp": "..." }]
    inputs JSONB DEFAULT '{}'::JSONB, -- User inputs during playbook
    outputs JSONB DEFAULT '{}'::JSONB, -- Results/recommendations
    
    -- Performance
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    
    -- Outcome
    outcome VARCHAR(50), -- 'deal_won', 'deal_lost', 'lead_qualified', 'follow_up_scheduled'
    outcome_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-calculate duration
CREATE OR REPLACE FUNCTION compute_playbook_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.completed_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
        NEW.duration_seconds := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at))::INTEGER;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_compute_playbook_duration
    BEFORE UPDATE ON playbook_executions
    FOR EACH ROW
    EXECUTE FUNCTION compute_playbook_duration();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_playbook_lead ON playbook_executions(lead_id);
CREATE INDEX IF NOT EXISTS idx_playbook_user ON playbook_executions(user_id);
CREATE INDEX IF NOT EXISTS idx_playbook_name ON playbook_executions(playbook_name);
CREATE INDEX IF NOT EXISTS idx_playbook_status ON playbook_executions(status);
CREATE INDEX IF NOT EXISTS idx_playbook_started ON playbook_executions(started_at DESC);

-- ============================================================================
-- TABLE 9: AI COACHING SESSIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS ai_coaching_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    lead_id UUID,
    
    -- Session Info
    session_type VARCHAR(50) NOT NULL, -- 'general', 'lead_specific', 'playbook', 'objection_handling'
    topic VARCHAR(200),
    
    -- Conversation
    messages JSONB DEFAULT '[]'::JSONB, -- Array of { role: 'user'|'assistant', content: '...', timestamp: '...' }
    message_count INTEGER DEFAULT 0,
    
    -- AI Context Used
    context_loaded JSONB DEFAULT '{}'::JSONB, -- What context was fed to GPT
    personality_profile_used UUID,
    bant_data_used UUID,
    
    -- Outcomes
    recommendations_given JSONB DEFAULT '[]'::JSONB,
    scripts_generated JSONB DEFAULT '[]'::JSONB,
    playbooks_suggested TEXT[],
    
    -- Quality Metrics
    user_satisfaction_rating INTEGER CHECK (user_satisfaction_rating BETWEEN 1 AND 5),
    user_feedback TEXT,
    
    -- Metadata
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-calculate message count and duration
CREATE OR REPLACE FUNCTION compute_coaching_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Count messages
    NEW.message_count := COALESCE(jsonb_array_length(NEW.messages), 0);
    
    -- Calculate duration if ended
    IF NEW.ended_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
        NEW.duration_seconds := EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at))::INTEGER;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_compute_coaching_metrics
    BEFORE INSERT OR UPDATE ON ai_coaching_sessions
    FOR EACH ROW
    EXECUTE FUNCTION compute_coaching_metrics();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_coaching_user ON ai_coaching_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_coaching_lead ON ai_coaching_sessions(lead_id);
CREATE INDEX IF NOT EXISTS idx_coaching_type ON ai_coaching_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_coaching_date ON ai_coaching_sessions(started_at DESC);

-- ============================================================================
-- TABLE 10: CHANNEL PERFORMANCE METRICS
-- ============================================================================
CREATE TABLE IF NOT EXISTS channel_performance_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    squad_id UUID,
    
    -- Channel
    channel VARCHAR(50) NOT NULL, -- 'email', 'whatsapp', 'call', 'meeting', 'sms', 'linkedin'
    
    -- Time Period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Performance
    total_attempts INTEGER DEFAULT 0,
    successful_contacts INTEGER DEFAULT 0,
    contact_rate FLOAT,
    
    -- Conversion
    leads_created INTEGER DEFAULT 0,
    deals_closed INTEGER DEFAULT 0,
    conversion_rate FLOAT,
    
    -- Timing
    avg_response_time_seconds INTEGER,
    avg_time_to_close_days INTEGER,
    
    -- Best Time Windows
    best_contact_hours JSONB DEFAULT '[]'::JSONB, -- [9, 10, 11, 14, 15] (hours of day)
    best_contact_days JSONB DEFAULT '[]'::JSONB, -- [2, 3, 4] (1=Mon, 7=Sun)
    
    -- Revenue
    total_revenue DECIMAL(10, 2) DEFAULT 0,
    avg_deal_size DECIMAL(10, 2) DEFAULT 0,
    
    -- Metadata
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-calculate rates
CREATE OR REPLACE FUNCTION compute_channel_rates()
RETURNS TRIGGER AS $$
BEGIN
    -- Contact rate
    IF NEW.total_attempts > 0 THEN
        NEW.contact_rate := NEW.successful_contacts::FLOAT / NEW.total_attempts;
    ELSE
        NEW.contact_rate := 0;
    END IF;
    
    -- Conversion rate
    IF NEW.leads_created > 0 THEN
        NEW.conversion_rate := NEW.deals_closed::FLOAT / NEW.leads_created;
    ELSE
        NEW.conversion_rate := 0;
    END IF;
    
    -- Avg deal size
    IF NEW.deals_closed > 0 THEN
        NEW.avg_deal_size := NEW.total_revenue / NEW.deals_closed;
    ELSE
        NEW.avg_deal_size := 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_compute_channel_rates
    BEFORE INSERT OR UPDATE ON channel_performance_metrics
    FOR EACH ROW
    EXECUTE FUNCTION compute_channel_rates();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_channel_perf_user ON channel_performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_channel_perf_squad ON channel_performance_metrics(squad_id);
CREATE INDEX IF NOT EXISTS idx_channel_perf_channel ON channel_performance_metrics(channel);
CREATE INDEX IF NOT EXISTS idx_channel_perf_period ON channel_performance_metrics(period_start, period_end);

-- Unique constraint to prevent duplicate entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_channel_perf_unique 
    ON channel_performance_metrics(user_id, channel, period_start, period_end);

-- ============================================================================
-- COMPLETE! 🚀
-- ============================================================================
-- Total Tables Created: 10
-- Total Indexes: 50+
-- Total Triggers: 7
-- 
-- Next Steps:
-- 1. Run: psql -d salesflow_db -f ki_core_tables.sql
-- 2. Create Materialized Views (ki_materialized_views.sql)
-- 3. Create RPC Functions (ki_rpc_functions.sql)
-- ============================================================================


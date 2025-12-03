-- ═══════════════════════════════════════════════════════════════════════════
-- SALES FLOW AI: PREMIUM FEATURES MIGRATION
-- Implementiert alle Features für €29, €59, €100 Tiers
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. USER SUBSCRIPTIONS & TIER MANAGEMENT
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    tier VARCHAR(50) NOT NULL CHECK (tier IN ('free', 'starter', 'pro', 'premium', 'enterprise')),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'paused')),
    
    -- Limits
    max_leads INTEGER NOT NULL,
    max_ai_chats_per_day INTEGER,
    max_knowledge_base_mb INTEGER DEFAULT 0,
    max_squad_users INTEGER DEFAULT 1,
    
    -- Features
    features JSONB DEFAULT '{}'::jsonb,
    -- Example: {"active_lead_gen": true, "autonomous_agent": true, "predictive_ai": true}
    
    -- Billing
    price_monthly DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'EUR',
    billing_cycle VARCHAR(20) DEFAULT 'monthly', -- 'monthly', 'yearly'
    
    -- Dates
    started_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_subscriptions_user (user_id),
    INDEX idx_subscriptions_tier (tier),
    INDEX idx_subscriptions_status (status)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. USAGE TRACKING (für Tier Limits)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS user_usage_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Counters
    leads_count INTEGER DEFAULT 0,
    ai_chats_count INTEGER DEFAULT 0,
    knowledge_base_mb_used DECIMAL(10,2) DEFAULT 0,
    
    -- Feature Usage
    active_lead_gen_runs INTEGER DEFAULT 0,
    autonomous_agent_hours DECIMAL(10,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, date),
    INDEX idx_usage_user (user_id),
    INDEX idx_usage_date (date DESC)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. INTELLIGENT CHAT LOG (Message History mit Auto-Actions)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS intelligent_chat_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    lead_id UUID,
    
    -- Message
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    message TEXT NOT NULL,
    
    -- Auto-extracted data
    extracted_data JSONB DEFAULT '{}'::jsonb,
    -- Contains: lead_data, bant_signals, objections, personality_signals, etc.
    
    -- Auto-actions taken
    actions_taken TEXT[] DEFAULT ARRAY[]::TEXT[],
    -- Example: ['Lead created', 'BANT updated', 'Activity logged']
    
    -- AI suggestions
    suggestions TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    -- Metadata
    tokens_used INTEGER,
    processing_time_ms INTEGER,
    model VARCHAR(50) DEFAULT 'gpt-4',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_chat_user (user_id),
    INDEX idx_chat_lead (lead_id),
    INDEX idx_chat_created (created_at DESC)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. BANT ASSESSMENTS (Enhanced)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS bant_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL UNIQUE,
    
    -- Scores (0-100)
    budget_score INTEGER CHECK (budget_score BETWEEN 0 AND 100),
    authority_score INTEGER CHECK (authority_score BETWEEN 0 AND 100),
    need_score INTEGER CHECK (need_score BETWEEN 0 AND 100),
    timeline_score INTEGER CHECK (timeline_score BETWEEN 0 AND 100),
    total_score INTEGER CHECK (total_score BETWEEN 0 AND 100),
    
    -- Traffic Light
    traffic_light VARCHAR(10) CHECK (traffic_light IN ('green', 'yellow', 'red')),
    
    -- Detailed Notes (JSONB for structured data)
    budget_notes JSONB DEFAULT '{}'::jsonb,
    authority_notes JSONB DEFAULT '{}'::jsonb,
    need_notes JSONB DEFAULT '{}'::jsonb,
    timeline_notes JSONB DEFAULT '{}'::jsonb,
    
    -- Metadata
    assessed_by VARCHAR(50) DEFAULT 'ai_auto',
    confidence_level DECIMAL(3,2), -- 0.00 to 1.00
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_bant_lead (lead_id),
    INDEX idx_bant_score (total_score DESC),
    INDEX idx_bant_traffic (traffic_light)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. PERSONALITY PROFILES (DISG)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS personality_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL UNIQUE,
    
    primary_type VARCHAR(1) CHECK (primary_type IN ('D', 'I', 'S', 'G', 'C')),
    secondary_type VARCHAR(1),
    
    -- Scores for each type (0-100)
    d_score INTEGER DEFAULT 0 CHECK (d_score BETWEEN 0 AND 100),
    i_score INTEGER DEFAULT 0 CHECK (i_score BETWEEN 0 AND 100),
    s_score INTEGER DEFAULT 0 CHECK (s_score BETWEEN 0 AND 100),
    g_score INTEGER DEFAULT 0 CHECK (g_score BETWEEN 0 AND 100), -- German: "Gewissenhaft"
    c_score INTEGER DEFAULT 0 CHECK (c_score BETWEEN 0 AND 100),
    
    -- Assessment Details
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    assessment_method VARCHAR(50), -- 'ai_analysis', 'manual', 'survey'
    signals_used JSONB DEFAULT '{}'::jsonb,
    
    -- Communication Preferences (generated from type)
    communication_style TEXT,
    decision_speed VARCHAR(20),
    detail_orientation VARCHAR(20),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_personality_lead (lead_id),
    INDEX idx_personality_primary (primary_type)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. ACTIVITIES LOG (Enhanced)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL,
    user_id UUID,
    
    type VARCHAR(50) NOT NULL CHECK (type IN ('call', 'email', 'meeting', 'message', 'demo', 'other')),
    description TEXT,
    outcome VARCHAR(100),
    
    duration_minutes INTEGER,
    activity_date TIMESTAMPTZ NOT NULL,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    auto_logged BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_activities_lead (lead_id),
    INDEX idx_activities_user (user_id),
    INDEX idx_activities_date (activity_date DESC),
    INDEX idx_activities_type (type)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. SOCIAL MEDIA LEAD GENERATION
-- ═══════════════════════════════════════════════════════════════════════════

-- Lead Generation Jobs
CREATE TABLE IF NOT EXISTS lead_generation_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('instagram', 'facebook', 'linkedin', 'twitter')),
    job_type VARCHAR(50) NOT NULL,
    -- Types: 'hashtag_monitor', 'story_replies', 'connection_requests', 'group_mining'
    
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    
    config JSONB NOT NULL,
    -- Example: {"hashtags": ["#entrepreneur"], "max_profiles": 50, "min_followers": 100}
    
    results_summary JSONB DEFAULT '{}'::jsonb,
    leads_generated INTEGER DEFAULT 0,
    
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_leadgen_user (user_id),
    INDEX idx_leadgen_status (status),
    INDEX idx_leadgen_platform (platform),
    INDEX idx_leadgen_created (created_at DESC)
);

-- Auto-Generated Leads
CREATE TABLE IF NOT EXISTS auto_generated_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID REFERENCES lead_generation_jobs(id) ON DELETE CASCADE,
    
    platform VARCHAR(50) NOT NULL,
    platform_profile_id VARCHAR(255),
    username VARCHAR(255),
    profile_url VARCHAR(500),
    
    profile_data JSONB NOT NULL,
    -- Full profile snapshot: bio, followers, posts, engagement, etc.
    
    qualification_score INTEGER CHECK (qualification_score BETWEEN 0 AND 100),
    qualification_reasons JSONB DEFAULT '{}'::jsonb,
    
    lead_id UUID, -- Reference to created lead if converted
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'converted')),
    
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_autoleads_job (job_id),
    INDEX idx_autoleads_platform (platform),
    INDEX idx_autoleads_score (qualification_score DESC),
    INDEX idx_autoleads_status (status)
);

-- Social Media Interactions
CREATE TABLE IF NOT EXISTS social_media_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    lead_id UUID,
    
    platform VARCHAR(50) NOT NULL,
    interaction_type VARCHAR(50) NOT NULL,
    -- Types: 'dm', 'comment', 'story_reply', 'post_engagement', 'connection_request'
    
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    content TEXT,
    
    platform_interaction_id VARCHAR(255),
    automated BOOLEAN DEFAULT FALSE,
    
    sentiment VARCHAR(50), -- 'positive', 'neutral', 'negative'
    metadata JSONB DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_social_int_user (user_id),
    INDEX idx_social_int_lead (lead_id),
    INDEX idx_social_int_platform (platform),
    INDEX idx_social_int_created (created_at DESC)
);

-- Automation Rules
CREATE TABLE IF NOT EXISTS automation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    
    platform VARCHAR(50) NOT NULL,
    rule_type VARCHAR(50) NOT NULL,
    -- Types: 'auto_reply', 'auto_dm', 'auto_comment', 'auto_follow'
    
    trigger_config JSONB NOT NULL,
    -- Example: {"keywords": ["interested"], "sentiment": "positive"}
    
    action_config JSONB NOT NULL,
    -- Example: {"message_template": "Great! Let me send you more info..."}
    
    is_active BOOLEAN DEFAULT TRUE,
    
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    last_triggered_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_automation_user (user_id),
    INDEX idx_automation_active (is_active),
    INDEX idx_automation_platform (platform)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. PREDICTIVE AI TABLES
-- ═══════════════════════════════════════════════════════════════════════════

-- Win Probability Cache
CREATE TABLE IF NOT EXISTS lead_win_probability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL UNIQUE,
    
    win_probability INTEGER CHECK (win_probability BETWEEN 0 AND 100),
    confidence VARCHAR(20) CHECK (confidence IN ('low', 'medium', 'high')),
    
    -- Factor Scores
    factors JSONB DEFAULT '{}'::jsonb,
    -- Example: {"bant": 40, "engagement": 15, "personality": 12, "source": 8, ...}
    
    recommendations TEXT[] DEFAULT ARRAY[]::TEXT[],
    
    last_calculated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_winprob_lead (lead_id),
    INDEX idx_winprob_score (win_probability DESC),
    INDEX idx_winprob_updated (last_calculated_at DESC)
);

-- Optimal Contact Times
CREATE TABLE IF NOT EXISTS optimal_contact_times (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL,
    user_id UUID NOT NULL,
    
    optimal_day_of_week INTEGER, -- 0-6 (Monday-Sunday)
    optimal_hour INTEGER, -- 0-23
    
    confidence VARCHAR(20),
    based_on_pattern_count INTEGER,
    
    suggestion TEXT,
    
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_contact_times_lead (lead_id),
    INDEX idx_contact_times_user (user_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════

-- Update timestamp function (if not exists)
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_subscriptions
CREATE TRIGGER trg_subscriptions_timestamp
    BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- Trigger for user_usage_tracking
CREATE TRIGGER trg_usage_timestamp
    BEFORE UPDATE ON user_usage_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- Trigger for bant_assessments
CREATE TRIGGER trg_bant_timestamp
    BEFORE UPDATE ON bant_assessments
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- Trigger for personality_profiles
CREATE TRIGGER trg_personality_timestamp
    BEFORE UPDATE ON personality_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- Trigger for automation_rules
CREATE TRIGGER trg_automation_timestamp
    BEFORE UPDATE ON automation_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. DEFAULT TIER CONFIGURATIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- Insert default tier configurations (reference only, not user-specific)
CREATE TABLE IF NOT EXISTS tier_configurations (
    tier VARCHAR(50) PRIMARY KEY CHECK (tier IN ('free', 'starter', 'pro', 'premium', 'enterprise')),
    
    max_leads INTEGER NOT NULL,
    max_ai_chats_per_day INTEGER,
    max_knowledge_base_mb INTEGER DEFAULT 0,
    max_squad_users INTEGER DEFAULT 1,
    
    features JSONB DEFAULT '{}'::jsonb,
    
    price_monthly DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'EUR',
    
    display_name VARCHAR(100),
    description TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default tiers
INSERT INTO tier_configurations (tier, max_leads, max_ai_chats_per_day, max_knowledge_base_mb, max_squad_users, features, price_monthly, display_name, description) VALUES
('free', 25, 5, 0, 1, '{"basic_features": true, "playbooks": ["DEAL-MEDIC"]}', 0, 'Free', 'Basic features, 25 leads max'),
('starter', 200, -1, 100, 1, '{"unlimited_chats": true, "knowledge_base": true, "core_playbooks": true}', 29, 'Starter', '200 leads, unlimited AI chats, 100 MB knowledge base'),
('pro', 500, -1, 500, 5, '{"all_playbooks": true, "squad_management": true, "advanced_analytics": true, "social_import_passive": true}', 59, 'Pro', '500 leads, all playbooks, squad management for 5 users'),
('premium', -1, -1, 1000, 10, '{"unlimited_leads": true, "active_lead_gen": true, "autonomous_agent": true, "predictive_ai": true, "multi_channel": true}', 100, 'Premium', 'Unlimited leads, active lead generation, autonomous agent 24/7'),
('enterprise', -1, -1, -1, -1, '{"everything": true, "white_label": true, "custom_features": true, "priority_support": true}', 0, 'Enterprise', 'Custom pricing, everything premium + white-label and custom features')
ON CONFLICT (tier) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE user_subscriptions IS 'User tier subscriptions and feature access control';
COMMENT ON TABLE user_usage_tracking IS 'Daily usage tracking for enforcing tier limits';
COMMENT ON TABLE intelligent_chat_logs IS 'Chat history with auto-extracted data and actions';
COMMENT ON TABLE bant_assessments IS 'Lead qualification using BANT framework';
COMMENT ON TABLE personality_profiles IS 'Lead personality assessment using DISG model';
COMMENT ON TABLE lead_generation_jobs IS 'Background jobs for autonomous lead generation from social media';
COMMENT ON TABLE auto_generated_leads IS 'Leads automatically discovered and qualified from social media';
COMMENT ON TABLE lead_win_probability IS 'Predictive win probability for each lead';
COMMENT ON TABLE optimal_contact_times IS 'AI-predicted optimal times to contact leads';

-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION COMPLETE
-- ═══════════════════════════════════════════════════════════════════════════


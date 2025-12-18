-- ============================================================================
-- QUOTA / PLAN LIMIT SYSTEM
-- Handles plan limits, usage tracking, and feature access control
-- ============================================================================

-- Plan Limits Table (stores plan configurations)
CREATE TABLE IF NOT EXISTS plan_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    
    -- Limits (-1 = unlimited)
    leads_limit INTEGER DEFAULT 10,
    vision_credits_limit INTEGER DEFAULT 0,
    voice_minutes_limit INTEGER DEFAULT 0,
    message_improvements_limit INTEGER DEFAULT 10,
    freebies_limit INTEGER DEFAULT 0,
    
    -- AI Model Tier
    ai_model TEXT DEFAULT 'groq' CHECK (ai_model IN ('groq', 'gpt-4o-mini', 'gpt-4o')),
    
    -- Feature Flags
    instagram_dm BOOLEAN DEFAULT false,
    instagram_auto_reply BOOLEAN DEFAULT false,
    comment_to_dm BOOLEAN DEFAULT false,
    whatsapp BOOLEAN DEFAULT false,
    power_hour BOOLEAN DEFAULT false,
    voice_output BOOLEAN DEFAULT false,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Quotas Table (monthly usage tracking)
CREATE TABLE IF NOT EXISTS user_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    month_year TEXT NOT NULL,  -- Format: "2024-12"
    
    -- Usage counters
    vision_credits_used INTEGER DEFAULT 0,
    voice_minutes_used INTEGER DEFAULT 0,
    message_improvements_used INTEGER DEFAULT 0,
    ai_requests_count INTEGER DEFAULT 0,
    ai_tokens_used INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, month_year)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_plan_limits_name ON plan_limits(plan_name);
CREATE INDEX IF NOT EXISTS idx_plan_limits_active ON plan_limits(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_quotas_user ON user_quotas(user_id);
CREATE INDEX IF NOT EXISTS idx_user_quotas_month ON user_quotas(month_year);
CREATE INDEX IF NOT EXISTS idx_user_quotas_user_month ON user_quotas(user_id, month_year);

-- Insert default plan configurations
INSERT INTO plan_limits (plan_name, display_name, sort_order, leads_limit, vision_credits_limit, voice_minutes_limit, message_improvements_limit, freebies_limit, ai_model, instagram_dm, instagram_auto_reply, comment_to_dm, whatsapp, power_hour, voice_output, is_active)
VALUES
    ('free', 'Free', 1, 10, 0, 0, 10, 0, 'groq', false, false, false, false, false, false, true),
    ('starter', 'Starter', 2, 100, 0, 30, 50, 1, 'groq', false, false, false, false, false, false, true),
    ('builder', 'Builder', 3, 500, 50, -1, -1, 5, 'gpt-4o-mini', true, false, false, false, true, true, true),
    ('leader', 'Leader', 4, -1, -1, -1, -1, -1, 'gpt-4o', true, true, true, true, true, true, true)
ON CONFLICT (plan_name) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    sort_order = EXCLUDED.sort_order,
    leads_limit = EXCLUDED.leads_limit,
    vision_credits_limit = EXCLUDED.vision_credits_limit,
    voice_minutes_limit = EXCLUDED.voice_minutes_limit,
    message_improvements_limit = EXCLUDED.message_improvements_limit,
    freebies_limit = EXCLUDED.freebies_limit,
    ai_model = EXCLUDED.ai_model,
    instagram_dm = EXCLUDED.instagram_dm,
    instagram_auto_reply = EXCLUDED.instagram_auto_reply,
    comment_to_dm = EXCLUDED.comment_to_dm,
    whatsapp = EXCLUDED.whatsapp,
    power_hour = EXCLUDED.power_hour,
    voice_output = EXCLUDED.voice_output,
    updated_at = NOW();

-- RLS (Row Level Security)
ALTER TABLE plan_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quotas ENABLE ROW LEVEL SECURITY;

-- Policies: Everyone can read active plans
CREATE POLICY "Anyone can view active plans"
    ON plan_limits FOR SELECT
    USING (is_active = true);

-- Policies: Users can only view their own quotas
CREATE POLICY "Users can view their own quotas"
    ON user_quotas FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quotas"
    ON user_quotas FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quotas"
    ON user_quotas FOR UPDATE
    USING (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE plan_limits IS 'Plan configurations and limits for different subscription tiers';
COMMENT ON TABLE user_quotas IS 'Monthly usage tracking per user';
COMMENT ON COLUMN plan_limits.leads_limit IS 'Maximum number of leads (-1 = unlimited)';
COMMENT ON COLUMN plan_limits.vision_credits_limit IS 'Maximum vision API calls per month (-1 = unlimited)';
COMMENT ON COLUMN plan_limits.voice_minutes_limit IS 'Maximum voice minutes per month (-1 = unlimited)';
COMMENT ON COLUMN plan_limits.message_improvements_limit IS 'Maximum message improvements per month (-1 = unlimited)';
COMMENT ON COLUMN plan_limits.freebies_limit IS 'Maximum number of freebies (-1 = unlimited)';
COMMENT ON COLUMN user_quotas.month_year IS 'Month in YYYY-MM format (e.g., "2024-12")';


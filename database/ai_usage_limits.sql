-- AI Usage Tracking per User
CREATE TABLE IF NOT EXISTS ai_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    model TEXT NOT NULL,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    request_count INTEGER DEFAULT 1,
    estimated_cost DECIMAL(10,6) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date, model)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON ai_usage(user_id, date);

-- Monthly limits per subscription tier
CREATE TABLE IF NOT EXISTS subscription_limits (
    tier TEXT PRIMARY KEY,
    monthly_tokens INTEGER NOT NULL,
    monthly_requests INTEGER NOT NULL,
    allowed_models TEXT[] NOT NULL
);

-- Insert default limits
INSERT INTO subscription_limits (tier, monthly_tokens, monthly_requests, allowed_models) VALUES
    ('free', 50000, 100, ARRAY['gpt-4o-mini']),
    ('basic', 200000, 500, ARRAY['gpt-4o-mini']),
    ('pro', 1000000, 2000, ARRAY['gpt-4o-mini', 'gpt-4o']),
    ('business', 5000000, 10000, ARRAY['gpt-4o-mini', 'gpt-4o', 'claude-3-sonnet'])
ON CONFLICT (tier) DO UPDATE SET
    monthly_tokens = EXCLUDED.monthly_tokens,
    monthly_requests = EXCLUDED.monthly_requests,
    allowed_models = EXCLUDED.allowed_models;


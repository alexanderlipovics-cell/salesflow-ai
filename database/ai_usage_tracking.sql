-- AI Usage Tracking Table for Cost Optimization
-- Tracks all AI API calls for billing and analytics

CREATE TABLE IF NOT EXISTS ai_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- User and organization context
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

    -- AI call details
    model VARCHAR(50) NOT NULL, -- gpt-4o, gpt-4o-mini, etc.
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,

    -- Cost in USD (calculated)
    cost_usd DECIMAL(10, 6) NOT NULL DEFAULT 0,

    -- Context for analytics
    intent VARCHAR(20), -- QUERY, ACTION, CONTENT, CHAT
    session_id VARCHAR(100),
    tool_calls_count INTEGER DEFAULT 0,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_org ON ai_usage(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_usage_model ON ai_usage(model);
CREATE INDEX IF NOT EXISTS idx_ai_usage_created ON ai_usage(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_usage_intent ON ai_usage(intent);
CREATE INDEX IF NOT EXISTS idx_ai_usage_session ON ai_usage(session_id);

-- Row Level Security (RLS)
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

-- Users can only see their own usage
CREATE POLICY "Users can view own ai usage" ON ai_usage
    FOR SELECT USING (auth.uid() = user_id);

-- Organization admins can see org usage
CREATE POLICY "Org admins can view org ai usage" ON ai_usage
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_organization_members
            WHERE user_id = auth.uid()
            AND organization_id = ai_usage.org_id
            AND role IN ('admin', 'owner')
        )
    );

-- Insert policy (users can only insert their own usage)
CREATE POLICY "Users can insert own ai usage" ON ai_usage
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to get user cost summary
CREATE OR REPLACE FUNCTION get_user_ai_costs(user_uuid UUID, days INTEGER DEFAULT 30)
RETURNS TABLE (
    total_cost DECIMAL(10, 6),
    total_tokens INTEGER,
    total_calls INTEGER,
    model_breakdown JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    start_date TIMESTAMP;
    result_record RECORD;
    model_data JSONB := '{}';
BEGIN
    -- Calculate start date
    start_date := NOW() - INTERVAL '1 day' * days;

    -- Aggregate by model
    FOR result_record IN
        SELECT
            model,
            SUM(cost_usd) as model_cost,
            SUM(total_tokens) as model_tokens,
            COUNT(*) as model_calls
        FROM ai_usage
        WHERE user_id = user_uuid
        AND created_at >= start_date
        GROUP BY model
    LOOP
        model_data := model_data || jsonb_build_object(
            result_record.model,
            jsonb_build_object(
                'cost', result_record.model_cost,
                'tokens', result_record.model_tokens,
                'calls', result_record.model_calls
            )
        );
    END LOOP;

    -- Return summary
    RETURN QUERY
    SELECT
        COALESCE(SUM(cost_usd), 0)::DECIMAL(10, 6) as total_cost,
        COALESCE(SUM(total_tokens), 0)::INTEGER as total_tokens,
        COUNT(*)::INTEGER as total_calls,
        model_data
    FROM ai_usage
    WHERE user_id = user_uuid
    AND created_at >= start_date;

END;
$$;

-- Function to get organization cost summary
CREATE OR REPLACE FUNCTION get_org_ai_costs(org_uuid UUID, days INTEGER DEFAULT 30)
RETURNS TABLE (
    total_cost DECIMAL(10, 6),
    total_users INTEGER,
    avg_cost_per_user DECIMAL(10, 6),
    user_breakdown JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    start_date TIMESTAMP;
    user_data JSONB := '{}';
BEGIN
    -- Calculate start date
    start_date := NOW() - INTERVAL '1 day' * days;

    -- Aggregate by user
    SELECT jsonb_object_agg(
        user_id::text,
        jsonb_build_object('cost', user_cost)
    ) INTO user_data
    FROM (
        SELECT user_id, SUM(cost_usd) as user_cost
        FROM ai_usage
        WHERE org_id = org_uuid
        AND created_at >= start_date
        GROUP BY user_id
    ) user_costs;

    -- Return summary
    RETURN QUERY
    SELECT
        COALESCE(SUM(cost_usd), 0)::DECIMAL(10, 6) as total_cost,
        COUNT(DISTINCT user_id)::INTEGER as total_users,
        CASE
            WHEN COUNT(DISTINCT user_id) > 0
            THEN (SUM(cost_usd) / COUNT(DISTINCT user_id))::DECIMAL(10, 6)
            ELSE 0
        END as avg_cost_per_user,
        COALESCE(user_data, '{}') as user_breakdown
    FROM ai_usage
    WHERE org_id = org_uuid
    AND created_at >= start_date;

END;
$$;

-- Comments for documentation
COMMENT ON TABLE ai_usage IS 'Tracks all AI API usage for cost optimization and analytics';
COMMENT ON COLUMN ai_usage.intent IS 'User intent classification: QUERY, ACTION, CONTENT, CHAT';
COMMENT ON COLUMN ai_usage.tool_calls_count IS 'Number of tool/function calls made in this request';
COMMENT ON FUNCTION get_user_ai_costs(UUID, INTEGER) IS 'Get AI cost summary for a specific user';
COMMENT ON FUNCTION get_org_ai_costs(UUID, INTEGER) IS 'Get AI cost summary for an entire organization';

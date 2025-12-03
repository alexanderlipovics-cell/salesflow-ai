-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  SALES INTELLIGENCE v3.0 - DATABASE SCHEMA                                 ║
-- ║  A/B Testing, Framework Tracking, Buyer Psychology Analytics              ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- =============================================================================
-- ENUMS
-- =============================================================================

-- Buyer Type (DISC-based)
DO $$ BEGIN
    CREATE TYPE buyer_type AS ENUM ('analytical', 'driver', 'expressive', 'amiable');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Buying Stage
DO $$ BEGIN
    CREATE TYPE buying_stage AS ENUM ('awareness', 'consideration', 'decision', 'validation');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Risk Profile
DO $$ BEGIN
    CREATE TYPE risk_profile AS ENUM ('risk_averse', 'risk_neutral', 'risk_taker');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Authority Level
DO $$ BEGIN
    CREATE TYPE authority_level AS ENUM ('decision_maker', 'influencer', 'gatekeeper', 'champion', 'user');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Sales Framework
DO $$ BEGIN
    CREATE TYPE sales_framework AS ENUM ('spin', 'challenger', 'gap', 'sandler', 'snap', 'meddic', 'solution');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Industry Type
DO $$ BEGIN
    CREATE TYPE industry_type AS ENUM (
        'network_marketing', 'real_estate', 'insurance', 'finance',
        'b2b_saas', 'b2b_services', 'coaching', 'automotive',
        'recruiting', 'healthcare', 'event_sales', 'retail_high_ticket'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- A/B Test Status
DO $$ BEGIN
    CREATE TYPE ab_test_status AS ENUM ('running', 'completed', 'paused');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Momentum Trend
DO $$ BEGIN
    CREATE TYPE momentum_trend AS ENUM ('improving', 'stable', 'declining');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =============================================================================
-- LEAD PSYCHOLOGY PROFILES
-- =============================================================================

CREATE TABLE IF NOT EXISTS lead_psychology_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL,  -- Reference to leads table
    
    -- Buyer Type (DISC)
    buyer_type buyer_type,
    buyer_type_confidence NUMERIC(3,2),
    buyer_type_signals JSONB DEFAULT '[]'::JSONB,
    buyer_type_detected_at TIMESTAMPTZ,
    
    -- Buying Stage
    buying_stage buying_stage DEFAULT 'awareness',
    buying_stage_confidence NUMERIC(3,2),
    buying_stage_signals JSONB DEFAULT '[]'::JSONB,
    buying_stage_updated_at TIMESTAMPTZ,
    
    -- Risk Profile
    risk_profile risk_profile DEFAULT 'risk_neutral',
    risk_profile_confidence NUMERIC(3,2),
    
    -- Authority Level
    authority_level authority_level,
    authority_level_confidence NUMERIC(3,2),
    
    -- Communication Preferences (learned)
    preferred_tone TEXT,
    preferred_message_length TEXT,
    preferred_channel TEXT,
    response_time_pattern TEXT,
    
    -- Objection History
    common_objections JSONB DEFAULT '[]'::JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, lead_id)
);

-- =============================================================================
-- DEAL FRAMEWORK TRACKING
-- =============================================================================

CREATE TABLE IF NOT EXISTS deal_framework_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    deal_id UUID,  -- Reference to deals/opportunities
    lead_id UUID,
    
    -- Framework Used
    framework sales_framework NOT NULL,
    
    -- Context
    industry industry_type,
    buyer_type buyer_type,
    buying_stage buying_stage,
    
    -- Outcome
    outcome TEXT,  -- 'won', 'lost', 'ongoing'
    deal_value NUMERIC(12,2),
    days_to_close INTEGER,
    touchpoints_count INTEGER,
    
    -- Stage Progression (JSON for flexibility)
    stages_completed JSONB DEFAULT '[]'::JSONB,
    -- Example: [{"stage": "situation", "completed_at": "...", "notes": "..."}]
    
    -- Timestamps
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- A/B TESTS
-- =============================================================================

CREATE TABLE IF NOT EXISTS ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Test Definition
    name TEXT NOT NULL,
    description TEXT,
    test_type TEXT NOT NULL,  -- 'framework', 'industry', 'buyer_type', 'language', 'template'
    
    -- Variants
    variant_a TEXT NOT NULL,
    variant_b TEXT NOT NULL,
    
    -- Targeting
    target_industry industry_type,
    target_buyer_type buyer_type,
    target_metric TEXT DEFAULT 'conversion_rate',
    
    -- Results
    variant_a_count INTEGER DEFAULT 0,
    variant_b_count INTEGER DEFAULT 0,
    variant_a_conversions INTEGER DEFAULT 0,
    variant_b_conversions INTEGER DEFAULT 0,
    
    -- Winner (calculated)
    winner TEXT,  -- 'a', 'b', or NULL
    statistical_significance NUMERIC(5,4) DEFAULT 0,
    
    -- Status
    status ab_test_status DEFAULT 'running',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- =============================================================================
-- A/B TEST RESULTS (Individual data points)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ab_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Assignment
    variant TEXT NOT NULL,  -- 'a' or 'b'
    lead_id UUID,
    
    -- Outcome
    converted BOOLEAN DEFAULT FALSE,
    conversion_value NUMERIC(12,2),
    
    -- Context
    context_data JSONB DEFAULT '{}'::JSONB,
    
    -- Timestamps
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    converted_at TIMESTAMPTZ
);

-- =============================================================================
-- MOMENTUM SIGNALS
-- =============================================================================

CREATE TABLE IF NOT EXISTS deal_momentum_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL,
    deal_id UUID,
    
    -- Signal
    signal_type TEXT NOT NULL,  -- 'positive', 'negative', 'neutral'
    signal_name TEXT NOT NULL,  -- e.g., 'fast_response', 'delayed_response', 'buying_signal'
    signal_weight NUMERIC(3,2) DEFAULT 1.0,
    description TEXT,
    
    -- Calculated Score Snapshot
    momentum_score_at_time NUMERIC(4,2),
    
    -- Timestamps
    detected_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- FRAMEWORK EFFECTIVENESS (Aggregated Daily)
-- =============================================================================

CREATE TABLE IF NOT EXISTS framework_effectiveness_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Framework Stats (JSONB for flexibility)
    framework_stats JSONB DEFAULT '{}'::JSONB,
    -- Example: {"spin": {"uses": 5, "conversions": 2, "avg_value": 5000}, ...}
    
    -- Buyer Type Stats
    buyer_type_stats JSONB DEFAULT '{}'::JSONB,
    -- Example: {"analytical": {"leads": 10, "conversions": 4}, ...}
    
    -- Industry Stats
    industry_stats JSONB DEFAULT '{}'::JSONB,
    
    -- Totals
    total_deals INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    total_value NUMERIC(14,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, date)
);

-- =============================================================================
-- USER SALES INTELLIGENCE SETTINGS
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_sales_intelligence_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Language Settings
    default_language TEXT DEFAULT 'de',
    detected_languages JSONB DEFAULT '[]'::JSONB,
    
    -- Industry Settings
    primary_industry industry_type DEFAULT 'network_marketing',
    secondary_industries JSONB DEFAULT '[]'::JSONB,
    
    -- Framework Preferences
    preferred_framework sales_framework,
    framework_performance JSONB DEFAULT '{}'::JSONB,
    
    -- Buyer Psychology Settings
    enable_auto_detection BOOLEAN DEFAULT TRUE,
    detection_confidence_threshold NUMERIC(3,2) DEFAULT 0.70,
    
    -- A/B Testing Settings
    ab_testing_enabled BOOLEAN DEFAULT TRUE,
    
    -- Phone Mode Settings
    phone_mode_enabled BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Lead Psychology
CREATE INDEX IF NOT EXISTS idx_lead_psychology_user ON lead_psychology_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_psychology_lead ON lead_psychology_profiles(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_psychology_buyer_type ON lead_psychology_profiles(buyer_type);
CREATE INDEX IF NOT EXISTS idx_lead_psychology_stage ON lead_psychology_profiles(buying_stage);

-- Framework Usage
CREATE INDEX IF NOT EXISTS idx_framework_usage_user ON deal_framework_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_framework_usage_framework ON deal_framework_usage(framework);
CREATE INDEX IF NOT EXISTS idx_framework_usage_outcome ON deal_framework_usage(outcome);
CREATE INDEX IF NOT EXISTS idx_framework_usage_industry ON deal_framework_usage(industry);

-- A/B Tests
CREATE INDEX IF NOT EXISTS idx_ab_tests_user ON ab_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_ab_test_results_test ON ab_test_results(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_results_variant ON ab_test_results(variant);

-- Momentum
CREATE INDEX IF NOT EXISTS idx_momentum_signals_lead ON deal_momentum_signals(lead_id);
CREATE INDEX IF NOT EXISTS idx_momentum_signals_type ON deal_momentum_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_momentum_signals_date ON deal_momentum_signals(detected_at);

-- Effectiveness
CREATE INDEX IF NOT EXISTS idx_effectiveness_daily_user_date ON framework_effectiveness_daily(user_id, date);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE lead_psychology_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_framework_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_momentum_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE framework_effectiveness_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sales_intelligence_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own psychology profiles" ON lead_psychology_profiles
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own framework usage" ON deal_framework_usage
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own ab tests" ON ab_tests
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own ab test results" ON ab_test_results
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own momentum signals" ON deal_momentum_signals
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own effectiveness data" ON framework_effectiveness_daily
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own intelligence settings" ON user_sales_intelligence_settings
    FOR ALL USING (auth.uid() = user_id);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Calculate Momentum Score for a Lead
CREATE OR REPLACE FUNCTION calculate_lead_momentum_score(p_user_id UUID, p_lead_id UUID)
RETURNS TABLE (
    score NUMERIC,
    trend momentum_trend,
    positive_count INTEGER,
    negative_count INTEGER
) AS $$
DECLARE
    v_total_weight NUMERIC;
    v_weighted_sum NUMERIC;
    v_score NUMERIC;
    v_recent_positive INTEGER;
    v_older_positive INTEGER;
    v_trend momentum_trend;
BEGIN
    -- Calculate weighted score
    SELECT 
        COALESCE(SUM(
            CASE 
                WHEN signal_type = 'positive' THEN 8 * signal_weight
                WHEN signal_type = 'negative' THEN 2 * signal_weight
                ELSE 5 * signal_weight
            END
        ), 0),
        COALESCE(SUM(signal_weight), 1)
    INTO v_weighted_sum, v_total_weight
    FROM deal_momentum_signals
    WHERE user_id = p_user_id AND lead_id = p_lead_id
    AND detected_at > NOW() - INTERVAL '30 days';
    
    v_score := ROUND(v_weighted_sum / v_total_weight, 1);
    
    -- Calculate trend
    SELECT COUNT(*) INTO v_recent_positive
    FROM deal_momentum_signals
    WHERE user_id = p_user_id AND lead_id = p_lead_id
    AND signal_type = 'positive'
    AND detected_at > NOW() - INTERVAL '7 days';
    
    SELECT COUNT(*) INTO v_older_positive
    FROM deal_momentum_signals
    WHERE user_id = p_user_id AND lead_id = p_lead_id
    AND signal_type = 'positive'
    AND detected_at <= NOW() - INTERVAL '7 days'
    AND detected_at > NOW() - INTERVAL '30 days';
    
    IF v_recent_positive > v_older_positive THEN
        v_trend := 'improving';
    ELSIF v_recent_positive < v_older_positive THEN
        v_trend := 'declining';
    ELSE
        v_trend := 'stable';
    END IF;
    
    RETURN QUERY SELECT 
        v_score,
        v_trend,
        (SELECT COUNT(*)::INTEGER FROM deal_momentum_signals 
         WHERE user_id = p_user_id AND lead_id = p_lead_id AND signal_type = 'positive'),
        (SELECT COUNT(*)::INTEGER FROM deal_momentum_signals 
         WHERE user_id = p_user_id AND lead_id = p_lead_id AND signal_type = 'negative');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update Framework Effectiveness Daily (called by cron)
CREATE OR REPLACE FUNCTION update_framework_effectiveness_daily(p_user_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
DECLARE
    v_framework_stats JSONB := '{}'::JSONB;
    v_buyer_type_stats JSONB := '{}'::JSONB;
    v_industry_stats JSONB := '{}'::JSONB;
    v_totals RECORD;
    r RECORD;
BEGIN
    -- Framework Stats
    FOR r IN (
        SELECT 
            framework,
            COUNT(*) as uses,
            COUNT(*) FILTER (WHERE outcome = 'won') as conversions,
            AVG(deal_value) FILTER (WHERE outcome = 'won') as avg_value,
            AVG(days_to_close) FILTER (WHERE outcome = 'won') as avg_days
        FROM deal_framework_usage
        WHERE user_id = p_user_id
        AND started_at::DATE = p_date
        GROUP BY framework
    ) LOOP
        v_framework_stats := v_framework_stats || jsonb_build_object(
            r.framework::TEXT,
            jsonb_build_object(
                'uses', r.uses,
                'conversions', r.conversions,
                'avg_value', COALESCE(r.avg_value, 0),
                'avg_days', COALESCE(r.avg_days, 0)
            )
        );
    END LOOP;
    
    -- Buyer Type Stats
    FOR r IN (
        SELECT 
            buyer_type,
            COUNT(*) as leads,
            COUNT(*) FILTER (WHERE outcome = 'won') as conversions
        FROM deal_framework_usage
        WHERE user_id = p_user_id
        AND started_at::DATE = p_date
        AND buyer_type IS NOT NULL
        GROUP BY buyer_type
    ) LOOP
        v_buyer_type_stats := v_buyer_type_stats || jsonb_build_object(
            r.buyer_type::TEXT,
            jsonb_build_object('leads', r.leads, 'conversions', r.conversions)
        );
    END LOOP;
    
    -- Totals
    SELECT 
        COUNT(*) as total_deals,
        COUNT(*) FILTER (WHERE outcome = 'won') as total_conversions,
        COALESCE(SUM(deal_value) FILTER (WHERE outcome = 'won'), 0) as total_value
    INTO v_totals
    FROM deal_framework_usage
    WHERE user_id = p_user_id
    AND started_at::DATE = p_date;
    
    -- Upsert
    INSERT INTO framework_effectiveness_daily (
        user_id, date, framework_stats, buyer_type_stats, industry_stats,
        total_deals, total_conversions, total_value
    ) VALUES (
        p_user_id, p_date, v_framework_stats, v_buyer_type_stats, v_industry_stats,
        v_totals.total_deals, v_totals.total_conversions, v_totals.total_value
    )
    ON CONFLICT (user_id, date) DO UPDATE SET
        framework_stats = EXCLUDED.framework_stats,
        buyer_type_stats = EXCLUDED.buyer_type_stats,
        industry_stats = EXCLUDED.industry_stats,
        total_deals = EXCLUDED.total_deals,
        total_conversions = EXCLUDED.total_conversions,
        total_value = EXCLUDED.total_value;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get A/B Test Winner (with statistical significance check)
CREATE OR REPLACE FUNCTION get_ab_test_winner(p_test_id UUID)
RETURNS TABLE (
    winner TEXT,
    variant_a_rate NUMERIC,
    variant_b_rate NUMERIC,
    statistical_significance NUMERIC,
    is_significant BOOLEAN
) AS $$
DECLARE
    v_test RECORD;
    v_rate_a NUMERIC;
    v_rate_b NUMERIC;
    v_diff NUMERIC;
    v_significance NUMERIC;
BEGIN
    SELECT * INTO v_test FROM ab_tests WHERE id = p_test_id;
    
    IF v_test.variant_a_count = 0 OR v_test.variant_b_count = 0 THEN
        RETURN QUERY SELECT NULL::TEXT, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, FALSE;
        RETURN;
    END IF;
    
    v_rate_a := v_test.variant_a_conversions::NUMERIC / v_test.variant_a_count;
    v_rate_b := v_test.variant_b_conversions::NUMERIC / v_test.variant_b_count;
    v_diff := ABS(v_rate_a - v_rate_b);
    
    -- Simplified significance (in production: proper chi-squared or z-test)
    v_significance := LEAST(v_diff * 10, 1.0);
    
    RETURN QUERY SELECT
        CASE 
            WHEN v_test.variant_a_count < 30 OR v_test.variant_b_count < 30 THEN NULL
            WHEN v_diff < 0.05 THEN NULL
            WHEN v_rate_a > v_rate_b THEN 'a'
            ELSE 'b'
        END,
        ROUND(v_rate_a, 4),
        ROUND(v_rate_b, 4),
        ROUND(v_significance, 4),
        v_significance >= 0.95;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_sales_intelligence_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_lead_psychology_updated
    BEFORE UPDATE ON lead_psychology_profiles
    FOR EACH ROW EXECUTE FUNCTION update_sales_intelligence_timestamp();

CREATE TRIGGER trg_ab_tests_updated
    BEFORE UPDATE ON ab_tests
    FOR EACH ROW EXECUTE FUNCTION update_sales_intelligence_timestamp();

CREATE TRIGGER trg_user_settings_updated
    BEFORE UPDATE ON user_sales_intelligence_settings
    FOR EACH ROW EXECUTE FUNCTION update_sales_intelligence_timestamp();

-- Auto-update A/B test counters
CREATE OR REPLACE FUNCTION update_ab_test_counters()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.variant = 'a' THEN
        UPDATE ab_tests SET 
            variant_a_count = variant_a_count + 1,
            variant_a_conversions = variant_a_conversions + CASE WHEN NEW.converted THEN 1 ELSE 0 END,
            updated_at = NOW()
        WHERE id = NEW.test_id;
    ELSE
        UPDATE ab_tests SET 
            variant_b_count = variant_b_count + 1,
            variant_b_conversions = variant_b_conversions + CASE WHEN NEW.converted THEN 1 ELSE 0 END,
            updated_at = NOW()
        WHERE id = NEW.test_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ab_test_result_inserted
    AFTER INSERT ON ab_test_results
    FOR EACH ROW EXECUTE FUNCTION update_ab_test_counters();

-- =============================================================================
-- DONE
-- =============================================================================

COMMENT ON TABLE lead_psychology_profiles IS 'Buyer Psychology profiles for leads (DISC-based)';
COMMENT ON TABLE deal_framework_usage IS 'Tracks which sales framework was used for each deal';
COMMENT ON TABLE ab_tests IS 'A/B Tests for frameworks, templates, languages, etc.';
COMMENT ON TABLE ab_test_results IS 'Individual A/B test results/conversions';
COMMENT ON TABLE deal_momentum_signals IS 'Momentum signals for deal health tracking';
COMMENT ON TABLE framework_effectiveness_daily IS 'Daily aggregated framework effectiveness metrics';
COMMENT ON TABLE user_sales_intelligence_settings IS 'User settings for Sales Intelligence features';


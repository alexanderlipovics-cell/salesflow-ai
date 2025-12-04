-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  MIGRATION: Sales Intelligence v3.0 Tables                                ║
-- ║  A/B Tests, Framework Analytics, Buyer Psychology, Momentum Tracking       ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- =============================================================================
-- A/B TESTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Owner
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID,
    
    -- Test Definition
    name TEXT NOT NULL,
    description TEXT,
    test_type TEXT NOT NULL CHECK (test_type IN (
        'template', 'framework', 'tone', 'timing', 'channel', 'subject_line', 'cta'
    )),
    
    -- Variants
    variant_a TEXT NOT NULL,  -- Template ID, Framework ID, oder Text
    variant_b TEXT NOT NULL,
    variant_a_name TEXT DEFAULT 'Variante A',
    variant_b_name TEXT DEFAULT 'Variante B',
    
    -- Targeting
    target_metric TEXT NOT NULL DEFAULT 'reply_rate' CHECK (target_metric IN (
        'reply_rate', 'conversion_rate', 'meeting_rate', 'open_rate', 'click_rate'
    )),
    target_industry TEXT,
    target_buyer_type TEXT,
    
    -- Results
    variant_a_count INTEGER DEFAULT 0,
    variant_b_count INTEGER DEFAULT 0,
    variant_a_conversions INTEGER DEFAULT 0,
    variant_b_conversions INTEGER DEFAULT 0,
    
    -- Statistical Analysis
    winner TEXT CHECK (winner IN ('a', 'b', 'tie', 'inconclusive')),
    statistical_significance DECIMAL(5, 4) DEFAULT 0,
    confidence_level DECIMAL(5, 4) DEFAULT 0,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'running' CHECK (status IN (
        'draft', 'running', 'paused', 'completed', 'archived'
    )),
    
    -- Timestamps
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ab_tests_user ON ab_tests(user_id);
CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_ab_tests_type ON ab_tests(test_type);


-- =============================================================================
-- A/B TEST RESULTS TABLE (Individual Results)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ab_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
    
    -- Which variant
    variant TEXT NOT NULL CHECK (variant IN ('a', 'b')),
    
    -- Lead/Context
    lead_id UUID,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Outcome
    converted BOOLEAN DEFAULT false,
    metric_value DECIMAL(10, 4),
    
    -- Context
    industry TEXT,
    buyer_type TEXT,
    channel TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ab_results_test ON ab_test_results(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_results_variant ON ab_test_results(test_id, variant);
CREATE INDEX IF NOT EXISTS idx_ab_results_lead ON ab_test_results(lead_id) WHERE lead_id IS NOT NULL;


-- =============================================================================
-- FRAMEWORK USAGE STATS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS framework_usage_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Owner
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID,
    
    -- Framework
    framework_id TEXT NOT NULL CHECK (framework_id IN (
        'spin', 'challenger', 'solution', 'gap', 'sandler', 'meddic', 'bant', 'value'
    )),
    
    -- Period
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Metrics
    total_uses INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    meetings_booked INTEGER DEFAULT 0,
    deals_closed INTEGER DEFAULT 0,
    total_deal_value DECIMAL(15, 2) DEFAULT 0,
    avg_time_to_close_days INTEGER,
    
    -- Context Breakdown (JSONB)
    by_buyer_type JSONB DEFAULT '{}'::jsonb,  -- {"driver": 5, "analytical": 3}
    by_industry JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ein Eintrag pro User, Framework, Tag
    UNIQUE(user_id, framework_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_framework_stats_user ON framework_usage_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_framework_stats_framework ON framework_usage_stats(framework_id);
CREATE INDEX IF NOT EXISTS idx_framework_stats_date ON framework_usage_stats(date);


-- =============================================================================
-- BUYER TYPE STATS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS buyer_type_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Owner
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID,
    
    -- Buyer Type
    buyer_type TEXT NOT NULL CHECK (buyer_type IN (
        'driver', 'analytical', 'expressive', 'amiable'
    )),
    
    -- Period
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Metrics
    total_leads INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    total_touchpoints INTEGER DEFAULT 0,
    avg_touchpoints DECIMAL(5, 2) DEFAULT 0,
    
    -- Best Framework for this buyer type
    best_framework TEXT,
    
    -- Response Times
    avg_response_time_hours DECIMAL(10, 2),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, buyer_type, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_buyer_stats_user ON buyer_type_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_buyer_stats_type ON buyer_type_stats(buyer_type);
CREATE INDEX IF NOT EXISTS idx_buyer_stats_date ON buyer_type_stats(date);


-- =============================================================================
-- INDUSTRY STATS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS industry_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Owner
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID,
    
    -- Industry
    industry_id TEXT NOT NULL,
    industry_name TEXT,
    
    -- Period
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Metrics
    total_deals INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    total_deal_value DECIMAL(15, 2) DEFAULT 0,
    avg_deal_size DECIMAL(15, 2) DEFAULT 0,
    
    -- Best Practices
    best_framework TEXT,
    best_buyer_approach TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, industry_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_industry_stats_user ON industry_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_industry_stats_industry ON industry_stats(industry_id);
CREATE INDEX IF NOT EXISTS idx_industry_stats_date ON industry_stats(date);


-- =============================================================================
-- MOMENTUM SIGNALS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS momentum_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Lead
    lead_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID,
    
    -- Signal
    signal_type TEXT NOT NULL CHECK (signal_type IN (
        'positive', 'negative', 'neutral'
    )),
    signal_name TEXT NOT NULL,  -- z.B. "email_opened", "meeting_scheduled", "no_response"
    signal_weight DECIMAL(3, 2) DEFAULT 1.0,  -- 0.1 to 3.0
    
    -- Description
    description TEXT,
    
    -- Source
    source TEXT,  -- "email", "call", "meeting", "website", "social"
    
    -- Timestamps
    signal_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_momentum_lead ON momentum_signals(lead_id);
CREATE INDEX IF NOT EXISTS idx_momentum_user ON momentum_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_momentum_type ON momentum_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_momentum_date ON momentum_signals(signal_at);


-- =============================================================================
-- MOMENTUM SCORES TABLE (Aggregated)
-- =============================================================================

CREATE TABLE IF NOT EXISTS momentum_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    lead_id UUID NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Current Score
    score INTEGER DEFAULT 50 CHECK (score BETWEEN 0 AND 100),
    trend TEXT DEFAULT 'stable' CHECK (trend IN ('rising', 'stable', 'declining')),
    
    -- Signal Counts
    positive_signals INTEGER DEFAULT 0,
    negative_signals INTEGER DEFAULT 0,
    neutral_signals INTEGER DEFAULT 0,
    
    -- Last Update
    last_signal_at TIMESTAMPTZ,
    
    -- Recommendation
    recommendation TEXT,
    alert TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_momentum_scores_lead ON momentum_scores(lead_id);
CREATE INDEX IF NOT EXISTS idx_momentum_scores_user ON momentum_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_momentum_scores_score ON momentum_scores(score);


-- =============================================================================
-- MICRO COACHING LOGS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS micro_coaching_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Action
    action_type TEXT NOT NULL,
    context JSONB,
    
    -- Feedback
    feedback TEXT NOT NULL,
    feedback_type TEXT CHECK (feedback_type IN ('positive', 'warning', 'tip')),
    
    -- Was it shown/used?
    was_shown BOOLEAN DEFAULT true,
    was_helpful BOOLEAN,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_coaching_user ON micro_coaching_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_coaching_action ON micro_coaching_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_coaching_date ON micro_coaching_logs(created_at);


-- =============================================================================
-- PHONE MODE SESSIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS phone_mode_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID,
    lead_name TEXT,
    
    -- Call Details
    call_type TEXT CHECK (call_type IN ('cold', 'warm', 'follow_up', 'closing')),
    
    -- Transcript & Coaching
    transcript_segments JSONB DEFAULT '[]'::jsonb,
    coaching_hints JSONB DEFAULT '[]'::jsonb,
    
    -- Outcome
    call_outcome TEXT,
    next_steps TEXT,
    
    -- Timestamps
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_phone_sessions_user ON phone_mode_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_phone_sessions_lead ON phone_mode_sessions(lead_id) WHERE lead_id IS NOT NULL;


-- =============================================================================
-- DAILY EFFECTIVENESS AGGREGATION TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS daily_effectiveness (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID,
    
    -- Period
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Framework Stats (aggregated)
    framework_stats JSONB DEFAULT '{}'::jsonb,
    
    -- Buyer Type Stats
    buyer_type_stats JSONB DEFAULT '{}'::jsonb,
    
    -- Industry Stats
    industry_stats JSONB DEFAULT '{}'::jsonb,
    
    -- Overall Metrics
    total_activities INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5, 4) DEFAULT 0,
    
    -- Top Performers
    top_framework TEXT,
    top_buyer_type TEXT,
    top_industry TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_eff_user ON daily_effectiveness(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_eff_date ON daily_effectiveness(date);


-- =============================================================================
-- VERTICAL CONFIGS TABLE (Optional - für DB-basierte Verticals)
-- =============================================================================

CREATE TABLE IF NOT EXISTS vertical_configs (
    id TEXT PRIMARY KEY,  -- z.B. "network_marketing"
    
    -- Display
    display_name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    
    -- Settings
    compliance_level TEXT DEFAULT 'standard' CHECK (compliance_level IN (
        'low', 'standard', 'high', 'regulated'
    )),
    default_tone TEXT DEFAULT 'professional',
    
    -- JSON Configs
    key_objections JSONB DEFAULT '[]'::jsonb,
    common_moods JSONB DEFAULT '[]'::jsonb,
    special_rules JSONB DEFAULT '[]'::jsonb,
    coach_priorities JSONB DEFAULT '[]'::jsonb,
    
    -- Extended Config
    pipeline_stages JSONB DEFAULT '[]'::jsonb,
    kpis JSONB DEFAULT '[]'::jsonb,
    followup_cycle JSONB DEFAULT '{}'::jsonb,
    channels JSONB DEFAULT '{"primary": [], "secondary": []}'::jsonb,
    playbooks JSONB DEFAULT '[]'::jsonb,
    success_patterns JSONB DEFAULT '[]'::jsonb,
    
    -- Active
    is_active BOOLEAN DEFAULT true,
    is_custom BOOLEAN DEFAULT false,  -- User-created vertical
    
    -- Owner (for custom verticals)
    created_by UUID REFERENCES auth.users(id),
    company_id UUID,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vertical_active ON vertical_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_vertical_custom ON vertical_configs(is_custom);


-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

ALTER TABLE ab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE ab_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE framework_usage_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_type_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE industry_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE momentum_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE momentum_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE micro_coaching_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_mode_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_effectiveness ENABLE ROW LEVEL SECURITY;

-- A/B Tests: Eigene Tests
CREATE POLICY "Eigene AB Tests sehen" ON ab_tests FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
CREATE POLICY "AB Tests erstellen" ON ab_tests FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "AB Tests bearbeiten" ON ab_tests FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);
CREATE POLICY "AB Tests löschen" ON ab_tests FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- A/B Test Results
CREATE POLICY "Eigene AB Results sehen" ON ab_test_results FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
CREATE POLICY "AB Results erstellen" ON ab_test_results FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Framework Stats
CREATE POLICY "Eigene Framework Stats sehen" ON framework_usage_stats FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
CREATE POLICY "Framework Stats erstellen/updaten" ON framework_usage_stats FOR ALL TO authenticated
    USING (auth.uid() = user_id);

-- Buyer Type Stats
CREATE POLICY "Eigene Buyer Stats sehen" ON buyer_type_stats FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
CREATE POLICY "Buyer Stats erstellen/updaten" ON buyer_type_stats FOR ALL TO authenticated
    USING (auth.uid() = user_id);

-- Industry Stats
CREATE POLICY "Eigene Industry Stats sehen" ON industry_stats FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
CREATE POLICY "Industry Stats erstellen/updaten" ON industry_stats FOR ALL TO authenticated
    USING (auth.uid() = user_id);

-- Momentum Signals
CREATE POLICY "Eigene Momentum Signals sehen" ON momentum_signals FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
CREATE POLICY "Momentum Signals erstellen" ON momentum_signals FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Momentum Scores
CREATE POLICY "Eigene Momentum Scores sehen" ON momentum_scores FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
CREATE POLICY "Momentum Scores erstellen/updaten" ON momentum_scores FOR ALL TO authenticated
    USING (auth.uid() = user_id);

-- Micro Coaching Logs
CREATE POLICY "Eigene Coaching Logs sehen" ON micro_coaching_logs FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
CREATE POLICY "Coaching Logs erstellen" ON micro_coaching_logs FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Phone Mode Sessions
CREATE POLICY "Eigene Phone Sessions sehen" ON phone_mode_sessions FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
CREATE POLICY "Phone Sessions erstellen" ON phone_mode_sessions FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Phone Sessions bearbeiten" ON phone_mode_sessions FOR UPDATE TO authenticated
    USING (auth.uid() = user_id);

-- Daily Effectiveness
CREATE POLICY "Eigene Daily Effectiveness sehen" ON daily_effectiveness FOR SELECT TO authenticated
    USING (auth.uid() = user_id);
CREATE POLICY "Daily Effectiveness erstellen/updaten" ON daily_effectiveness FOR ALL TO authenticated
    USING (auth.uid() = user_id);

-- Vertical Configs: Öffentlich lesbar, nur eigene Custom editierbar
ALTER TABLE vertical_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Verticals lesen" ON vertical_configs FOR SELECT TO authenticated
    USING (is_active = true);
CREATE POLICY "Custom Verticals erstellen" ON vertical_configs FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = created_by AND is_custom = true);
CREATE POLICY "Custom Verticals bearbeiten" ON vertical_configs FOR UPDATE TO authenticated
    USING (auth.uid() = created_by AND is_custom = true);


-- =============================================================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_trigger()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_ab_tests_updated_at BEFORE UPDATE ON ab_tests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_trigger();

CREATE TRIGGER trigger_framework_stats_updated_at BEFORE UPDATE ON framework_usage_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_trigger();

CREATE TRIGGER trigger_buyer_stats_updated_at BEFORE UPDATE ON buyer_type_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_trigger();

CREATE TRIGGER trigger_industry_stats_updated_at BEFORE UPDATE ON industry_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_trigger();

CREATE TRIGGER trigger_momentum_scores_updated_at BEFORE UPDATE ON momentum_scores
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_trigger();

CREATE TRIGGER trigger_daily_eff_updated_at BEFORE UPDATE ON daily_effectiveness
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_trigger();

CREATE TRIGGER trigger_vertical_configs_updated_at BEFORE UPDATE ON vertical_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_trigger();


-- =============================================================================
-- HELPER FUNCTIONS
-- =============================================================================

-- Function to update A/B test counters atomically
CREATE OR REPLACE FUNCTION log_ab_test_result(
    p_test_id UUID,
    p_variant TEXT,
    p_converted BOOLEAN,
    p_lead_id UUID DEFAULT NULL,
    p_user_id UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    -- Insert result
    INSERT INTO ab_test_results (test_id, variant, converted, lead_id, user_id)
    VALUES (p_test_id, p_variant, p_converted, p_lead_id, COALESCE(p_user_id, auth.uid()));
    
    -- Update counters
    IF p_variant = 'a' THEN
        UPDATE ab_tests SET
            variant_a_count = variant_a_count + 1,
            variant_a_conversions = variant_a_conversions + CASE WHEN p_converted THEN 1 ELSE 0 END,
            updated_at = NOW()
        WHERE id = p_test_id;
    ELSE
        UPDATE ab_tests SET
            variant_b_count = variant_b_count + 1,
            variant_b_conversions = variant_b_conversions + CASE WHEN p_converted THEN 1 ELSE 0 END,
            updated_at = NOW()
        WHERE id = p_test_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment A/B test counters atomically
CREATE OR REPLACE FUNCTION increment_ab_test_counter(
    p_test_id UUID,
    p_variant TEXT,
    p_converted BOOLEAN
) RETURNS VOID AS $$
BEGIN
    IF p_variant = 'a' THEN
        UPDATE ab_tests SET
            variant_a_count = variant_a_count + 1,
            variant_a_conversions = variant_a_conversions + CASE WHEN p_converted THEN 1 ELSE 0 END,
            updated_at = NOW()
        WHERE id = p_test_id;
    ELSE
        UPDATE ab_tests SET
            variant_b_count = variant_b_count + 1,
            variant_b_conversions = variant_b_conversions + CASE WHEN p_converted THEN 1 ELSE 0 END,
            updated_at = NOW()
        WHERE id = p_test_id;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function to calculate momentum score
CREATE OR REPLACE FUNCTION calculate_lead_momentum(p_lead_id UUID)
RETURNS TABLE (
    score INTEGER,
    trend TEXT,
    positive_count INTEGER,
    negative_count INTEGER
) AS $$
DECLARE
    v_positive INTEGER;
    v_negative INTEGER;
    v_neutral INTEGER;
    v_score INTEGER;
    v_trend TEXT;
    v_recent_positive INTEGER;
    v_recent_negative INTEGER;
BEGIN
    -- Count signals from last 30 days
    SELECT 
        COUNT(*) FILTER (WHERE signal_type = 'positive'),
        COUNT(*) FILTER (WHERE signal_type = 'negative'),
        COUNT(*) FILTER (WHERE signal_type = 'neutral')
    INTO v_positive, v_negative, v_neutral
    FROM momentum_signals
    WHERE lead_id = p_lead_id
      AND signal_at > NOW() - INTERVAL '30 days';
    
    -- Calculate score (0-100)
    v_score := LEAST(100, GREATEST(0, 
        50 + (v_positive * 10) - (v_negative * 15)
    ));
    
    -- Calculate trend from last 7 days vs previous 7 days
    SELECT 
        COUNT(*) FILTER (WHERE signal_type = 'positive' AND signal_at > NOW() - INTERVAL '7 days'),
        COUNT(*) FILTER (WHERE signal_type = 'negative' AND signal_at > NOW() - INTERVAL '7 days')
    INTO v_recent_positive, v_recent_negative
    FROM momentum_signals
    WHERE lead_id = p_lead_id;
    
    IF v_recent_positive > v_recent_negative + 1 THEN
        v_trend := 'rising';
    ELSIF v_recent_negative > v_recent_positive + 1 THEN
        v_trend := 'declining';
    ELSE
        v_trend := 'stable';
    END IF;
    
    RETURN QUERY SELECT v_score, v_trend, v_positive, v_negative;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- SEED DEFAULT VERTICALS (Optional)
-- =============================================================================

INSERT INTO vertical_configs (id, display_name, description, compliance_level, default_tone, key_objections, is_custom)
VALUES 
    ('network_marketing', 'Network Marketing', 'MLM und Direktvertrieb', 'standard', 'casual', 
     '["Ist das MLM?", "Keine Zeit", "Kein Geld", "Muss Partner fragen"]'::jsonb, false),
    ('real_estate', 'Immobilien', 'Makler und Immobilienvertrieb', 'high', 'professional',
     '["Zu teuer", "Muss noch überlegen", "Andere Angebote", "Finanzierung unklar"]'::jsonb, false),
    ('coaching', 'Coaching', 'Business und Life Coaching', 'standard', 'empathetic',
     '["Zu teuer", "Keine Zeit", "Schaffe ich alleine", "Später vielleicht"]'::jsonb, false),
    ('insurance', 'Versicherung', 'Versicherungsvertrieb', 'regulated', 'professional',
     '["Schon versichert", "Zu teuer", "Muss Unterlagen prüfen", "Partner fragen"]'::jsonb, false),
    ('finance', 'Finanzberatung', 'Finanz- und Anlageberatung', 'regulated', 'professional',
     '["Kein Geld zum Anlegen", "Muss Bank fragen", "Zu riskant", "Verstehe das nicht"]'::jsonb, false)
ON CONFLICT (id) DO NOTHING;


-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE ab_tests IS 'A/B Tests für Templates, Frameworks, Messaging';
COMMENT ON TABLE ab_test_results IS 'Einzelne Ergebnisse von A/B Tests';
COMMENT ON TABLE framework_usage_stats IS 'Tägliche Statistiken pro Sales Framework';
COMMENT ON TABLE buyer_type_stats IS 'Statistiken nach Buyer Psychology Type';
COMMENT ON TABLE industry_stats IS 'Branchenspezifische Statistiken';
COMMENT ON TABLE momentum_signals IS 'Einzelne Momentum-Signale für Leads';
COMMENT ON TABLE momentum_scores IS 'Aggregierte Momentum-Scores pro Lead';
COMMENT ON TABLE micro_coaching_logs IS 'Logs der Micro-Coaching Hinweise';
COMMENT ON TABLE phone_mode_sessions IS 'Phone Mode Call Sessions';
COMMENT ON TABLE daily_effectiveness IS 'Tägliche Effektivitäts-Aggregation';
COMMENT ON TABLE vertical_configs IS 'Branchenkonfigurationen (Standard + Custom)';


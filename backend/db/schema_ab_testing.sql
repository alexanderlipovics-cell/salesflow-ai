-- ============================================================
-- A/B TESTING SCHEMA
-- Track and analyze A/B test campaigns
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. AB TESTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS ab_tests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    test_type VARCHAR(100) NOT NULL, -- message_template, subject_line, objection_response, etc.
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, running, completed, paused
    industry VARCHAR(100),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    winner_variant_id UUID, -- Reference to winning variant
    confidence_level DECIMAL(5,2), -- Statistical confidence (0-100)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID, -- User who created the test
    
    CONSTRAINT valid_status CHECK (status IN ('draft', 'running', 'completed', 'paused')),
    CONSTRAINT valid_test_type CHECK (test_type IN (
        'message_template', 'subject_line', 'objection_response',
        'follow_up_sequence', 'call_script', 'email_copy', 'landing_page'
    ))
);

-- ============================================================
-- 2. AB TEST VARIANTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS ab_test_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
    variant_name VARCHAR(100) NOT NULL, -- e.g., "A", "B", "Control"
    content JSONB NOT NULL, -- Template text, subject line, etc.
    impressions INTEGER DEFAULT 0, -- How many times shown
    conversions INTEGER DEFAULT 0, -- How many conversions
    conversion_rate DECIMAL(5,2) DEFAULT 0.00, -- Percentage
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_variant_per_test UNIQUE(test_id, variant_name),
    CONSTRAINT positive_impressions CHECK (impressions >= 0),
    CONSTRAINT positive_conversions CHECK (conversions >= 0),
    CONSTRAINT valid_conversion_rate CHECK (conversion_rate >= 0 AND conversion_rate <= 100)
);

-- ============================================================
-- 3. AB TEST EVENTS TABLE (Detailed tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS ab_test_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id UUID NOT NULL REFERENCES ab_tests(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES ab_test_variants(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- impression, click, conversion, bounce
    lead_id UUID, -- Optional: Link to specific lead
    user_id UUID, -- User who triggered the event
    metadata JSONB DEFAULT '{}', -- Additional context
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_event_type CHECK (event_type IN (
        'impression', 'click', 'conversion', 'bounce', 'open', 'reply'
    ))
);

-- ============================================================
-- 4. AB TEST RESULTS SUMMARY (Materialized view for performance)
-- ============================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS ab_test_results_summary AS
SELECT 
    t.id AS test_id,
    t.name AS test_name,
    t.status,
    t.test_type,
    v.id AS variant_id,
    v.variant_name,
    v.impressions,
    v.conversions,
    v.conversion_rate,
    RANK() OVER (PARTITION BY t.id ORDER BY v.conversion_rate DESC) AS rank
FROM ab_tests t
JOIN ab_test_variants v ON t.id = v.test_id
WHERE t.status IN ('running', 'completed');

-- Index for the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_ab_test_results_unique 
    ON ab_test_results_summary (test_id, variant_id);

-- ============================================================
-- INDEXES for Performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_ab_tests_status ON ab_tests(status);
CREATE INDEX IF NOT EXISTS idx_ab_tests_type ON ab_tests(test_type);
CREATE INDEX IF NOT EXISTS idx_ab_tests_industry ON ab_tests(industry);
CREATE INDEX IF NOT EXISTS idx_ab_tests_dates ON ab_tests(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_ab_test_variants_test ON ab_test_variants(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_variants_rate ON ab_test_variants(conversion_rate DESC);

CREATE INDEX IF NOT EXISTS idx_ab_test_events_test ON ab_test_events(test_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_events_variant ON ab_test_events(variant_id);
CREATE INDEX IF NOT EXISTS idx_ab_test_events_type ON ab_test_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ab_test_events_created ON ab_test_events(created_at);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-update conversion rate when impressions/conversions change
CREATE OR REPLACE FUNCTION update_variant_conversion_rate()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.impressions > 0 THEN
        NEW.conversion_rate = ROUND((NEW.conversions::DECIMAL / NEW.impressions) * 100, 2);
    ELSE
        NEW.conversion_rate = 0;
    END IF;
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_variant_rate BEFORE UPDATE ON ab_test_variants
    FOR EACH ROW EXECUTE FUNCTION update_variant_conversion_rate();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_ab_tests_updated_at BEFORE UPDATE ON ab_tests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Refresh materialized view on variant updates
CREATE OR REPLACE FUNCTION refresh_ab_test_results()
RETURNS TRIGGER AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY ab_test_results_summary;
    RETURN NULL;
END;
$$ language 'plpgsql';

CREATE TRIGGER refresh_results_on_variant_change 
    AFTER INSERT OR UPDATE ON ab_test_variants
    FOR EACH STATEMENT EXECUTE FUNCTION refresh_ab_test_results();

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Function to calculate statistical significance (Chi-square test)
CREATE OR REPLACE FUNCTION calculate_ab_test_significance(
    test_id_param UUID
) RETURNS TABLE (
    variant_a_id UUID,
    variant_b_id UUID,
    p_value DECIMAL,
    is_significant BOOLEAN
) AS $$
DECLARE
    variants RECORD;
BEGIN
    -- This is a simplified chi-square test
    -- For production, consider using a proper statistical library
    
    FOR variants IN 
        SELECT 
            v1.id AS var_a_id,
            v2.id AS var_b_id,
            v1.impressions AS a_impressions,
            v1.conversions AS a_conversions,
            v2.impressions AS b_impressions,
            v2.conversions AS b_conversions
        FROM ab_test_variants v1
        CROSS JOIN ab_test_variants v2
        WHERE v1.test_id = test_id_param
          AND v2.test_id = test_id_param
          AND v1.id < v2.id
    LOOP
        -- Simplified p-value calculation (placeholder)
        -- In production, use proper chi-square calculation
        variant_a_id := variants.var_a_id;
        variant_b_id := variants.var_b_id;
        p_value := 0.05; -- Placeholder
        is_significant := (
            ABS(variants.a_conversions::DECIMAL / NULLIF(variants.a_impressions, 0) - 
                variants.b_conversions::DECIMAL / NULLIF(variants.b_impressions, 0)) > 0.05
        );
        
        RETURN NEXT;
    END LOOP;
END;
$$ LANGUAGE plpgsql;


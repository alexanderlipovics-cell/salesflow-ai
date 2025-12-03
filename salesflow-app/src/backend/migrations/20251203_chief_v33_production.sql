-- ============================================================================
-- CHIEF v3.3 PRODUCTION READY
-- Security, Performance, Learning, Emotion Engine, Coach System
-- ============================================================================
-- Migration: 20251203_chief_v33_production.sql
-- Description: Enterprise-Grade Updates für CHIEF Live Assist
-- ============================================================================

-- ===================
-- TEIL 1: TENANT-ISOLATION (RLS POLICIES)
-- ===================

-- Drop alte "Anyone can read" Policies
DROP POLICY IF EXISTS "Anyone can read quick facts" ON quick_facts;
DROP POLICY IF EXISTS "Anyone can read objection responses" ON objection_responses;
DROP POLICY IF EXISTS "Anyone can read vertical knowledge" ON vertical_knowledge;

-- Quick Facts: Echte Tenant-Isolation
CREATE POLICY "tenant_quick_facts" ON quick_facts
FOR SELECT
TO authenticated
USING (
    is_active = true
    AND (
        company_id IS NULL  -- Globales Wissen für alle
        OR company_id = COALESCE(
            NULLIF(current_setting('app.current_company_id', true), '')::uuid,
            (SELECT company_id FROM company_users WHERE user_id = auth.uid() LIMIT 1)
        )
    )
);

-- Objection Responses: Echte Tenant-Isolation  
CREATE POLICY "tenant_objection_responses" ON objection_responses
FOR SELECT
TO authenticated
USING (
    is_active = true
    AND (
        company_id IS NULL
        OR company_id = COALESCE(
            NULLIF(current_setting('app.current_company_id', true), '')::uuid,
            (SELECT company_id FROM company_users WHERE user_id = auth.uid() LIMIT 1)
        )
    )
);

-- Vertical Knowledge: Echte Tenant-Isolation
CREATE POLICY "tenant_vertical_knowledge" ON vertical_knowledge
FOR SELECT
TO authenticated
USING (
    is_active = true
    AND (
        company_id IS NULL
        OR company_id = COALESCE(
            NULLIF(current_setting('app.current_company_id', true), '')::uuid,
            (SELECT company_id FROM company_users WHERE user_id = auth.uid() LIMIT 1)
        )
    )
);

-- Live Assist Sessions: Tenant-Isolation
DROP POLICY IF EXISTS "Users can manage own sessions" ON live_assist_sessions;
CREATE POLICY "tenant_live_assist_sessions" ON live_assist_sessions
FOR ALL
TO authenticated
USING (
    user_id = auth.uid()
    OR company_id = COALESCE(
        NULLIF(current_setting('app.current_company_id', true), '')::uuid,
        (SELECT company_id FROM company_users WHERE user_id = auth.uid() LIMIT 1)
    )
);

-- Live Assist Queries: Nur eigene Session
DROP POLICY IF EXISTS "Users can manage own queries" ON live_assist_queries;
CREATE POLICY "tenant_live_assist_queries" ON live_assist_queries
FOR ALL
TO authenticated
USING (
    session_id IN (
        SELECT id FROM live_assist_sessions 
        WHERE user_id = auth.uid()
    )
);


-- ===================
-- TEIL 2: EMOTION & STIMMUNGS-FELDER
-- ===================

-- Neue Felder für live_assist_queries
ALTER TABLE live_assist_queries
    ADD COLUMN IF NOT EXISTS contact_mood TEXT,           -- 'positiv', 'neutral', 'gestresst', 'skeptisch'
    ADD COLUMN IF NOT EXISTS engagement_level INTEGER,    -- 1-5
    ADD COLUMN IF NOT EXISTS decision_tendency TEXT,      -- 'on_hold', 'close_to_yes', 'close_to_no', 'neutral'
    ADD COLUMN IF NOT EXISTS tone_hint TEXT,              -- 'neutral', 'direct', 'reassuring', 'value_focused', 'evidence_based'
    ADD COLUMN IF NOT EXISTS emotion_confidence NUMERIC(3,2),  -- 0.0 - 1.0
    ADD COLUMN IF NOT EXISTS user_corrected_intent TEXT,
    ADD COLUMN IF NOT EXISTS user_corrected_objection_type TEXT,
    ADD COLUMN IF NOT EXISTS feedback_text TEXT,
    ADD COLUMN IF NOT EXISTS feedback_at TIMESTAMPTZ;

-- Constraint für engagement_level
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_engagement_level'
    ) THEN
        ALTER TABLE live_assist_queries
            ADD CONSTRAINT check_engagement_level CHECK (engagement_level IS NULL OR engagement_level BETWEEN 1 AND 5);
    END IF;
END $$;

-- Index für Emotion Analytics
CREATE INDEX IF NOT EXISTS idx_queries_emotion 
ON live_assist_queries(contact_mood, decision_tendency)
WHERE contact_mood IS NOT NULL;

-- Index für Learning-Queries
CREATE INDEX IF NOT EXISTS idx_queries_with_feedback 
ON live_assist_queries(detected_intent, user_corrected_intent)
WHERE user_corrected_intent IS NOT NULL;


-- ===================
-- TEIL 3: INTENT LEARNING PATTERNS
-- ===================

CREATE TABLE IF NOT EXISTS intent_learning_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    
    -- Pattern
    query_pattern TEXT NOT NULL,          -- Normalisiertes Query-Muster
    wrong_intent TEXT NOT NULL,           -- Ursprünglich erkannter Intent
    correct_intent TEXT NOT NULL,         -- Korrigierter Intent
    
    -- Learning Metadata
    confidence NUMERIC(3,2) DEFAULT 0.5,  -- 0.0 - 1.0
    correction_count INTEGER DEFAULT 1,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique Constraint
    UNIQUE(company_id, query_pattern)
);

-- Index für Pattern-Lookup
CREATE INDEX IF NOT EXISTS idx_intent_patterns_lookup 
ON intent_learning_patterns(company_id, query_pattern);

-- Enable RLS
ALTER TABLE intent_learning_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_intent_patterns" ON intent_learning_patterns
FOR ALL
TO authenticated
USING (
    company_id IS NULL
    OR company_id = COALESCE(
        NULLIF(current_setting('app.current_company_id', true), '')::uuid,
        (SELECT company_id FROM company_users WHERE user_id = auth.uid() LIMIT 1)
    )
);


-- ===================
-- TEIL 4: OBJECTION LEARNING PATTERNS
-- ===================

CREATE TABLE IF NOT EXISTS objection_learning_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    
    -- Pattern
    query_pattern TEXT NOT NULL,
    wrong_objection_type TEXT NOT NULL,
    correct_objection_type TEXT NOT NULL,
    
    -- Learning Metadata
    confidence NUMERIC(3,2) DEFAULT 0.5,
    correction_count INTEGER DEFAULT 1,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(company_id, query_pattern)
);

CREATE INDEX IF NOT EXISTS idx_objection_patterns_lookup 
ON objection_learning_patterns(company_id, query_pattern);

ALTER TABLE objection_learning_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_objection_patterns" ON objection_learning_patterns
FOR ALL
TO authenticated
USING (
    company_id IS NULL
    OR company_id = COALESCE(
        NULLIF(current_setting('app.current_company_id', true), '')::uuid,
        (SELECT company_id FROM company_users WHERE user_id = auth.uid() LIMIT 1)
    )
);


-- ===================
-- TEIL 5: SESSION CACHE METADATA
-- ===================

-- Neue Felder für live_assist_sessions
ALTER TABLE live_assist_sessions
    ADD COLUMN IF NOT EXISTS cache_preloaded_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cache_facts_count INTEGER,
    ADD COLUMN IF NOT EXISTS cache_objections_count INTEGER,
    ADD COLUMN IF NOT EXISTS cache_products_count INTEGER,
    ADD COLUMN IF NOT EXISTS avg_response_time_ms INTEGER,
    ADD COLUMN IF NOT EXISTS cache_hit_rate NUMERIC(3,2);


-- ===================
-- TEIL 6: COACH ANALYTICS VIEWS
-- ===================

-- View: Mood Distribution per User
CREATE OR REPLACE VIEW v_live_assist_mood_distribution AS
SELECT
    s.user_id,
    s.company_id,
    q.contact_mood,
    COUNT(*) as count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY s.user_id, s.company_id), 1) as percentage
FROM live_assist_queries q
JOIN live_assist_sessions s ON s.id = q.session_id
WHERE q.contact_mood IS NOT NULL
  AND q.created_at >= NOW() - INTERVAL '30 days'
GROUP BY s.user_id, s.company_id, q.contact_mood;

-- View: Decision Tendency Distribution per User
CREATE OR REPLACE VIEW v_live_assist_decision_distribution AS
SELECT
    s.user_id,
    s.company_id,
    q.decision_tendency,
    COUNT(*) as count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY s.user_id, s.company_id), 1) as percentage
FROM live_assist_queries q
JOIN live_assist_sessions s ON s.id = q.session_id
WHERE q.decision_tendency IS NOT NULL
  AND q.created_at >= NOW() - INTERVAL '30 days'
GROUP BY s.user_id, s.company_id, q.decision_tendency;

-- View: Intent Distribution per Company
CREATE OR REPLACE VIEW v_live_assist_intent_distribution AS
SELECT
    s.company_id,
    q.detected_intent,
    COUNT(*) as count,
    ROUND(AVG(q.response_time_ms)) as avg_response_time_ms,
    ROUND(100.0 * SUM(CASE WHEN q.was_helpful THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) as helpful_rate
FROM live_assist_queries q
JOIN live_assist_sessions s ON s.id = q.session_id
WHERE q.created_at >= NOW() - INTERVAL '30 days'
GROUP BY s.company_id, q.detected_intent;

-- View: Top Objections per Company
CREATE OR REPLACE VIEW v_live_assist_top_objections AS
SELECT
    s.company_id,
    q.detected_objection_type,
    COUNT(*) as count,
    ROUND(100.0 * SUM(CASE WHEN q.was_helpful THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) as helpful_rate
FROM live_assist_queries q
JOIN live_assist_sessions s ON s.id = q.session_id
WHERE q.detected_intent = 'objection'
  AND q.created_at >= NOW() - INTERVAL '30 days'
  AND q.detected_objection_type IS NOT NULL
GROUP BY s.company_id, q.detected_objection_type
ORDER BY count DESC;

-- View: User Performance Leaderboard
CREATE OR REPLACE VIEW v_live_assist_user_leaderboard AS
SELECT
    s.user_id,
    s.company_id,
    COUNT(DISTINCT s.id) AS sessions,
    SUM(s.queries_count) AS total_queries,
    ROUND(AVG(q.response_time_ms)) AS avg_response_ms,
    ROUND(100.0 * SUM(CASE WHEN q.was_helpful THEN 1 ELSE 0 END) / NULLIF(COUNT(q.*), 0), 1) AS helpful_rate
FROM live_assist_sessions s
LEFT JOIN live_assist_queries q ON q.session_id = s.id
WHERE s.created_at >= NOW() - INTERVAL '30 days'
GROUP BY s.user_id, s.company_id;

-- View: Performance Over Time (Daily)
CREATE OR REPLACE VIEW v_live_assist_daily_performance AS
SELECT
    DATE_TRUNC('day', q.created_at) AS date,
    s.company_id,
    COUNT(*) AS queries,
    ROUND(AVG(q.response_time_ms)) AS avg_response_ms,
    ROUND(100.0 * SUM(CASE WHEN q.was_helpful THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) AS helpful_rate,
    ROUND(100.0 * SUM(CASE WHEN q.response_time_ms < 100 THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 1) AS cache_hit_rate
FROM live_assist_queries q
JOIN live_assist_sessions s ON s.id = q.session_id
WHERE q.created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', q.created_at), s.company_id
ORDER BY date;


-- ===================
-- TEIL 7: HELPER FUNCTIONS
-- ===================

-- Function: Set Tenant Context für RLS
CREATE OR REPLACE FUNCTION set_tenant_context(p_company_id UUID)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_company_id', p_company_id::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Clear Tenant Context
CREATE OR REPLACE FUNCTION clear_tenant_context()
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_company_id', '', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get Learned Intent Correction
CREATE OR REPLACE FUNCTION get_learned_intent(
    p_company_id UUID,
    p_query_pattern TEXT
)
RETURNS TABLE (
    correct_intent TEXT,
    confidence NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ilp.correct_intent,
        ilp.confidence
    FROM intent_learning_patterns ilp
    WHERE (ilp.company_id = p_company_id OR ilp.company_id IS NULL)
      AND p_query_pattern ILIKE '%' || ilp.query_pattern || '%'
    ORDER BY ilp.confidence DESC, ilp.correction_count DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Aggregate Intent Learnings (für Cron-Job)
CREATE OR REPLACE FUNCTION aggregate_intent_learnings(p_company_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    -- Finde häufige Korrekturen
    INSERT INTO intent_learning_patterns (company_id, query_pattern, wrong_intent, correct_intent, confidence, correction_count)
    SELECT 
        p_company_id,
        LOWER(SUBSTRING(query_text, 1, 100)),
        detected_intent,
        user_corrected_intent,
        LEAST(COUNT(*)::numeric / 10, 1.0),
        COUNT(*)::integer
    FROM live_assist_queries q
    JOIN live_assist_sessions s ON s.id = q.session_id
    WHERE s.company_id = p_company_id
      AND q.user_corrected_intent IS NOT NULL
      AND q.user_corrected_intent != q.detected_intent
      AND q.created_at > NOW() - INTERVAL '30 days'
    GROUP BY LOWER(SUBSTRING(query_text, 1, 100)), detected_intent, user_corrected_intent
    HAVING COUNT(*) >= 3
    ON CONFLICT (company_id, query_pattern) 
    DO UPDATE SET 
        correct_intent = EXCLUDED.correct_intent,
        confidence = GREATEST(intent_learning_patterns.confidence, EXCLUDED.confidence),
        correction_count = intent_learning_patterns.correction_count + EXCLUDED.correction_count,
        updated_at = NOW();
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Update Session Duration
CREATE OR REPLACE FUNCTION update_session_duration(p_session_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE live_assist_sessions
    SET 
        duration_seconds = EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at))::INTEGER,
        avg_response_time_ms = (
            SELECT ROUND(AVG(response_time_ms))
            FROM live_assist_queries 
            WHERE session_id = p_session_id
        )
    WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ===================
-- TEIL 8: COACH ANALYTICS FUNCTION
-- ===================

CREATE OR REPLACE FUNCTION get_coach_insights(
    p_user_id UUID,
    p_company_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS JSONB AS $$
DECLARE
    v_moods JSONB;
    v_decisions JSONB;
    v_sessions_count INTEGER;
    v_vertical TEXT;
BEGIN
    -- Get vertical
    SELECT vertical INTO v_vertical
    FROM companies WHERE id = p_company_id;
    
    -- Get mood distribution
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'mood', contact_mood,
        'count', count
    )), '[]'::jsonb) INTO v_moods
    FROM (
        SELECT contact_mood, COUNT(*) as count
        FROM live_assist_queries q
        JOIN live_assist_sessions s ON s.id = q.session_id
        WHERE s.user_id = p_user_id
          AND s.company_id = p_company_id
          AND q.created_at >= NOW() - (p_days || ' days')::INTERVAL
          AND q.contact_mood IS NOT NULL
        GROUP BY contact_mood
    ) m;
    
    -- Get decision distribution
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'tendency', decision_tendency,
        'count', count
    )), '[]'::jsonb) INTO v_decisions
    FROM (
        SELECT decision_tendency, COUNT(*) as count
        FROM live_assist_queries q
        JOIN live_assist_sessions s ON s.id = q.session_id
        WHERE s.user_id = p_user_id
          AND s.company_id = p_company_id
          AND q.created_at >= NOW() - (p_days || ' days')::INTERVAL
          AND q.decision_tendency IS NOT NULL
        GROUP BY decision_tendency
    ) d;
    
    -- Get sessions count
    SELECT COUNT(*) INTO v_sessions_count
    FROM live_assist_sessions
    WHERE user_id = p_user_id
      AND company_id = p_company_id
      AND created_at >= NOW() - (p_days || ' days')::INTERVAL;
    
    RETURN jsonb_build_object(
        'user_id', p_user_id,
        'company_id', p_company_id,
        'vertical', v_vertical,
        'days', p_days,
        'sessions_analyzed', v_sessions_count,
        'moods', v_moods,
        'decisions', v_decisions
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ===================
-- TEIL 9: PERFORMANCE INDEXES
-- ===================

-- Composite index für Session-Lookup mit Company
CREATE INDEX IF NOT EXISTS idx_live_sessions_user_company 
ON live_assist_sessions(user_id, company_id, created_at DESC);

-- Composite index für Queries mit Timing
CREATE INDEX IF NOT EXISTS idx_live_queries_session_created 
ON live_assist_queries(session_id, created_at DESC);

-- Index für Response-Time Analyse
CREATE INDEX IF NOT EXISTS idx_live_queries_response_time 
ON live_assist_queries(response_time_ms)
WHERE response_time_ms IS NOT NULL;

-- Index für Helpful-Rate Berechnung
CREATE INDEX IF NOT EXISTS idx_live_queries_helpful 
ON live_assist_queries(was_helpful)
WHERE was_helpful IS NOT NULL;


-- ===================
-- COMMENTS
-- ===================

COMMENT ON TABLE intent_learning_patterns IS 'Gelernte Muster für Intent-Korrektur aus User-Feedback';
COMMENT ON TABLE objection_learning_patterns IS 'Gelernte Muster für Objection-Type-Korrektur';
COMMENT ON COLUMN live_assist_queries.contact_mood IS 'Erkannte Stimmung des Kontakts: positiv, neutral, gestresst, skeptisch';
COMMENT ON COLUMN live_assist_queries.engagement_level IS 'Engagement-Level 1-5 basierend auf Nachrichten-Analyse';
COMMENT ON COLUMN live_assist_queries.decision_tendency IS 'Entscheidungstendenz: on_hold, close_to_yes, close_to_no, neutral';
COMMENT ON COLUMN live_assist_queries.tone_hint IS 'Empfohlener Ton für Antwort: neutral, direct, reassuring, value_focused, evidence_based';
COMMENT ON FUNCTION set_tenant_context(UUID) IS 'Setzt den Tenant-Context für RLS Policies';
COMMENT ON FUNCTION get_coach_insights(UUID, UUID, INTEGER) IS 'Holt Coach-Analytics für einen User';

-- ============================================================================
-- MIGRATION COMPLETE: CHIEF v3.3 PRODUCTION READY
-- ============================================================================


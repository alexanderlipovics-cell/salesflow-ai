-- ============================================================================
-- CHIEF v3.3 - FINAL DEPLOYMENT
-- Erstellt Live Assist Tabellen (mit la_ Prefix um Konflikte zu vermeiden)
-- ============================================================================

-- ===================
-- LIVE ASSIST CORE TABLES
-- ===================

-- Quick Facts für Live Assist
CREATE TABLE IF NOT EXISTS la_quick_facts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    product_id UUID,
    vertical TEXT,
    
    fact_type TEXT NOT NULL,
    fact_key TEXT NOT NULL,
    fact_value TEXT NOT NULL,
    fact_short TEXT,
    
    source TEXT,
    evidence_id UUID,
    
    use_in_contexts TEXT[],
    
    importance INTEGER DEFAULT 50,
    is_key_fact BOOLEAN DEFAULT false,
    
    language TEXT DEFAULT 'de',
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Objection Responses für Live Assist
CREATE TABLE IF NOT EXISTS la_objection_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    vertical TEXT,
    
    objection_type TEXT NOT NULL,
    objection_keywords TEXT[],
    objection_example TEXT,
    
    response_short TEXT NOT NULL,
    response_full TEXT,
    
    response_technique TEXT,
    
    follow_up_question TEXT,
    
    times_used INTEGER DEFAULT 0,
    success_rate NUMERIC(3,2),
    
    source_type TEXT DEFAULT 'system',
    source_user_id UUID,
    
    language TEXT DEFAULT 'de',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vertical Knowledge für Live Assist
CREATE TABLE IF NOT EXISTS la_vertical_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vertical TEXT NOT NULL,
    company_id UUID REFERENCES companies(id),
    
    knowledge_type TEXT NOT NULL,
    
    topic TEXT NOT NULL,
    question TEXT,
    answer_short TEXT NOT NULL,
    answer_full TEXT,
    
    keywords TEXT[],
    related_topics TEXT[],
    
    source TEXT,
    last_verified_at TIMESTAMPTZ,
    
    language TEXT DEFAULT 'de',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Company Products für Live Assist
CREATE TABLE IF NOT EXISTS la_company_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    tagline TEXT,
    description TEXT,
    key_benefits TEXT[],
    category TEXT,
    price_info TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Company Guardrails für Live Assist
CREATE TABLE IF NOT EXISTS la_company_guardrails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    guardrail_type TEXT NOT NULL,
    content TEXT NOT NULL,
    severity TEXT DEFAULT 'warning',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Live Assist Sessions
CREATE TABLE IF NOT EXISTS la_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    
    company_id UUID REFERENCES companies(id),
    vertical TEXT,
    lead_id UUID REFERENCES leads(id),
    
    queries_count INTEGER DEFAULT 0,
    facts_served INTEGER DEFAULT 0,
    objections_handled INTEGER DEFAULT 0,
    
    session_outcome TEXT,
    
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    user_feedback TEXT,
    
    cache_preloaded_at TIMESTAMPTZ,
    cache_facts_count INTEGER,
    cache_objections_count INTEGER,
    cache_products_count INTEGER,
    avg_response_time_ms INTEGER,
    cache_hit_rate NUMERIC(3,2),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Live Assist Queries
CREATE TABLE IF NOT EXISTS la_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES la_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    
    query_text TEXT NOT NULL,
    query_type TEXT DEFAULT 'text',
    
    detected_intent TEXT,
    detected_objection_type TEXT,
    detected_product_id UUID,
    
    response_text TEXT,
    response_source TEXT,
    
    response_time_ms INTEGER,
    
    was_helpful BOOLEAN,
    
    contact_mood TEXT,
    engagement_level INTEGER CHECK (engagement_level IS NULL OR engagement_level BETWEEN 1 AND 5),
    decision_tendency TEXT,
    tone_hint TEXT,
    emotion_confidence NUMERIC(3,2),
    user_corrected_intent TEXT,
    user_corrected_objection_type TEXT,
    feedback_text TEXT,
    feedback_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Intent Learning Patterns
CREATE TABLE IF NOT EXISTS la_intent_learning_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    
    query_pattern TEXT NOT NULL,
    wrong_intent TEXT NOT NULL,
    correct_intent TEXT NOT NULL,
    
    confidence NUMERIC(3,2) DEFAULT 0.5,
    correction_count INTEGER DEFAULT 1,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(company_id, query_pattern)
);

-- Objection Learning Patterns
CREATE TABLE IF NOT EXISTS la_objection_learning_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    
    query_pattern TEXT NOT NULL,
    wrong_objection_type TEXT NOT NULL,
    correct_objection_type TEXT NOT NULL,
    
    confidence NUMERIC(3,2) DEFAULT 0.5,
    correction_count INTEGER DEFAULT 1,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(company_id, query_pattern)
);

-- ===================
-- INDEXES
-- ===================

CREATE INDEX IF NOT EXISTS idx_la_quick_facts_company ON la_quick_facts(company_id);
CREATE INDEX IF NOT EXISTS idx_la_quick_facts_type ON la_quick_facts(fact_type);
CREATE INDEX IF NOT EXISTS idx_la_quick_facts_active ON la_quick_facts(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_la_objection_responses_company ON la_objection_responses(company_id);
CREATE INDEX IF NOT EXISTS idx_la_objection_responses_type ON la_objection_responses(objection_type);
CREATE INDEX IF NOT EXISTS idx_la_objection_responses_active ON la_objection_responses(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_la_vertical_knowledge_vertical ON la_vertical_knowledge(vertical);
CREATE INDEX IF NOT EXISTS idx_la_vertical_knowledge_active ON la_vertical_knowledge(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_la_sessions_user ON la_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_la_sessions_company ON la_sessions(company_id);

CREATE INDEX IF NOT EXISTS idx_la_queries_session ON la_queries(session_id);
CREATE INDEX IF NOT EXISTS idx_la_queries_user ON la_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_la_queries_intent ON la_queries(detected_intent);

CREATE INDEX IF NOT EXISTS idx_la_queries_emotion ON la_queries(contact_mood, decision_tendency) WHERE contact_mood IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_la_queries_with_feedback ON la_queries(detected_intent, user_corrected_intent) WHERE user_corrected_intent IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_la_intent_patterns_lookup ON la_intent_learning_patterns(company_id, query_pattern);
CREATE INDEX IF NOT EXISTS idx_la_objection_patterns_lookup ON la_objection_learning_patterns(company_id, query_pattern);

-- ===================
-- RLS POLICIES
-- ===================

ALTER TABLE la_quick_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE la_objection_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE la_vertical_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE la_company_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE la_company_guardrails ENABLE ROW LEVEL SECURITY;
ALTER TABLE la_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE la_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE la_intent_learning_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE la_objection_learning_patterns ENABLE ROW LEVEL SECURITY;

-- Einfache Policies
DROP POLICY IF EXISTS "allow_all_la_quick_facts" ON la_quick_facts;
CREATE POLICY "allow_all_la_quick_facts" ON la_quick_facts FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "allow_all_la_objection_responses" ON la_objection_responses;
CREATE POLICY "allow_all_la_objection_responses" ON la_objection_responses FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "allow_all_la_vertical_knowledge" ON la_vertical_knowledge;
CREATE POLICY "allow_all_la_vertical_knowledge" ON la_vertical_knowledge FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "allow_all_la_company_products" ON la_company_products;
CREATE POLICY "allow_all_la_company_products" ON la_company_products FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "allow_all_la_company_guardrails" ON la_company_guardrails;
CREATE POLICY "allow_all_la_company_guardrails" ON la_company_guardrails FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "allow_all_la_sessions" ON la_sessions;
CREATE POLICY "allow_all_la_sessions" ON la_sessions FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "allow_all_la_queries" ON la_queries;
CREATE POLICY "allow_all_la_queries" ON la_queries FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "allow_all_la_intent_patterns" ON la_intent_learning_patterns;
CREATE POLICY "allow_all_la_intent_patterns" ON la_intent_learning_patterns FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "allow_all_la_objection_patterns" ON la_objection_learning_patterns;
CREATE POLICY "allow_all_la_objection_patterns" ON la_objection_learning_patterns FOR ALL TO authenticated USING (true);

-- ===================
-- HELPER FUNCTIONS
-- ===================

CREATE OR REPLACE FUNCTION la_update_session_duration(p_session_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE la_sessions
    SET 
        duration_seconds = EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at))::INTEGER,
        avg_response_time_ms = (
            SELECT ROUND(AVG(response_time_ms))
            FROM la_queries 
            WHERE session_id = p_session_id
        )
    WHERE id = p_session_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION la_get_coach_insights(
    p_user_id UUID,
    p_company_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS JSONB AS $$
DECLARE
    v_moods JSONB;
    v_decisions JSONB;
    v_sessions_count INTEGER;
BEGIN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'mood', contact_mood,
        'count', count
    )), '[]'::jsonb) INTO v_moods
    FROM (
        SELECT contact_mood, COUNT(*) as count
        FROM la_queries q
        JOIN la_sessions s ON s.id = q.session_id
        WHERE s.user_id = p_user_id
          AND s.company_id = p_company_id
          AND q.created_at >= NOW() - (p_days || ' days')::INTERVAL
          AND q.contact_mood IS NOT NULL
        GROUP BY contact_mood
    ) m;
    
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
        'tendency', decision_tendency,
        'count', count
    )), '[]'::jsonb) INTO v_decisions
    FROM (
        SELECT decision_tendency, COUNT(*) as count
        FROM la_queries q
        JOIN la_sessions s ON s.id = q.session_id
        WHERE s.user_id = p_user_id
          AND s.company_id = p_company_id
          AND q.created_at >= NOW() - (p_days || ' days')::INTERVAL
          AND q.decision_tendency IS NOT NULL
        GROUP BY decision_tendency
    ) d;
    
    SELECT COUNT(*) INTO v_sessions_count
    FROM la_sessions
    WHERE user_id = p_user_id
      AND company_id = p_company_id
      AND created_at >= NOW() - (p_days || ' days')::INTERVAL;
    
    RETURN jsonb_build_object(
        'user_id', p_user_id,
        'company_id', p_company_id,
        'days', p_days,
        'sessions_analyzed', v_sessions_count,
        'moods', v_moods,
        'decisions', v_decisions
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================
-- VIEWS für Backwards-Kompatibilität
-- ===================

-- Alias Views für die ursprünglichen Namen (falls Backend sie erwartet)
CREATE OR REPLACE VIEW live_assist_sessions AS SELECT * FROM la_sessions;
CREATE OR REPLACE VIEW live_assist_queries AS SELECT * FROM la_queries;
CREATE OR REPLACE VIEW quick_facts AS SELECT * FROM la_quick_facts;

-- Note: objection_responses View würde Konflikt verursachen, daher nicht erstellen


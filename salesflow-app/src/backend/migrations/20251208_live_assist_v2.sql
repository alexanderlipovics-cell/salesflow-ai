-- ============================================================================
-- LIVE ASSIST MODE - CLEAN INSTALL v2
-- ============================================================================

-- ===================
-- DROP EXISTING VIEWS/TABLES
-- ===================

DROP VIEW IF EXISTS quick_facts CASCADE;
DROP VIEW IF EXISTS live_assist_sessions CASCADE;
DROP VIEW IF EXISTS live_assist_queries CASCADE;
DROP TABLE IF EXISTS quick_facts CASCADE;
DROP TABLE IF EXISTS live_assist_sessions CASCADE;
DROP TABLE IF EXISTS live_assist_queries CASCADE;

-- ===================
-- QUICK FACTS 
-- ===================

CREATE TABLE quick_facts (
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

-- ===================
-- VERTICAL KNOWLEDGE
-- ===================

CREATE TABLE IF NOT EXISTS vertical_knowledge (
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

-- ===================
-- LIVE ASSIST SESSIONS
-- ===================

CREATE TABLE live_assist_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    
    company_id UUID REFERENCES companies(id),
    vertical TEXT,
    lead_id UUID,
    
    queries_count INTEGER DEFAULT 0,
    facts_served INTEGER DEFAULT 0,
    objections_handled INTEGER DEFAULT 0,
    
    session_outcome TEXT,
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    user_feedback TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================
-- LIVE ASSIST QUERIES
-- ===================

CREATE TABLE live_assist_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES live_assist_sessions(id) ON DELETE CASCADE,
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
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================
-- INDEXES
-- ===================

CREATE INDEX idx_quick_facts_company ON quick_facts(company_id);
CREATE INDEX idx_quick_facts_type ON quick_facts(fact_type);
CREATE INDEX idx_quick_facts_key ON quick_facts(fact_key);
CREATE INDEX idx_quick_facts_vertical ON quick_facts(vertical);

CREATE INDEX IF NOT EXISTS idx_vertical_knowledge_vertical ON vertical_knowledge(vertical);
CREATE INDEX IF NOT EXISTS idx_vertical_knowledge_type ON vertical_knowledge(knowledge_type);

CREATE INDEX idx_live_sessions_user ON live_assist_sessions(user_id);
CREATE INDEX idx_live_sessions_company ON live_assist_sessions(company_id);

CREATE INDEX idx_live_queries_session ON live_assist_queries(session_id);
CREATE INDEX idx_live_queries_user ON live_assist_queries(user_id);

-- ===================
-- RLS POLICIES
-- ===================

ALTER TABLE quick_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vertical_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_assist_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_assist_queries ENABLE ROW LEVEL SECURITY;

-- Quick Facts: Alle können lesen
CREATE POLICY "quick_facts_read" ON quick_facts
    FOR SELECT TO authenticated
    USING (is_active = true);

-- Vertical Knowledge: Alle können lesen
CREATE POLICY "vertical_knowledge_read" ON vertical_knowledge
    FOR SELECT TO authenticated
    USING (is_active = true);

-- Sessions: Nur eigene
CREATE POLICY "sessions_own" ON live_assist_sessions
    FOR ALL TO authenticated
    USING (user_id = auth.uid());

-- Queries: Nur eigene
CREATE POLICY "queries_own" ON live_assist_queries
    FOR ALL TO authenticated
    USING (user_id = auth.uid());

-- ===================
-- HELPER FUNCTIONS
-- ===================

CREATE OR REPLACE FUNCTION search_quick_facts(
    p_company_id UUID DEFAULT NULL,
    p_vertical TEXT DEFAULT NULL,
    p_query TEXT DEFAULT NULL,
    p_fact_type TEXT DEFAULT NULL,
    p_key_only BOOLEAN DEFAULT false,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    fact_key TEXT,
    fact_value TEXT,
    fact_short TEXT,
    fact_type TEXT,
    importance INTEGER,
    is_key_fact BOOLEAN,
    source TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        qf.id,
        qf.fact_key,
        qf.fact_value,
        qf.fact_short,
        qf.fact_type,
        qf.importance,
        qf.is_key_fact,
        qf.source
    FROM quick_facts qf
    WHERE qf.is_active = true
      AND (p_company_id IS NULL OR qf.company_id = p_company_id OR qf.company_id IS NULL)
      AND (p_vertical IS NULL OR qf.vertical = p_vertical OR qf.vertical IS NULL)
      AND (p_fact_type IS NULL OR qf.fact_type = p_fact_type)
      AND (p_key_only = false OR qf.is_key_fact = true)
      AND (p_query IS NULL OR 
           qf.fact_key ILIKE '%' || p_query || '%' OR 
           qf.fact_value ILIKE '%' || p_query || '%')
    ORDER BY 
        CASE WHEN qf.company_id IS NOT NULL THEN 0 ELSE 1 END,
        qf.importance DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION find_objection_response(
    p_company_id UUID,
    p_objection_type TEXT,
    p_keywords TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    objection_type TEXT,
    objection_example TEXT,
    response_short TEXT,
    response_full TEXT,
    response_technique TEXT,
    follow_up_question TEXT,
    success_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        orr.id,
        orr.objection_type,
        orr.objection_example,
        orr.response_short,
        orr.response_full,
        orr.response_technique,
        orr.follow_up_question,
        orr.success_rate
    FROM objection_responses orr
    WHERE orr.is_active = true
      AND (orr.company_id = p_company_id OR orr.company_id IS NULL)
      AND orr.objection_type = p_objection_type
    ORDER BY 
        CASE WHEN orr.company_id IS NOT NULL THEN 0 ELSE 1 END,
        orr.success_rate DESC NULLS LAST
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION log_objection_response_used(
    p_response_id UUID,
    p_was_successful BOOLEAN DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE objection_responses
    SET 
        times_used = times_used + 1,
        updated_at = NOW()
    WHERE id = p_response_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================
-- DONE
-- ===================

SELECT 'Live Assist Migration erfolgreich!' as status;


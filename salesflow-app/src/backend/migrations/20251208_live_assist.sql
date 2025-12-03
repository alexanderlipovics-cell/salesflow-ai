-- ============================================================================
-- LIVE ASSIST MODE
-- Quick Facts, Objection Responses, Vertical Knowledge
-- ============================================================================
-- Migration: 20251208_live_assist.sql
-- Description: Tables for Live Sales Assistant Mode
-- ============================================================================

-- ===================
-- QUICK FACTS (Pro Firma/Produkt)
-- ===================

CREATE TABLE IF NOT EXISTS quick_facts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    product_id UUID REFERENCES company_products(id),
    vertical TEXT,
    
    -- Fact Content
    fact_type TEXT NOT NULL,
    -- 'number', 'percentage', 'comparison', 'benefit', 'differentiator', 'social_proof'
    
    fact_key TEXT NOT NULL,           -- "omega_balance_improvement"
    fact_value TEXT NOT NULL,         -- "90% der Nutzer verbessern ihre Balance in 120 Tagen"
    fact_short TEXT,                  -- "90% verbessern in 120 Tagen" (für Voice)
    
    source TEXT,                      -- Quelle (Studie, intern, etc.)
    evidence_id UUID REFERENCES evidence_items(id),
    
    -- Usage
    use_in_contexts TEXT[],           -- ['objection_price', 'usp_pitch', 'closing']
    
    -- Priority
    importance INTEGER DEFAULT 50,    -- 0-100
    is_key_fact BOOLEAN DEFAULT false,
    
    -- Language
    language TEXT DEFAULT 'de',
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================
-- OBJECTION RESPONSES (Bewährte Antworten)
-- ===================

CREATE TABLE IF NOT EXISTS objection_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    vertical TEXT,
    
    -- Objection
    objection_type TEXT NOT NULL,
    -- 'price', 'time', 'think_about_it', 'not_interested', 'competitor', 
    -- 'trust', 'need', 'authority', 'already_have', 'bad_experience'
    
    objection_keywords TEXT[],        -- Trigger-Wörter: ['zu teuer', 'kein budget', 'kostet zu viel']
    objection_example TEXT,           -- "Das ist mir zu teuer"
    
    -- Response
    response_short TEXT NOT NULL,     -- Kurze Version (für Voice)
    response_full TEXT,               -- Ausführliche Version
    
    response_technique TEXT,
    -- 'reframe', 'empathize_then_pivot', 'question_back', 'social_proof', 
    -- 'compare_value', 'future_pace', 'reduce_to_daily', 'takeaway'
    
    -- Follow-up
    follow_up_question TEXT,          -- "Was wäre es dir wert, wenn..."
    
    -- Effectiveness
    times_used INTEGER DEFAULT 0,
    success_rate NUMERIC(3,2),
    
    -- Source
    source_type TEXT DEFAULT 'system',
    -- 'system', 'user_created', 'team_best_practice', 'ai_generated'
    source_user_id UUID REFERENCES auth.users(id),
    
    language TEXT DEFAULT 'de',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================
-- VERTICAL KNOWLEDGE (Branchen-Wissen)
-- ===================

CREATE TABLE IF NOT EXISTS vertical_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vertical TEXT NOT NULL,
    company_id UUID REFERENCES companies(id),  -- NULL = gilt für ganzes Vertical
    
    -- Knowledge Type
    knowledge_type TEXT NOT NULL,
    -- 'industry_fact', 'market_data', 'regulation', 'trend', 
    -- 'competitor_info', 'best_practice', 'terminology', 'faq'
    
    -- Content
    topic TEXT NOT NULL,              -- "Kaffeeröstung", "MLM-Rechtslage", "Bauvorschriften"
    question TEXT,                    -- "Was ist der Unterschied zwischen Arabica und Robusta?"
    answer_short TEXT NOT NULL,       -- Kurze Antwort
    answer_full TEXT,                 -- Ausführliche Antwort
    
    -- Metadata
    keywords TEXT[],
    related_topics TEXT[],
    
    -- Source
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

CREATE TABLE IF NOT EXISTS live_assist_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Session Info
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    
    -- Context
    company_id UUID REFERENCES companies(id),
    vertical TEXT,
    lead_id UUID REFERENCES leads(id),
    
    -- Stats
    queries_count INTEGER DEFAULT 0,
    facts_served INTEGER DEFAULT 0,
    objections_handled INTEGER DEFAULT 0,
    
    -- Outcome
    session_outcome TEXT,
    -- 'sale_made', 'appointment_set', 'follow_up_needed', 'lost', 'unknown'
    
    -- Feedback
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    user_feedback TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================
-- LIVE ASSIST QUERIES (Was wurde gefragt)
-- ===================

CREATE TABLE IF NOT EXISTS live_assist_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES live_assist_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Query
    query_text TEXT NOT NULL,
    query_type TEXT DEFAULT 'text',   -- 'voice', 'text'
    
    -- Intent Detection
    detected_intent TEXT,
    -- 'product_info', 'usp', 'objection', 'facts', 'science', 
    -- 'pricing', 'comparison', 'story', 'quick_answer'
    
    detected_objection_type TEXT,
    detected_product_id UUID REFERENCES company_products(id),
    
    -- Response
    response_text TEXT,
    response_source TEXT,             -- 'quick_facts', 'objection_responses', 'company_stories', 'ai_generated'
    
    -- Timing
    response_time_ms INTEGER,
    
    -- Feedback
    was_helpful BOOLEAN,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================
-- INDEXES
-- ===================

CREATE INDEX IF NOT EXISTS idx_quick_facts_company ON quick_facts(company_id);
CREATE INDEX IF NOT EXISTS idx_quick_facts_product ON quick_facts(product_id);
CREATE INDEX IF NOT EXISTS idx_quick_facts_type ON quick_facts(fact_type);
CREATE INDEX IF NOT EXISTS idx_quick_facts_key ON quick_facts(fact_key);
CREATE INDEX IF NOT EXISTS idx_quick_facts_vertical ON quick_facts(vertical);
CREATE INDEX IF NOT EXISTS idx_quick_facts_active ON quick_facts(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_objection_responses_company ON objection_responses(company_id);
CREATE INDEX IF NOT EXISTS idx_objection_responses_type ON objection_responses(objection_type);
CREATE INDEX IF NOT EXISTS idx_objection_responses_keywords ON objection_responses USING GIN(objection_keywords);
CREATE INDEX IF NOT EXISTS idx_objection_responses_vertical ON objection_responses(vertical);
CREATE INDEX IF NOT EXISTS idx_objection_responses_active ON objection_responses(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_vertical_knowledge_vertical ON vertical_knowledge(vertical);
CREATE INDEX IF NOT EXISTS idx_vertical_knowledge_type ON vertical_knowledge(knowledge_type);
CREATE INDEX IF NOT EXISTS idx_vertical_knowledge_keywords ON vertical_knowledge USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_vertical_knowledge_active ON vertical_knowledge(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_live_sessions_user ON live_assist_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_active ON live_assist_sessions(user_id, ended_at) 
    WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_live_sessions_company ON live_assist_sessions(company_id);

CREATE INDEX IF NOT EXISTS idx_live_queries_session ON live_assist_queries(session_id);
CREATE INDEX IF NOT EXISTS idx_live_queries_user ON live_assist_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_live_queries_intent ON live_assist_queries(detected_intent);

-- ===================
-- RLS POLICIES
-- ===================

ALTER TABLE quick_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE objection_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE vertical_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_assist_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_assist_queries ENABLE ROW LEVEL SECURITY;

-- Quick Facts: Alle authentifizierten User können lesen
DROP POLICY IF EXISTS "Anyone can read quick facts" ON quick_facts;
CREATE POLICY "Anyone can read quick facts" ON quick_facts
    FOR SELECT 
    TO authenticated
    USING (is_active = true);

-- Quick Facts: Nur Admins können schreiben
DROP POLICY IF EXISTS "Admins can manage quick facts" ON quick_facts;
CREATE POLICY "Admins can manage quick facts" ON quick_facts
    FOR ALL 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM company_users cu
            WHERE cu.user_id = auth.uid()
            AND cu.company_id = quick_facts.company_id
            AND cu.role IN ('owner', 'admin')
        )
    );

-- Objection Responses: Alle können lesen
DROP POLICY IF EXISTS "Anyone can read objection responses" ON objection_responses;
CREATE POLICY "Anyone can read objection responses" ON objection_responses
    FOR SELECT 
    TO authenticated
    USING (is_active = true);

-- Objection Responses: User können eigene erstellen
DROP POLICY IF EXISTS "Users can create objection responses" ON objection_responses;
CREATE POLICY "Users can create objection responses" ON objection_responses
    FOR INSERT 
    TO authenticated
    WITH CHECK (source_user_id = auth.uid());

-- Objection Responses: Admins können alles
DROP POLICY IF EXISTS "Admins can manage objection responses" ON objection_responses;
CREATE POLICY "Admins can manage objection responses" ON objection_responses
    FOR ALL 
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM company_users cu
            WHERE cu.user_id = auth.uid()
            AND cu.company_id = objection_responses.company_id
            AND cu.role IN ('owner', 'admin')
        )
    );

-- Vertical Knowledge: Alle können lesen
DROP POLICY IF EXISTS "Anyone can read vertical knowledge" ON vertical_knowledge;
CREATE POLICY "Anyone can read vertical knowledge" ON vertical_knowledge
    FOR SELECT 
    TO authenticated
    USING (is_active = true);

-- Sessions: Nur eigene
DROP POLICY IF EXISTS "Users can manage own sessions" ON live_assist_sessions;
CREATE POLICY "Users can manage own sessions" ON live_assist_sessions
    FOR ALL 
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Queries: Nur eigene
DROP POLICY IF EXISTS "Users can manage own queries" ON live_assist_queries;
CREATE POLICY "Users can manage own queries" ON live_assist_queries
    FOR ALL 
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- ===================
-- HELPER FUNCTIONS
-- ===================

-- Function zum Suchen relevanter Quick Facts
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
        qf.importance DESC,
        qf.is_key_fact DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function zum Finden einer Einwand-Antwort
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

-- Function zum Loggen von Objection Response Usage
CREATE OR REPLACE FUNCTION log_objection_response_used(
    p_response_id UUID,
    p_was_successful BOOLEAN DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    UPDATE objection_responses
    SET 
        times_used = times_used + 1,
        success_rate = CASE 
            WHEN p_was_successful IS NOT NULL THEN
                COALESCE(success_rate * times_used + (CASE WHEN p_was_successful THEN 1 ELSE 0 END), 0) / (times_used + 1)
            ELSE success_rate
        END,
        updated_at = NOW()
    WHERE id = p_response_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================
-- COMMENTS
-- ===================

COMMENT ON TABLE quick_facts IS 'Schnell abrufbare Fakten für Live Sales Assist';
COMMENT ON TABLE objection_responses IS 'Bewährte Antworten auf Einwände';
COMMENT ON TABLE vertical_knowledge IS 'Branchen-spezifisches Wissen';
COMMENT ON TABLE live_assist_sessions IS 'Tracking von Live Assist Sessions';
COMMENT ON TABLE live_assist_queries IS 'Einzelne Anfragen innerhalb einer Session';

COMMENT ON COLUMN quick_facts.fact_short IS 'Kurze Version für Voice Output (max 100 Zeichen)';
COMMENT ON COLUMN quick_facts.use_in_contexts IS 'In welchen Kontexten ist dieser Fakt relevant';
COMMENT ON COLUMN objection_responses.response_technique IS 'Verkaufstechnik die verwendet wird';
COMMENT ON COLUMN live_assist_sessions.session_outcome IS 'Ergebnis des Kundengesprächs';


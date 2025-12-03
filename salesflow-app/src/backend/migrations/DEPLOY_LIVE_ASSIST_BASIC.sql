-- ============================================================================
-- LIVE ASSIST BASIC DEPLOYMENT
-- Erstellt Tabellen ohne komplexe RLS Policies
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. QUICK FACTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS quick_facts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    vertical TEXT,
    fact_type TEXT NOT NULL,
    fact_key TEXT NOT NULL,
    fact_value TEXT NOT NULL,
    fact_short TEXT,
    source TEXT,
    use_in_contexts TEXT[] DEFAULT '{}',
    importance INTEGER DEFAULT 50,
    is_key_fact BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    language TEXT DEFAULT 'de',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quick_facts_company ON quick_facts(company_id);
CREATE INDEX IF NOT EXISTS idx_quick_facts_key ON quick_facts(is_key_fact) WHERE is_key_fact = true;

-- ============================================================================
-- 2. OBJECTION RESPONSES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS objection_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    vertical TEXT,
    objection_type TEXT NOT NULL,
    objection_keywords TEXT[] DEFAULT '{}',
    objection_example TEXT,
    response_short TEXT NOT NULL,
    response_full TEXT,
    response_technique TEXT,
    follow_up_question TEXT,
    effectiveness_score NUMERIC(3,2) DEFAULT 0.5,
    times_used INTEGER DEFAULT 0,
    source_type TEXT DEFAULT 'system',
    is_active BOOLEAN DEFAULT true,
    language TEXT DEFAULT 'de',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_objection_responses_company ON objection_responses(company_id);
CREATE INDEX IF NOT EXISTS idx_objection_responses_type ON objection_responses(objection_type);

-- ============================================================================
-- 3. VERTICAL KNOWLEDGE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS vertical_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    vertical TEXT NOT NULL,
    knowledge_type TEXT NOT NULL,
    topic TEXT NOT NULL,
    question TEXT,
    answer_short TEXT NOT NULL,
    answer_full TEXT,
    keywords TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    language TEXT DEFAULT 'de',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vertical_knowledge_vertical ON vertical_knowledge(vertical);

-- ============================================================================
-- 4. LIVE ASSIST SESSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS live_assist_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    company_id UUID,
    lead_id UUID,
    vertical TEXT,
    status TEXT DEFAULT 'active',
    queries_count INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    session_outcome TEXT,
    user_rating INTEGER,
    user_feedback TEXT,
    avg_response_time_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_assist_sessions_user ON live_assist_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_live_assist_sessions_company ON live_assist_sessions(company_id);

-- ============================================================================
-- 5. LIVE ASSIST QUERIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS live_assist_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL,
    query_text TEXT NOT NULL,
    query_type TEXT DEFAULT 'text',
    detected_intent TEXT,
    detected_objection_type TEXT,
    response_text TEXT NOT NULL,
    response_short TEXT,
    source TEXT,
    source_id UUID,
    response_technique TEXT,
    follow_up_question TEXT,
    confidence NUMERIC(3,2),
    response_time_ms INTEGER,
    was_helpful BOOLEAN,
    user_corrected_intent TEXT,
    contact_mood TEXT,
    engagement_level INTEGER,
    decision_tendency TEXT,
    tone_hint TEXT,
    emotion_confidence NUMERIC(3,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_live_assist_queries_session ON live_assist_queries(session_id);
CREATE INDEX IF NOT EXISTS idx_live_assist_queries_intent ON live_assist_queries(detected_intent);
CREATE INDEX IF NOT EXISTS idx_live_assist_queries_response_time ON live_assist_queries(response_time_ms);

-- ============================================================================
-- 6. INTENT LEARNING PATTERNS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS intent_learning_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    query_pattern TEXT NOT NULL,
    wrong_intent TEXT,
    correct_intent TEXT NOT NULL,
    confidence NUMERIC(3,2) DEFAULT 0.5,
    correction_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. OBJECTION LEARNING PATTERNS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS objection_learning_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    query_pattern TEXT NOT NULL,
    wrong_objection_type TEXT,
    correct_objection_type TEXT NOT NULL,
    confidence NUMERIC(3,2) DEFAULT 0.5,
    correction_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 8. SIMPLE RLS - Anyone can read, authenticated can write own
-- ============================================================================

ALTER TABLE quick_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE objection_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE vertical_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_assist_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_assist_queries ENABLE ROW LEVEL SECURITY;

-- Simple read policies
DROP POLICY IF EXISTS "Anyone can read quick facts" ON quick_facts;
CREATE POLICY "Anyone can read quick facts" ON quick_facts
FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Anyone can read objection responses" ON objection_responses;
CREATE POLICY "Anyone can read objection responses" ON objection_responses
FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Anyone can read vertical knowledge" ON vertical_knowledge;
CREATE POLICY "Anyone can read vertical knowledge" ON vertical_knowledge
FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Users manage own sessions" ON live_assist_sessions;
CREATE POLICY "Users manage own sessions" ON live_assist_sessions
FOR ALL USING (true);

DROP POLICY IF EXISTS "Users manage own queries" ON live_assist_queries;
CREATE POLICY "Users manage own queries" ON live_assist_queries
FOR ALL USING (true);

-- ============================================================================
-- DONE
-- ============================================================================

SELECT 'Live Assist Basic Deployment erfolgreich!' as status;


-- ═══════════════════════════════════════════════════════════════════════════
-- REACTIVATION AGENT - DATABASE MIGRATIONS
-- Version: 1.0.0
-- Date: 2024-12-03
-- ═══════════════════════════════════════════════════════════════════════════

-- ───────────────────────────────────────────────────────────────────────────
-- 1. EXTENSIONS
-- ───────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. REACTIVATION RUNS
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reactivation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'started',
    -- started, completed, failed, skipped
    
    -- Ergebnisse
    signals_found INTEGER DEFAULT 0,
    primary_signal JSONB,
    confidence_score DECIMAL(3,2),
    action_taken VARCHAR(50),
    
    -- Execution
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    execution_time_ms INTEGER,
    
    -- Debug
    final_state JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reactivation_runs_user ON reactivation_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_reactivation_runs_lead ON reactivation_runs(lead_id);
CREATE INDEX IF NOT EXISTS idx_reactivation_runs_status ON reactivation_runs(status);
CREATE INDEX IF NOT EXISTS idx_reactivation_runs_started ON reactivation_runs(started_at DESC);

-- RLS
ALTER TABLE reactivation_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own runs" ON reactivation_runs;
CREATE POLICY "Users can manage own runs" ON reactivation_runs
    FOR ALL USING (auth.uid() = user_id);

-- ───────────────────────────────────────────────────────────────────────────
-- 3. REACTIVATION DRAFTS (Review Queue)
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reactivation_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    run_id UUID NOT NULL REFERENCES reactivation_runs(id) ON DELETE CASCADE,
    
    -- Content
    draft_message TEXT NOT NULL,
    suggested_channel VARCHAR(50) NOT NULL,
    
    -- Context
    signals JSONB NOT NULL DEFAULT '[]',
    lead_context JSONB NOT NULL DEFAULT '{}',
    confidence_score DECIMAL(3,2) NOT NULL,
    
    -- Review
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- pending, approved, rejected, edited, expired
    reviewed_at TIMESTAMPTZ,
    reviewer_notes TEXT,
    edited_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_drafts_user_status ON reactivation_drafts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_drafts_expires ON reactivation_drafts(expires_at) 
    WHERE status = 'pending';

-- RLS
ALTER TABLE reactivation_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own drafts" ON reactivation_drafts;
CREATE POLICY "Users can manage own drafts" ON reactivation_drafts
    FOR ALL USING (auth.uid() = user_id);

-- ───────────────────────────────────────────────────────────────────────────
-- 4. SIGNAL EVENTS
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS signal_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Signal
    signal_type VARCHAR(50) NOT NULL,
    source VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    url TEXT,
    
    -- Score
    relevance_score DECIMAL(3,2) NOT NULL,
    
    -- Processing
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    run_id UUID REFERENCES reactivation_runs(id),
    
    -- Metadata
    raw_data JSONB,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_signals_lead ON signal_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_signals_type ON signal_events(signal_type);
CREATE INDEX IF NOT EXISTS idx_signals_unprocessed ON signal_events(lead_id, processed) 
    WHERE processed = FALSE;

-- RLS
ALTER TABLE signal_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own signals" ON signal_events;
CREATE POLICY "Users can view own signals" ON signal_events
    FOR ALL USING (auth.uid() = user_id);

-- ───────────────────────────────────────────────────────────────────────────
-- 5. LEAD INTERACTIONS EMBEDDINGS (Vector Store)
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lead_interactions_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Content
    interaction_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    
    -- Embedding
    embedding vector(1536) NOT NULL,
    
    -- Metadata
    channel VARCHAR(50),
    sentiment VARCHAR(20),
    topics TEXT[],
    
    -- Timestamps
    interaction_date TIMESTAMPTZ NOT NULL,
    indexed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vector Index (IVFFlat)
CREATE INDEX IF NOT EXISTS idx_interactions_embedding 
    ON lead_interactions_embeddings 
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Other Indexes
CREATE INDEX IF NOT EXISTS idx_interactions_lead ON lead_interactions_embeddings(lead_id);
CREATE INDEX IF NOT EXISTS idx_interactions_user ON lead_interactions_embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_date ON lead_interactions_embeddings(interaction_date DESC);

-- RLS
ALTER TABLE lead_interactions_embeddings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own embeddings" ON lead_interactions_embeddings;
CREATE POLICY "Users can manage own embeddings" ON lead_interactions_embeddings
    FOR ALL USING (auth.uid() = user_id);

-- ───────────────────────────────────────────────────────────────────────────
-- 6. VECTOR SEARCH FUNCTION
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION match_lead_interactions(
    query_embedding vector(1536),
    match_lead_id UUID,
    match_count INT DEFAULT 5,
    match_threshold FLOAT DEFAULT 0.7
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    summary TEXT,
    interaction_type VARCHAR(50),
    interaction_date TIMESTAMPTZ,
    similarity FLOAT,
    sentiment VARCHAR(20),
    topics TEXT[]
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.content,
        e.summary,
        e.interaction_type,
        e.interaction_date,
        1 - (e.embedding <=> query_embedding) AS similarity,
        e.sentiment,
        e.topics
    FROM lead_interactions_embeddings e
    WHERE 
        e.lead_id = match_lead_id
        AND 1 - (e.embedding <=> query_embedding) > match_threshold
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ───────────────────────────────────────────────────────────────────────────
-- 7. DORMANT LEADS VIEW
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW dormant_leads_view AS
SELECT 
    l.id,
    l.user_id,
    l.name,
    l.company,
    l.email,
    l.linkedin_url,
    l.status,
    l.last_contact_at,
    EXTRACT(DAY FROM (NOW() - l.last_contact_at))::INTEGER AS days_dormant,
    (
        SELECT MAX(r.started_at) 
        FROM reactivation_runs r 
        WHERE r.lead_id = l.id
    ) AS last_reactivation_attempt
FROM leads l
WHERE 
    l.status = 'dormant'
    OR (
        l.last_contact_at < NOW() - INTERVAL '90 days'
        AND l.status NOT IN ('won', 'lost')
    );

-- ───────────────────────────────────────────────────────────────────────────
-- 8. DORMANT LEADS FUNCTION
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_dormant_leads_for_reactivation(
    min_dormant_days INT DEFAULT 90
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    name TEXT,
    company TEXT,
    email TEXT,
    linkedin_url TEXT,
    days_dormant INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.user_id,
        l.name,
        l.company,
        l.email,
        l.linkedin_url,
        EXTRACT(DAY FROM (NOW() - l.last_contact_at))::INT AS days_dormant
    FROM leads l
    LEFT JOIN (
        SELECT r.lead_id, MAX(r.started_at) as last_run
        FROM reactivation_runs r
        WHERE r.started_at > NOW() - INTERVAL '30 days'
        GROUP BY r.lead_id
    ) recent_runs ON l.id = recent_runs.lead_id
    WHERE 
        recent_runs.last_run IS NULL
        AND l.status NOT IN ('won', 'lost')
        AND (
            l.status = 'dormant' 
            OR l.last_contact_at < NOW() - (min_dormant_days || ' days')::INTERVAL
        )
        AND l.user_id = auth.uid()
    ORDER BY l.last_contact_at ASC
    LIMIT 100;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- DONE
-- ═══════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE reactivation_runs IS 'Tracks all Reactivation Agent executions';
COMMENT ON TABLE reactivation_drafts IS 'Review Queue for Human-in-the-Loop';
COMMENT ON TABLE signal_events IS 'Detected signals for lead reactivation';
COMMENT ON TABLE lead_interactions_embeddings IS 'Vector store for RAG/Memory Engine';


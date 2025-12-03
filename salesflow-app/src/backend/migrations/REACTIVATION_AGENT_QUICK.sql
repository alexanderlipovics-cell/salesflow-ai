-- ═══════════════════════════════════════════════════════════════════════════
-- REACTIVATION AGENT - Quick Migration
-- Kopiere dieses SQL ins Supabase Dashboard und führe es aus
-- ═══════════════════════════════════════════════════════════════════════════

-- 0. pgvector Extension (für Embeddings)
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. reactivation_runs
CREATE TABLE IF NOT EXISTS reactivation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    lead_id UUID NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'started',
    signals_found INTEGER DEFAULT 0,
    primary_signal JSONB,
    confidence_score DECIMAL(3,2),
    action_taken VARCHAR(50),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    execution_time_ms INTEGER,
    final_state JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. reactivation_drafts (Review Queue)
CREATE TABLE IF NOT EXISTS reactivation_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    lead_id UUID NOT NULL,
    run_id UUID NOT NULL,
    draft_message TEXT NOT NULL,
    suggested_channel VARCHAR(50) NOT NULL,
    signals JSONB NOT NULL DEFAULT '[]',
    lead_context JSONB NOT NULL DEFAULT '{}',
    confidence_score DECIMAL(3,2) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    reviewed_at TIMESTAMPTZ,
    reviewer_notes TEXT,
    edited_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- 3. signal_events
CREATE TABLE IF NOT EXISTS signal_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL,
    user_id UUID NOT NULL,
    signal_type VARCHAR(50) NOT NULL,
    source VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    url TEXT,
    relevance_score DECIMAL(3,2) NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    run_id UUID,
    raw_data JSONB,
    detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. lead_interactions_embeddings (Vector Store für RAG)
CREATE TABLE IF NOT EXISTS lead_interactions_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL,
    user_id UUID NOT NULL,
    interaction_type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    summary TEXT,
    embedding vector(1536),
    channel VARCHAR(50),
    sentiment VARCHAR(20),
    topics TEXT[],
    interaction_date TIMESTAMPTZ NOT NULL,
    indexed_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. reactivation_queue (für Batch-Jobs)
CREATE TABLE IF NOT EXISTS reactivation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL,
    user_id UUID NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    priority INTEGER DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_reactivation_runs_user ON reactivation_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_reactivation_runs_lead ON reactivation_runs(lead_id);
CREATE INDEX IF NOT EXISTS idx_reactivation_runs_status ON reactivation_runs(status);
CREATE INDEX IF NOT EXISTS idx_drafts_user_status ON reactivation_drafts(user_id, status);
CREATE INDEX IF NOT EXISTS idx_signals_lead ON signal_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_signals_type ON signal_events(signal_type);
CREATE INDEX IF NOT EXISTS idx_interactions_lead ON lead_interactions_embeddings(lead_id);
CREATE INDEX IF NOT EXISTS idx_interactions_user ON lead_interactions_embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_queue_user ON reactivation_queue(user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE reactivation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactivation_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_interactions_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactivation_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own runs" ON reactivation_runs;
CREATE POLICY "Users own runs" ON reactivation_runs FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own drafts" ON reactivation_drafts;
CREATE POLICY "Users own drafts" ON reactivation_drafts FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own signals" ON signal_events;
CREATE POLICY "Users own signals" ON signal_events FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own embeddings" ON lead_interactions_embeddings;
CREATE POLICY "Users own embeddings" ON lead_interactions_embeddings FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users own queue" ON reactivation_queue;
CREATE POLICY "Users own queue" ON reactivation_queue FOR ALL USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- VECTOR SEARCH FUNCTION
-- ═══════════════════════════════════════════════════════════════════════════

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

-- ═══════════════════════════════════════════════════════════════════════════
-- DONE! 
-- ═══════════════════════════════════════════════════════════════════════════


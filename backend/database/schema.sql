-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Objection Library Table
CREATE TABLE IF NOT EXISTS objection_library (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category TEXT NOT NULL CHECK (category IN ('Preis', 'Zeit', 'Vertrauen', 'Autorität', 'Bedarf', 'Risiko & Veränderung', 'Network Marketing spezifisch', 'Immobilien spezifisch', 'Finanzberatung spezifisch', 'Vertragsbedingungen', 'Daten & Sicherheit', 'Social Proof', 'Vermeidungs-Einwand')),
    objection_text TEXT NOT NULL UNIQUE,
    psychology TEXT NOT NULL,
    industry TEXT[] NOT NULL,
    frequency_score INTEGER CHECK (frequency_score BETWEEN 1 AND 100),
    severity INTEGER CHECK (severity BETWEEN 1 AND 10),
    source TEXT DEFAULT 'sales_flow_ai_internal_v1',
    confidence_score DECIMAL(3,2) CHECK (confidence_score BETWEEN 0 AND 1),
    embedding vector(1536), -- OpenAI ada-002 embedding dimension
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Objection Responses Table
CREATE TABLE IF NOT EXISTS objection_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    objection_id UUID REFERENCES objection_library(id) ON DELETE CASCADE,
    technique TEXT NOT NULL,
    response_script TEXT NOT NULL,
    success_rate TEXT CHECK (success_rate IN ('low', 'medium', 'high')),
    tone TEXT,
    when_to_use TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_objection_category ON objection_library(category);
CREATE INDEX IF NOT EXISTS idx_objection_industry ON objection_library USING GIN(industry);
CREATE INDEX IF NOT EXISTS idx_response_objection ON objection_responses(objection_id);
CREATE INDEX IF NOT EXISTS idx_objection_embedding ON objection_library USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Function for semantic search
CREATE OR REPLACE FUNCTION search_objections(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    objection_text TEXT,
    category TEXT,
    psychology TEXT,
    industry TEXT[],
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        objection_library.id,
        objection_library.objection_text,
        objection_library.category,
        objection_library.psychology,
        objection_library.industry,
        1 - (objection_library.embedding <=> query_embedding) as similarity
    FROM objection_library
    WHERE 1 - (objection_library.embedding <=> query_embedding) > match_threshold
    ORDER BY objection_library.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_objection_library_updated_at BEFORE UPDATE
    ON objection_library FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

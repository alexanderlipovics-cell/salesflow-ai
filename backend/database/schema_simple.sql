-- ============================================================================
-- SALES FLOW AI - SIMPLIFIED SCHEMA (No Vector Extension)
-- ============================================================================
-- This version works without pgvector extension
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- TABLE: objection_library
-- Stores objections without AI embeddings
-- ============================================================================
CREATE TABLE IF NOT EXISTS objection_library (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category TEXT NOT NULL,
    objection_text TEXT NOT NULL UNIQUE,
    psychology TEXT NOT NULL,
    industry TEXT[] NOT NULL,
    frequency_score INTEGER CHECK (frequency_score BETWEEN 1 AND 100),
    severity INTEGER CHECK (severity BETWEEN 1 AND 10),
    source TEXT DEFAULT 'sales_flow_ai_internal_v1',
    confidence_score DECIMAL(3,2) CHECK (confidence_score BETWEEN 0 AND 1),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: objection_responses
-- Response techniques for each objection
-- ============================================================================
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

-- ============================================================================
-- INDEXES for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_objection_category ON objection_library(category);
CREATE INDEX IF NOT EXISTS idx_objection_industry ON objection_library USING GIN(industry);
CREATE INDEX IF NOT EXISTS idx_objection_frequency ON objection_library(frequency_score DESC);
CREATE INDEX IF NOT EXISTS idx_response_objection ON objection_responses(objection_id);

-- ============================================================================
-- FUNCTION: Auto-update timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER: Auto-update updated_at on changes
-- ============================================================================
DROP TRIGGER IF EXISTS update_objection_library_updated_at ON objection_library;
CREATE TRIGGER update_objection_library_updated_at 
    BEFORE UPDATE ON objection_library 
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Simplified schema created successfully!';
    RAISE NOTICE '📋 Tables: objection_library, objection_responses';
    RAISE NOTICE '🔍 Indexes: 4 indexes created';
    RAISE NOTICE '⏰ Triggers: Auto-update timestamp enabled';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Next step:';
    RAISE NOTICE '   Run: python scripts/titanium_import.py';
END $$;


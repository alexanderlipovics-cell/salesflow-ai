-- ============================================================================
-- SALES FLOW AI - TITANIUM SCHEMA FIX v1.0
-- ============================================================================
-- Purpose: Clean slate schema setup for objections system
-- This script DROPS and RECREATES tables to ensure clean state
-- ============================================================================
-- IMPORTANT: Run this ONCE in Supabase SQL Editor before importing data
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For fuzzy text search

-- ============================================================================
-- STEP 1: Clean Slate (Drop old tables)
-- ============================================================================
DROP TABLE IF EXISTS objection_responses CASCADE;
DROP TABLE IF EXISTS objection_library CASCADE;
DROP TABLE IF EXISTS objections CASCADE;

-- ============================================================================
-- STEP 2: Create OBJECTIONS table (Master table)
-- ============================================================================
CREATE TABLE objections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Core Objection Data
  category TEXT NOT NULL,
  objection_text_de TEXT NOT NULL UNIQUE,
  objection_text_en TEXT,
  
  -- Metadata Arrays
  psychology_tags TEXT[] DEFAULT '{}',
  industry TEXT[] NOT NULL DEFAULT '{}',
  
  -- Scoring
  frequency_score INTEGER DEFAULT 50 CHECK (frequency_score >= 0 AND frequency_score <= 100),
  severity INTEGER DEFAULT 5 CHECK (severity >= 1 AND severity <= 10),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 3: Create OBJECTION_RESPONSES table
-- ============================================================================
CREATE TABLE objection_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Foreign Key
  objection_id UUID NOT NULL REFERENCES objections(id) ON DELETE CASCADE,
  
  -- Response Data
  technique TEXT NOT NULL,
  response_script TEXT NOT NULL,
  success_rate TEXT DEFAULT 'medium' CHECK (success_rate IN ('low', 'medium', 'high')),
  tone TEXT DEFAULT 'consultative',
  when_to_use TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- STEP 4: Create INDEXES for Performance
-- ============================================================================
CREATE INDEX idx_objections_category ON objections(category);
CREATE INDEX idx_objections_industry ON objections USING GIN(industry);
CREATE INDEX idx_objections_frequency ON objections(frequency_score DESC);
CREATE INDEX idx_objections_text_search ON objections USING GIN(to_tsvector('german', objection_text_de));
CREATE INDEX idx_objection_responses_objection_id ON objection_responses(objection_id);
CREATE INDEX idx_objection_responses_success_rate ON objection_responses(success_rate);

-- ============================================================================
-- STEP 5: Create TRIGGERS for Auto-Update Timestamps
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_objections_updated_at ON objections;
CREATE TRIGGER update_objections_updated_at
  BEFORE UPDATE ON objections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_objection_responses_updated_at ON objection_responses;
CREATE TRIGGER update_objection_responses_updated_at
  BEFORE UPDATE ON objection_responses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 6: Add Table Comments (Documentation)
-- ============================================================================
COMMENT ON TABLE objections IS 'Objection library with German text, psychology tags, and industry mapping';
COMMENT ON TABLE objection_responses IS 'Response techniques and scripts for handling objections';

COMMENT ON COLUMN objections.category IS 'Objection category (e.g., preis, zeit, konkurrenz)';
COMMENT ON COLUMN objections.objection_text_de IS 'German objection text (primary)';
COMMENT ON COLUMN objections.objection_text_en IS 'English objection text (optional)';
COMMENT ON COLUMN objections.psychology_tags IS 'Psychological patterns (e.g., Loss Aversion, Status Quo Bias)';
COMMENT ON COLUMN objections.industry IS 'Industries where this objection is common (e.g., network_marketing, real_estate)';
COMMENT ON COLUMN objections.frequency_score IS 'How often this objection appears (0-100, higher = more frequent)';
COMMENT ON COLUMN objections.severity IS 'How difficult to handle (1-10, higher = more difficult)';

COMMENT ON COLUMN objection_responses.technique IS 'Response technique name (e.g., ROI Reframe, Social Proof)';
COMMENT ON COLUMN objection_responses.response_script IS 'Full response script with placeholders like {name}, {x}';
COMMENT ON COLUMN objection_responses.success_rate IS 'Historical success rate: low, medium, high';
COMMENT ON COLUMN objection_responses.tone IS 'Tone of response (e.g., empathetic, consultative, confident)';
COMMENT ON COLUMN objection_responses.when_to_use IS 'Best scenarios for using this response';

-- ============================================================================
-- STEP 7: Verification Query
-- ============================================================================
DO $$
DECLARE
  obj_count INTEGER;
  resp_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO obj_count FROM information_schema.columns WHERE table_name = 'objections';
  SELECT COUNT(*) INTO resp_count FROM information_schema.columns WHERE table_name = 'objection_responses';
  
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════════════';
  RAISE NOTICE '✅ TITANIUM SCHEMA FIX COMPLETED SUCCESSFULLY!';
  RAISE NOTICE '══════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Tables Created:';
  RAISE NOTICE '   • objections (% columns)', obj_count;
  RAISE NOTICE '   • objection_responses (% columns)', resp_count;
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Indexes Created: 6';
  RAISE NOTICE '⏰ Triggers Created: 2 (auto-update timestamps)';
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════════════';
  RAISE NOTICE '🚀 NEXT STEP:';
  RAISE NOTICE '   Run: .\setup.ps1 in backend directory';
  RAISE NOTICE '   Or: python scripts/titanium_import.py';
  RAISE NOTICE '══════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;


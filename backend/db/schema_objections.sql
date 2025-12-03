-- ============================================================================
-- Sales Flow AI - Objections Knowledge Base Schema
-- ============================================================================
-- Run this in your Supabase SQL Editor to create the objections tables
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLE: objections
-- Stores objection library with German text, categories, and metadata
-- ============================================================================
CREATE TABLE IF NOT EXISTS objections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL,
  objection_text_de TEXT NOT NULL,
  objection_text_en TEXT,
  psychology_tags TEXT[] DEFAULT '{}',
  industry TEXT[] NOT NULL DEFAULT '{}',
  frequency_score INTEGER DEFAULT 50 CHECK (frequency_score >= 0 AND frequency_score <= 100),
  severity INTEGER DEFAULT 5 CHECK (severity >= 1 AND severity <= 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- TABLE: objection_responses
-- Stores response techniques for each objection
-- ============================================================================
CREATE TABLE IF NOT EXISTS objection_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  objection_id UUID NOT NULL REFERENCES objections(id) ON DELETE CASCADE,
  technique TEXT NOT NULL,
  response_script TEXT NOT NULL,
  success_rate TEXT DEFAULT 'medium' CHECK (success_rate IN ('low', 'medium', 'high')),
  tone TEXT DEFAULT 'consultative',
  when_to_use TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES for better query performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_objections_category ON objections(category);
CREATE INDEX IF NOT EXISTS idx_objections_industry ON objections USING GIN(industry);
CREATE INDEX IF NOT EXISTS idx_objections_frequency ON objections(frequency_score DESC);
CREATE INDEX IF NOT EXISTS idx_objections_text_search ON objections USING GIN(to_tsvector('german', objection_text_de));
CREATE INDEX IF NOT EXISTS idx_objection_responses_objection_id ON objection_responses(objection_id);
CREATE INDEX IF NOT EXISTS idx_objection_responses_success_rate ON objection_responses(success_rate);

-- ============================================================================
-- FUNCTION: Update updated_at timestamp automatically
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS: Auto-update updated_at on row changes
-- ============================================================================
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
-- ROW LEVEL SECURITY (RLS)
-- Enable if you want to add authentication-based access control
-- ============================================================================
-- ALTER TABLE objections ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE objection_responses ENABLE ROW LEVEL SECURITY;

-- Example policy (uncomment and adjust as needed):
-- CREATE POLICY "Allow public read access" ON objections
--   FOR SELECT USING (true);

-- ============================================================================
-- COMMENTS for documentation
-- ============================================================================
COMMENT ON TABLE objections IS 'Objection library with German text, psychology tags, and industry mapping';
COMMENT ON TABLE objection_responses IS 'Response techniques and scripts for handling objections';

COMMENT ON COLUMN objections.category IS 'Objection category (e.g., preis, zeit, konkurrenz)';
COMMENT ON COLUMN objections.objection_text_de IS 'German objection text';
COMMENT ON COLUMN objections.psychology_tags IS 'Psychological patterns (e.g., Loss Aversion)';
COMMENT ON COLUMN objections.industry IS 'Industries where this objection is common';
COMMENT ON COLUMN objections.frequency_score IS 'How often this objection appears (0-100)';
COMMENT ON COLUMN objections.severity IS 'How difficult to handle (1-10)';

COMMENT ON COLUMN objection_responses.technique IS 'Response technique name';
COMMENT ON COLUMN objection_responses.response_script IS 'Full response script with placeholders';
COMMENT ON COLUMN objection_responses.success_rate IS 'Success rate: low, medium, high';
COMMENT ON COLUMN objection_responses.tone IS 'Tone of the response (e.g., empathetic, consultative)';

-- ============================================================================
-- VERIFICATION QUERY
-- Run this after schema creation to verify tables exist
-- ============================================================================
-- SELECT 
--   table_name, 
--   (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
-- FROM information_schema.tables t
-- WHERE table_schema = 'public' 
--   AND table_name IN ('objections', 'objection_responses')
-- ORDER BY table_name;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Objections schema created successfully!';
  RAISE NOTICE '📋 Tables: objections, objection_responses';
  RAISE NOTICE '🔍 Indexes: 6 indexes created for performance';
  RAISE NOTICE '⏰ Triggers: Auto-update timestamps enabled';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Next steps:';
  RAISE NOTICE '1. Import data: python backend/scripts/import_objections.py backend/data/objections_import.json';
  RAISE NOTICE '2. Test API: http://localhost:8000/docs';
END $$;


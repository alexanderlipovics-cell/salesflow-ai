-- ============================================================================
-- SALES FLOW AI - TITANIUM SCHEMA FIX v1.0
-- ============================================================================
-- Purpose: Prepare database for AI Knowledge Base
-- Features:
--   - Safe column additions (IF NOT EXISTS logic)
--   - Adds frequency_score to objections
--   - Adds psychology_tags array support
--   - Optional cleanup (commented for safety)
-- ============================================================================

-- 1. Ensure objections table has frequency_score column
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'objections' 
        AND column_name = 'frequency_score'
    ) THEN
        ALTER TABLE objections ADD COLUMN frequency_score INTEGER DEFAULT 5;
        RAISE NOTICE 'Added frequency_score column to objections';
    ELSE
        RAISE NOTICE 'frequency_score column already exists';
    END IF;
END $$;

-- 2. Ensure we have text arrays for tags (if not already present)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'objections' 
        AND column_name = 'psychology_tags'
    ) THEN
        ALTER TABLE objections ADD COLUMN psychology_tags TEXT[] DEFAULT '{}';
        RAISE NOTICE 'Added psychology_tags column to objections';
    ELSE
        RAISE NOTICE 'psychology_tags column already exists';
    END IF;
END $$;

-- 3. Create index on frequency_score for better query performance
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE tablename = 'objections' 
        AND indexname = 'idx_objections_frequency'
    ) THEN
        CREATE INDEX idx_objections_frequency ON objections(frequency_score DESC);
        RAISE NOTICE 'Created index on frequency_score';
    ELSE
        RAISE NOTICE 'Index on frequency_score already exists';
    END IF;
END $$;

-- ============================================================================
-- OPTIONAL: Cleanup (ONLY for DEV! Uncomment if you want to reset)
-- ============================================================================
-- ⚠️ WARNING: This will DELETE ALL DATA in these tables!
-- ⚠️ Only use this in DEVELOPMENT environment for testing!

-- DELETE FROM objections;
-- DELETE FROM message_templates;
-- DELETE FROM playbooks;

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run this to verify the schema is correct:
/*
SELECT 
    column_name, 
    data_type, 
    column_default
FROM information_schema.columns
WHERE table_name = 'objections'
ORDER BY ordinal_position;
*/

-- Expected output should include:
-- - frequency_score | integer | 5
-- - psychology_tags | ARRAY | '{}'::text[]

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Objections schema enhancements completed!';
  RAISE NOTICE '📊 Added: frequency_score (for popularity tracking)';
  RAISE NOTICE '🏷️  Added: psychology_tags (for categorization)';
  RAISE NOTICE '🔍 Created: Index on frequency_score for performance';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Ready for AI Knowledge Base integration!';
END $$;


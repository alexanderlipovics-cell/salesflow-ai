-- ============================================================================
-- FIX: Add missing frequency_score column to objections table
-- ============================================================================
-- Run this if you get error: "Could not find the 'frequency_score' column"
-- ============================================================================

-- Add frequency_score column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'objections' 
        AND column_name = 'frequency_score'
    ) THEN
        ALTER TABLE objections 
        ADD COLUMN frequency_score INTEGER DEFAULT 50 
        CHECK (frequency_score >= 0 AND frequency_score <= 100);
        
        RAISE NOTICE '✅ Added frequency_score column to objections table';
    ELSE
        RAISE NOTICE 'ℹ️  frequency_score column already exists';
    END IF;
END $$;

-- Add severity column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'objections' 
        AND column_name = 'severity'
    ) THEN
        ALTER TABLE objections 
        ADD COLUMN severity INTEGER DEFAULT 5 
        CHECK (severity >= 1 AND severity <= 10);
        
        RAISE NOTICE '✅ Added severity column to objections table';
    ELSE
        RAISE NOTICE 'ℹ️  severity column already exists';
    END IF;
END $$;

-- Add psychology_tags column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'objections' 
        AND column_name = 'psychology_tags'
    ) THEN
        ALTER TABLE objections 
        ADD COLUMN psychology_tags TEXT[] DEFAULT '{}';
        
        RAISE NOTICE '✅ Added psychology_tags column to objections table';
    ELSE
        RAISE NOTICE 'ℹ️  psychology_tags column already exists';
    END IF;
END $$;

-- Add industry column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'objections' 
        AND column_name = 'industry'
    ) THEN
        ALTER TABLE objections 
        ADD COLUMN industry TEXT[] NOT NULL DEFAULT '{}';
        
        RAISE NOTICE '✅ Added industry column to objections table';
    ELSE
        RAISE NOTICE 'ℹ️  industry column already exists';
    END IF;
END $$;

-- Verify the fix
SELECT 
    column_name, 
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'objections'
AND column_name IN ('frequency_score', 'severity', 'psychology_tags', 'industry')
ORDER BY column_name;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ Schema fix complete!';
    RAISE NOTICE '📋 All required columns are now present';
    RAISE NOTICE '🚀 You can now run: python scripts/import_objections.py data/objections_import.json';
END $$;


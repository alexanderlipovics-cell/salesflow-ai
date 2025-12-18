-- ============================================================================
-- Sales Flow AI - Sales Content Waterfall System
-- ============================================================================
-- Multi-tenant, multi-language content system with waterfall fallback logic
-- Company Specific > Language Specific > Global Fallback
-- ============================================================================

-- ============================================================================
-- STEP 1: Enable Extensions
-- ============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable vector extension for embeddings (prepare for future AI memory features)
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================================
-- STEP 2: Create Enums & Types
-- ============================================================================

-- Language codes supported by the application
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_language') THEN
        CREATE TYPE app_language AS ENUM ('de', 'en', 'es', 'fr', 'it', 'pt');
    END IF;
END $$;

-- Content categories for different types of sales content
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'content_category') THEN
        CREATE TYPE content_category AS ENUM ('objection', 'template', 'playbook', 'script');
    END IF;
END $$;

-- ============================================================================
-- STEP 3: Modify Existing Tables
-- ============================================================================

-- Add language support to profiles table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'language_code'
    ) THEN
        ALTER TABLE profiles 
        ADD COLUMN language_code TEXT DEFAULT 'de' CHECK (language_code IN ('de', 'en', 'es', 'fr', 'it', 'pt'));
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'region_code'
    ) THEN
        ALTER TABLE profiles 
        ADD COLUMN region_code TEXT;
    END IF;
END $$;

-- Add language support to companies table (if it exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'companies' AND column_name = 'default_language'
        ) THEN
            ALTER TABLE companies 
            ADD COLUMN default_language TEXT DEFAULT 'de' CHECK (default_language IN ('de', 'en', 'es', 'fr', 'it', 'pt'));
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'companies' AND column_name = 'supported_regions'
        ) THEN
            ALTER TABLE companies 
            ADD COLUMN supported_regions TEXT[];
        END IF;
    END IF;
END $$;

-- ============================================================================
-- STEP 4: Create Master Content Table (sales_content)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sales_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Multi-tenant: Company-specific content (NULL = global/fallback)
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Multi-language support
    language_code TEXT NOT NULL CHECK (language_code IN ('de', 'en', 'es', 'fr', 'it', 'pt')),
    region_code TEXT, -- Optional: 'de-DE', 'de-AT', 'en-US', etc.
    
    -- Content classification
    category content_category NOT NULL,
    key_identifier TEXT NOT NULL, -- Slug-like: 'pyramid_scheme', 'price_too_high', etc.
    
    -- Content payload (flexible JSON structure)
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Expected structure: { "title": "...", "script": "...", "ai_hints": "..." }
    
    -- Future: Vector embeddings for semantic search
    embedding vector(1536), -- OpenAI embeddings dimension
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Unique constraint: Prevent duplicates in waterfall stack
    -- NULLS NOT DISTINCT: Treats NULL company_id as a distinct value
    CONSTRAINT sales_content_unique_waterfall UNIQUE NULLS NOT DISTINCT (
        company_id, 
        language_code, 
        COALESCE(region_code, ''), 
        category, 
        key_identifier
    )
);

-- ============================================================================
-- STEP 5: Create Performance Indexes
-- ============================================================================

-- Composite index for waterfall query (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_sales_content_waterfall 
ON sales_content(category, key_identifier, language_code, company_id NULLS LAST);

-- Index for company-specific queries
CREATE INDEX IF NOT EXISTS idx_sales_content_company 
ON sales_content(company_id) WHERE company_id IS NOT NULL;

-- Index for language queries
CREATE INDEX IF NOT EXISTS idx_sales_content_language 
ON sales_content(language_code, category);

-- GIN index for fast JSON searching in payload
CREATE INDEX IF NOT EXISTS idx_sales_content_payload 
ON sales_content USING GIN (payload);

-- Index for region-specific content
CREATE INDEX IF NOT EXISTS idx_sales_content_region 
ON sales_content(region_code) WHERE region_code IS NOT NULL;

-- ============================================================================
-- STEP 6: Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE sales_content ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read content where:
-- 1. company_id matches their profile's company_id, OR
-- 2. company_id IS NULL (global fallback content)
DROP POLICY IF EXISTS "Read Access: Company or Global" ON sales_content;
CREATE POLICY "Read Access: Company or Global" ON sales_content
    FOR SELECT
    USING (
        company_id IS NULL 
        OR company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

-- Policy: Users can insert/update content for their own company
DROP POLICY IF EXISTS "Write Access: Own Company" ON sales_content;
CREATE POLICY "Write Access: Own Company" ON sales_content
    FOR ALL
    USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
        OR company_id IS NULL -- Allow global content (admin only, adjust as needed)
    )
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
        OR company_id IS NULL
    );

-- ============================================================================
-- STEP 7: Create Auto-Update Trigger for updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_sales_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sales_content_updated_at ON sales_content;
CREATE TRIGGER sales_content_updated_at
    BEFORE UPDATE ON sales_content
    FOR EACH ROW
    EXECUTE FUNCTION update_sales_content_updated_at();

-- ============================================================================
-- STEP 8: Create Waterfall RPC Function (get_optimized_content)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_optimized_content(
    p_category content_category,
    p_key_identifier TEXT,
    p_language TEXT DEFAULT 'de',
    p_region TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    company_id UUID,
    language_code TEXT,
    region_code TEXT,
    category content_category,
    key_identifier TEXT,
    payload JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) AS $$
DECLARE
    v_user_company_id UUID;
BEGIN
    -- Get user's company_id from their profile
    SELECT company_id INTO v_user_company_id
    FROM profiles
    WHERE id = auth.uid()
    LIMIT 1;
    
    -- Waterfall Query: Returns single best match per key_identifier
    -- Priority Order:
    -- 1. Company Override (User's Company + Language + Region)
    -- 2. Company Override (User's Company + Language)
    -- 3. Region Specific (Global + Language + Region)
    -- 4. Language Default (Global + Language)
    -- 5. English Fallback (Global + 'en')
    
    RETURN QUERY
    SELECT DISTINCT ON (sc.key_identifier)
        sc.id,
        sc.company_id,
        sc.language_code,
        sc.region_code,
        sc.category,
        sc.key_identifier,
        sc.payload,
        sc.created_at,
        sc.updated_at
    FROM sales_content sc
    WHERE sc.category = p_category
        AND sc.key_identifier = p_key_identifier
        AND (
            -- Priority 1: Company + Language + Region
            (sc.company_id = v_user_company_id AND sc.language_code = p_language AND sc.region_code = p_region)
            -- Priority 2: Company + Language
            OR (sc.company_id = v_user_company_id AND sc.language_code = p_language AND sc.region_code IS NULL)
            -- Priority 3: Global + Language + Region
            OR (sc.company_id IS NULL AND sc.language_code = p_language AND sc.region_code = p_region)
            -- Priority 4: Global + Language
            OR (sc.company_id IS NULL AND sc.language_code = p_language AND sc.region_code IS NULL)
            -- Priority 5: English Fallback (only if not already English)
            OR (sc.company_id IS NULL AND sc.language_code = 'en' AND sc.region_code IS NULL AND p_language != 'en')
        )
    ORDER BY sc.key_identifier,
        -- Order by priority: Company > Global, Region > No Region
        CASE 
            WHEN sc.company_id = v_user_company_id AND sc.region_code = p_region THEN 1
            WHEN sc.company_id = v_user_company_id THEN 2
            WHEN sc.region_code = p_region THEN 3
            ELSE 4
        END,
        sc.updated_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_optimized_content TO authenticated;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Sales Content Waterfall System created successfully!';
    RAISE NOTICE '📋 Table: sales_content';
    RAISE NOTICE '🔍 Indexes: 5 indexes created';
    RAISE NOTICE '👁️  RLS: Enabled with read/write policies';
    RAISE NOTICE '🎯 Function: get_optimized_content() with waterfall logic';
    RAISE NOTICE '🌍 Languages: de, en, es, fr, it, pt';
    RAISE NOTICE '📦 Categories: objection, template, playbook, script';
END $$;


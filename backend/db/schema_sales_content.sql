-- ═══════════════════════════════════════════════════════════════════════════
-- SALES FLOW AI - SALES CONTENT SCHEMA (WATERFALL LOGIC)
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Version: 1.0
-- Description: Multi-tenant, multi-language content system with waterfall logic
--              Priority: Company Specific > Language Specific > Global Fallback
-- 
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ============================================
-- PART 1: EXTENSIONS
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable vector extension for embeddings (if available)
-- CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================
-- PART 2: ENUMS & TYPES
-- ============================================

-- Supported languages
DO $$ BEGIN
    CREATE TYPE app_language AS ENUM (
      'de', 'en', 'es', 'fr', 'it', 'pt'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Content categories
DO $$ BEGIN
    CREATE TYPE content_category AS ENUM (
      'objection', 'template', 'playbook', 'script'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- PART 3: TABLE MODIFICATIONS
-- ============================================

-- Add language support to profiles table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'language_code'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN language_code TEXT DEFAULT 'de';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'region_code'
    ) THEN
        ALTER TABLE public.profiles 
        ADD COLUMN region_code TEXT;
    END IF;
END $$;

-- Add language support to companies table (if exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'mlm_companies'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'mlm_companies' 
            AND column_name = 'default_language'
        ) THEN
            ALTER TABLE public.mlm_companies 
            ADD COLUMN default_language TEXT DEFAULT 'de';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'mlm_companies' 
            AND column_name = 'supported_regions'
        ) THEN
            ALTER TABLE public.mlm_companies 
            ADD COLUMN supported_regions TEXT[] DEFAULT ARRAY['DE', 'AT', 'CH'];
        END IF;
    END IF;
END $$;

-- ============================================
-- PART 4: MASTER CONTENT TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.sales_content (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Company linkage (NULL = global fallback)
  company_id UUID REFERENCES public.mlm_companies(id) ON DELETE CASCADE,
  
  -- Language & Region
  language_code TEXT NOT NULL DEFAULT 'de',
  region_code TEXT,  -- NULL = applies to all regions
  
  -- Content Category
  category content_category NOT NULL,
  
  -- Unique identifier (slug-like, e.g., 'pyramid_scheme', 'price_too_high')
  key_identifier TEXT NOT NULL,
  
  -- Content payload (JSONB for flexibility)
  payload JSONB NOT NULL DEFAULT '{}'::JSONB,
  -- Structure:
  -- {
  --   "title": "Objection Title",
  --   "script": "The actual response text...",
  --   "ai_hints": ["key point 1", "key point 2"],
  --   "tone": "professional|friendly|assertive",
  --   "tags": ["price", "trust", "timing"]
  -- }
  
  -- Embedding for semantic search (optional, requires vector extension)
  -- embedding vector(1536),
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,  -- Soft delete
  
  -- Unique constraint with NULL handling
  -- NULLS NOT DISTINCT ensures we can have one global + one company-specific
  CONSTRAINT unique_content_key UNIQUE NULLS NOT DISTINCT (
    company_id, 
    language_code, 
    region_code, 
    category, 
    key_identifier
  )
);

-- ============================================
-- PART 5: INDEXES FOR PERFORMANCE
-- ============================================

-- Composite index for waterfall query (most important!)
CREATE INDEX IF NOT EXISTS idx_sales_content_waterfall 
  ON public.sales_content (category, key_identifier, language_code, company_id NULLS LAST)
  WHERE deleted_at IS NULL;

-- GIN index for JSONB payload searching
CREATE INDEX IF NOT EXISTS idx_sales_content_payload 
  ON public.sales_content USING GIN (payload)
  WHERE deleted_at IS NULL;

-- Index for company-specific queries
CREATE INDEX IF NOT EXISTS idx_sales_content_company 
  ON public.sales_content (company_id, category, key_identifier)
  WHERE deleted_at IS NULL AND company_id IS NOT NULL;

-- Index for language queries
CREATE INDEX IF NOT EXISTS idx_sales_content_language 
  ON public.sales_content (language_code, category, key_identifier)
  WHERE deleted_at IS NULL;

-- ============================================
-- PART 6: TRIGGERS
-- ============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_sales_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sales_content_updated_at ON public.sales_content;
CREATE TRIGGER trigger_sales_content_updated_at
  BEFORE UPDATE ON public.sales_content
  FOR EACH ROW
  EXECUTE FUNCTION update_sales_content_updated_at();

-- ============================================
-- PART 7: ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.sales_content ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Read Access" ON public.sales_content;
DROP POLICY IF EXISTS "Admins can manage content" ON public.sales_content;

-- Policy: Users can see rows where company_id matches their profile's company OR company_id is NULL (global)
CREATE POLICY "Read Access"
  ON public.sales_content FOR SELECT
  USING (
    company_id IS NULL OR  -- Global content (visible to all)
    company_id IN (
      SELECT company_id FROM public.user_profiles 
      WHERE id = auth.uid()
    )
  );

-- Policy: Admins can insert/update/delete
CREATE POLICY "Admins can manage content"
  ON public.sales_content FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- PART 8: WATERFALL RPC FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION get_optimized_content(
  p_category content_category,
  p_language TEXT DEFAULT 'de',
  p_region TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  company_id UUID,
  language_code TEXT,
  region_code TEXT,
  key_identifier TEXT,
  payload JSONB,
  priority INTEGER
) AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Get user's company_id from profile
  SELECT company_id INTO v_company_id
  FROM public.user_profiles
  WHERE id = auth.uid()
  LIMIT 1;
  
  -- Waterfall query with priority ordering
  RETURN QUERY
  SELECT DISTINCT ON (sc.key_identifier)
    sc.id,
    sc.company_id,
    sc.language_code,
    sc.region_code,
    sc.key_identifier,
    sc.payload,
    CASE
      -- Priority 1: Company Override (User's Company + Language)
      WHEN sc.company_id = v_company_id AND sc.language_code = p_language AND (sc.region_code = p_region OR sc.region_code IS NULL) THEN 1
      -- Priority 2: Region Specific (Global + Language + Region)
      WHEN sc.company_id IS NULL AND sc.language_code = p_language AND sc.region_code = p_region THEN 2
      -- Priority 3: Language Default (Global + Language)
      WHEN sc.company_id IS NULL AND sc.language_code = p_language AND sc.region_code IS NULL THEN 3
      -- Priority 4: English Fallback (Global + 'en')
      WHEN sc.company_id IS NULL AND sc.language_code = 'en' AND sc.region_code IS NULL THEN 4
      ELSE 99
    END as priority
  FROM public.sales_content sc
  WHERE 
    sc.category = p_category AND
    sc.deleted_at IS NULL AND
    (
      -- Company-specific match
      (sc.company_id = v_company_id AND sc.language_code = p_language AND (sc.region_code = p_region OR sc.region_code IS NULL)) OR
      -- Region-specific global
      (sc.company_id IS NULL AND sc.language_code = p_language AND sc.region_code = p_region) OR
      -- Language-specific global
      (sc.company_id IS NULL AND sc.language_code = p_language AND sc.region_code IS NULL) OR
      -- English fallback
      (sc.company_id IS NULL AND sc.language_code = 'en' AND sc.region_code IS NULL)
    )
  ORDER BY 
    sc.key_identifier,
    priority ASC,
    sc.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_optimized_content TO authenticated;

-- ============================================
-- PART 9: HELPER FUNCTIONS
-- ============================================

-- Get content by key (simplified version)
CREATE OR REPLACE FUNCTION get_content_by_key(
  p_key_identifier TEXT,
  p_category content_category DEFAULT 'objection',
  p_language TEXT DEFAULT 'de'
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT payload INTO v_result
  FROM get_optimized_content(p_category, p_language, NULL)
  WHERE key_identifier = p_key_identifier
  LIMIT 1;
  
  RETURN COALESCE(v_result, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_content_by_key TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- SCHEMA CREATION COMPLETE ✅
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- USAGE EXAMPLES:
-- 
-- 1. Insert company-specific content:
-- INSERT INTO sales_content (company_id, language_code, category, key_identifier, payload)
-- VALUES (
--   'company-uuid',
--   'de',
--   'objection',
--   'pyramid_scheme',
--   '{"title": "Pyramiden-System Einwand", "script": "...", "ai_hints": ["..."]}'::JSONB
-- );
-- 
-- 2. Insert global fallback:
-- INSERT INTO sales_content (company_id, language_code, category, key_identifier, payload)
-- VALUES (
--   NULL,  -- Global
--   'de',
--   'objection',
--   'price_too_high',
--   '{"title": "Preis zu hoch", "script": "...", "ai_hints": ["..."]}'::JSONB
-- );
-- 
-- 3. Query with waterfall:
-- SELECT * FROM get_optimized_content('objection', 'de', 'DE');
-- 
-- 4. Get specific key:
-- SELECT get_content_by_key('pyramid_scheme', 'objection', 'de');
-- ═══════════════════════════════════════════════════════════════════════════


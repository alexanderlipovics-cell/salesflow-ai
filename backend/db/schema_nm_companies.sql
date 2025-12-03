-- ═══════════════════════════════════════════════════════════════════════════
-- NETWORK MARKETING COMPANIES DATABASE SCHEMA
-- Firmendatenbank für Network Marketing Unternehmen im DACH-Raum
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Version: 1.0
-- Beschreibung: Speichert Firmendaten, Einwände, Templates für NM-Unternehmen
-- 
-- Ausführen in Supabase SQL Editor:
-- 1. Kopiere den gesamten Inhalt dieser Datei
-- 2. Füge ihn im Supabase SQL Editor ein
-- 3. Klicke auf "Run"
-- ═══════════════════════════════════════════════════════════════════════════

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────
-- 1. NM COMPANIES TABLE
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.nm_companies (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Company Information
    name TEXT NOT NULL UNIQUE,
    legal_name TEXT,
    founded INTEGER,
    headquarters TEXT,
    
    -- Products & Business
    product_categories TEXT[],
    plan_type TEXT,
    partners_global TEXT,
    partners_dach TEXT,
    
    -- Online Presence
    website TEXT,
    
    -- Description & USPs
    description TEXT,
    usp TEXT,
    
    -- Associations & Status
    associations TEXT[],
    status TEXT DEFAULT 'aktiv',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- 2. NM OBJECTIONS TABLE
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.nm_objections (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Linked to company
    company_id UUID REFERENCES public.nm_companies(id) ON DELETE CASCADE,
    company_name TEXT,
    
    -- Objection Details
    objection_text TEXT NOT NULL,
    category TEXT,
    frequency TEXT,
    severity TEXT,
    
    -- Responses
    responses JSONB DEFAULT '[]'::jsonb,
    
    -- Psychology & Context
    psychology_tags TEXT[],
    context TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- 3. NM MESSAGE TEMPLATES TABLE
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.nm_templates (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Linked to company
    company_id UUID REFERENCES public.nm_companies(id) ON DELETE CASCADE,
    company_name TEXT,
    
    -- Template Details
    template_name TEXT NOT NULL,
    category TEXT,
    channel TEXT,
    
    -- Content
    subject_line TEXT,
    body_text TEXT,
    cta TEXT,
    
    -- Metadata
    tone TEXT,
    use_case TEXT,
    personalization_tags TEXT[],
    
    -- Performance Metrics
    open_rate DECIMAL(5,2),
    conversion_rate DECIMAL(5,2),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- 4. INDEXES FOR PERFORMANCE
-- ─────────────────────────────────────────────────────────────────

-- Companies
CREATE INDEX IF NOT EXISTS idx_nm_companies_name ON public.nm_companies(name);
CREATE INDEX IF NOT EXISTS idx_nm_companies_status ON public.nm_companies(status);

-- Objections
CREATE INDEX IF NOT EXISTS idx_nm_objections_company ON public.nm_objections(company_id);
CREATE INDEX IF NOT EXISTS idx_nm_objections_company_name ON public.nm_objections(company_name);
CREATE INDEX IF NOT EXISTS idx_nm_objections_category ON public.nm_objections(category);

-- Templates
CREATE INDEX IF NOT EXISTS idx_nm_templates_company ON public.nm_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_nm_templates_company_name ON public.nm_templates(company_name);
CREATE INDEX IF NOT EXISTS idx_nm_templates_category ON public.nm_templates(category);
CREATE INDEX IF NOT EXISTS idx_nm_templates_channel ON public.nm_templates(channel);

-- ─────────────────────────────────────────────────────────────────
-- 5. UPDATED_AT TRIGGERS
-- ─────────────────────────────────────────────────────────────────

-- Function for automatic updated_at
CREATE OR REPLACE FUNCTION update_nm_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for all tables
DROP TRIGGER IF EXISTS trigger_nm_companies_updated_at ON public.nm_companies;
CREATE TRIGGER trigger_nm_companies_updated_at
    BEFORE UPDATE ON public.nm_companies
    FOR EACH ROW
    EXECUTE FUNCTION update_nm_updated_at();

DROP TRIGGER IF EXISTS trigger_nm_objections_updated_at ON public.nm_objections;
CREATE TRIGGER trigger_nm_objections_updated_at
    BEFORE UPDATE ON public.nm_objections
    FOR EACH ROW
    EXECUTE FUNCTION update_nm_updated_at();

DROP TRIGGER IF EXISTS trigger_nm_templates_updated_at ON public.nm_templates;
CREATE TRIGGER trigger_nm_templates_updated_at
    BEFORE UPDATE ON public.nm_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_nm_updated_at();

-- ─────────────────────────────────────────────────────────────────
-- 6. ROW LEVEL SECURITY (RLS)
-- ─────────────────────────────────────────────────────────────────

-- Enable RLS
ALTER TABLE public.nm_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nm_objections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nm_templates ENABLE ROW LEVEL SECURITY;

-- Public READ access (authenticated users can read all NM data)
CREATE POLICY "Authenticated users can read NM companies" 
    ON public.nm_companies
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can read NM objections" 
    ON public.nm_objections
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Authenticated users can read NM templates" 
    ON public.nm_templates
    FOR SELECT
    TO authenticated
    USING (true);

-- Admin WRITE access (only service_role can insert/update/delete)
-- This ensures data integrity - only backend/admins can modify

-- ─────────────────────────────────────────────────────────────────
-- 7. COMMENTS FOR DOCUMENTATION
-- ─────────────────────────────────────────────────────────────────

COMMENT ON TABLE public.nm_companies IS 
    'Network Marketing Firmendatenbank für DACH-Raum';

COMMENT ON TABLE public.nm_objections IS 
    'Firmenspezifische Einwände und bewährte Antworten';

COMMENT ON TABLE public.nm_templates IS 
    'Nachrichtenvorlagen für spezifische NM-Firmen';

-- ═══════════════════════════════════════════════════════════════════════════
-- FERTIG! Schema erstellt ✅
-- ═══════════════════════════════════════════════════════════════════════════

/*
NEXT STEPS:

1. Führe dieses Schema in Supabase aus
2. Führe dann den Import aus:
   python backend/scripts/nm_database_import.py

Expected result:
✅ 51 companies imported
✅ 500+ objections imported
✅ 500+ templates imported
*/


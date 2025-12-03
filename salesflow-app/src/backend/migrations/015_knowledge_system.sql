-- ============================================================================
-- KNOWLEDGE SYSTEM: Companies, Knowledge Items, Evidence Hub
-- Migration: 015_knowledge_system.sql
-- Date: 2025-12-02
-- 
-- Dieses System ermöglicht:
-- - Multi-Company Support ohne Code-Änderungen
-- - Evidence Hub für wissenschaftliche Studien
-- - Company-spezifisches Wissen (Produkte, Compliance, etc.)
-- - RAG-Integration für CHIEF via pgvector
-- - Health Pro Modul für Therapeuten/Ärzte
-- ============================================================================

-- Sicherstellen dass pgvector aktiviert ist
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- 1. COMPANIES TABLE (Erweitert)
-- ============================================================================

CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Basics
    slug TEXT UNIQUE NOT NULL,           -- 'zinzino', 'herbalife', 'pm_international'
    name TEXT NOT NULL,
    vertical_id TEXT NOT NULL DEFAULT 'network_marketing',
    
    -- Company Details
    country_origin TEXT,
    website_url TEXT,
    logo_url TEXT,
    
    -- Business Model
    business_model TEXT DEFAULT 'mlm',   -- 'mlm', 'direct_sales', 'affiliate'
    comp_plan_type TEXT,                 -- 'unilevel', 'binary', 'matrix', 'hybrid'
    
    -- Knowledge Config
    has_evidence_hub BOOLEAN DEFAULT false,
    has_health_pro_module BOOLEAN DEFAULT false,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    
    -- Meta
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Zinzino als erste Company
INSERT INTO companies (slug, name, vertical_id, country_origin, business_model, comp_plan_type, has_evidence_hub, has_health_pro_module, is_verified)
VALUES ('zinzino', 'Zinzino', 'network_marketing', 'Sweden', 'mlm', 'unilevel', true, true, true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 2. ENUMS FÜR KNOWLEDGE SYSTEM
-- ============================================================================

-- Knowledge Domain
DO $$ BEGIN
    CREATE TYPE knowledge_domain AS ENUM (
        'evidence',      -- Wissenschaftliche Studien, Health Claims
        'company',       -- Firmen-spezifisch (Produkte, Compliance)
        'vertical',      -- Branchen-spezifisch (MLM allgemein)
        'generic'        -- Allgemeines Sales-Wissen
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Knowledge Type
DO $$ BEGIN
    CREATE TYPE knowledge_type AS ENUM (
        -- Evidence
        'study_summary',
        'meta_analysis',
        'health_claim',
        'guideline',
        
        -- Company
        'company_overview',
        'product_line',
        'product_detail',
        'compensation_plan',
        'compliance_rule',
        'faq',
        
        -- Vertical
        'objection_handler',
        'sales_script',
        'best_practice',
        
        -- Generic
        'psychology',
        'communication',
        'template_helper'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Evidence Strength
DO $$ BEGIN
    CREATE TYPE evidence_strength AS ENUM (
        'high',          -- RCT, große Meta-Analysen
        'moderate',      -- Kohortenstudien, kleinere RCTs
        'limited',       -- Beobachtungsstudien, Fallberichte
        'expert_opinion' -- Expertenmeinung, Leitlinien ohne starke Evidenz
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 3. KNOWLEDGE ITEMS TABLE (Haupttabelle)
-- ============================================================================

CREATE TABLE IF NOT EXISTS knowledge_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Zuordnung
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    vertical_id TEXT,
    
    -- Lokalisierung
    language TEXT NOT NULL DEFAULT 'de',
    region TEXT,                         -- 'DACH', 'EU', 'global'
    
    -- Klassifikation
    domain knowledge_domain NOT NULL,
    type knowledge_type NOT NULL,
    
    -- Thema
    topic TEXT NOT NULL,                 -- 'omega3', 'gut_health', 'compensation_plan'
    subtopic TEXT,                       -- 'cardiovascular', 'bonus_types'
    
    -- Inhalt
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    content_short TEXT,                  -- Kurzversion für schnelle Antworten
    
    -- Für Studien
    study_year INTEGER,
    study_authors TEXT[],
    study_population TEXT,
    study_type TEXT,                     -- 'rct', 'cohort', 'meta_analysis'
    study_intervention TEXT,
    study_outcomes TEXT,
    nutrients_or_factors TEXT[],         -- ['EPA', 'DHA', 'omega3_index']
    health_outcome_areas TEXT[],         -- ['cardiovascular', 'inflammation']
    evidence_level evidence_strength,
    
    -- Quellen
    source_type TEXT,                    -- 'official_website', 'peer_reviewed', 'guideline'
    source_url TEXT,
    source_reference TEXT,               -- DOI, PubMed ID
    
    -- Qualität & Compliance
    quality_score NUMERIC(3,2),          -- 0.00 - 1.00
    compliance_level TEXT DEFAULT 'normal', -- 'strict', 'normal', 'low'
    requires_disclaimer BOOLEAN DEFAULT false,
    disclaimer_text TEXT,
    
    -- Nutzung
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    effectiveness_score NUMERIC(3,2),    -- Wie gut funktioniert dieser Content?
    
    -- AI Hints
    usage_notes_for_ai TEXT,
    keywords TEXT[],
    
    -- Versioning
    version INTEGER DEFAULT 1,
    is_current BOOLEAN DEFAULT true,
    superseded_by UUID REFERENCES knowledge_items(id),
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID,
    verified_at TIMESTAMPTZ,
    
    -- Meta
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. KNOWLEDGE EMBEDDINGS TABLE (für RAG)
-- ============================================================================

CREATE TABLE IF NOT EXISTS knowledge_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_item_id UUID NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
    
    -- Embedding
    embedding vector(1536),              -- OpenAI ada-002 oder Claude
    embedding_model TEXT DEFAULT 'text-embedding-3-small',
    
    -- Chunk Info (falls Content gesplittet)
    chunk_index INTEGER DEFAULT 0,
    chunk_text TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. HEALTH PRO MODULE (für Therapeuten/Ärzte)
-- ============================================================================

CREATE TABLE IF NOT EXISTS health_pro_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id),
    
    -- Qualifikation
    profession TEXT NOT NULL,            -- 'arzt', 'heilpraktiker', 'therapeut', 'ernaehrungsberater'
    specialization TEXT,
    license_number TEXT,
    
    -- Verifizierung
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    verification_document_url TEXT,
    
    -- Settings
    can_view_lab_results BOOLEAN DEFAULT false,
    can_interpret_results BOOLEAN DEFAULT false,
    
    -- Meta
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. LAB RESULTS (Bluttests etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS lab_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Zuordnung
    company_id UUID NOT NULL REFERENCES companies(id),
    lead_id UUID,  -- Optional, falls leads table existiert
    health_pro_id UUID REFERENCES health_pro_profiles(id),
    uploaded_by UUID NOT NULL,
    
    -- Test Info
    test_type TEXT NOT NULL,             -- 'balance_test', 'vitamin_d', 'blood_panel'
    test_date DATE,
    lab_provider TEXT,
    
    -- Ergebnisse (strukturiert)
    results JSONB NOT NULL,              -- {"omega_6_3_ratio": 8.5, "omega3_index": 4.2, ...}
    
    -- Interpretation
    interpretation_summary TEXT,
    recommendations TEXT[],
    follow_up_date DATE,
    
    -- Dokumente
    original_document_url TEXT,
    
    -- Privacy
    consent_given BOOLEAN DEFAULT false,
    consent_date TIMESTAMPTZ,
    
    -- Meta
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. INDEXES
-- ============================================================================

-- Companies
CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);
CREATE INDEX IF NOT EXISTS idx_companies_vertical ON companies(vertical_id);

-- Knowledge Items
CREATE INDEX IF NOT EXISTS idx_knowledge_items_company ON knowledge_items(company_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_domain ON knowledge_items(domain);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_type ON knowledge_items(type);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_topic ON knowledge_items(topic, subtopic);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_active ON knowledge_items(is_active, is_current);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_language ON knowledge_items(language);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_keywords ON knowledge_items USING gin(keywords);

-- Knowledge Embeddings
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_item ON knowledge_embeddings(knowledge_item_id);

-- Vector Index für Similarity Search (HNSW) - bessere Performance als IVFFlat
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_vector ON knowledge_embeddings 
    USING hnsw (embedding vector_cosine_ops);

-- Health Pro
CREATE INDEX IF NOT EXISTS idx_health_pro_user ON health_pro_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_health_pro_company ON health_pro_profiles(company_id);

-- Lab Results
CREATE INDEX IF NOT EXISTS idx_lab_results_company ON lab_results(company_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_lead ON lab_results(lead_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_health_pro ON lab_results(health_pro_id);

-- ============================================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_pro_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;

-- Companies: Alle können aktive Companies lesen
DROP POLICY IF EXISTS "Companies viewable by all" ON companies;
CREATE POLICY "Companies viewable by all" ON companies 
    FOR SELECT USING (is_active = true);

-- Knowledge Items: Alle aktiven können gelesen werden
DROP POLICY IF EXISTS "Knowledge items viewable" ON knowledge_items;
CREATE POLICY "Knowledge items viewable" ON knowledge_items 
    FOR SELECT USING (is_active = true);

-- Knowledge Items: Nur Admins können schreiben
DROP POLICY IF EXISTS "Knowledge items admin write" ON knowledge_items;
CREATE POLICY "Knowledge items admin write" ON knowledge_items 
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Knowledge items admin update" ON knowledge_items;
CREATE POLICY "Knowledge items admin update" ON knowledge_items 
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'super_admin')
        )
    );

-- Knowledge Embeddings: Lesbar wenn Item lesbar
DROP POLICY IF EXISTS "Knowledge embeddings viewable" ON knowledge_embeddings;
CREATE POLICY "Knowledge embeddings viewable" ON knowledge_embeddings 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM knowledge_items ki 
            WHERE ki.id = knowledge_item_id 
            AND ki.is_active = true
        )
    );

-- Health Pro: Nur eigenes Profil
DROP POLICY IF EXISTS "Health pro own profile select" ON health_pro_profiles;
CREATE POLICY "Health pro own profile select" ON health_pro_profiles
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Health pro own profile insert" ON health_pro_profiles;
CREATE POLICY "Health pro own profile insert" ON health_pro_profiles
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Health pro own profile update" ON health_pro_profiles;
CREATE POLICY "Health pro own profile update" ON health_pro_profiles
    FOR UPDATE USING (user_id = auth.uid());

-- Lab Results: Nur zugehörige User oder Health Pros
DROP POLICY IF EXISTS "Lab results access" ON lab_results;
CREATE POLICY "Lab results access" ON lab_results
    FOR SELECT USING (
        uploaded_by = auth.uid() OR
        health_pro_id IN (
            SELECT id FROM health_pro_profiles 
            WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Lab results insert" ON lab_results;
CREATE POLICY "Lab results insert" ON lab_results
    FOR INSERT WITH CHECK (uploaded_by = auth.uid());

-- ============================================================================
-- 9. UPDATED_AT TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_knowledge_items_updated_at ON knowledge_items;
CREATE TRIGGER update_knowledge_items_updated_at
    BEFORE UPDATE ON knowledge_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_health_pro_profiles_updated_at ON health_pro_profiles;
CREATE TRIGGER update_health_pro_profiles_updated_at
    BEFORE UPDATE ON health_pro_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_lab_results_updated_at ON lab_results;
CREATE TRIGGER update_lab_results_updated_at
    BEFORE UPDATE ON lab_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 10. HELPER FUNCTIONS
-- ============================================================================

-- Funktion für Semantic Search
CREATE OR REPLACE FUNCTION search_knowledge_semantic(
    query_embedding vector(1536),
    p_company_id UUID DEFAULT NULL,
    p_vertical_id TEXT DEFAULT NULL,
    p_domains TEXT[] DEFAULT NULL,
    p_language TEXT DEFAULT 'de',
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    item_id UUID,
    title TEXT,
    content TEXT,
    content_short TEXT,
    domain knowledge_domain,
    type knowledge_type,
    topic TEXT,
    similarity FLOAT,
    priority_score INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ki.id AS item_id,
        ki.title,
        ki.content,
        ki.content_short,
        ki.domain,
        ki.type,
        ki.topic,
        1 - (ke.embedding <=> query_embedding) AS similarity,
        CASE 
            WHEN ki.company_id = p_company_id THEN 3
            WHEN ki.vertical_id = p_vertical_id THEN 2
            WHEN ki.domain = 'evidence' THEN 1
            ELSE 0
        END AS priority_score
    FROM knowledge_embeddings ke
    JOIN knowledge_items ki ON ki.id = ke.knowledge_item_id
    WHERE ki.is_active = true 
        AND ki.is_current = true
        AND (ki.language = p_language OR ki.language = 'universal')
        AND (p_company_id IS NULL OR ki.company_id = p_company_id OR ki.company_id IS NULL)
        AND (p_vertical_id IS NULL OR ki.vertical_id = p_vertical_id OR ki.vertical_id IS NULL)
        AND (p_domains IS NULL OR ki.domain::TEXT = ANY(p_domains))
    ORDER BY priority_score DESC, similarity DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Funktion für Keyword Search mit Ranking
CREATE OR REPLACE FUNCTION search_knowledge_keyword(
    p_query TEXT,
    p_company_id UUID DEFAULT NULL,
    p_vertical_id TEXT DEFAULT NULL,
    p_domains TEXT[] DEFAULT NULL,
    p_types TEXT[] DEFAULT NULL,
    p_topics TEXT[] DEFAULT NULL,
    p_language TEXT DEFAULT 'de',
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    item_id UUID,
    title TEXT,
    content TEXT,
    content_short TEXT,
    domain knowledge_domain,
    type knowledge_type,
    topic TEXT,
    relevance FLOAT
) AS $$
DECLARE
    search_pattern TEXT := '%' || p_query || '%';
BEGIN
    RETURN QUERY
    SELECT 
        ki.id AS item_id,
        ki.title,
        ki.content,
        ki.content_short,
        ki.domain,
        ki.type,
        ki.topic,
        CASE 
            WHEN ki.title ILIKE search_pattern THEN 1.0
            WHEN ki.content ILIKE search_pattern THEN 0.8
            WHEN p_query = ANY(ki.keywords) THEN 0.7
            WHEN ki.topic ILIKE search_pattern THEN 0.6
            ELSE 0.5
        END::FLOAT AS relevance
    FROM knowledge_items ki
    WHERE ki.is_active = true 
        AND ki.is_current = true
        AND (ki.language = p_language OR ki.language = 'universal')
        AND (p_company_id IS NULL OR ki.company_id = p_company_id OR ki.company_id IS NULL)
        AND (p_vertical_id IS NULL OR ki.vertical_id = p_vertical_id OR ki.vertical_id IS NULL)
        AND (p_domains IS NULL OR ki.domain::TEXT = ANY(p_domains))
        AND (p_types IS NULL OR ki.type::TEXT = ANY(p_types))
        AND (p_topics IS NULL OR ki.topic = ANY(p_topics))
        AND (
            ki.title ILIKE search_pattern OR 
            ki.content ILIKE search_pattern OR
            p_query = ANY(ki.keywords) OR
            ki.topic ILIKE search_pattern
        )
    ORDER BY relevance DESC, COALESCE(ki.quality_score, 0.5) DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 11. USAGE COUNT INCREMENT FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_usage_count(item_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE knowledge_items 
    SET usage_count = usage_count + 1, 
        last_used_at = NOW()
    WHERE id = item_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- DONE
-- ============================================================================


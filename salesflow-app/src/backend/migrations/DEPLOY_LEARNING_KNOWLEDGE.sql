-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  SALES FLOW AI - LEARNING & KNOWLEDGE SYSTEM DEPLOYMENT                    ║
-- ║  Migrations: 015_knowledge_system + 014_learning_system                    ║
-- ╚════════════════════════════════════════════════════════════════════════════╝
--
-- ANLEITUNG:
-- 1. Öffne Supabase Dashboard → SQL Editor
-- 2. Kopiere den GESAMTEN Inhalt dieser Datei
-- 3. Führe das Script aus
-- 4. Prüfe die Output-Messages
--
-- REIHENFOLGE:
-- 1. BASIS-TABELLEN (profiles, leads) - falls noch nicht vorhanden
-- 2. 015_knowledge_system (companies, knowledge_items, etc.)
-- 3. 014_learning_system (templates, learning_events, etc.)
-- ============================================================================

-- ============================================================================
-- PHASE 0: EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PHASE 0.5: ALTER EXISTING TABLES (falls Spalten fehlen)
-- ============================================================================

-- Füge fehlende Spalten zu knowledge_items hinzu (falls Tabelle existiert)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'knowledge_items') THEN
        -- Alle Spalten die fehlen könnten
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'knowledge_items' AND column_name = 'company_id') THEN
            ALTER TABLE knowledge_items ADD COLUMN company_id UUID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'knowledge_items' AND column_name = 'subtopic') THEN
            ALTER TABLE knowledge_items ADD COLUMN subtopic TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'knowledge_items' AND column_name = 'vertical_id') THEN
            ALTER TABLE knowledge_items ADD COLUMN vertical_id TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'knowledge_items' AND column_name = 'language') THEN
            ALTER TABLE knowledge_items ADD COLUMN language TEXT DEFAULT 'de';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'knowledge_items' AND column_name = 'region') THEN
            ALTER TABLE knowledge_items ADD COLUMN region TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'knowledge_items' AND column_name = 'is_current') THEN
            ALTER TABLE knowledge_items ADD COLUMN is_current BOOLEAN DEFAULT true;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'knowledge_items' AND column_name = 'content_short') THEN
            ALTER TABLE knowledge_items ADD COLUMN content_short TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'knowledge_items' AND column_name = 'superseded_by') THEN
            ALTER TABLE knowledge_items ADD COLUMN superseded_by UUID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'knowledge_items' AND column_name = 'usage_notes_for_ai') THEN
            ALTER TABLE knowledge_items ADD COLUMN usage_notes_for_ai TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'knowledge_items' AND column_name = 'effectiveness_score') THEN
            ALTER TABLE knowledge_items ADD COLUMN effectiveness_score NUMERIC(3,2);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'knowledge_items' AND column_name = 'version') THEN
            ALTER TABLE knowledge_items ADD COLUMN version INTEGER DEFAULT 1;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'knowledge_items' AND column_name = 'quality_score') THEN
            ALTER TABLE knowledge_items ADD COLUMN quality_score NUMERIC(3,2);
        END IF;
        RAISE NOTICE '✅ knowledge_items Spalten geprüft/hinzugefügt';
    END IF;
END $$;

-- Füge fehlende Spalten zu templates hinzu
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'templates') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'templates' AND column_name = 'company_id') THEN
            ALTER TABLE templates ADD COLUMN company_id UUID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'templates' AND column_name = 'quality_score') THEN
            ALTER TABLE templates ADD COLUMN quality_score NUMERIC(3,2);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'templates' AND column_name = 'effectiveness_score') THEN
            ALTER TABLE templates ADD COLUMN effectiveness_score NUMERIC(3,2);
        END IF;
        RAISE NOTICE '✅ templates Spalten geprüft/hinzugefügt';
    END IF;
END $$;

-- ============================================================================
-- PHASE 1: BASIS-TABELLEN (falls noch nicht vorhanden)
-- ============================================================================

-- Profiles (User-Erweiterung)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user',  -- 'user', 'admin', 'super_admin', 'leader'
    company_id UUID,
    vertical_id TEXT DEFAULT 'network_marketing',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Profiles für Company-Zuordnung (wird von RLS genutzt)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID,
    role TEXT DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Leads (Basis-Tabelle)
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Contact Info
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    
    -- Social
    instagram_handle TEXT,
    whatsapp_number TEXT,
    
    -- Status
    status TEXT DEFAULT 'new',  -- 'new', 'contacted', 'qualified', 'proposal', 'won', 'lost'
    temperature TEXT DEFAULT 'cold',  -- 'cold', 'warm', 'hot'
    
    -- Source
    source TEXT,
    source_details TEXT,
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    last_contact_at TIMESTAMPTZ,
    next_follow_up_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN RAISE NOTICE '✅ Phase 1: Basis-Tabellen erstellt/geprüft'; END $$;

-- ============================================================================
-- PHASE 2: COMPANIES & KNOWLEDGE SYSTEM (015_knowledge_system.sql)
-- ============================================================================

-- Knowledge Domain Enum
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

-- Knowledge Type Enum
DO $$ BEGIN
    CREATE TYPE knowledge_type AS ENUM (
        'study_summary',
        'meta_analysis',
        'health_claim',
        'guideline',
        'company_overview',
        'product_line',
        'product_detail',
        'compensation_plan',
        'compliance_rule',
        'faq',
        'objection_handler',
        'sales_script',
        'best_practice',
        'psychology',
        'communication',
        'template_helper'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Evidence Strength Enum
DO $$ BEGIN
    CREATE TYPE evidence_strength AS ENUM (
        'high',
        'moderate',
        'limited',
        'expert_opinion'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Companies Table
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    vertical_id TEXT NOT NULL DEFAULT 'network_marketing',
    country_origin TEXT,
    website_url TEXT,
    logo_url TEXT,
    business_model TEXT DEFAULT 'mlm',
    comp_plan_type TEXT,
    has_evidence_hub BOOLEAN DEFAULT false,
    has_health_pro_module BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert Demo Company
INSERT INTO companies (slug, name, vertical_id, country_origin, business_model, comp_plan_type, has_evidence_hub, has_health_pro_module, is_verified)
VALUES ('demo_company', 'Demo Company', 'network_marketing', 'Germany', 'mlm', 'unilevel', true, true, true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO companies (slug, name, vertical_id, country_origin, business_model, comp_plan_type, has_evidence_hub, has_health_pro_module, is_verified)
VALUES ('zinzino', 'Zinzino', 'network_marketing', 'Sweden', 'mlm', 'unilevel', true, true, true)
ON CONFLICT (slug) DO NOTHING;

-- Knowledge Items Table
CREATE TABLE IF NOT EXISTS knowledge_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    vertical_id TEXT,
    language TEXT NOT NULL DEFAULT 'de',
    region TEXT,
    domain knowledge_domain NOT NULL,
    type knowledge_type NOT NULL,
    topic TEXT NOT NULL,
    subtopic TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    content_short TEXT,
    study_year INTEGER,
    study_authors TEXT[],
    study_population TEXT,
    study_type TEXT,
    study_intervention TEXT,
    study_outcomes TEXT,
    nutrients_or_factors TEXT[],
    health_outcome_areas TEXT[],
    evidence_level evidence_strength,
    source_type TEXT,
    source_url TEXT,
    source_reference TEXT,
    quality_score NUMERIC(3,2),
    compliance_level TEXT DEFAULT 'normal',
    requires_disclaimer BOOLEAN DEFAULT false,
    disclaimer_text TEXT,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    effectiveness_score NUMERIC(3,2),
    usage_notes_for_ai TEXT,
    keywords TEXT[],
    version INTEGER DEFAULT 1,
    is_current BOOLEAN DEFAULT true,
    superseded_by UUID REFERENCES knowledge_items(id),
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID,
    verified_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge Embeddings Table (für RAG)
CREATE TABLE IF NOT EXISTS knowledge_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_item_id UUID NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
    embedding vector(1536),
    embedding_model TEXT DEFAULT 'text-embedding-3-small',
    chunk_index INTEGER DEFAULT 0,
    chunk_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Health Pro Profiles
CREATE TABLE IF NOT EXISTS health_pro_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id),
    profession TEXT NOT NULL,
    specialization TEXT,
    license_number TEXT,
    is_verified BOOLEAN DEFAULT false,
    verified_at TIMESTAMPTZ,
    verification_document_url TEXT,
    can_view_lab_results BOOLEAN DEFAULT false,
    can_interpret_results BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lab Results
CREATE TABLE IF NOT EXISTS lab_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    lead_id UUID REFERENCES leads(id),
    health_pro_id UUID REFERENCES health_pro_profiles(id),
    uploaded_by UUID NOT NULL,
    test_type TEXT NOT NULL,
    test_date DATE,
    lab_provider TEXT,
    results JSONB NOT NULL,
    interpretation_summary TEXT,
    recommendations TEXT[],
    follow_up_date DATE,
    original_document_url TEXT,
    consent_given BOOLEAN DEFAULT false,
    consent_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN RAISE NOTICE '✅ Phase 2: Knowledge System erstellt'; END $$;

-- ============================================================================
-- PHASE 3: LEARNING SYSTEM (014_learning_system.sql)
-- ============================================================================

-- Learning Event Type Enum
DO $$ BEGIN
    CREATE TYPE learning_event_type AS ENUM (
        'template_used',
        'template_edited',
        'response_received',
        'positive_outcome',
        'negative_outcome',
        'objection_handled',
        'follow_up_sent'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Outcome Type Enum
DO $$ BEGIN
    CREATE TYPE outcome_type AS ENUM (
        'appointment_booked',
        'deal_closed',
        'info_sent',
        'follow_up_scheduled',
        'objection_overcome',
        'no_response',
        'rejected',
        'ghosted'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Template Category Enum
DO $$ BEGIN
    CREATE TYPE template_category AS ENUM (
        'first_contact',
        'follow_up',
        'reactivation',
        'objection_handler',
        'closing',
        'appointment_booking',
        'info_request',
        'custom'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Templates Table
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name VARCHAR(200) NOT NULL,
    category template_category NOT NULL DEFAULT 'custom',
    content TEXT NOT NULL,
    target_channel VARCHAR(50),
    target_temperature VARCHAR(20),
    target_stage VARCHAR(50),
    tags TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    is_shared BOOLEAN DEFAULT FALSE,
    is_ai_generated BOOLEAN DEFAULT FALSE,
    ai_generation_context JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learning Events Table
CREATE TABLE IF NOT EXISTS learning_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type learning_event_type NOT NULL,
    template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
    template_category template_category,
    template_name VARCHAR(200),
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    lead_status VARCHAR(50),
    lead_temperature VARCHAR(20),
    channel VARCHAR(50),
    message_text TEXT,
    message_word_count INTEGER,
    outcome outcome_type,
    outcome_value DECIMAL(10,2),
    response_received BOOLEAN DEFAULT FALSE,
    response_time_hours DECIMAL(10,2),
    converted_to_next_stage BOOLEAN DEFAULT FALSE,
    conversion_stage VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learning Aggregates Table
CREATE TABLE IF NOT EXISTS learning_aggregates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    aggregate_type VARCHAR(20) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    template_category template_category,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    total_events INTEGER DEFAULT 0,
    templates_used INTEGER DEFAULT 0,
    unique_leads INTEGER DEFAULT 0,
    responses_received INTEGER DEFAULT 0,
    response_rate DECIMAL(5,2) DEFAULT 0,
    avg_response_time_hours DECIMAL(10,2),
    positive_outcomes INTEGER DEFAULT 0,
    negative_outcomes INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    appointments_booked INTEGER DEFAULT 0,
    deals_closed INTEGER DEFAULT 0,
    total_deal_value DECIMAL(12,2) DEFAULT 0,
    channel_breakdown JSONB DEFAULT '{}',
    top_templates JSONB DEFAULT '[]',
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, aggregate_type, period_start, template_id, user_id)
);

-- Template Performance Table
CREATE TABLE IF NOT EXISTS template_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    total_uses INTEGER DEFAULT 0,
    total_responses INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    response_rate DECIMAL(5,2) DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    avg_response_time_hours DECIMAL(10,2),
    uses_last_30d INTEGER DEFAULT 0,
    responses_last_30d INTEGER DEFAULT 0,
    conversions_last_30d INTEGER DEFAULT 0,
    response_rate_30d DECIMAL(5,2) DEFAULT 0,
    conversion_rate_30d DECIMAL(5,2) DEFAULT 0,
    quality_score DECIMAL(5,2) DEFAULT 50,
    trend VARCHAR(20) DEFAULT 'stable',
    last_used_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(template_id)
);

DO $$ BEGIN RAISE NOTICE '✅ Phase 3: Learning System erstellt'; END $$;

-- ============================================================================
-- PHASE 4: INDEXES
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
CREATE INDEX IF NOT EXISTS idx_knowledge_embeddings_vector ON knowledge_embeddings 
    USING hnsw (embedding vector_cosine_ops);

-- Templates
CREATE INDEX IF NOT EXISTS idx_templates_company ON templates(company_id);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_active ON templates(is_active) WHERE is_active = TRUE;

-- Learning Events
CREATE INDEX IF NOT EXISTS idx_learning_events_company ON learning_events(company_id);
CREATE INDEX IF NOT EXISTS idx_learning_events_user ON learning_events(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_events_template ON learning_events(template_id);
CREATE INDEX IF NOT EXISTS idx_learning_events_created ON learning_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_events_type ON learning_events(event_type);
CREATE INDEX IF NOT EXISTS idx_learning_events_category ON learning_events(template_category);

-- Learning Aggregates
CREATE INDEX IF NOT EXISTS idx_learning_aggregates_company ON learning_aggregates(company_id);
CREATE INDEX IF NOT EXISTS idx_learning_aggregates_period ON learning_aggregates(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_learning_aggregates_type ON learning_aggregates(aggregate_type);

-- Template Performance
CREATE INDEX IF NOT EXISTS idx_template_performance_template ON template_performance(template_id);
CREATE INDEX IF NOT EXISTS idx_template_performance_score ON template_performance(quality_score DESC);

-- Leads
CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company_id);
CREATE INDEX IF NOT EXISTS idx_leads_user ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_temperature ON leads(temperature);

DO $$ BEGIN RAISE NOTICE '✅ Phase 4: Indexes erstellt'; END $$;

-- ============================================================================
-- PHASE 5: ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_pro_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Companies: Alle aktiven können gelesen werden
DROP POLICY IF EXISTS "Companies viewable by all" ON companies;
CREATE POLICY "Companies viewable by all" ON companies 
    FOR SELECT USING (is_active = true);

-- Knowledge Items: Alle aktiven können gelesen werden
DROP POLICY IF EXISTS "Knowledge items viewable" ON knowledge_items;
CREATE POLICY "Knowledge items viewable" ON knowledge_items 
    FOR SELECT USING (is_active = true);

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

-- Templates: Company-based access
DROP POLICY IF EXISTS "templates_company_access" ON templates;
CREATE POLICY "templates_company_access" ON templates
    FOR ALL USING (true);  -- Vereinfacht für Demo

-- Learning Events: User can see all for now (vereinfacht)
DROP POLICY IF EXISTS "learning_events_access" ON learning_events;
CREATE POLICY "learning_events_access" ON learning_events
    FOR ALL USING (true);  -- Vereinfacht für Demo

-- Learning Aggregates: Company-based access
DROP POLICY IF EXISTS "learning_aggregates_access" ON learning_aggregates;
CREATE POLICY "learning_aggregates_access" ON learning_aggregates
    FOR ALL USING (true);  -- Vereinfacht für Demo

-- Template Performance: Company-based access
DROP POLICY IF EXISTS "template_performance_access" ON template_performance;
CREATE POLICY "template_performance_access" ON template_performance
    FOR ALL USING (true);  -- Vereinfacht für Demo

-- Leads: Vereinfacht
DROP POLICY IF EXISTS "leads_access" ON leads;
CREATE POLICY "leads_access" ON leads
    FOR ALL USING (true);  -- Vereinfacht für Demo

-- Profiles
DROP POLICY IF EXISTS "profiles_access" ON profiles;
CREATE POLICY "profiles_access" ON profiles
    FOR ALL USING (true);  -- Vereinfacht für Demo

-- User Profiles
DROP POLICY IF EXISTS "user_profiles_access" ON user_profiles;
CREATE POLICY "user_profiles_access" ON user_profiles
    FOR ALL USING (true);  -- Vereinfacht für Demo

-- Health Pro
DROP POLICY IF EXISTS "health_pro_access" ON health_pro_profiles;
CREATE POLICY "health_pro_access" ON health_pro_profiles
    FOR ALL USING (true);  -- Vereinfacht für Demo

-- Lab Results
DROP POLICY IF EXISTS "lab_results_access" ON lab_results;
CREATE POLICY "lab_results_access" ON lab_results
    FOR ALL USING (true);  -- Vereinfacht für Demo

DO $$ BEGIN RAISE NOTICE '✅ Phase 5: RLS Policies erstellt'; END $$;

-- ============================================================================
-- PHASE 6: FUNCTIONS
-- ============================================================================

-- Updated_at Trigger Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers für updated_at
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_knowledge_items_updated_at ON knowledge_items;
CREATE TRIGGER update_knowledge_items_updated_at
    BEFORE UPDATE ON knowledge_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;
CREATE TRIGGER update_templates_updated_at
    BEFORE UPDATE ON templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Get Top Templates Function
CREATE OR REPLACE FUNCTION get_top_templates(
    p_company_id UUID,
    p_limit INTEGER DEFAULT 10,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    template_id UUID,
    template_name VARCHAR,
    category template_category,
    total_uses INTEGER,
    response_rate DECIMAL,
    conversion_rate DECIMAL,
    quality_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.category,
        COALESCE(tp.uses_last_30d, 0)::INTEGER,
        COALESCE(tp.response_rate_30d, 0),
        COALESCE(tp.conversion_rate_30d, 0),
        COALESCE(tp.quality_score, 50)
    FROM templates t
    LEFT JOIN template_performance tp ON tp.template_id = t.id
    WHERE t.company_id = p_company_id
        AND t.is_active = TRUE
    ORDER BY tp.quality_score DESC NULLS LAST, tp.uses_last_30d DESC NULLS LAST
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Template Performance Update Trigger
CREATE OR REPLACE FUNCTION update_template_performance()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.template_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    INSERT INTO template_performance (template_id, company_id, total_uses, last_used_at)
    VALUES (NEW.template_id, NEW.company_id, 1, NOW())
    ON CONFLICT (template_id) DO UPDATE SET
        total_uses = template_performance.total_uses + 1,
        total_responses = template_performance.total_responses + 
            CASE WHEN NEW.response_received THEN 1 ELSE 0 END,
        total_conversions = template_performance.total_conversions + 
            CASE WHEN NEW.converted_to_next_stage THEN 1 ELSE 0 END,
        last_used_at = NOW(),
        updated_at = NOW();
    
    UPDATE template_performance SET
        response_rate = CASE 
            WHEN total_uses > 0 THEN (total_responses::DECIMAL / total_uses) * 100 
            ELSE 0 
        END,
        conversion_rate = CASE 
            WHEN total_uses > 0 THEN (total_conversions::DECIMAL / total_uses) * 100 
            ELSE 0 
        END
    WHERE template_id = NEW.template_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_template_performance ON learning_events;
CREATE TRIGGER trigger_update_template_performance
    AFTER INSERT ON learning_events
    FOR EACH ROW
    EXECUTE FUNCTION update_template_performance();

-- Semantic Search Function
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

-- Usage Count Function
CREATE OR REPLACE FUNCTION increment_usage_count(item_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE knowledge_items 
    SET usage_count = usage_count + 1, 
        last_used_at = NOW()
    WHERE id = item_id;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN RAISE NOTICE '✅ Phase 6: Functions erstellt'; END $$;

-- ============================================================================
-- PHASE 7: SAMPLE DATA
-- ============================================================================

-- Demo Templates
INSERT INTO templates (company_id, name, category, content, target_channel, is_shared)
SELECT 
    c.id,
    'Erstkontakt - Neugierig machen',
    'first_contact'::template_category,
    'Hey {{name}}! 👋 Bin gerade auf dein Profil gestoßen und finde toll, was du machst! Wollte nur kurz Hallo sagen 😊',
    'instagram',
    true
FROM companies c WHERE c.slug = 'demo_company'
ON CONFLICT DO NOTHING;

INSERT INTO templates (company_id, name, category, content, target_channel, is_shared)
SELECT 
    c.id,
    'Follow-up nach Story',
    'follow_up'::template_category,
    'Hey {{name}}! Hab gesehen, dass du meine Story angeschaut hast 👀 Was hat dich neugierig gemacht?',
    'instagram',
    true
FROM companies c WHERE c.slug = 'demo_company'
ON CONFLICT DO NOTHING;

INSERT INTO templates (company_id, name, category, content, target_channel, is_shared)
SELECT 
    c.id,
    'Terminvereinbarung',
    'closing'::template_category,
    'Super, dass dich das interessiert! 🙌 Wann passt es dir diese Woche für einen kurzen Call? 15-20 Min reichen völlig.',
    'whatsapp',
    true
FROM companies c WHERE c.slug = 'demo_company'
ON CONFLICT DO NOTHING;

INSERT INTO templates (company_id, name, category, content, target_channel, is_shared)
SELECT 
    c.id,
    'Einwand: Keine Zeit',
    'objection_handler'::template_category,
    'Verstehe total! Gerade deshalb ist das so spannend - dauert wirklich nur 15 Minuten und du siehst, ob es für dich passt. Wann wäre ein Slot diese Woche möglich?',
    'whatsapp',
    true
FROM companies c WHERE c.slug = 'demo_company'
ON CONFLICT DO NOTHING;

INSERT INTO templates (company_id, name, category, content, target_channel, is_shared)
SELECT 
    c.id,
    'Reaktivierung - Warm Lead',
    'reactivation'::template_category,
    'Hey {{name}}! 👋 Lang nichts gehört - wie gehts dir? Hab mich neulich an unser Gespräch erinnert...',
    'instagram',
    true
FROM companies c WHERE c.slug = 'demo_company'
ON CONFLICT DO NOTHING;

DO $$ BEGIN RAISE NOTICE '✅ Phase 7: Demo-Daten erstellt'; END $$;

-- ============================================================================
-- DEPLOYMENT COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║  🎉 DEPLOYMENT ERFOLGREICH!                                    ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Erstellte Tabellen:';
    RAISE NOTICE '   • companies';
    RAISE NOTICE '   • knowledge_items';
    RAISE NOTICE '   • knowledge_embeddings';
    RAISE NOTICE '   • health_pro_profiles';
    RAISE NOTICE '   • lab_results';
    RAISE NOTICE '   • templates';
    RAISE NOTICE '   • learning_events';
    RAISE NOTICE '   • learning_aggregates';
    RAISE NOTICE '   • template_performance';
    RAISE NOTICE '   • leads';
    RAISE NOTICE '   • profiles';
    RAISE NOTICE '   • user_profiles';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Erstellte Functions:';
    RAISE NOTICE '   • get_top_templates(company_id, limit, days)';
    RAISE NOTICE '   • search_knowledge_semantic(embedding, ...)';
    RAISE NOTICE '   • increment_usage_count(item_id)';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Nächste Schritte:';
    RAISE NOTICE '   1. Backend neu starten: uvicorn app.main:app --reload';
    RAISE NOTICE '   2. API testen: http://localhost:8000/api/v1/analytics/templates';
    RAISE NOTICE '';
END $$;

SELECT '🎉 Sales Flow AI - Learning & Knowledge System erfolgreich deployed!' as status;


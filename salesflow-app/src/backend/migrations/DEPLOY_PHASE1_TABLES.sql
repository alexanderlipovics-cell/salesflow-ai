-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  PHASE 1: EXTENSIONS & BASIS-TABELLEN                                      ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- Extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE knowledge_domain AS ENUM ('evidence', 'company', 'vertical', 'generic');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE knowledge_type AS ENUM (
        'study_summary', 'meta_analysis', 'health_claim', 'guideline',
        'company_overview', 'product_line', 'product_detail', 'compensation_plan',
        'compliance_rule', 'faq', 'objection_handler', 'sales_script',
        'best_practice', 'psychology', 'communication', 'template_helper'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE evidence_strength AS ENUM ('high', 'moderate', 'limited', 'expert_opinion');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE learning_event_type AS ENUM (
        'template_used', 'template_edited', 'response_received',
        'positive_outcome', 'negative_outcome', 'objection_handled', 'follow_up_sent'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE outcome_type AS ENUM (
        'appointment_booked', 'deal_closed', 'info_sent', 'follow_up_scheduled',
        'objection_overcome', 'no_response', 'rejected', 'ghosted'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE template_category AS ENUM (
        'first_contact', 'follow_up', 'reactivation', 'objection_handler',
        'closing', 'appointment_booking', 'info_request', 'custom'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- COMPANIES
-- ============================================================================

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

INSERT INTO companies (slug, name, vertical_id, is_verified)
VALUES ('demo_company', 'Demo Company', 'network_marketing', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- LEADS
-- ============================================================================

CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    user_id UUID,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    instagram_handle TEXT,
    whatsapp_number TEXT,
    status TEXT DEFAULT 'new',
    temperature TEXT DEFAULT 'cold',
    source TEXT,
    source_details TEXT,
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    last_contact_at TIMESTAMPTZ,
    next_follow_up_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TEMPLATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_by UUID,
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

-- ============================================================================
-- TEMPLATE PERFORMANCE
-- ============================================================================

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

-- ============================================================================
-- LEARNING EVENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS learning_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
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

-- ============================================================================
-- LEARNING AGGREGATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS learning_aggregates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    aggregate_type VARCHAR(20) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    template_category template_category,
    user_id UUID,
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

-- ============================================================================
-- KNOWLEDGE ITEMS
-- ============================================================================

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
    superseded_by UUID,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID,
    verified_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- KNOWLEDGE EMBEDDINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS knowledge_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_item_id UUID NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
    embedding vector(1536),
    embedding_model TEXT DEFAULT 'text-embedding-3-small',
    chunk_index INTEGER DEFAULT 0,
    chunk_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

SELECT '✅ PHASE 1 COMPLETE: Alle Tabellen erstellt!' as status;


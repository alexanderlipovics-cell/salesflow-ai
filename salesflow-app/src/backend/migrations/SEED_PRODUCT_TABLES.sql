-- PRODUCT KNOWLEDGE TABLES
-- Tabellen für Company-Daten, Products, Stories, Guardrails

-- 1. COMPANIES
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    vertical TEXT DEFAULT 'network_marketing',
    description TEXT,
    website TEXT,
    compliance_level TEXT DEFAULT 'normal',
    brand_config JSONB DEFAULT '{}',
    chief_prompt TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);

-- 2. PRODUCTS
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    tagline TEXT,
    description_short TEXT,
    description_full TEXT,
    key_benefits TEXT[],
    how_to_use TEXT,
    how_to_explain TEXT,
    common_objections TEXT[],
    price_hint TEXT,
    subscription_available BOOLEAN DEFAULT false,
    science_summary TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_products_company ON products(company_id);

-- 3. BRAND STORIES
CREATE TABLE IF NOT EXISTS brand_stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    story_type TEXT NOT NULL,
    audience TEXT DEFAULT 'consumer',
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    use_case TEXT,
    channel_hints TEXT[],
    tags TEXT[],
    source_document TEXT,
    source_page TEXT,
    usage_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_brand_stories_company ON brand_stories(company_id);

-- 4. COMPLIANCE GUARDRAILS
CREATE TABLE IF NOT EXISTS compliance_guardrails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    rule_name TEXT NOT NULL,
    rule_description TEXT,
    severity TEXT DEFAULT 'warn',
    trigger_patterns TEXT[],
    replacement_suggestion TEXT,
    example_bad TEXT,
    example_good TEXT,
    applies_to TEXT[],
    legal_reference TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, rule_name)
);

-- RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_guardrails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Companies viewable" ON companies;
CREATE POLICY "Companies viewable" ON companies FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Products viewable" ON products;
CREATE POLICY "Products viewable" ON products FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Stories viewable" ON brand_stories;
CREATE POLICY "Stories viewable" ON brand_stories FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "Guardrails viewable" ON compliance_guardrails;
CREATE POLICY "Guardrails viewable" ON compliance_guardrails FOR SELECT USING (is_active = true);

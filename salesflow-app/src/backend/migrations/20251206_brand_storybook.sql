-- ============================================================================
-- BRAND STORYBOOK SYSTEM
-- Company Knowledge, Compliance, Sales Stories
-- Migration: 20251206_brand_storybook.sql
-- ============================================================================

-- ===================
-- COMPANY ERWEITERN
-- ===================

ALTER TABLE companies ADD COLUMN IF NOT EXISTS 
    brand_config JSONB DEFAULT '{}';
    -- {
    --   "primary_color": "#1E3A5F",
    --   "logo_url": "...",
    --   "country": "SE",
    --   "founded_year": 2005,
    --   "business_model": "network_marketing",
    --   "product_focus": ["omega3", "gut_health", "skin_care"]
    -- }

ALTER TABLE companies ADD COLUMN IF NOT EXISTS 
    compliance_level TEXT DEFAULT 'strict';
    -- 'strict': Health/MLM (Zinzino, Herbalife)
    -- 'moderate': Coaching, Services
    -- 'standard': Normal Products

ALTER TABLE companies ADD COLUMN IF NOT EXISTS 
    storybook_imported BOOLEAN DEFAULT false;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS 
    storybook_imported_at TIMESTAMPTZ;

-- ===================
-- STORY TYPES
-- ===================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'story_type') THEN
        CREATE TYPE story_type AS ENUM (
            'elevator_pitch',        -- 30 Sekunden
            'short_story',           -- 1-2 Minuten
            'founder_story',         -- Gründer-Geschichte
            'product_story',         -- Produkt-Erklärung
            'why_story',             -- Warum dieses Unternehmen?
            'objection_story',       -- Einwand-Antwort als Story
            'success_story',         -- Erfolgsgeschichte
            'science_story'          -- Wissenschaft erklärt
        );
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'story_audience') THEN
        CREATE TYPE story_audience AS ENUM (
            'consumer',              -- Endkunde
            'business_partner',      -- Potentieller Partner
            'health_professional',   -- Arzt/Therapeut
            'skeptic',               -- Skeptiker/Kritiker
            'warm_contact',          -- Warmer Kontakt
            'cold_contact'           -- Kalter Kontakt
        );
    END IF;
END $$;

-- ===================
-- COMPANY STORIES
-- ===================

CREATE TABLE IF NOT EXISTS company_stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Story-Typ & Zielgruppe
    story_type story_type NOT NULL,
    audience story_audience NOT NULL DEFAULT 'consumer',
    
    -- Inhalt
    title TEXT NOT NULL,
    subtitle TEXT,
    
    -- Verschiedene Längen
    content_30s TEXT,           -- 30 Sekunden Version
    content_1min TEXT,          -- 1 Minute Version
    content_2min TEXT,          -- 2 Minuten Version
    content_full TEXT,          -- Vollständig
    
    -- Kontext
    use_case TEXT,              -- Wann nutzen?
    channel_hints TEXT[],       -- ['instagram', 'whatsapp', 'call']
    
    -- Tags für Suche
    tags TEXT[],
    keywords TEXT[],
    
    -- Performance (optional)
    times_used INTEGER DEFAULT 0,
    effectiveness_score NUMERIC(3,2),
    
    -- Quelle
    source_document TEXT,       -- z.B. "Brand-Storybook-2024.pdf"
    source_page TEXT,           -- z.B. "S. 6-7"
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================
-- COMPANY PRODUCTS
-- ===================

CREATE TABLE IF NOT EXISTS company_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Produkt-Info
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    category TEXT,              -- 'supplements', 'skincare', 'tests', 'bundles'
    
    -- Beschreibungen
    tagline TEXT,               -- Kurz-Slogan
    description_short TEXT,     -- 1-2 Sätze
    description_full TEXT,      -- Vollständig
    
    -- Key Benefits (für CHIEF)
    key_benefits TEXT[],
    
    -- Wissenschaft (für Health-Produkte)
    science_summary TEXT,
    studies_referenced TEXT[],
    
    -- Preis (optional)
    price_hint TEXT,            -- z.B. "ab 49€/Monat"
    subscription_available BOOLEAN DEFAULT false,
    
    -- Bilder/Links
    image_url TEXT,
    product_url TEXT,
    
    -- Für CHIEF
    how_to_explain TEXT,        -- Wie erklärt man das Produkt?
    common_objections TEXT[],   -- Typische Einwände
    
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(company_id, slug)
);

-- ===================
-- GUARDRAIL SEVERITY
-- ===================

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'guardrail_severity') THEN
        CREATE TYPE guardrail_severity AS ENUM (
            'block',         -- Komplett verhindern
            'warn',          -- Warnen, aber erlauben
            'suggest'        -- Bessere Alternative vorschlagen
        );
    END IF;
END $$;

-- ===================
-- COMPLIANCE GUARDRAILS
-- ===================

CREATE TABLE IF NOT EXISTS company_guardrails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    -- NULL = gilt für alle Companies dieses Verticals
    
    vertical TEXT,              -- 'network_marketing', 'health', 'coaching'
    
    -- Regel
    rule_name TEXT NOT NULL,
    rule_description TEXT NOT NULL,
    
    -- Severity
    severity guardrail_severity NOT NULL DEFAULT 'warn',
    
    -- Patterns die getriggert werden
    trigger_patterns TEXT[],    -- Regex oder Keywords
    -- z.B. ["heilt", "garantiert", "100%", "schnell reich"]
    
    -- Was stattdessen?
    replacement_suggestion TEXT,
    example_bad TEXT,
    example_good TEXT,
    
    -- Kontext
    applies_to TEXT[],          -- ['messages', 'posts', 'ads', 'all']
    
    -- Referenz
    legal_reference TEXT,       -- z.B. "HCVO Art. 10", "UWG §5"
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================
-- STORYBOOK IMPORTS
-- ===================

CREATE TABLE IF NOT EXISTS storybook_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    
    -- Datei
    file_name TEXT NOT NULL,
    file_url TEXT,
    file_type TEXT,             -- 'pdf', 'docx', 'notion'
    
    -- Processing
    status TEXT DEFAULT 'pending',
    -- 'pending', 'processing', 'completed', 'failed'
    
    -- Ergebnisse
    extracted_stories INTEGER DEFAULT 0,
    extracted_products INTEGER DEFAULT 0,
    extracted_guardrails INTEGER DEFAULT 0,
    
    -- Raw Data (für Debugging)
    raw_extraction JSONB,
    
    error_message TEXT,
    
    processed_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- ===================
-- INDEXES
-- ===================

CREATE INDEX IF NOT EXISTS idx_stories_company ON company_stories(company_id);
CREATE INDEX IF NOT EXISTS idx_stories_type ON company_stories(story_type);
CREATE INDEX IF NOT EXISTS idx_stories_audience ON company_stories(audience);
CREATE INDEX IF NOT EXISTS idx_stories_tags ON company_stories USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_products_company ON company_products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON company_products(category);

CREATE INDEX IF NOT EXISTS idx_guardrails_company ON company_guardrails(company_id);
CREATE INDEX IF NOT EXISTS idx_guardrails_vertical ON company_guardrails(vertical);
CREATE INDEX IF NOT EXISTS idx_guardrails_patterns ON company_guardrails USING GIN(trigger_patterns);

CREATE INDEX IF NOT EXISTS idx_storybook_imports_company ON storybook_imports(company_id);
CREATE INDEX IF NOT EXISTS idx_storybook_imports_status ON storybook_imports(status);

-- ===================
-- RLS POLICIES
-- ===================

ALTER TABLE company_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_guardrails ENABLE ROW LEVEL SECURITY;
ALTER TABLE storybook_imports ENABLE ROW LEVEL SECURITY;

-- Stories: Alle User der Company können lesen
DROP POLICY IF EXISTS "Company members can view stories" ON company_stories;
CREATE POLICY "Company members can view stories" ON company_stories
    FOR SELECT USING (
        company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    );

-- Products: Alle User der Company können lesen
DROP POLICY IF EXISTS "Company members can view products" ON company_products;
CREATE POLICY "Company members can view products" ON company_products
    FOR SELECT USING (
        company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    );

-- Guardrails: Alle können lesen (auch generische)
DROP POLICY IF EXISTS "All can view guardrails" ON company_guardrails;
CREATE POLICY "All can view guardrails" ON company_guardrails
    FOR SELECT USING (true);

-- Imports: Nur eigene Company
DROP POLICY IF EXISTS "Company members can view imports" ON storybook_imports;
CREATE POLICY "Company members can view imports" ON storybook_imports
    FOR SELECT USING (
        company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    );

-- Admins können alles
DROP POLICY IF EXISTS "Admins manage stories" ON company_stories;
CREATE POLICY "Admins manage stories" ON company_stories
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Admins manage products" ON company_products;
CREATE POLICY "Admins manage products" ON company_products
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Admins manage guardrails" ON company_guardrails;
CREATE POLICY "Admins manage guardrails" ON company_guardrails
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

DROP POLICY IF EXISTS "Admins manage imports" ON storybook_imports;
CREATE POLICY "Admins manage imports" ON storybook_imports
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    );

-- ===================
-- UPDATED_AT TRIGGER
-- ===================

CREATE OR REPLACE FUNCTION update_company_stories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_company_stories_updated_at ON company_stories;
CREATE TRIGGER trigger_update_company_stories_updated_at
    BEFORE UPDATE ON company_stories
    FOR EACH ROW
    EXECUTE FUNCTION update_company_stories_updated_at();

-- ===================
-- HELPER FUNCTIONS
-- ===================

-- Funktion: Story für Kontext finden
CREATE OR REPLACE FUNCTION get_relevant_story(
    p_company_id UUID,
    p_story_type story_type DEFAULT NULL,
    p_audience story_audience DEFAULT NULL,
    p_tags TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    title TEXT,
    content_30s TEXT,
    content_1min TEXT,
    content_2min TEXT,
    content_full TEXT,
    use_case TEXT,
    story_type story_type,
    audience story_audience
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cs.id,
        cs.title,
        cs.content_30s,
        cs.content_1min,
        cs.content_2min,
        cs.content_full,
        cs.use_case,
        cs.story_type,
        cs.audience
    FROM company_stories cs
    WHERE cs.company_id = p_company_id
      AND cs.is_active = true
      AND (p_story_type IS NULL OR cs.story_type = p_story_type)
      AND (p_audience IS NULL OR cs.audience = p_audience)
      AND (p_tags IS NULL OR cs.tags && p_tags)
    ORDER BY cs.times_used DESC, cs.created_at DESC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- Funktion: Compliance Check
CREATE OR REPLACE FUNCTION check_text_compliance(
    p_text TEXT,
    p_company_id UUID DEFAULT NULL,
    p_vertical TEXT DEFAULT NULL
)
RETURNS TABLE (
    rule_name TEXT,
    severity guardrail_severity,
    description TEXT,
    example_good TEXT,
    matched_pattern TEXT
) AS $$
DECLARE
    guardrail RECORD;
    pattern TEXT;
BEGIN
    FOR guardrail IN 
        SELECT * FROM company_guardrails cg
        WHERE cg.is_active = true
          AND (p_company_id IS NULL OR cg.company_id = p_company_id OR cg.company_id IS NULL)
          AND (p_vertical IS NULL OR cg.vertical = p_vertical OR cg.vertical IS NULL)
    LOOP
        IF guardrail.trigger_patterns IS NOT NULL THEN
            FOREACH pattern IN ARRAY guardrail.trigger_patterns
            LOOP
                BEGIN
                    IF p_text ~* pattern THEN
                        rule_name := guardrail.rule_name;
                        severity := guardrail.severity;
                        description := guardrail.rule_description;
                        example_good := guardrail.example_good;
                        matched_pattern := pattern;
                        RETURN NEXT;
                        EXIT; -- One match per rule is enough
                    END IF;
                EXCEPTION WHEN OTHERS THEN
                    -- Invalid regex, skip
                    CONTINUE;
                END;
            END LOOP;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ===================
-- COMMENTS
-- ===================

COMMENT ON TABLE company_stories IS 'Sales Stories und Elevator Pitches pro Company';
COMMENT ON TABLE company_products IS 'Produkt-Katalog mit CHIEF-optimierten Beschreibungen';
COMMENT ON TABLE company_guardrails IS 'Compliance-Regeln und verbotene Formulierungen';
COMMENT ON TABLE storybook_imports IS 'Import-Log für Brand-Storybooks';

COMMENT ON COLUMN company_stories.content_30s IS '30-Sekunden Elevator Pitch Version';
COMMENT ON COLUMN company_stories.content_1min IS '1-Minute Story Version';
COMMENT ON COLUMN company_stories.content_2min IS '2-Minuten ausführliche Version';
COMMENT ON COLUMN company_stories.channel_hints IS 'Empfohlene Kanäle: instagram, whatsapp, call, etc.';

COMMENT ON COLUMN company_products.how_to_explain IS 'Anleitung für CHIEF wie das Produkt erklärt werden soll';
COMMENT ON COLUMN company_products.common_objections IS 'Typische Einwände zu diesem Produkt';

COMMENT ON COLUMN company_guardrails.severity IS 'block=verhindern, warn=warnen, suggest=Alternative vorschlagen';
COMMENT ON COLUMN company_guardrails.trigger_patterns IS 'Regex-Patterns die die Regel triggern';

-- ===================
-- SUCCESS MESSAGE
-- ===================

DO $$
BEGIN
    RAISE NOTICE '✅ Brand Storybook System erfolgreich installiert!';
    RAISE NOTICE '   - company_stories Tabelle erstellt';
    RAISE NOTICE '   - company_products Tabelle erstellt';
    RAISE NOTICE '   - company_guardrails Tabelle erstellt';
    RAISE NOTICE '   - storybook_imports Tabelle erstellt';
    RAISE NOTICE '   - RLS Policies aktiviert';
    RAISE NOTICE '   - Helper Functions erstellt';
END $$;


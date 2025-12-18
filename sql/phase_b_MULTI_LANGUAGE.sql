-- ====================================================================
-- SALES FLOW AI - PHASE B: MULTI-LANGUAGE ARCHITECTURE
-- ====================================================================
-- Basierend auf Gemini Output: Waterfall Content Selection
-- Integration mit Phase A Analytics System
-- ====================================================================

-- ====================================================================
-- 1. CREATE ENUMS
-- ====================================================================

CREATE TYPE app_language AS ENUM ('de', 'en', 'es', 'fr', 'pt', 'it', 'nl', 'pl', 'ru', 'ja', 'zh', 'ko', 'ar', 'tr');
CREATE TYPE content_category AS ENUM ('objection', 'invite', 'closing', 'followup', 'reactivation', 'onboarding', 'training');
CREATE TYPE content_tone AS ENUM ('direct', 'soft', 'enthusiastic', 'professional', 'casual', 'formal');

-- ====================================================================
-- 2. SALES TEMPLATES TABLE (MULTI-LANGUAGE CONTENT)
-- ====================================================================

CREATE TABLE public.sales_templates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- ============================================================
    -- HIERARCHIE-LOGIK (Waterfall Pattern)
    -- ============================================================
    company_id UUID REFERENCES public.mlm_companies(id) ON DELETE CASCADE,  
    -- NULL = Global Fallback für alle Firmen
    
    language_code app_language NOT NULL,              
    -- ISO 639-1: 'de', 'en', 'es'
    
    region_code VARCHAR(2),                           
    -- ISO 3166-1: 'DE', 'AT', 'CH', 'US', 'UK', etc.
    -- NULL = Gilt für alle Regionen dieser Sprache
    
    -- ============================================================
    -- KATEGORISIERUNG & IDENTIFIKATION
    -- ============================================================
    category content_category NOT NULL,
    -- 'objection', 'invite', 'closing', 'followup', 'reactivation'
    
    key_identifier VARCHAR(100) NOT NULL,
    -- Eindeutiger Key: 'pyramid_scheme', 'no_time', 'too_expensive'
    
    sub_category VARCHAR(50),
    -- Optional: 'trust', 'price', 'time', 'product'
    
    -- ============================================================
    -- AI-NATIVE CONTENT (JSONB for Flexibility)
    -- ============================================================
    content JSONB NOT NULL,
    /*
    STRUKTUR:
    {
      "label": "Ist das ein Schneeballsystem?",
      "ai_instruction": "Lead ist skeptisch bzgl. Legalität. Vermeide defensive Sprache. Fokus auf IHK-Eintrag und Produktverkauf.",
      "compliance_warning": "Niemals garantierte Einnahmen versprechen (§ UWG).",
      "scripts": [
        {
          "tone": "direct",
          "text": "Ich verstehe die Frage, das dachte ich zuerst auch. Schneeballsysteme sind illegal, weil kein echtes Produkt fließt. Wir sind bei der IHK eingetragen und verkaufen echte Produkte..."
        },
        {
          "tone": "soft",  
          "text": "Wichtige Frage. Hast du schlechte Erfahrungen gemacht oder meinst du die Struktur?"
        }
      ],
      "followup_suggestions": [
        "Möchtest du dir unseren IHK-Eintrag ansehen?",
        "Darf ich dir erklären wie das Vergütungssystem funktioniert?"
      ],
      "related_objections": ["too_good_to_be_true", "friends_family_pressure"],
      "meta": {
        "difficulty": "medium",
        "success_rate": 0.67,
        "avg_conversion_time_hours": 48
      }
    }
    */
    
    -- ============================================================
    -- METADATA & STATUS
    -- ============================================================
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'testing', 'paused', 'archived')),
    
    version INTEGER DEFAULT 1,
    -- Für Versionierung: template_v1, template_v2
    
    is_ai_generated BOOLEAN DEFAULT false,
    -- True wenn AI-generiert, false wenn human-created
    
    requires_compliance_review BOOLEAN DEFAULT false,
    -- True für Templates die legal review brauchen
    
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    
    -- ============================================================
    -- ANALYTICS INTEGRATION
    -- ============================================================
    times_used INTEGER DEFAULT 0,
    times_successful INTEGER DEFAULT 0,
    avg_response_time_hours DECIMAL(10,2),
    
    -- ============================================================
    -- TAGS & SEARCH
    -- ============================================================
    tags TEXT[],
    search_vector tsvector,
    
    -- ============================================================
    -- CONSTRAINTS
    -- ============================================================
    CONSTRAINT unique_content_hierarchy 
      UNIQUE NULLS NOT DISTINCT (company_id, language_code, region_code, category, key_identifier, version)
);

-- ====================================================================
-- 3. INDEXES FOR PERFORMANCE
-- ====================================================================

-- A. HIERARCHIE-INDEX (Wichtigster Index!)
CREATE INDEX idx_templates_hierarchy 
ON public.sales_templates (category, key_identifier, language_code, company_id NULLS LAST, region_code NULLS LAST);

-- B. JSONB GIN INDEX (AI Search in Content)
CREATE INDEX idx_templates_content_gin 
ON public.sales_templates USING gin (content);

-- C. PARTIAL INDEX FÜR GLOBALS (80% Traffic)
CREATE INDEX idx_templates_globals 
ON public.sales_templates (language_code, key_identifier, category) 
WHERE company_id IS NULL;

-- D. FULL-TEXT SEARCH INDEX
CREATE INDEX idx_templates_search 
ON public.sales_templates USING gin (search_vector);

-- E. STATUS INDEX (Nur aktive Templates)
CREATE INDEX idx_templates_active 
ON public.sales_templates (status) 
WHERE status = 'active';

-- F. COMPANY-SPECIFIC INDEX
CREATE INDEX idx_templates_company 
ON public.sales_templates (company_id, language_code) 
WHERE company_id IS NOT NULL;

-- ====================================================================
-- 4. SMART SELECTOR VIEW (Waterfall Logic)
-- ====================================================================

CREATE OR REPLACE VIEW view_active_templates AS
SELECT DISTINCT ON (category, key_identifier, language_code)
    id,
    company_id,
    language_code,
    region_code,
    category,
    key_identifier,
    sub_category,
    content,
    status,
    version,
    times_used,
    times_successful,
    tags,
    created_at,
    updated_at
FROM 
    public.sales_templates
WHERE 
    status = 'active'
ORDER BY 
    category, 
    key_identifier, 
    language_code,
    -- PRIORISIERUNGS-LOGIK (Spezifische Werte vor NULLs)
    company_id NULLS LAST, 
    region_code NULLS LAST,
    -- Bei gleicher Hierarchie: Neueste Version
    version DESC,
    -- Bei gleicher Version: Am häufigsten erfolgreich
    (times_successful::DECIMAL / NULLIF(times_used, 0)) DESC NULLS LAST;

COMMENT ON VIEW view_active_templates IS 
'Smart Content Selector: Gibt spezifischstes verfügbares Template zurück (Firma+Sprache+Region → Firma+Sprache → Global+Sprache+Region → Global+Sprache)';

-- ====================================================================
-- 5. USER CONTENT VIEW (RLS-Ready)
-- ====================================================================

CREATE OR REPLACE FUNCTION get_user_templates(
    p_user_id UUID,
    p_category content_category DEFAULT NULL,
    p_region VARCHAR(2) DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    category content_category,
    key_identifier VARCHAR(100),
    content JSONB,
    is_company_specific BOOLEAN,
    priority INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_company_id UUID;
    v_language app_language;
    v_region VARCHAR(2);
BEGIN
    -- Hole User Settings (aus users Tabelle - noch zu erstellen)
    -- Placeholder: Annahme User hat company_id und language in seinem Profil
    SELECT company_id, language, region 
    INTO v_company_id, v_language, v_region
    FROM public.users 
    WHERE id = p_user_id;
    
    -- Falls Region-Parameter übergeben, überschreibe
    IF p_region IS NOT NULL THEN
        v_region := p_region;
    END IF;
    
    -- Return Templates mit Priorität
    RETURN QUERY
    SELECT 
        st.id,
        st.category,
        st.key_identifier,
        st.content,
        (st.company_id IS NOT NULL) as is_company_specific,
        CASE 
            WHEN st.company_id = v_company_id AND st.region_code = v_region THEN 1
            WHEN st.company_id = v_company_id AND st.region_code IS NULL THEN 2
            WHEN st.company_id IS NULL AND st.region_code = v_region THEN 3
            WHEN st.company_id IS NULL AND st.region_code IS NULL THEN 4
            ELSE 5
        END as priority
    FROM public.sales_templates st
    WHERE 
        st.status = 'active'
        AND st.language_code = v_language
        AND (p_category IS NULL OR st.category = p_category)
        AND (
            (st.company_id = v_company_id OR st.company_id IS NULL)
            AND (st.region_code = v_region OR st.region_code IS NULL)
        )
    ORDER BY priority, st.times_successful DESC;
END;
$$;

COMMENT ON FUNCTION get_user_templates IS 
'RLS-ready function: Holt Templates für User basierend auf company, language, region mit automatischem Fallback';

-- ====================================================================
-- 6. TRIGGERS
-- ====================================================================

-- Auto-Update Search Vector
CREATE OR REPLACE FUNCTION update_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('german', COALESCE(NEW.content->>'label', '')), 'A') ||
        setweight(to_tsvector('german', COALESCE(NEW.key_identifier, '')), 'B') ||
        setweight(to_tsvector('german', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
    
    NEW.updated_at := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_search_vector
    BEFORE INSERT OR UPDATE ON public.sales_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_search_vector();

-- ====================================================================
-- 7. SAMPLE DATA (Beispiel für Waterfall Logic)
-- ====================================================================

-- Global Fallback (Deutsch)
INSERT INTO public.sales_templates (
    company_id, language_code, region_code, category, key_identifier, content
) VALUES (
    NULL, 'de', NULL, 'objection', 'pyramid_scheme',
    '{
        "label": "Ist das ein Schneeballsystem?",
        "ai_instruction": "Lead ist skeptisch bzgl. Legalität. Vermeide defensive Sprache. Fokus auf Produktverkauf und Legalität.",
        "compliance_warning": "Niemals garantierte Einnahmen versprechen.",
        "scripts": [
            {
                "tone": "direct",
                "text": "Ich verstehe die Frage, das dachte ich zuerst auch. Schneeballsysteme sind illegal, weil kein echtes Produkt fließt. Wir verkaufen echte Produkte und sind bei der IHK eingetragen."
            },
            {
                "tone": "soft",
                "text": "Wichtige Frage. Hast du schlechte Erfahrungen gemacht oder meinst du die Struktur?"
            }
        ],
        "followup_suggestions": [
            "Möchtest du dir unseren IHK-Eintrag ansehen?",
            "Darf ich dir erklären wie das Vergütungssystem funktioniert?"
        ]
    }'::jsonb
);

-- Herbalife-spezifisch (Deutsch, strengere Compliance)
INSERT INTO public.sales_templates (
    company_id, language_code, region_code, category, key_identifier, content
) 
SELECT 
    id, 'de', NULL, 'objection', 'pyramid_scheme',
    '{
        "label": "Ist Herbalife ein Schneeballsystem?",
        "ai_instruction": "Betone NYSE-Listing und 44+ Jahre Geschichte. Zeige Mark Hughes Vision. Vermeide Einkommens-Claims.",
        "compliance_warning": "CRITICAL: Herbalife Compliance - Keine Income Claims ohne Disclaimer!",
        "scripts": [
            {
                "tone": "professional",
                "text": "Herbalife ist seit 44 Jahren erfolgreich am Markt und an der NYSE gelistet (HLF). Ein Schneeballsystem hätte das niemals geschafft. Wir verkaufen Ernährungsprodukte in über 90 Ländern."
            }
        ],
        "followup_suggestions": [
            "Möchtest du die NYSE-Listing Informationen sehen?",
            "Darf ich dir unsere Statement of Average Gross Compensation zeigen?"
        ],
        "meta": {
            "compliance_level": "strict",
            "requires_disclaimer": true
        }
    }'::jsonb
FROM public.mlm_companies 
WHERE name = 'Herbalife'
LIMIT 1;

-- Zinzino-spezifisch (Deutsch, Produkt-Fokus)
INSERT INTO public.sales_templates (
    company_id, language_code, region_code, category, key_identifier, content
)
SELECT 
    id, 'de', NULL, 'objection', 'pyramid_scheme',
    '{
        "label": "Ist Zinzino ein Schneeballsystem?",
        "ai_instruction": "Fokus auf BalanceTest und wissenschaftlichen Ansatz. Betone Norwegen-Herkunft und Premium-Positionierung.",
        "compliance_warning": "Zinzino: Immer BalanceTest als Differentiator nutzen.",
        "scripts": [
            {
                "tone": "enthusiastic",
                "text": "Zinzino ist ein norwegisches Gesundheitsunternehmen mit einem einzigartigen Ansatz: Der BalanceTest zeigt objektiv deine Omega-6/3-Balance. Wir verkaufen Premium-Supplements basierend auf wissenschaftlichen Tests, nicht auf leeren Versprechen."
            }
        ],
        "followup_suggestions": [
            "Möchtest du einen kostenlosen BalanceTest machen?",
            "Darf ich dir die Studie von der Universität Oslo zeigen?"
        ],
        "meta": {
            "unique_selling_point": "BalanceTest",
            "product_focus": true
        }
    }'::jsonb
FROM public.mlm_companies 
WHERE name = 'Zinzino'
LIMIT 1;

-- ====================================================================
-- 8. VERIFICATION QUERIES
-- ====================================================================

-- Zeige Waterfall Logic in Action
SELECT 
    'Waterfall Test - Pyramid Scheme Objection (Deutsch)' as test_case,
    company_id,
    language_code,
    region_code,
    key_identifier,
    content->>'label' as label,
    CASE 
        WHEN company_id IS NOT NULL AND region_code IS NOT NULL THEN 'Level 1: Company + Region'
        WHEN company_id IS NOT NULL AND region_code IS NULL THEN 'Level 2: Company Only'
        WHEN company_id IS NULL AND region_code IS NOT NULL THEN 'Level 3: Global + Region'
        WHEN company_id IS NULL AND region_code IS NULL THEN 'Level 4: Global Fallback'
    END as priority_level
FROM public.sales_templates
WHERE key_identifier = 'pyramid_scheme' AND language_code = 'de'
ORDER BY 
    company_id NULLS LAST,
    region_code NULLS LAST;

-- Test View
SELECT * FROM view_active_templates 
WHERE key_identifier = 'pyramid_scheme' AND language_code = 'de'
LIMIT 5;

-- ====================================================================
-- SUCCESS MESSAGE
-- ====================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ PHASE B INSTALLATION COMPLETE!';
    RAISE NOTICE '✅ Multi-Language Architecture LIVE';
    RAISE NOTICE '✅ Waterfall Content Selection aktiv';
    RAISE NOTICE '✅ 3 Sample Templates inserted (Global + Herbalife + Zinzino)';
    RAISE NOTICE '';
    RAISE NOTICE '🌍 READY FOR GLOBAL EXPANSION!';
    RAISE NOTICE '🎯 Next: Migrate JSON Files to Database';
END $$;

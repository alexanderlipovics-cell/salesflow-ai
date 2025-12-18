-- ====================================================================
-- SALES FLOW AI - PHASE B: MULTI-LANGUAGE ARCHITECTURE (INTEGRATED)
-- ====================================================================
-- Kombiniert: Gemini Waterfall Logic + GPT Analytics + Meine Extensions
-- Ready for Global Expansion (14 Languages)
-- ====================================================================

-- ====================================================================
-- 1. CREATE ENUMS (Type Safety)
-- ====================================================================

-- Sprachen (ISO 639-1)
CREATE TYPE app_language AS ENUM (
  'de', -- Deutsch
  'en', -- English
  'es', -- Español
  'fr', -- Français
  'pt', -- Português
  'it', -- Italiano
  'nl', -- Nederlands
  'pl', -- Polski
  'ru', -- Русский
  'ja', -- 日本語
  'zh', -- 中文
  'ko', -- 한국어
  'ar', -- العربية
  'tr'  -- Türkçe
);

-- Content-Kategorien
CREATE TYPE content_category AS ENUM (
  'objection',    -- Einwandbehandlung
  'template',     -- Message Templates
  'playbook',     -- Sales Playbooks
  'script',       -- Gesprächsleitfaden
  'training'      -- Training Content
);

-- Tonalität
CREATE TYPE content_tone AS ENUM (
  'direct',       -- Direkt
  'soft',         -- Sanft
  'enthusiastic', -- Begeistert
  'professional', -- Professionell
  'casual',       -- Locker
  'formal'        -- Formell
);

-- ====================================================================
-- 2. SALES CONTENT TABLE (Master Content Store)
-- ====================================================================

CREATE TABLE sales_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- ============================================================
  -- WATERFALL HIERARCHIE (Gemini Pattern)
  -- ============================================================
  company_id UUID,  -- NULL = Global Fallback für alle Firmen
  -- WICHTIG: Keine REFERENCES hier, weil mlm_companies in Phase A nicht erstellt wurde
  -- In Production: REFERENCES mlm_companies(id) ON DELETE CASCADE
  
  language_code app_language NOT NULL,  -- ISO 639-1: 'de', 'en', 'es'
  region_code CHAR(2),                   -- ISO 3166-1: 'DE', 'AT', 'CH', NULL = Alle Regionen
  
  -- ============================================================
  -- KATEGORISIERUNG & IDENTIFIKATION
  -- ============================================================
  type content_category NOT NULL,
  key_identifier VARCHAR(100) NOT NULL,  -- 'pyramid_scheme', 'no_time', 'cold_intro_01'
  sub_category VARCHAR(50),              -- Optional: 'trust', 'price', 'time'
  
  -- ============================================================
  -- AI-NATIVE CONTENT (JSONB for Flexibility)
  -- ============================================================
  payload JSONB NOT NULL,
  /*
  BEISPIEL STRUKTUR:
  {
    "label": "Ist das ein Schneeballsystem?",
    "ai_instruction": "Lead ist skeptisch bzgl. Legalität. Vermeide defensive Sprache. Fokus auf IHK-Eintrag und Produktverkauf.",
    "compliance_warning": "Niemals garantierte Einnahmen versprechen (§ UWG).",
    "scripts": [
      {
        "tone": "direct",
        "text": "Ich verstehe die Frage, das dachte ich zuerst auch. Schneeballsysteme sind illegal..."
      },
      {
        "tone": "soft",
        "text": "Wichtige Frage. Hast du schlechte Erfahrungen gemacht?"
      }
    ],
    "followup_suggestions": [
      "Möchtest du dir unseren IHK-Eintrag ansehen?",
      "Darf ich dir erklären wie das Vergütungssystem funktioniert?"
    ],
    "related_keys": ["too_good_to_be_true", "friends_family_pressure"],
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
  is_ai_generated BOOLEAN DEFAULT false,
  requires_compliance_review BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  
  -- ============================================================
  -- ANALYTICS INTEGRATION (GPT Pattern)
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
  -- UNIQUE CONSTRAINT (Gemini Pattern - Prevents Duplicates)
  -- ============================================================
  CONSTRAINT unique_content_hierarchy 
    UNIQUE NULLS NOT DISTINCT (company_id, language_code, region_code, type, key_identifier, version)
);

-- ====================================================================
-- 3. INDEXES FOR PERFORMANCE (Sub-100ms Goal)
-- ====================================================================

-- A. HIERARCHIE-INDEX (Wichtigster Index für Waterfall!)
CREATE INDEX idx_content_hierarchy 
ON sales_content (type, key_identifier, language_code, company_id NULLS LAST, region_code NULLS LAST);

-- B. JSONB GIN INDEX (AI Search in Content)
CREATE INDEX idx_content_payload_gin 
ON sales_content USING gin (payload);

-- C. PARTIAL INDEX FÜR GLOBALS (80% Traffic Optimization)
CREATE INDEX idx_content_globals 
ON sales_content (language_code, key_identifier, type) 
WHERE company_id IS NULL;

-- D. FULL-TEXT SEARCH INDEX
CREATE INDEX idx_content_search 
ON sales_content USING gin (search_vector);

-- E. STATUS INDEX (Nur aktive Content)
CREATE INDEX idx_content_active 
ON sales_content (status, type) 
WHERE status = 'active';

-- F. COMPANY-SPECIFIC INDEX
CREATE INDEX idx_content_company 
ON sales_content (company_id, language_code, type) 
WHERE company_id IS NOT NULL;

-- ====================================================================
-- 4. ROW LEVEL SECURITY (Gemini Security Pattern)
-- ====================================================================

-- Enable RLS
ALTER TABLE sales_content ENABLE ROW LEVEL SECURITY;

-- Policy: User sieht Globales ODER seine Firma
-- HINWEIS: Diese Policy funktioniert nur wenn du eine 'profiles' Tabelle hast
-- mit company_id und auth.uid() funktioniert
CREATE POLICY "access_relevant_content" ON sales_content
FOR SELECT USING (
  company_id IS NULL 
  -- OR company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  -- Auskommentiert weil profiles Tabelle noch nicht existiert
  -- In Production: aktivieren!
);

-- ====================================================================
-- 5. WATERFALL CONTENT SELECTION VIEW (Gemini Magic!)
-- ====================================================================

CREATE OR REPLACE VIEW v_active_content AS
SELECT DISTINCT ON (type, key_identifier, language_code)
  id,
  company_id,
  language_code,
  region_code,
  type,
  key_identifier,
  sub_category,
  payload,
  status,
  version,
  times_used,
  times_successful,
  tags,
  created_at,
  updated_at,
  -- Debug Info: Woher kommt dieser Content?
  CASE 
    WHEN company_id IS NOT NULL AND region_code IS NOT NULL THEN 'company_region_specific'
    WHEN company_id IS NOT NULL AND region_code IS NULL THEN 'company_specific'
    WHEN company_id IS NULL AND region_code IS NOT NULL THEN 'regional_global'
    WHEN company_id IS NULL AND region_code IS NULL THEN 'global_fallback'
  END as source_type
FROM sales_content
WHERE status = 'active'
ORDER BY 
  type,
  key_identifier, 
  language_code,
  -- PRIORISIERUNGS-LOGIK (Spezifische Werte gewinnen)
  company_id NULLS LAST,      -- 1. Company-Specific schlägt Global
  region_code NULLS LAST,     -- 2. Region-Specific schlägt Generic
  version DESC,               -- 3. Neueste Version
  (times_successful::DECIMAL / NULLIF(times_used, 0)) DESC NULLS LAST  -- 4. Erfolgsrate
;

COMMENT ON VIEW v_active_content IS 
'Smart Content Selector: Gibt spezifischstes verfügbares Content zurück (Company+Region → Company → Global+Region → Global)';

-- ====================================================================
-- 6. WATERFALL SELECTION FUNCTION (RPC for Frontend)
-- ====================================================================

CREATE OR REPLACE FUNCTION get_content_for_user(
  p_user_lang app_language DEFAULT 'de',
  p_user_region CHAR(2) DEFAULT NULL,
  p_user_company UUID DEFAULT NULL,
  p_content_type content_category DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  type content_category,
  key_identifier VARCHAR(100),
  payload JSONB,
  source_type TEXT,
  priority INTEGER
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sc.id,
    sc.type,
    sc.key_identifier,
    sc.payload,
    CASE 
      WHEN sc.company_id = p_user_company AND sc.region_code = p_user_region THEN 'exact_match'
      WHEN sc.company_id = p_user_company AND sc.region_code IS NULL THEN 'company_match'
      WHEN sc.company_id IS NULL AND sc.region_code = p_user_region THEN 'region_match'
      WHEN sc.company_id IS NULL AND sc.region_code IS NULL THEN 'global_fallback'
      ELSE 'no_match'
    END as source_type,
    CASE 
      WHEN sc.company_id = p_user_company AND sc.region_code = p_user_region THEN 1
      WHEN sc.company_id = p_user_company AND sc.region_code IS NULL THEN 2
      WHEN sc.company_id IS NULL AND sc.region_code = p_user_region THEN 3
      WHEN sc.company_id IS NULL AND sc.region_code IS NULL THEN 4
      ELSE 5
    END as priority
  FROM sales_content sc
  WHERE 
    sc.status = 'active'
    AND sc.language_code = p_user_lang
    AND (p_content_type IS NULL OR sc.type = p_content_type)
    AND (
      (sc.company_id = p_user_company OR sc.company_id IS NULL)
      AND (sc.region_code = p_user_region OR sc.region_code IS NULL)
    )
  ORDER BY priority, sc.times_successful DESC;
END;
$$;

COMMENT ON FUNCTION get_content_for_user IS 
'RLS-ready function: Holt Content für User basierend auf company, language, region mit automatischem Fallback';

-- ====================================================================
-- 7. SEARCH VECTOR UPDATE TRIGGER
-- ====================================================================

CREATE OR REPLACE FUNCTION update_content_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('german', COALESCE(NEW.payload->>'label', '')), 'A') ||
    setweight(to_tsvector('german', COALESCE(NEW.key_identifier, '')), 'B') ||
    setweight(to_tsvector('german', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_content_search
  BEFORE INSERT OR UPDATE ON sales_content
  FOR EACH ROW
  EXECUTE FUNCTION update_content_search_vector();

-- ====================================================================
-- 8. SAMPLE DATA (Demonstriert Waterfall Logic)
-- ====================================================================

-- 8.1 GLOBAL FALLBACK (Deutsch)
INSERT INTO sales_content (
  company_id, language_code, region_code, type, key_identifier, payload, tags
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
    ],
    "related_keys": ["too_good_to_be_true", "friends_family_pressure"]
  }'::jsonb,
  ARRAY['trust', 'legal', 'objection_handling']
);

-- 8.2 GLOBAL FALLBACK (English)
INSERT INTO sales_content (
  company_id, language_code, region_code, type, key_identifier, payload, tags
) VALUES (
  NULL, 'en', NULL, 'objection', 'pyramid_scheme',
  '{
    "label": "Is this a pyramid scheme?",
    "ai_instruction": "Lead is skeptical about legality. Avoid defensive language. Focus on product sales and legitimacy.",
    "compliance_warning": "Never promise guaranteed income.",
    "scripts": [
      {
        "tone": "professional",
        "text": "That is an important question. Pyramid schemes are illegal because they have no real product. We sell actual products and are registered as a legitimate business."
      },
      {
        "tone": "casual",
        "text": "I get why you are asking. Have you had bad experiences with MLM before?"
      }
    ],
    "followup_suggestions": [
      "Would you like to see our business registration?",
      "Can I explain how our compensation plan works?"
    ],
    "related_keys": ["too_good_to_be_true", "friends_family_pressure"]
  }'::jsonb,
  ARRAY['trust', 'legal', 'objection_handling']
);

-- 8.3 REGIONAL VARIANT (Deutsch + Österreich - andere Rechtslage)
INSERT INTO sales_content (
  company_id, language_code, region_code, type, key_identifier, payload, tags
) VALUES (
  NULL, 'de', 'AT', 'objection', 'pyramid_scheme',
  '{
    "label": "Ist das ein Schneeballsystem?",
    "ai_instruction": "In Österreich gibt es spezielle Regelungen. Erwähne Wirtschaftskammer-Eintrag statt IHK.",
    "compliance_warning": "In AT: § 168a StGB beachten - Keine Versprechen über Einnahmen.",
    "scripts": [
      {
        "tone": "direct",
        "text": "Schneeballsysteme sind in Österreich nach § 168a StGB strafbar. Wir sind bei der Wirtschaftskammer eingetragen und verkaufen echte Produkte mit nachvollziehbarem Nutzen."
      }
    ],
    "followup_suggestions": [
      "Möchtest du unseren Wirtschaftskammer-Eintrag sehen?"
    ],
    "related_keys": ["legal_austria"]
  }'::jsonb,
  ARRAY['trust', 'legal', 'objection_handling', 'austria_specific']
);

-- 8.4 BEISPIEL: Message Template (Global, Deutsch)
INSERT INTO sales_content (
  company_id, language_code, region_code, type, key_identifier, payload, tags
) VALUES (
  NULL, 'de', NULL, 'template', 'cold_intro_health_01',
  '{
    "label": "Cold Intro - Gesundheitsthema",
    "ai_instruction": "Nutze für Leads aus Instagram/TikTok die Gesundheit als Hook interessiert haben.",
    "scripts": [
      {
        "tone": "casual",
        "text": "Hey [NAME]! Ich hab gesehen du interessierst dich für [THEMA]. Ich arbeite mit einem System das mir geholfen hat [BENEFIT]. Magst du mehr erfahren?"
      },
      {
        "tone": "professional",
        "text": "Hallo [NAME], durch dein Interesse an [THEMA] bin ich auf dich aufmerksam geworden. Ich nutze ein wissenschaftlich fundiertes System für [BENEFIT]. Hätte das Interesse für dich?"
      }
    ],
    "variables": ["NAME", "THEMA", "BENEFIT"],
    "best_channels": ["instagram_dm", "whatsapp"],
    "avg_response_rate": 0.22,
    "meta": {
      "recommended_for": "cold_leads_health_interest",
      "time_of_day": "afternoon"
    }
  }'::jsonb,
  ARRAY['cold_outreach', 'health', 'instagram', 'whatsapp']
);

-- ====================================================================
-- 9. VERIFICATION QUERIES
-- ====================================================================

-- Test 1: Zeige alle Content-Typen
SELECT 
  'Content Types Overview' as test,
  type,
  language_code,
  COUNT(*) as count,
  COUNT(DISTINCT key_identifier) as unique_keys
FROM sales_content
GROUP BY type, language_code
ORDER BY type, language_code;

-- Test 2: Teste Waterfall Logic
SELECT 
  'Waterfall Test - Pyramid Scheme Objection' as test,
  key_identifier,
  language_code,
  region_code,
  company_id,
  payload->>'label' as label,
  CASE 
    WHEN company_id IS NOT NULL AND region_code IS NOT NULL THEN 'Level 1: Company + Region'
    WHEN company_id IS NOT NULL AND region_code IS NULL THEN 'Level 2: Company Only'
    WHEN company_id IS NULL AND region_code IS NOT NULL THEN 'Level 3: Global + Region'
    WHEN company_id IS NULL AND region_code IS NULL THEN 'Level 4: Global Fallback'
  END as priority_level
FROM sales_content
WHERE key_identifier = 'pyramid_scheme'
ORDER BY 
  company_id NULLS LAST,
  region_code NULLS LAST;

-- Test 3: Teste View
SELECT 
  'Active Content View Test' as test,
  type,
  key_identifier,
  language_code,
  source_type
FROM v_active_content
WHERE key_identifier = 'pyramid_scheme'
ORDER BY language_code;

-- Test 4: Teste Function (Beispiel: Deutscher User aus Österreich)
SELECT 
  'Function Test - DE User from AT' as test,
  key_identifier,
  source_type,
  priority,
  payload->>'label' as label
FROM get_content_for_user(
  p_user_lang := 'de',
  p_user_region := 'AT',
  p_user_company := NULL,
  p_content_type := 'objection'
)
WHERE key_identifier = 'pyramid_scheme';

-- ====================================================================
-- SUCCESS MESSAGE
-- ====================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ PHASE B INSTALLATION COMPLETE!';
  RAISE NOTICE '✅ Multi-Language Architecture LIVE';
  RAISE NOTICE '✅ 3 ENUMs created (14 Languages ready!)';
  RAISE NOTICE '✅ sales_content Table created';
  RAISE NOTICE '✅ 6 Performance Indexes created';
  RAISE NOTICE '✅ Row Level Security enabled';
  RAISE NOTICE '✅ Waterfall Content Selection View created';
  RAISE NOTICE '✅ RPC Function for Frontend ready';
  RAISE NOTICE '✅ 4 Sample Contents inserted (DE, EN, AT-specific)';
  RAISE NOTICE '';
  RAISE NOTICE '🌍 READY FOR GLOBAL EXPANSION!';
  RAISE NOTICE '🎯 Next: Migrate your JSON files to database';
  RAISE NOTICE '🚀 Use: SELECT * FROM get_content_for_user(''de'', ''AT'', NULL);';
  RAISE NOTICE '';
END $$;

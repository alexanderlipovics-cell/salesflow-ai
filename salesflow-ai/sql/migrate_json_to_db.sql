-- ====================================================================
-- SALES FLOW AI - JSON MIGRATION SCRIPT
-- ====================================================================
-- Migriert deine existierenden JSON Files in die sales_content Tabelle
-- Safe to run multiple times (UPSERT Pattern)
-- ====================================================================

-- VORBEREITUNG:
-- 1. Öffne deine nm_objections_v1.json
-- 2. Für jeden Objection-Eintrag, führe ein INSERT aus (siehe Beispiele unten)
-- 3. Später: Automatisierung via Supabase Edge Function

-- ====================================================================
-- BEISPIEL 1: Einfacher Objection Import
-- ====================================================================

-- Nehmen wir an, dein nm_objections_v1.json hat:
-- {
--   "objections": [
--     {
--       "id": "pyramid_scheme",
--       "question": "Ist das ein Schneeballsystem?",
--       "response": "Nein, Schneeballsysteme sind illegal..."
--     }
--   ]
-- }

-- SQL Import (Global, Deutsch):
INSERT INTO sales_content (
  company_id,
  language_code,
  region_code,
  type,
  key_identifier,
  payload,
  tags
) VALUES (
  NULL,                    -- Global (alle Firmen)
  'de',                    -- Deutsch
  NULL,                    -- Alle Regionen
  'objection',
  'pyramid_scheme',        -- Dein JSON "id" wird zum key_identifier
  jsonb_build_object(
    'label', 'Ist das ein Schneeballsystem?',
    'ai_instruction', 'Lead ist skeptisch. Sei sachlich, nicht defensiv.',
    'scripts', jsonb_build_array(
      jsonb_build_object(
        'tone', 'direct',
        'text', 'Nein, Schneeballsysteme sind illegal. Wir verkaufen echte Produkte und sind bei der IHK eingetragen.'
      )
    )
  ),
  ARRAY['trust', 'legal']
)
ON CONFLICT ON CONSTRAINT unique_content_hierarchy 
DO UPDATE SET
  payload = EXCLUDED.payload,
  updated_at = NOW();

-- ====================================================================
-- BEISPIEL 2: Batch Import Template
-- ====================================================================

-- Wenn du mehrere Objections hast, nutze dieses Template:

DO $$
DECLARE
  objections JSONB := '[
    {
      "key": "no_time",
      "label": "Ich habe keine Zeit",
      "response": "Ich verstehe das völlig. Die meisten erfolgreichen Partner haben auch nur 5-10 Stunden pro Woche investiert. Wann hättest du denn 30 Minuten für ein kurzes Gespräch?"
    },
    {
      "key": "too_expensive",
      "label": "Das ist zu teuer",
      "response": "Ich höre dich. Lass uns mal durchrechnen was du aktuell für [VERGLEICHSPRODUKT] ausgibst vs. was du hier bekommst..."
    },
    {
      "key": "already_in_mlm",
      "label": "Ich bin schon bei einer anderen Firma",
      "response": "Super, dann kennst du das Prinzip ja schon! Viele unserer Top-Leute arbeiten parallel. Was gefällt dir an deiner aktuellen Firma am besten?"
    }
  ]'::jsonb;
  obj JSONB;
BEGIN
  FOR obj IN SELECT jsonb_array_elements(objections)
  LOOP
    INSERT INTO sales_content (
      company_id,
      language_code,
      region_code,
      type,
      key_identifier,
      payload,
      tags
    ) VALUES (
      NULL,
      'de',
      NULL,
      'objection',
      obj->>'key',
      jsonb_build_object(
        'label', obj->>'label',
        'scripts', jsonb_build_array(
          jsonb_build_object(
            'tone', 'direct',
            'text', obj->>'response'
          )
        ),
        'ai_instruction', 'Standard Einwandbehandlung. Empathisch bleiben.'
      ),
      ARRAY['objection_handling']
    )
    ON CONFLICT ON CONSTRAINT unique_content_hierarchy 
    DO UPDATE SET
      payload = EXCLUDED.payload,
      updated_at = NOW();
  END LOOP;
  
  RAISE NOTICE '✅ % Objections imported!', jsonb_array_length(objections);
END $$;

-- ====================================================================
-- BEISPIEL 3: Company-Specific Import (z.B. Zinzino)
-- ====================================================================

-- Wenn du für Zinzino einen speziellen Einwand hast:

-- Erst: Hole die company_id (falls mlm_companies Tabelle existiert)
-- SELECT id FROM mlm_companies WHERE name = 'Zinzino';
-- Nehmen wir an: id = '12345678-1234-1234-1234-123456789012'

INSERT INTO sales_content (
  company_id,
  language_code,
  region_code,
  type,
  key_identifier,
  payload,
  tags
) VALUES (
  '12345678-1234-1234-1234-123456789012'::uuid,  -- Zinzino ID
  'de',
  NULL,
  'objection',
  'pyramid_scheme',
  jsonb_build_object(
    'label', 'Ist Zinzino ein Schneeballsystem?',
    'ai_instruction', 'Betone BalanceTest als wissenschaftlichen Ansatz. Erwähne Nasdaq-Listing.',
    'scripts', jsonb_build_array(
      jsonb_build_object(
        'tone', 'enthusiastic',
        'text', 'Zinzino ist an der Nasdaq gelistet und nutzt einen wissenschaftlichen BalanceTest. Das unterscheidet uns fundamental von illegalen Systemen - wir verkaufen echte Gesundheitsprodukte mit messbaren Ergebnissen.'
      )
    ),
    'followup_suggestions', jsonb_build_array(
      'Möchtest du einen kostenlosen BalanceTest machen?',
      'Darf ich dir die Nasdaq-Informationen zeigen?'
    )
  ),
  ARRAY['zinzino_specific', 'trust', 'science']
)
ON CONFLICT ON CONSTRAINT unique_content_hierarchy 
DO UPDATE SET
  payload = EXCLUDED.payload,
  updated_at = NOW();

-- ====================================================================
-- BEISPIEL 4: Message Templates Migration
-- ====================================================================

-- Wenn du Message Templates aus nm_message_templates_merged_v1.json hast:

INSERT INTO sales_content (
  company_id,
  language_code,
  region_code,
  type,
  key_identifier,
  payload,
  tags
) VALUES (
  NULL,
  'de',
  NULL,
  'template',
  'cold_instagram_health',
  jsonb_build_object(
    'label', 'Cold Instagram DM - Gesundheit',
    'scripts', jsonb_build_array(
      jsonb_build_object(
        'tone', 'casual',
        'text', 'Hey {{name}}! Hab gesehen du interessierst dich für {{topic}}. Ich nutze ein System das mir mega bei {{benefit}} geholfen hat. Magst du mehr wissen?'
      ),
      jsonb_build_object(
        'tone', 'professional',
        'text', 'Hallo {{name}}, dein Interesse an {{topic}} hat mich auf dich aufmerksam gemacht. Ich arbeite mit einem wissenschaftlichen Ansatz für {{benefit}}. Hätte das Relevanz für dich?'
      )
    ),
    'variables', jsonb_build_array('name', 'topic', 'benefit'),
    'best_channels', jsonb_build_array('instagram_dm', 'whatsapp'),
    'ai_instruction', 'Personalisiere basierend auf Instagram Bio und letzten Posts.',
    'meta', jsonb_build_object(
      'avg_response_rate', 0.18,
      'best_time', 'afternoon',
      'recommended_for', 'cold_health_leads'
    )
  ),
  ARRAY['cold_outreach', 'instagram', 'health']
)
ON CONFLICT ON CONSTRAINT unique_content_hierarchy 
DO UPDATE SET
  payload = EXCLUDED.payload,
  updated_at = NOW();

-- ====================================================================
-- VERIFICATION NACH MIGRATION
-- ====================================================================

-- Check 1: Wie viele Contents habe ich?
SELECT 
  'Migration Summary' as check,
  type,
  language_code,
  COUNT(*) as total,
  COUNT(DISTINCT key_identifier) as unique_keys,
  SUM(CASE WHEN company_id IS NULL THEN 1 ELSE 0 END) as global_count,
  SUM(CASE WHEN company_id IS NOT NULL THEN 1 ELSE 0 END) as company_specific_count
FROM sales_content
GROUP BY type, language_code;

-- Check 2: Teste Waterfall für einen Key
SELECT 
  'Waterfall Test' as check,
  key_identifier,
  language_code,
  CASE 
    WHEN company_id IS NOT NULL THEN 'Company-Specific'
    ELSE 'Global'
  END as scope,
  payload->>'label' as label
FROM sales_content
WHERE key_identifier = 'pyramid_scheme'  -- Ersetze mit deinem Key
ORDER BY 
  company_id NULLS LAST,
  region_code NULLS LAST;

-- Check 3: Teste View
SELECT COUNT(*) as active_content_count
FROM v_active_content;

-- Check 4: Teste Function
SELECT 
  key_identifier,
  payload->>'label' as label,
  source_type,
  priority
FROM get_content_for_user('de', 'DE', NULL, 'objection')
LIMIT 10;

-- ====================================================================
-- TIPPS FÜR DEINE MIGRATION
-- ====================================================================

/*
1. STRUKTUR DEINER JSON FILES:
   - Identifiziere den "Key" (wird zu key_identifier)
   - Identifiziere den "Text" (wird zu payload.scripts[].text)
   - Identifiziere Metadaten (wird zu payload.meta)

2. SPRACHEN HINZUFÜGEN:
   - Kopiere einfach die INSERT Statements
   - Ändere language_code von 'de' zu 'en', 'es', etc.
   - Passe den Text an

3. COMPANY-SPECIFIC:
   - Erst: Hole company_id via SELECT id FROM mlm_companies WHERE name = '...'
   - Dann: Nutze diese UUID statt NULL

4. BULK IMPORT:
   - Für >100 Einträge: Schreibe ein Python/Node.js Script
   - Oder: Nutze Supabase Edge Function (siehe separates File)

5. UPSERT PATTERN:
   - ON CONFLICT ... DO UPDATE macht Migration idempotent
   - Du kannst das Script 100x laufen lassen - es updated nur

6. TESTING:
   - Nach Migration: Nutze die Verification Queries oben
   - Teste Waterfall: get_content_for_user() mit verschiedenen Params
*/

-- ====================================================================
-- SUCCESS MESSAGE
-- ====================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ MIGRATION GUIDE COMPLETE!';
  RAISE NOTICE '📋 Next Steps:';
  RAISE NOTICE '   1. Öffne deine nm_objections_v1.json';
  RAISE NOTICE '   2. Nutze die Beispiele oben als Template';
  RAISE NOTICE '   3. Führe INSERTs aus (einzeln oder batch)';
  RAISE NOTICE '   4. Verify mit den Queries oben';
  RAISE NOTICE '   5. Test via: SELECT * FROM get_content_for_user(''de'');';
  RAISE NOTICE '';
END $$;

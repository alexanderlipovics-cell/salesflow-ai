-- ╔════════════════════════════════════════════════════════════════╗
-- ║  INTERNATIONALIZATION (i18n) SYSTEM                            ║
-- ║  Multi-Language Support für Templates, UI, GPT Prompts         ║
-- ╚════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════
-- 1. SUPPORTED LANGUAGES TABLE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS supported_languages (
  code VARCHAR(5) PRIMARY KEY,              -- 'de', 'en', 'fr', 'es', etc.
  name TEXT NOT NULL,                       -- 'Deutsch', 'English', etc.
  native_name TEXT NOT NULL,                -- 'Deutsch', 'English', etc.
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Supported Languages
INSERT INTO supported_languages (code, name, native_name, is_default) VALUES
('de', 'German', 'Deutsch', TRUE),
('en', 'English', 'English', FALSE),
('fr', 'French', 'Français', FALSE),
('es', 'Spanish', 'Español', FALSE),
('it', 'Italian', 'Italiano', FALSE),
('nl', 'Dutch', 'Nederlands', FALSE),
('pt', 'Portuguese', 'Português', FALSE),
('pl', 'Polish', 'Polski', FALSE)
ON CONFLICT (code) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 2. TRANSLATIONS TABLE (UI Strings)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,                        -- 'dashboard.title', 'lead.status.new', etc.
  language VARCHAR(5) NOT NULL REFERENCES supported_languages(code),
  value TEXT NOT NULL,
  category TEXT,                            -- 'ui', 'email', 'whatsapp', 'system'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(key, language)
);

CREATE INDEX IF NOT EXISTS idx_translations_key ON translations(key);
CREATE INDEX IF NOT EXISTS idx_translations_language ON translations(language);

-- ═══════════════════════════════════════════════════════════════
-- 3. TEMPLATE TRANSLATIONS TABLE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS template_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES followup_templates(id) ON DELETE CASCADE,
  language VARCHAR(5) NOT NULL REFERENCES supported_languages(code),
  
  -- Translated Fields
  name TEXT,
  subject_template TEXT,
  short_template TEXT,
  body_template TEXT NOT NULL,
  reminder_template TEXT,
  fallback_template TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(template_id, language)
);

CREATE INDEX IF NOT EXISTS idx_template_translations_template ON template_translations(template_id);
CREATE INDEX IF NOT EXISTS idx_template_translations_language ON template_translations(language);

-- ═══════════════════════════════════════════════════════════════
-- 4. PLAYBOOK TRANSLATIONS TABLE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS playbook_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id TEXT NOT NULL REFERENCES followup_playbooks(id) ON DELETE CASCADE,
  language VARCHAR(5) NOT NULL REFERENCES supported_languages(code),
  
  -- Translated Fields
  name TEXT,
  description TEXT,
  message_template TEXT NOT NULL,
  subject_template TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(playbook_id, language)
);

CREATE INDEX IF NOT EXISTS idx_playbook_translations_playbook ON playbook_translations(playbook_id);
CREATE INDEX IF NOT EXISTS idx_playbook_translations_language ON playbook_translations(language);

-- ═══════════════════════════════════════════════════════════════
-- 5. ADD LANGUAGE COLUMN TO USERS TABLE
-- ═══════════════════════════════════════════════════════════════

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'language'
  ) THEN
    ALTER TABLE users ADD COLUMN language VARCHAR(5) DEFAULT 'de' REFERENCES supported_languages(code);
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 6. SEED: UI TRANSLATIONS (DE + EN)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO translations (key, language, value, category) VALUES

-- Dashboard
('dashboard.title', 'de', 'Dashboard', 'ui'),
('dashboard.title', 'en', 'Dashboard', 'ui'),
('dashboard.leads', 'de', 'Leads', 'ui'),
('dashboard.leads', 'en', 'Leads', 'ui'),
('dashboard.activities', 'de', 'Aktivitäten', 'ui'),
('dashboard.activities', 'en', 'Activities', 'ui'),
('dashboard.welcome', 'de', 'Willkommen', 'ui'),
('dashboard.welcome', 'en', 'Welcome', 'ui'),

-- Lead Status
('lead.status.new', 'de', 'Neu', 'ui'),
('lead.status.new', 'en', 'New', 'ui'),
('lead.status.contacted', 'de', 'Kontaktiert', 'ui'),
('lead.status.contacted', 'en', 'Contacted', 'ui'),
('lead.status.qualified', 'de', 'Qualifiziert', 'ui'),
('lead.status.qualified', 'en', 'Qualified', 'ui'),
('lead.status.won', 'de', 'Gewonnen', 'ui'),
('lead.status.won', 'en', 'Won', 'ui'),
('lead.status.lost', 'de', 'Verloren', 'ui'),
('lead.status.lost', 'en', 'Lost', 'ui'),

-- Actions
('action.save', 'de', 'Speichern', 'ui'),
('action.save', 'en', 'Save', 'ui'),
('action.cancel', 'de', 'Abbrechen', 'ui'),
('action.cancel', 'en', 'Cancel', 'ui'),
('action.delete', 'de', 'Löschen', 'ui'),
('action.delete', 'en', 'Delete', 'ui'),
('action.edit', 'de', 'Bearbeiten', 'ui'),
('action.edit', 'en', 'Edit', 'ui'),
('action.create', 'de', 'Erstellen', 'ui'),
('action.create', 'en', 'Create', 'ui'),
('action.send', 'de', 'Senden', 'ui'),
('action.send', 'en', 'Send', 'ui'),

-- Follow-ups
('followup.title', 'de', 'Follow-up', 'ui'),
('followup.title', 'en', 'Follow-up', 'ui'),
('followup.send', 'de', 'Senden', 'ui'),
('followup.send', 'en', 'Send', 'ui'),
('followup.preview', 'de', 'Vorschau', 'ui'),
('followup.preview', 'en', 'Preview', 'ui'),
('followup.scheduled', 'de', 'Geplant', 'ui'),
('followup.scheduled', 'en', 'Scheduled', 'ui'),

-- Templates
('template.create', 'de', 'Template erstellen', 'ui'),
('template.create', 'en', 'Create Template', 'ui'),
('template.gpt_autocomplete', 'de', 'Mit GPT generieren', 'ui'),
('template.gpt_autocomplete', 'en', 'Generate with GPT', 'ui'),
('template.name', 'de', 'Template Name', 'ui'),
('template.name', 'en', 'Template Name', 'ui'),

-- Settings
('settings.title', 'de', 'Einstellungen', 'ui'),
('settings.title', 'en', 'Settings', 'ui'),
('settings.language', 'de', 'Sprache', 'ui'),
('settings.language', 'en', 'Language', 'ui'),
('settings.profile', 'de', 'Profil', 'ui'),
('settings.profile', 'en', 'Profile', 'ui')

ON CONFLICT (key, language) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 7. SEED: TEMPLATE TRANSLATIONS (Inaktivität Template)
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_template_id UUID;
BEGIN
  -- Find existing inactivity template
  SELECT id INTO v_template_id 
  FROM followup_templates 
  WHERE trigger_key = 'inactivity_14d' AND channel = 'whatsapp'
  LIMIT 1;
  
  IF v_template_id IS NOT NULL THEN
    -- German (original)
    INSERT INTO template_translations (template_id, language, name, short_template, body_template, reminder_template, fallback_template) VALUES
    (v_template_id, 'de', 
     'Inaktivität 14 Tage - WhatsApp',
     'Hey {{first_name}}, alles gut bei dir? 😊',
     'Hey {{first_name}}, ich hoffe, es ist alles gut bei dir 🙌 

Ich hatte noch im Kopf, dass du Interesse hattest – wenn du Fragen hast oder einen Reminder brauchst, sag gern Bescheid. 

Ich bin da, wenn du bereit bist!',
     'Wollte nur kurz nachhaken, ob du meine Nachricht gesehen hast 😊 

Wenn du magst, können wir auch einfach kurz telefonieren!',
     'Letzter Check-In – wenn du aktuell kein Interesse hast, ist das natürlich vollkommen ok 🙏 

Gib mir einfach kurz Bescheid, dann nehme ich dich aus der Liste.')
    ON CONFLICT (template_id, language) DO NOTHING;
    
    -- English
    INSERT INTO template_translations (template_id, language, name, short_template, body_template, reminder_template, fallback_template) VALUES
    (v_template_id, 'en',
     'Inactivity 14 Days - WhatsApp',
     'Hey {{first_name}}, how are you doing? 😊',
     'Hey {{first_name}}, I hope you''re doing well 🙌 

I remembered you showed interest – if you have any questions or need a reminder, just let me know. 

I''m here when you''re ready!',
     'Just wanted to follow up quickly to see if you saw my message 😊 

If you''d like, we can also have a quick call!',
     'Last check-in – if you''re not interested right now, that''s totally fine 🙏 

Just let me know, and I''ll take you off the list.')
    ON CONFLICT (template_id, language) DO NOTHING;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 8. RPC FUNCTIONS FOR i18n
-- ═══════════════════════════════════════════════════════════════

-- Get Translation
CREATE OR REPLACE FUNCTION get_translation(
  p_key TEXT,
  p_language VARCHAR(5) DEFAULT 'de'
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_value TEXT;
BEGIN
  -- Try requested language
  SELECT value INTO v_value
  FROM translations
  WHERE key = p_key AND language = p_language;
  
  -- Fallback to default language (German)
  IF v_value IS NULL THEN
    SELECT value INTO v_value
    FROM translations
    WHERE key = p_key AND language = 'de';
  END IF;
  
  -- Fallback to key itself
  RETURN COALESCE(v_value, p_key);
END;
$$;

COMMENT ON FUNCTION get_translation IS 'Get translation for a key with fallback to default language';

-- Get Template in Language
CREATE OR REPLACE FUNCTION get_template_in_language(
  p_template_id UUID,
  p_language VARCHAR(5) DEFAULT 'de'
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_translation RECORD;
  v_template RECORD;
  v_result JSON;
BEGIN
  -- Try to get translation
  SELECT * INTO v_translation
  FROM template_translations
  WHERE template_id = p_template_id AND language = p_language;
  
  -- Fallback to default language (German)
  IF NOT FOUND THEN
    SELECT * INTO v_translation
    FROM template_translations
    WHERE template_id = p_template_id AND language = 'de';
  END IF;
  
  -- If translation found, return it
  IF FOUND THEN
    SELECT json_build_object(
      'id', v_translation.id,
      'template_id', v_translation.template_id,
      'language', v_translation.language,
      'name', v_translation.name,
      'subject_template', v_translation.subject_template,
      'short_template', v_translation.short_template,
      'body_template', v_translation.body_template,
      'reminder_template', v_translation.reminder_template,
      'fallback_template', v_translation.fallback_template
    ) INTO v_result;
    
    RETURN v_result;
  END IF;
  
  -- Fallback to original template
  SELECT * INTO v_template
  FROM followup_templates
  WHERE id = p_template_id;
  
  IF FOUND THEN
    SELECT json_build_object(
      'id', v_template.id,
      'template_id', v_template.id,
      'language', 'de',
      'name', v_template.name,
      'subject_template', v_template.subject_template,
      'short_template', v_template.short_template,
      'body_template', v_template.body_template,
      'reminder_template', v_template.reminder_template,
      'fallback_template', v_template.fallback_template
    ) INTO v_result;
    
    RETURN v_result;
  END IF;
  
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION get_template_in_language IS 'Get follow-up template in specific language with fallback';

-- Get All Translations for Language
CREATE OR REPLACE FUNCTION get_translations_for_language(
  p_language VARCHAR(5) DEFAULT 'de',
  p_category TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSON;
BEGIN
  IF p_category IS NOT NULL THEN
    SELECT json_object_agg(key, value)
    INTO v_result
    FROM translations
    WHERE language = p_language AND category = p_category;
  ELSE
    SELECT json_object_agg(key, value)
    INTO v_result
    FROM translations
    WHERE language = p_language;
  END IF;
  
  RETURN COALESCE(v_result, '{}'::json);
END;
$$;

COMMENT ON FUNCTION get_translations_for_language IS 'Get all translations for a language as JSON object';

COMMENT ON TABLE supported_languages IS 'All supported languages in the system';
COMMENT ON TABLE translations IS 'UI translations for all supported languages';
COMMENT ON TABLE template_translations IS 'Multi-language follow-up templates';
COMMENT ON TABLE playbook_translations IS 'Multi-language playbook translations';

-- ═══════════════════════════════════════════════════════════════
-- 9. GRANTS
-- ═══════════════════════════════════════════════════════════════

GRANT SELECT ON supported_languages TO anon, authenticated;
GRANT SELECT ON translations TO anon, authenticated;
GRANT SELECT ON template_translations TO authenticated;
GRANT SELECT ON playbook_translations TO authenticated;

GRANT EXECUTE ON FUNCTION get_translation TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_template_in_language TO authenticated;
GRANT EXECUTE ON FUNCTION get_translations_for_language TO anon, authenticated;


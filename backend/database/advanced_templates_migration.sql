-- ╔════════════════════════════════════════════════════════════════╗
-- ║  ADVANCED FOLLOW-UP TEMPLATES SYSTEM                           ║
-- ║  Multi-Field Templates, GPT Auto-Complete, Preview, Admin-UI   ║
-- ╚════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════
-- 1. FOLLOW-UP TEMPLATES TABLE (Advanced Multi-Field)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS followup_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Metadata
  name TEXT NOT NULL,
  trigger_key TEXT NOT NULL,                   -- 'inactivity_14d', 'proposal_no_response', etc.
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'email', 'in_app')),
  category TEXT,                               -- 'objection', 'nurture', 'reminder'
  
  -- Multi-Field Templates
  subject_template TEXT,                       -- Email Betreff (nur für Email)
  short_template TEXT,                         -- WhatsApp Vorschau / In-App Teaser
  body_template TEXT NOT NULL,                 -- Haupttext mit {{placeholders}}
  reminder_template TEXT,                      -- Follow-up nach 2 Tagen
  fallback_template TEXT,                      -- Letzter Versuch nach 5 Tagen
  
  -- GPT Integration
  gpt_autocomplete_prompt TEXT,                -- Prompt für Auto-Generierung von Reminder/Fallback
  
  -- Testing & Preview
  preview_context JSONB,                       -- Beispiel-Daten für Template-Preview
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  version INTEGER DEFAULT 1,
  
  -- Usage Stats
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  
  UNIQUE(trigger_key, channel)
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_templates_trigger ON followup_templates(trigger_key);
CREATE INDEX IF NOT EXISTS idx_templates_channel ON followup_templates(channel);
CREATE INDEX IF NOT EXISTS idx_templates_active ON followup_templates(is_active);

COMMENT ON TABLE followup_templates IS 'Advanced editable follow-up templates with GPT auto-complete';

-- ═══════════════════════════════════════════════════════════════
-- 2. TEMPLATE VERSIONS TABLE (für History)
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS template_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES followup_templates(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  
  -- Snapshot of Template
  name TEXT,
  body_template TEXT,
  reminder_template TEXT,
  fallback_template TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  change_note TEXT
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_versions_template ON template_versions(template_id);
CREATE INDEX IF NOT EXISTS idx_versions_created ON template_versions(created_at DESC);

COMMENT ON TABLE template_versions IS 'Version history for templates';

-- ═══════════════════════════════════════════════════════════════
-- 3. SEED: 3 ADVANCED TEMPLATES
-- ═══════════════════════════════════════════════════════════════

INSERT INTO followup_templates (
  name, trigger_key, channel, category,
  subject_template, short_template, body_template, 
  reminder_template, fallback_template,
  gpt_autocomplete_prompt, preview_context
) VALUES

-- 1. Inaktivität 14 Tage (WhatsApp)
(
  'Inaktivität 14 Tage - WhatsApp',
  'inactivity_14d',
  'whatsapp',
  'reactivation',
  NULL,
  'Hey {{first_name}}, alles gut bei dir? 😊',
  'Hey {{first_name}}, ich hoffe, es ist alles gut bei dir 🙌 

Ich hatte noch im Kopf, dass du Interesse hattest – wenn du Fragen hast oder einen Reminder brauchst, sag gern Bescheid. 

Ich bin da, wenn du bereit bist!',
  'Wollte nur kurz nachhaken, ob du meine Nachricht gesehen hast 😊 

Wenn du magst, können wir auch einfach kurz telefonieren!',
  'Letzter Check-In – wenn du aktuell kein Interesse hast, ist das natürlich vollkommen ok 🙏 

Gib mir einfach kurz Bescheid, dann nehme ich dich aus der Liste.',
  'Generiere für {{first_name}} nach 14 Tagen Inaktivität:
1. Reminder (2 Tage später, falls keine Antwort): freundlich nachfassen
2. Fallback (nach 5 Tagen): letzte Erinnerung, Opt-Out anbieten

Ton: empathisch, nicht drängend, WhatsApp-Stil (Emojis ok)',
  '{
    "first_name": "Sarah",
    "last_name": "Müller",
    "product_name": "Sales Flow AI Starter",
    "last_contact_days": 14
  }'::jsonb
),

-- 2. Proposal No Response (Email)
(
  'Proposal versendet - keine Antwort',
  'proposal_no_response',
  'email',
  'reminder',
  'Noch Fragen zum Angebot, {{first_name}}?',
  NULL,
  'Hi {{first_name}},

ich hoffe, du konntest dir das Angebot in Ruhe anschauen. 

Gibt es noch offene Fragen oder Punkte, die wir besprechen sollten?

Ich bin jederzeit für dich da – melde dich einfach!

Beste Grüße',
  'Hi {{first_name}},

ich bin morgen flexibel für ein kurzes Gespräch – sag gern, wann es für dich passt.

Falls das Angebot nicht passt, gib mir auch gerne Feedback – das hilft mir sehr!',
  'Hi {{first_name}},

wenn du erstmal pausieren willst, gib mir einfach ein kurzes Zeichen. Kein Stress 😊

Ich nehme dich dann aus der Follow-up Liste.',
  'Generiere für {{first_name}} nach Proposal-Versand ohne Antwort:
1. Reminder (2 Tage): Angebot nochmal ansprechen, Fragen anbieten
2. Fallback (5 Tage): Pause-Option anbieten, Opt-Out

Ton: professionell, hilfsbereit, Email-Format',
  '{
    "first_name": "Tom",
    "last_name": "Schmidt",
    "offer_name": "Premium Paket",
    "offer_price": "99€",
    "proposal_sent_days": 3
  }'::jsonb
),

-- 3. Zusage ohne Termin (In-App)
(
  'Zusage erhalten - kein Termin gebucht',
  'commitment_no_meeting',
  'in_app',
  'reminder',
  NULL,
  'Hey {{first_name}}, du hattest gesagt, du bist dabei 🙌',
  'Hey {{first_name}}, 

super dass du dabei bist! 🚀

Damit wir konkret weitermachen können, buche dir hier bitte einen Termin:
{{booking_link}}

Dauert nur 30 Sekunden!',
  'Ich block dir gern einen Timeslot – einfach hier klicken 💬
{{booking_link}}',
  'Wenn es doch nicht passt, alles gut – gib mir einfach ein kurzes Zeichen, dann planen wir neu 🙌',
  'Generiere für {{first_name}} bei Zusage ohne gebuchten Termin:
1. Reminder (2 Tage): Termin-Buchung nochmal anbieten
2. Fallback (5 Tage): Alternative anbieten (z.B. anderer Zeitpunkt)

Ton: motivierend, action-oriented, In-App Chat-Stil',
  '{
    "first_name": "Lena",
    "last_name": "Weber",
    "booking_link": "https://calendly.com/salesflow/onboarding",
    "commitment_date": "2025-11-20"
  }'::jsonb
)
ON CONFLICT (trigger_key, channel) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 4. RPC FUNCTIONS
-- ═══════════════════════════════════════════════════════════════

-- Render Template with Context
CREATE OR REPLACE FUNCTION render_template(
  p_template_text TEXT,
  p_context JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_result TEXT;
  v_key TEXT;
  v_value TEXT;
BEGIN
  v_result := p_template_text;
  
  -- Replace all {{placeholders}} with values from context
  FOR v_key, v_value IN SELECT * FROM jsonb_each_text(p_context) LOOP
    v_result := REPLACE(v_result, '{{' || v_key || '}}', v_value);
  END LOOP;
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION render_template IS 'Renders template with context (replaces {{placeholders}})';

-- Get Template with Rendered Preview
CREATE OR REPLACE FUNCTION get_template_preview(p_template_id UUID)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  v_template RECORD;
  v_result JSON;
BEGIN
  SELECT * INTO v_template
  FROM followup_templates
  WHERE id = p_template_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- Render all fields with preview_context
  v_result := json_build_object(
    'id', v_template.id,
    'name', v_template.name,
    'channel', v_template.channel,
    'preview', json_build_object(
      'subject', render_template(COALESCE(v_template.subject_template, ''), v_template.preview_context),
      'short', render_template(COALESCE(v_template.short_template, ''), v_template.preview_context),
      'body', render_template(v_template.body_template, v_template.preview_context),
      'reminder', render_template(COALESCE(v_template.reminder_template, ''), v_template.preview_context),
      'fallback', render_template(COALESCE(v_template.fallback_template, ''), v_template.preview_context)
    )
  );
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION get_template_preview IS 'Returns template with rendered preview';

-- Upsert Template (Insert or Update)
CREATE OR REPLACE FUNCTION upsert_followup_template(
  p_name TEXT,
  p_trigger_key TEXT,
  p_channel TEXT,
  p_subject_template TEXT,
  p_short_template TEXT,
  p_body_template TEXT,
  p_reminder_template TEXT,
  p_fallback_template TEXT,
  p_gpt_autocomplete_prompt TEXT,
  p_preview_context JSONB
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_template_id UUID;
BEGIN
  INSERT INTO followup_templates (
    name, trigger_key, channel,
    subject_template, short_template, body_template,
    reminder_template, fallback_template,
    gpt_autocomplete_prompt, preview_context
  ) VALUES (
    p_name, p_trigger_key, p_channel,
    p_subject_template, p_short_template, p_body_template,
    p_reminder_template, p_fallback_template,
    p_gpt_autocomplete_prompt, p_preview_context
  )
  ON CONFLICT (trigger_key, channel)
  DO UPDATE SET
    name = EXCLUDED.name,
    subject_template = EXCLUDED.subject_template,
    short_template = EXCLUDED.short_template,
    body_template = EXCLUDED.body_template,
    reminder_template = EXCLUDED.reminder_template,
    fallback_template = EXCLUDED.fallback_template,
    gpt_autocomplete_prompt = EXCLUDED.gpt_autocomplete_prompt,
    preview_context = EXCLUDED.preview_context,
    updated_at = NOW()
  RETURNING id INTO v_template_id;
  
  RETURN v_template_id;
END;
$$;

COMMENT ON FUNCTION upsert_followup_template IS 'Inserts or updates follow-up template';

-- ═══════════════════════════════════════════════════════════════
-- 5. TRIGGERS
-- ═══════════════════════════════════════════════════════════════

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_template_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_template_timestamp
BEFORE UPDATE ON followup_templates
FOR EACH ROW
EXECUTE FUNCTION update_template_timestamp();

-- Auto-create version on update
CREATE OR REPLACE FUNCTION create_template_version()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (OLD.body_template IS DISTINCT FROM NEW.body_template OR
      OLD.reminder_template IS DISTINCT FROM NEW.reminder_template OR
      OLD.fallback_template IS DISTINCT FROM NEW.fallback_template) THEN
    
    INSERT INTO template_versions (
      template_id, version, name,
      body_template, reminder_template, fallback_template,
      created_by
    ) VALUES (
      NEW.id, NEW.version, NEW.name,
      OLD.body_template, OLD.reminder_template, OLD.fallback_template,
      NEW.created_by
    );
    
    NEW.version = NEW.version + 1;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_create_template_version
BEFORE UPDATE ON followup_templates
FOR EACH ROW
EXECUTE FUNCTION create_template_version();

-- ═══════════════════════════════════════════════════════════════
-- VERIFICATION QUERY
-- ═══════════════════════════════════════════════════════════════

-- Check if tables and data were created successfully
DO $$
DECLARE
  template_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO template_count FROM followup_templates;
  RAISE NOTICE '✅ Advanced Follow-up Templates System deployed successfully!';
  RAISE NOTICE '📊 Created % templates', template_count;
END $$;


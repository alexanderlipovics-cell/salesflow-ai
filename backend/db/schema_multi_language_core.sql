-- ═════════════════════════════════════════════════════════════════
-- SALES FLOW AI - MULTI-LANGUAGE / COMPANY CORE SCHEMA
-- ═════════════════════════════════════════════════════════════════
-- Modul 1: Datenstruktur – Multi-Language / Company Core
-- Modul 2: Neuro-Profiler (DISG)
-- Modul 3: Speed-Hunter (Gamification Loop)
-- Modul 4: Einwand-Killer (Sales Intelligence)
-- Modul 5: Liability-Shield (Compliance)
-- ═════════════════════════════════════════════════════════════════

-- ═════════════════════════════════════════════════════════════════
-- 1️⃣ MODUL: DATENSTRUKTUR – MULTI-LANGUAGE / COMPANY CORE
-- ═════════════════════════════════════════════════════════════════

-- 1.1 mlm_companies
CREATE TABLE IF NOT EXISTS public.mlm_companies (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              text NOT NULL UNIQUE,      -- 'zinzino', 'herbalife', ...
  display_name      text NOT NULL,             -- "Zinzino", "Herbalife"
  default_language  text NOT NULL DEFAULT 'de-DE',
  allowed_languages text[] NOT NULL DEFAULT ARRAY['de-DE'],
  compliance_profile text NOT NULL DEFAULT 'standard',  -- 'health', 'finance', ...
  risk_level        text NOT NULL DEFAULT 'medium',     -- 'low','medium','high'
  brand_tone        jsonb NOT NULL DEFAULT '{}'::jsonb, -- {"formality":"medium","emoji":"low"}
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mlm_companies_slug ON public.mlm_companies (slug);

COMMENT ON TABLE public.mlm_companies IS 'Multi-Language Company Core - Zentrale Firmen-Konfiguration';
COMMENT ON COLUMN public.mlm_companies.slug IS 'Eindeutiger Slug für URL/API-Zugriff';
COMMENT ON COLUMN public.mlm_companies.allowed_languages IS 'Array der unterstützten Sprachen';
COMMENT ON COLUMN public.mlm_companies.compliance_profile IS 'Compliance-Profil: health, finance, standard, etc.';
COMMENT ON COLUMN public.mlm_companies.brand_tone IS 'JSON mit Brand-Tone-Einstellungen (formality, emoji, etc.)';

-- 1.2 templates (sprachunabhängiger Kern)
CREATE TABLE IF NOT EXISTS public.templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid REFERENCES public.mlm_companies(id) ON DELETE CASCADE,
  funnel_stage    text NOT NULL,           -- 'cold','early_follow_up','closing',...
  channel         text NOT NULL,           -- 'whatsapp','instagram_dm','email','phone'
  use_case        text NOT NULL,           -- 'intro','objection','referral','reactivation',...
  persona_hint    text,                    -- 'D','I','S','G','generic'
  is_active       boolean NOT NULL DEFAULT true,
  created_by      uuid,                    -- auth.users.id (optional FK)
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_templates_company_funnel_channel ON public.templates (company_id, funnel_stage, channel);
CREATE INDEX IF NOT EXISTS idx_templates_use_case ON public.templates (use_case);
CREATE INDEX IF NOT EXISTS idx_templates_is_active ON public.templates (is_active);

COMMENT ON TABLE public.templates IS 'Sprachunabhängiger Template-Kern - Metadaten ohne Text';
COMMENT ON COLUMN public.templates.funnel_stage IS 'Funnel-Stage: cold, early_follow_up, closing, etc.';
COMMENT ON COLUMN public.templates.channel IS 'Kommunikationskanal: whatsapp, instagram_dm, email, phone';
COMMENT ON COLUMN public.templates.persona_hint IS 'DISG-Persona-Hinweis: D, I, S, G oder generic';

-- 1.3 template_translations (Multi-Language Layer)
CREATE TABLE IF NOT EXISTS public.template_translations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id       uuid NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  language_code     text NOT NULL,          -- 'de-DE','de-AT','en-US',...
  region            text,                   -- 'DACH','EU','LATAM',...
  subject           text,                   -- für Email
  body              text NOT NULL,
  tone_variation    text,                   -- 'formal','casual','soft','direct'
  compliance_status text NOT NULL DEFAULT 'pending', -- 'approved','flagged','pending'
  version           integer NOT NULL DEFAULT 1,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),

  UNIQUE (template_id, language_code, tone_variation, version)
);

CREATE INDEX IF NOT EXISTS idx_template_translations_language ON public.template_translations (language_code);
CREATE INDEX IF NOT EXISTS idx_template_translations_template ON public.template_translations (template_id);
CREATE INDEX IF NOT EXISTS idx_template_translations_compliance ON public.template_translations (compliance_status);

COMMENT ON TABLE public.template_translations IS 'Multi-Language Layer - Übersetzungen und Varianten der Templates';
COMMENT ON COLUMN public.template_translations.tone_variation IS 'Ton-Variante: formal, casual, soft, direct';
COMMENT ON COLUMN public.template_translations.compliance_status IS 'Compliance-Status: approved, flagged, pending';

-- 1.4 template_performance (Kern für Analytics)
CREATE TABLE IF NOT EXISTS public.template_performance (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id           uuid NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  translation_id        uuid REFERENCES public.template_translations(id) ON DELETE SET NULL,
  company_id            uuid REFERENCES public.mlm_companies(id) ON DELETE CASCADE,
  language_code         text NOT NULL,
  funnel_stage          text NOT NULL,
  channel               text NOT NULL,

  times_used            bigint NOT NULL DEFAULT 0,
  times_sent            bigint NOT NULL DEFAULT 0,
  times_delivered       bigint NOT NULL DEFAULT 0,
  times_opened          bigint NOT NULL DEFAULT 0,
  times_clicked         bigint NOT NULL DEFAULT 0,
  times_replied         bigint NOT NULL DEFAULT 0,
  times_positive_reply  bigint NOT NULL DEFAULT 0,
  times_converted       bigint NOT NULL DEFAULT 0,

  delivery_rate         numeric(5,4) NOT NULL DEFAULT 0,  -- 0.0000 - 1.0000
  open_rate             numeric(5,4) NOT NULL DEFAULT 0,
  response_rate         numeric(5,4) NOT NULL DEFAULT 0,
  positive_response_rate numeric(5,4) NOT NULL DEFAULT 0,
  conversion_rate       numeric(5,4) NOT NULL DEFAULT 0,
  performance_score     numeric(6,2) NOT NULL DEFAULT 0,  -- gewichteter Score

  last_event_at         timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_template_performance_company_funnel_channel ON public.template_performance (company_id, funnel_stage, channel);
CREATE INDEX IF NOT EXISTS idx_template_performance_language ON public.template_performance (language_code);
CREATE INDEX IF NOT EXISTS idx_template_performance_score ON public.template_performance (performance_score DESC);

COMMENT ON TABLE public.template_performance IS 'Template-Performance-Analytics - Tracking aller Metriken';
COMMENT ON COLUMN public.template_performance.performance_score IS 'Gewichteter Performance-Score für Template-Ranking';

-- ═════════════════════════════════════════════════════════════════
-- 2️⃣ MODUL: NEURO-PROFILER (DISG)
-- ═════════════════════════════════════════════════════════════════

-- 2.1 leads – Erweiterung um DISG-Felder
-- ANNAHME: leads-Tabelle existiert bereits
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'leads' 
    AND column_name = 'disc_primary'
  ) THEN
    ALTER TABLE public.leads
      ADD COLUMN disc_primary      text,       -- 'D','I','S','G'
      ADD COLUMN disc_secondary    text,
      ADD COLUMN disc_confidence   numeric(3,2), -- 0.00 - 1.00
      ADD COLUMN disc_last_source  text,       -- 'ai_chat','intake_form','manual'
      ADD COLUMN disc_last_updated timestamptz;
    
    COMMENT ON COLUMN public.leads.disc_primary IS 'DISG-Primärtyp: D, I, S oder G';
    COMMENT ON COLUMN public.leads.disc_secondary IS 'DISG-Sekundärtyp (optional)';
    COMMENT ON COLUMN public.leads.disc_confidence IS 'Konfidenz der DISG-Einschätzung (0.00 - 1.00)';
    COMMENT ON COLUMN public.leads.disc_last_source IS 'Quelle der letzten DISG-Analyse';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_leads_disc_primary ON public.leads (disc_primary) WHERE disc_primary IS NOT NULL;

-- 2.2 disc_analyses – Log der Einschätzungen
CREATE TABLE IF NOT EXISTS public.disc_analyses (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id        uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source         text NOT NULL,           -- 'ai_chat','import','manual'
  disc_primary   text NOT NULL,
  disc_secondary text,
  confidence     numeric(3,2) NOT NULL,   -- 0.00 - 1.00
  rationale      text,                    -- kurze Erklärung
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_disc_analyses_lead ON public.disc_analyses (lead_id);
CREATE INDEX IF NOT EXISTS idx_disc_analyses_created_at ON public.disc_analyses (created_at DESC);

COMMENT ON TABLE public.disc_analyses IS 'DISG-Analysen-Log - Historie aller Einschätzungen';
COMMENT ON COLUMN public.disc_analyses.rationale IS 'Kurze Erklärung der DISG-Einschätzung';

-- ═════════════════════════════════════════════════════════════════
-- 3️⃣ MODUL: SPEED-HUNTER (GAMIFICATION LOOP)
-- ═════════════════════════════════════════════════════════════════

-- 3.1 speed_hunter_sessions
CREATE TABLE IF NOT EXISTS public.speed_hunter_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at      timestamptz NOT NULL DEFAULT now(),
  ended_at        timestamptz,
  daily_goal      integer NOT NULL DEFAULT 20,    -- z.B. 20 Kontakte oder 20 Punkte
  mode            text NOT NULL DEFAULT 'points', -- 'contacts','points'
  total_contacts  integer NOT NULL DEFAULT 0,
  total_points    integer NOT NULL DEFAULT 0,
  streak_day      integer,                       -- optional: Streak-Logik
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_speed_hunter_sessions_user_started ON public.speed_hunter_sessions (user_id, started_at DESC);

COMMENT ON TABLE public.speed_hunter_sessions IS 'Speed-Hunter Sessions - Gamification-Loop für tägliche Ziele';
COMMENT ON COLUMN public.speed_hunter_sessions.mode IS 'Modus: contacts (Kontakte zählen) oder points (Punkte zählen)';
COMMENT ON COLUMN public.speed_hunter_sessions.streak_day IS 'Aktueller Streak-Tag (optional für Streak-Logik)';

-- 3.2 speed_hunter_actions
CREATE TABLE IF NOT EXISTS public.speed_hunter_actions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES public.speed_hunter_sessions(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id         uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  action_type     text NOT NULL,   -- 'call','message','snooze','done'
  outcome         text,            -- 'no_answer','interested','not_interested','follow_up_scheduled',...
  points          integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_speed_hunter_actions_user_created ON public.speed_hunter_actions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_speed_hunter_actions_lead_created ON public.speed_hunter_actions (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_speed_hunter_actions_session ON public.speed_hunter_actions (session_id);

COMMENT ON TABLE public.speed_hunter_actions IS 'Speed-Hunter Actions - Log aller Aktionen innerhalb einer Session';
COMMENT ON COLUMN public.speed_hunter_actions.action_type IS 'Aktionstyp: call, message, snooze, done';
COMMENT ON COLUMN public.speed_hunter_actions.outcome IS 'Ergebnis der Aktion: no_answer, interested, not_interested, etc.';

-- ═════════════════════════════════════════════════════════════════
-- 4️⃣ MODUL: EINWAND-KILLER (SALES INTELLIGENCE)
-- ═════════════════════════════════════════════════════════════════

-- 4.1 objection_templates
CREATE TABLE IF NOT EXISTS public.objection_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid REFERENCES public.mlm_companies(id) ON DELETE CASCADE,
  objection_key   text NOT NULL,      -- 'no_time','too_expensive','mlm_skeptic',...
  funnel_stage    text NOT NULL,      -- 'cold','follow_up','closing',...
  disc_type       text,               -- 'D','I','S','G','generic'
  style           text NOT NULL,      -- 'logical','emotional','provocative'
  step            text NOT NULL,      -- 'acknowledge','clarify','reframe','close'
  language_code   text NOT NULL,      -- 'de-DE','en-US',...
  body            text NOT NULL,
  compliance_status text NOT NULL DEFAULT 'pending', -- 'approved','flagged','pending'
  is_active       boolean NOT NULL DEFAULT true,
  created_by      uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_objection_templates_company_key_stage ON public.objection_templates (company_id, objection_key, funnel_stage);
CREATE INDEX IF NOT EXISTS idx_objection_templates_disc_type ON public.objection_templates (disc_type);
CREATE INDEX IF NOT EXISTS idx_objection_templates_language ON public.objection_templates (language_code);
CREATE INDEX IF NOT EXISTS idx_objection_templates_is_active ON public.objection_templates (is_active);

COMMENT ON TABLE public.objection_templates IS 'Einwand-Killer Templates - Sales Intelligence für Objection Handling';
COMMENT ON COLUMN public.objection_templates.objection_key IS 'Schlüssel des Einwands: no_time, too_expensive, mlm_skeptic, etc.';
COMMENT ON COLUMN public.objection_templates.style IS 'Antwort-Stil: logical, emotional, provocative';
COMMENT ON COLUMN public.objection_templates.step IS 'Verkaufs-Schritt: acknowledge, clarify, reframe, close';

-- 4.2 objection_logs – wie hat der Einwand geendet?
CREATE TABLE IF NOT EXISTS public.objection_logs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id        uuid REFERENCES public.mlm_companies(id) ON DELETE CASCADE,
  objection_key     text NOT NULL,      -- 'too_expensive',...
  funnel_stage      text NOT NULL,
  disc_type         text,
  template_id       uuid REFERENCES public.objection_templates(id) ON DELETE SET NULL,
  language_code     text NOT NULL,

  response_style    text,               -- 'logical','emotional','provocative',...
  outcome           text,               -- 'won','lost','pending','neutral'
  notes             text,

  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_objection_logs_company_key ON public.objection_logs (company_id, objection_key);
CREATE INDEX IF NOT EXISTS idx_objection_logs_lead_created ON public.objection_logs (lead_id, created_at DESC);

COMMENT ON TABLE public.objection_logs IS 'Einwand-Logs - Tracking wie Einwände behandelt wurden und Ergebnis';
COMMENT ON COLUMN public.objection_logs.outcome IS 'Ergebnis: won, lost, pending, neutral';

-- ═════════════════════════════════════════════════════════════════
-- 5️⃣ MODUL: LIABILITY-SHIELD (COMPLIANCE)
-- ═════════════════════════════════════════════════════════════════

-- 5.1 compliance_rules
CREATE TABLE IF NOT EXISTS public.compliance_rules (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  locale             text NOT NULL,         -- 'de-DE','de-AT','en-US',...
  company_id         uuid REFERENCES public.mlm_companies(id) ON DELETE CASCADE,
  category           text NOT NULL,         -- 'health_claim','income_claim','time_pressure','comparative','generic'
  pattern_type       text NOT NULL DEFAULT 'regex',  -- 'regex','keyword'
  pattern            text NOT NULL,         -- regex oder Keyword-Liste (JSON)
  severity           text NOT NULL DEFAULT 'warn',   -- 'info','warn','block'
  suggestion         text,                  -- alternative Formulierung
  legal_reference_url text,                 -- optional: Link zu Gesetz/Guideline
  is_active          boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compliance_rules_locale_category ON public.compliance_rules (locale, category);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_company ON public.compliance_rules (company_id);
CREATE INDEX IF NOT EXISTS idx_compliance_rules_is_active ON public.compliance_rules (is_active);

COMMENT ON TABLE public.compliance_rules IS 'Compliance-Regeln - Liability-Shield für rechtssichere Kommunikation';
COMMENT ON COLUMN public.compliance_rules.category IS 'Kategorie: health_claim, income_claim, time_pressure, comparative, generic';
COMMENT ON COLUMN public.compliance_rules.pattern_type IS 'Pattern-Typ: regex oder keyword';
COMMENT ON COLUMN public.compliance_rules.severity IS 'Schweregrad: info, warn, block';

-- 5.2 compliance_violations
CREATE TABLE IF NOT EXISTS public.compliance_violations (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id       uuid REFERENCES public.mlm_companies(id) ON DELETE CASCADE,
  rule_id          uuid REFERENCES public.compliance_rules(id) ON DELETE SET NULL,
  category         text NOT NULL,          -- wie compliance_rules.category
  severity         text NOT NULL,          -- 'info','warn','block'
  locale           text NOT NULL,

  original_text    text NOT NULL,
  suggested_text   text,                   -- AI Rewrite / safer Version
  status           text NOT NULL DEFAULT 'pending', -- 'pending','accepted','overridden'
  metadata         jsonb NOT NULL DEFAULT '{}'::jsonb, -- z.B. { "channel": "whatsapp" }

  created_at       timestamptz NOT NULL DEFAULT now(),
  resolved_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_compliance_violations_user_created ON public.compliance_violations (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_compliance_violations_company_category ON public.compliance_violations (company_id, category);
CREATE INDEX IF NOT EXISTS idx_compliance_violations_status ON public.compliance_violations (status);

COMMENT ON TABLE public.compliance_violations IS 'Compliance-Verstöße - Log aller erkannten Compliance-Probleme';
COMMENT ON COLUMN public.compliance_violations.status IS 'Status: pending, accepted, overridden';
COMMENT ON COLUMN public.compliance_violations.metadata IS 'JSON-Metadaten z.B. { "channel": "whatsapp", "template_id": "..." }';

-- ═════════════════════════════════════════════════════════════════
-- AUTO-UPDATE TRIGGERS
-- ═════════════════════════════════════════════════════════════════

-- Funktion für updated_at (falls noch nicht existiert)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger für mlm_companies
DROP TRIGGER IF EXISTS trigger_mlm_companies_updated_at ON public.mlm_companies;
CREATE TRIGGER trigger_mlm_companies_updated_at
  BEFORE UPDATE ON public.mlm_companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger für templates
DROP TRIGGER IF EXISTS trigger_templates_updated_at ON public.templates;
CREATE TRIGGER trigger_templates_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger für template_translations
DROP TRIGGER IF EXISTS trigger_template_translations_updated_at ON public.template_translations;
CREATE TRIGGER trigger_template_translations_updated_at
  BEFORE UPDATE ON public.template_translations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger für template_performance
DROP TRIGGER IF EXISTS trigger_template_performance_updated_at ON public.template_performance;
CREATE TRIGGER trigger_template_performance_updated_at
  BEFORE UPDATE ON public.template_performance
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger für objection_templates
DROP TRIGGER IF EXISTS trigger_objection_templates_updated_at ON public.objection_templates;
CREATE TRIGGER trigger_objection_templates_updated_at
  BEFORE UPDATE ON public.objection_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger für compliance_rules
DROP TRIGGER IF EXISTS trigger_compliance_rules_updated_at ON public.compliance_rules;
CREATE TRIGGER trigger_compliance_rules_updated_at
  BEFORE UPDATE ON public.compliance_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ═════════════════════════════════════════════════════════════════
-- SUCCESS MESSAGE
-- ═════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '✅ Multi-Language / Company Core Schema erfolgreich erstellt!';
  RAISE NOTICE '📋 Tabellen: mlm_companies, templates, template_translations, template_performance';
  RAISE NOTICE '🧠 Neuro-Profiler: leads erweitert, disc_analyses';
  RAISE NOTICE '🎮 Speed-Hunter: speed_hunter_sessions, speed_hunter_actions';
  RAISE NOTICE '💪 Einwand-Killer: objection_templates, objection_logs';
  RAISE NOTICE '🛡️ Liability-Shield: compliance_rules, compliance_violations';
  RAISE NOTICE '🔍 Indexes: Alle Performance-Indexes erstellt';
  RAISE NOTICE '⏰ Triggers: Auto-update für updated_at Spalten';
END $$;


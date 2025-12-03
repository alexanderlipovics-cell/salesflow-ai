-- ============================================================================
-- DEPLOY: OUTREACH TRACKER & GHOST FOLLOW-UP SYSTEM
-- ============================================================================
-- 
-- Beschreibung: Social Media Akquise Tracking für MLM
--               Instagram, Facebook, LinkedIn, WhatsApp Nachrichten tracken
--               Ghost-Detection (gelesen aber keine Antwort)
--               Automatische Follow-up Vorschläge
--
-- Deployment:
--   1. In Supabase SQL Editor ausführen
--   2. Backend neu starten
--   3. Frontend neu laden
--
-- ============================================================================

-- ============================================================================
-- 1. ENUMS
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE outreach_platform AS ENUM (
      'instagram',
      'facebook', 
      'linkedin',
      'whatsapp',
      'telegram',
      'tiktok',
      'email',
      'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE outreach_status AS ENUM (
      'sent',           -- Gesendet
      'delivered',      -- Zugestellt (wenn sichtbar)
      'seen',           -- Gelesen/Gesehen (Ghost-Kandidat!)
      'replied',        -- Antwort erhalten
      'positive',       -- Positive Antwort (Interesse)
      'negative',       -- Absage
      'no_response',    -- Keine Reaktion nach X Tagen
      'converted',      -- Lead konvertiert
      'blocked'         -- Blockiert/Spam
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE outreach_type AS ENUM (
      'cold_dm',          -- Kalte Erstnachricht
      'warm_intro',       -- Warme Intro (z.B. nach Like/Kommentar)
      'story_reply',      -- Reaktion auf Story
      'content_share',    -- Content geteilt
      'follow_up_1',      -- 1. Follow-up
      'follow_up_2',      -- 2. Follow-up
      'follow_up_3',      -- 3. Follow-up
      'reactivation',     -- Reaktivierung nach längerer Zeit
      'value_drop'        -- Mehrwert-Nachricht ohne direkte Frage
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 2. HAUPTTABELLE: OUTREACH MESSAGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS outreach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Kontakt-Info
  contact_name TEXT NOT NULL,
  contact_handle TEXT,                    -- @username auf der Plattform
  contact_profile_url TEXT,               -- Link zum Profil
  lead_id UUID REFERENCES leads(id),      -- Optional: Verknüpfung zu bestehendem Lead
  
  -- Plattform & Nachricht
  platform outreach_platform NOT NULL,
  message_type outreach_type NOT NULL DEFAULT 'cold_dm',
  message_preview TEXT,                   -- Kurze Vorschau der Nachricht
  message_template_id UUID,               -- Referenz auf verwendetes Template
  
  -- Status-Tracking
  status outreach_status NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  seen_at TIMESTAMPTZ,                    -- WICHTIG: Wann wurde "gelesen" markiert
  replied_at TIMESTAMPTZ,
  
  -- Ghost-Tracking
  is_ghost BOOLEAN DEFAULT FALSE,         -- Gelesen aber keine Antwort
  ghost_since TIMESTAMPTZ,                -- Seit wann Ghost
  ghost_followup_count INT DEFAULT 0,     -- Wie oft schon nachgefasst
  next_followup_at TIMESTAMPTZ,           -- Wann nächstes Follow-up
  
  -- Kontext
  conversation_starter TEXT,              -- Worauf bezogen (Story, Post, etc.)
  notes TEXT,
  tags TEXT[],
  
  -- Analytics
  response_time_hours NUMERIC,            -- Wie schnell kam Antwort
  conversion_value NUMERIC,               -- Wert wenn konvertiert
  
  -- Sequenz-Tracking
  sequence_id UUID,                       -- Zugehörige Follow-up Sequenz
  sequence_step INT,                      -- Aktueller Schritt in Sequenz
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. OUTREACH TEMPLATES (Plattform-spezifisch)
-- ============================================================================

CREATE TABLE IF NOT EXISTS outreach_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  platform outreach_platform NOT NULL,
  message_type outreach_type NOT NULL,
  
  -- Template-Inhalt
  subject TEXT,                           -- Für Email/LinkedIn InMail
  body TEXT NOT NULL,                     -- Nachrichtentext mit Platzhaltern
  
  -- Platzhalter: {name}, {product}, {hook}, {cta}
  placeholders JSONB DEFAULT '[]',
  
  -- Performance
  times_used INT DEFAULT 0,
  reply_count INT DEFAULT 0,
  positive_count INT DEFAULT 0,
  reply_rate NUMERIC GENERATED ALWAYS AS (
    CASE WHEN times_used > 0 THEN (reply_count::NUMERIC / times_used * 100) ELSE 0 END
  ) STORED,
  
  -- Meta
  is_active BOOLEAN DEFAULT TRUE,
  is_system BOOLEAN DEFAULT FALSE,        -- System-Template vs. User-Template
  tags TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. FOLLOW-UP SEQUENZEN
-- ============================================================================

CREATE TABLE IF NOT EXISTS outreach_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  platform outreach_platform,             -- NULL = alle Plattformen
  
  -- Sequenz-Einstellungen (JSONB)
  steps JSONB NOT NULL DEFAULT '[]',
  
  -- Trigger
  trigger_on_ghost BOOLEAN DEFAULT TRUE,
  ghost_threshold_hours INT DEFAULT 24,
  max_followups INT DEFAULT 3,
  
  -- Performance
  contacts_enrolled INT DEFAULT 0,
  contacts_converted INT DEFAULT 0,
  conversion_rate NUMERIC GENERATED ALWAYS AS (
    CASE WHEN contacts_enrolled > 0 THEN (contacts_converted::NUMERIC / contacts_enrolled * 100) ELSE 0 END
  ) STORED,
  
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. GHOST FOLLOW-UP QUEUE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ghost_followup_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outreach_id UUID NOT NULL REFERENCES outreach_messages(id) ON DELETE CASCADE,
  sequence_id UUID REFERENCES outreach_sequences(id),
  
  -- Status
  scheduled_for TIMESTAMPTZ NOT NULL,
  priority INT DEFAULT 5,                 -- 1-10, höher = wichtiger
  
  -- Vorgeschlagene Nachricht
  suggested_message TEXT,
  suggested_template_id UUID REFERENCES outreach_templates(id),
  
  -- Kontext für CHIEF
  context JSONB DEFAULT '{}',
  
  -- Status
  status TEXT DEFAULT 'pending',          -- pending, sent, skipped, snoozed
  completed_at TIMESTAMPTZ,
  skipped_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. DAILY OUTREACH STATS
-- ============================================================================

CREATE TABLE IF NOT EXISTS outreach_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Aktivität
  messages_sent INT DEFAULT 0,
  messages_delivered INT DEFAULT 0,
  messages_seen INT DEFAULT 0,
  replies_received INT DEFAULT 0,
  positive_replies INT DEFAULT 0,
  
  -- Ghost-Tracking
  new_ghosts INT DEFAULT 0,
  ghosts_converted INT DEFAULT 0,
  followups_sent INT DEFAULT 0,
  
  -- Conversion
  leads_created INT DEFAULT 0,
  deals_closed INT DEFAULT 0,
  
  -- By Platform
  by_platform JSONB DEFAULT '{}',
  
  -- Rates
  seen_rate NUMERIC,
  reply_rate NUMERIC,
  ghost_rate NUMERIC,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, date)
);

-- ============================================================================
-- 7. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_outreach_messages_user ON outreach_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_outreach_messages_status ON outreach_messages(status);
CREATE INDEX IF NOT EXISTS idx_outreach_messages_platform ON outreach_messages(platform);
CREATE INDEX IF NOT EXISTS idx_outreach_messages_ghost ON outreach_messages(is_ghost) WHERE is_ghost = TRUE;
CREATE INDEX IF NOT EXISTS idx_outreach_messages_next_followup ON outreach_messages(next_followup_at) WHERE next_followup_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_outreach_messages_sent_at ON outreach_messages(sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_ghost_queue_user ON ghost_followup_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_ghost_queue_scheduled ON ghost_followup_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_ghost_queue_priority ON ghost_followup_queue(priority DESC, scheduled_for);

CREATE INDEX IF NOT EXISTS idx_outreach_templates_platform ON outreach_templates(platform);
CREATE INDEX IF NOT EXISTS idx_outreach_templates_user ON outreach_templates(user_id);

CREATE INDEX IF NOT EXISTS idx_outreach_daily_stats_user_date ON outreach_daily_stats(user_id, date DESC);

-- ============================================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE outreach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ghost_followup_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_daily_stats ENABLE ROW LEVEL SECURITY;

-- Policies für outreach_messages
DROP POLICY IF EXISTS "Users see own outreach" ON outreach_messages;
CREATE POLICY "Users see own outreach" ON outreach_messages
  FOR ALL USING (auth.uid() = user_id);

-- Policies für outreach_templates
DROP POLICY IF EXISTS "Users see own templates" ON outreach_templates;
CREATE POLICY "Users see own templates" ON outreach_templates
  FOR ALL USING (auth.uid() = user_id OR is_system = TRUE);

-- Policies für outreach_sequences
DROP POLICY IF EXISTS "Users see own sequences" ON outreach_sequences;
CREATE POLICY "Users see own sequences" ON outreach_sequences
  FOR ALL USING (auth.uid() = user_id);

-- Policies für ghost_followup_queue
DROP POLICY IF EXISTS "Users see own queue" ON ghost_followup_queue;
CREATE POLICY "Users see own queue" ON ghost_followup_queue
  FOR ALL USING (auth.uid() = user_id);

-- Policies für outreach_daily_stats
DROP POLICY IF EXISTS "Users see own stats" ON outreach_daily_stats;
CREATE POLICY "Users see own stats" ON outreach_daily_stats
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 9. TRIGGER: Auto-Update Ghost Status
-- ============================================================================

CREATE OR REPLACE FUNCTION update_ghost_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Wenn Status auf 'seen' wechselt und noch keine Antwort
  IF NEW.status = 'seen' AND OLD.status != 'seen' THEN
    NEW.seen_at := NOW();
  END IF;
  
  -- Ghost-Detection: Gesehen aber keine Antwort nach 24h
  IF NEW.seen_at IS NOT NULL 
     AND NEW.replied_at IS NULL 
     AND NEW.seen_at < NOW() - INTERVAL '24 hours'
     AND NEW.is_ghost = FALSE THEN
    NEW.is_ghost := TRUE;
    NEW.ghost_since := NEW.seen_at;
    NEW.next_followup_at := NOW() + INTERVAL '24 hours';
  END IF;
  
  -- Wenn Antwort kommt, Ghost-Status aufheben
  IF NEW.replied_at IS NOT NULL AND OLD.replied_at IS NULL THEN
    NEW.is_ghost := FALSE;
    NEW.next_followup_at := NULL;
    IF NEW.seen_at IS NOT NULL THEN
      NEW.response_time_hours := EXTRACT(EPOCH FROM (NEW.replied_at - NEW.sent_at)) / 3600;
    END IF;
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_ghost_status ON outreach_messages;
CREATE TRIGGER trigger_update_ghost_status
  BEFORE UPDATE ON outreach_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_ghost_status();

-- ============================================================================
-- 10. HELPER FUNCTION: Increment Outreach Stat
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_outreach_stat(
  p_user_id UUID,
  p_date DATE,
  p_field TEXT
)
RETURNS VOID AS $$
BEGIN
  EXECUTE format(
    'UPDATE outreach_daily_stats SET %I = COALESCE(%I, 0) + 1 WHERE user_id = $1 AND date = $2',
    p_field, p_field
  ) USING p_user_id, p_date;
  
  -- Insert if not exists
  IF NOT FOUND THEN
    INSERT INTO outreach_daily_stats (user_id, date)
    VALUES (p_user_id, p_date)
    ON CONFLICT (user_id, date) DO NOTHING;
    
    EXECUTE format(
      'UPDATE outreach_daily_stats SET %I = 1 WHERE user_id = $1 AND date = $2',
      p_field
    ) USING p_user_id, p_date;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 11. SYSTEM TEMPLATES (Starter-Templates pro Plattform)
-- ============================================================================

INSERT INTO outreach_templates (id, name, platform, message_type, body, is_system, tags) VALUES

-- INSTAGRAM Templates
('11111111-0001-0001-0001-000000000001', 'Insta Cold DM - Neugier', 'instagram', 'cold_dm',
'Hey {name}! 👋

Bin gerade auf dein Profil gestoßen und fand deinen Content echt stark. 

Kurze Frage: Bist du offen für neue Einkommensquellen neben dem was du aktuell machst?

Kein Spam, nur ne ehrliche Frage 😊',
TRUE, ARRAY['starter', 'cold', 'curiosity']),

('11111111-0001-0001-0001-000000000002', 'Insta Follow-up 1 - Soft', 'instagram', 'follow_up_1',
'Hey {name}! 

Hab gesehen du hast meine Nachricht gelesen - alles gut wenn gerade viel los ist! 😊

Falls du doch mal schauen willst worum es geht, sag einfach kurz Bescheid. Kein Druck!',
TRUE, ARRAY['followup', 'soft', 'ghost']),

('11111111-0001-0001-0001-000000000003', 'Insta Follow-up 2 - Value', 'instagram', 'follow_up_2',
'Nochmal ich 😄

Wollte dir nur kurz was zeigen was bei mir gerade funktioniert - {hook}

Wenn''s dich interessiert, schick mir einfach ein 👍',
TRUE, ARRAY['followup', 'value', 'ghost']),

('11111111-0001-0001-0001-000000000004', 'Insta Story Reply', 'instagram', 'story_reply',
'Boah, {hook}! 🔥

Das musste ich dir einfach schreiben. Wie lange machst du das schon?',
TRUE, ARRAY['warm', 'story', 'engagement']),

-- FACEBOOK Templates
('11111111-0001-0002-0001-000000000001', 'Facebook Cold DM', 'facebook', 'cold_dm',
'Hi {name}!

Ich hab dein Profil entdeckt und dachte mir, ich frag einfach mal direkt:

Wärst du offen für ein zusätzliches Standbein, das du flexibel von überall machen kannst?

Bin gespannt auf deine ehrliche Antwort 🙂',
TRUE, ARRAY['starter', 'cold', 'direct']),

('11111111-0001-0002-0001-000000000002', 'Facebook Follow-up 1', 'facebook', 'follow_up_1',
'Hey {name}!

Wollte nur kurz nachhaken - hast du meine letzte Nachricht gesehen?

Falls ja und es gerade nicht passt, völlig okay! Aber falls du neugierig bist, lass uns kurz quatschen 😊',
TRUE, ARRAY['followup', 'ghost']),

-- LINKEDIN Templates  
('11111111-0001-0003-0001-000000000001', 'LinkedIn Cold DM - Professional', 'linkedin', 'cold_dm',
'Hallo {name},

ich bin auf Ihr Profil aufmerksam geworden und Ihr Background hat mich neugierig gemacht.

Ich arbeite mit Fach- und Führungskräften zusammen, die sich ein zweites Standbein aufbauen wollen - ohne ihren aktuellen Job aufzugeben.

Wäre das grundsätzlich interessant für Sie?

Beste Grüße',
TRUE, ARRAY['starter', 'cold', 'professional']),

('11111111-0001-0003-0001-000000000002', 'LinkedIn Follow-up 1', 'linkedin', 'follow_up_1',
'Hallo {name},

ich wollte kurz nachfassen bezüglich meiner letzten Nachricht.

Falls das Thema "zusätzliches Einkommen" gerade nicht relevant ist, verstehe ich das vollkommen. Aber falls doch - ich freue mich auf einen kurzen Austausch.

Beste Grüße',
TRUE, ARRAY['followup', 'professional', 'ghost']),

-- WHATSAPP Templates
('11111111-0001-0004-0001-000000000001', 'WhatsApp Warm Intro', 'whatsapp', 'warm_intro',
'Hey {name}! 👋

{hook}

Wollte dich mal fragen: Bist du happy mit dem was du gerade machst oder offen für was Neues?',
TRUE, ARRAY['warm', 'intro']),

('11111111-0001-0004-0001-000000000002', 'WhatsApp Follow-up Quick', 'whatsapp', 'follow_up_1',
'Hey! Alles klar bei dir? 😊

Hatte dir letztens geschrieben - falls du''s verpasst hast, kein Ding. Sag einfach kurz ob''s dich interessiert oder nicht, dann weiß ich Bescheid 👍',
TRUE, ARRAY['followup', 'quick', 'ghost'])

ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 12. DEFAULT SEQUENCE
-- ============================================================================

INSERT INTO outreach_sequences (id, name, description, trigger_on_ghost, ghost_threshold_hours, max_followups, steps, is_active) VALUES
('22222222-0001-0001-0001-000000000001', 
 'Standard Ghost Follow-up',
 'Automatische Follow-up Sequenz für Nachrichten die gelesen aber nicht beantwortet wurden',
 TRUE,
 24,
 3,
 '[
   {"delay_hours": 24, "message_type": "follow_up_1", "note": "Soft nachfassen"},
   {"delay_hours": 72, "message_type": "follow_up_2", "note": "Value Drop"},
   {"delay_hours": 168, "message_type": "follow_up_3", "note": "Letzte Chance"}
 ]'::jsonb,
 TRUE
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- DEPLOYMENT COMPLETE!
-- ============================================================================

-- Verify installation
DO $$
BEGIN
  RAISE NOTICE '✅ Outreach Tracker System deployed successfully!';
  RAISE NOTICE '   Tables: outreach_messages, outreach_templates, outreach_sequences, ghost_followup_queue, outreach_daily_stats';
  RAISE NOTICE '   System templates: 10 pre-built templates for Instagram, Facebook, LinkedIn, WhatsApp';
END $$;


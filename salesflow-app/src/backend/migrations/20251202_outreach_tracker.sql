-- ============================================================================
-- OUTREACH TRACKER & GHOST FOLLOW-UP SYSTEM
-- MLM Social Media Akquise Tracking für Instagram, Facebook, LinkedIn
-- ============================================================================

-- Plattformen für Outreach
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

-- Status einer Outreach-Nachricht
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

-- Nachrichtentypen
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

-- ============================================================================
-- HAUPTTABELLE: OUTREACH MESSAGES
-- ============================================================================
CREATE TABLE outreach_messages (
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
-- OUTREACH TEMPLATES (Plattform-spezifisch)
-- ============================================================================
CREATE TABLE outreach_templates (
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
-- FOLLOW-UP SEQUENZEN
-- ============================================================================
CREATE TABLE outreach_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  platform outreach_platform,             -- NULL = alle Plattformen
  
  -- Sequenz-Einstellungen
  steps JSONB NOT NULL DEFAULT '[]',
  -- Format: [
  --   { "delay_hours": 24, "template_id": "...", "message_type": "follow_up_1" },
  --   { "delay_hours": 72, "template_id": "...", "message_type": "follow_up_2" },
  --   { "delay_hours": 168, "template_id": "...", "message_type": "follow_up_3" }
  -- ]
  
  -- Trigger
  trigger_on_ghost BOOLEAN DEFAULT TRUE,  -- Startet bei Ghost-Status
  ghost_threshold_hours INT DEFAULT 24,   -- Ab wann gilt "Ghost"
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
-- GHOST FOLLOW-UP QUEUE (Aktuelle anstehende Follow-ups)
-- ============================================================================
CREATE TABLE ghost_followup_queue (
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
  -- { platform, original_message, time_since_seen, contact_info, ... }
  
  -- Status
  status TEXT DEFAULT 'pending',          -- pending, sent, skipped, snoozed
  completed_at TIMESTAMPTZ,
  skipped_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- DAILY OUTREACH STATS (Für Dashboard)
-- ============================================================================
CREATE TABLE outreach_daily_stats (
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
  ghosts_converted INT DEFAULT 0,         -- Ghosts die doch geantwortet haben
  followups_sent INT DEFAULT 0,
  
  -- Conversion
  leads_created INT DEFAULT 0,
  deals_closed INT DEFAULT 0,
  
  -- By Platform (JSONB für Flexibilität)
  by_platform JSONB DEFAULT '{}',
  -- { "instagram": { sent: 20, seen: 15, replied: 3 }, ... }
  
  -- Rates (berechnet)
  seen_rate NUMERIC,
  reply_rate NUMERIC,
  ghost_rate NUMERIC,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, date)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_outreach_messages_user ON outreach_messages(user_id);
CREATE INDEX idx_outreach_messages_status ON outreach_messages(status);
CREATE INDEX idx_outreach_messages_platform ON outreach_messages(platform);
CREATE INDEX idx_outreach_messages_ghost ON outreach_messages(is_ghost) WHERE is_ghost = TRUE;
CREATE INDEX idx_outreach_messages_next_followup ON outreach_messages(next_followup_at) WHERE next_followup_at IS NOT NULL;
CREATE INDEX idx_outreach_messages_sent_at ON outreach_messages(sent_at DESC);

CREATE INDEX idx_ghost_queue_user ON ghost_followup_queue(user_id);
CREATE INDEX idx_ghost_queue_scheduled ON ghost_followup_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_ghost_queue_priority ON ghost_followup_queue(priority DESC, scheduled_for);

CREATE INDEX idx_outreach_templates_platform ON outreach_templates(platform);
CREATE INDEX idx_outreach_templates_user ON outreach_templates(user_id);

CREATE INDEX idx_outreach_daily_stats_user_date ON outreach_daily_stats(user_id, date DESC);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE outreach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ghost_followup_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_daily_stats ENABLE ROW LEVEL SECURITY;

-- User sieht nur eigene Daten
CREATE POLICY "Users see own outreach" ON outreach_messages
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users see own templates" ON outreach_templates
  FOR ALL USING (auth.uid() = user_id OR is_system = TRUE);

CREATE POLICY "Users see own sequences" ON outreach_sequences
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users see own queue" ON ghost_followup_queue
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users see own stats" ON outreach_daily_stats
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- TRIGGER: Auto-Update Ghost Status
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
    -- Setze nächstes Follow-up (24h nach Ghost-Status)
    NEW.next_followup_at := NOW() + INTERVAL '24 hours';
  END IF;
  
  -- Wenn Antwort kommt, Ghost-Status aufheben
  IF NEW.replied_at IS NOT NULL AND OLD.replied_at IS NULL THEN
    NEW.is_ghost := FALSE;
    NEW.next_followup_at := NULL;
    -- Response-Time berechnen
    IF NEW.seen_at IS NOT NULL THEN
      NEW.response_time_hours := EXTRACT(EPOCH FROM (NEW.replied_at - NEW.sent_at)) / 3600;
    END IF;
  END IF;
  
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_ghost_status
  BEFORE UPDATE ON outreach_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_ghost_status();

-- ============================================================================
-- FUNCTION: Scheduled Ghost-Check (für Cron-Job)
-- ============================================================================
CREATE OR REPLACE FUNCTION check_and_create_ghost_followups()
RETURNS INTEGER AS $$
DECLARE
  ghost_count INTEGER := 0;
  rec RECORD;
BEGIN
  -- Finde alle Nachrichten die:
  -- 1. Gesehen wurden (seen_at nicht NULL)
  -- 2. Keine Antwort haben (replied_at IS NULL)
  -- 3. Älter als 24h seit gesehen
  -- 4. Noch nicht als Ghost markiert ODER Follow-up fällig
  
  FOR rec IN 
    SELECT om.* 
    FROM outreach_messages om
    WHERE om.seen_at IS NOT NULL
      AND om.replied_at IS NULL
      AND om.status NOT IN ('replied', 'positive', 'negative', 'converted', 'blocked')
      AND (
        -- Neu als Ghost markieren
        (om.is_ghost = FALSE AND om.seen_at < NOW() - INTERVAL '24 hours')
        OR
        -- Follow-up fällig
        (om.is_ghost = TRUE AND om.next_followup_at IS NOT NULL AND om.next_followup_at <= NOW())
      )
  LOOP
    -- Update Ghost-Status
    IF rec.is_ghost = FALSE THEN
      UPDATE outreach_messages 
      SET is_ghost = TRUE, 
          ghost_since = rec.seen_at,
          next_followup_at = NOW()
      WHERE id = rec.id;
    END IF;
    
    -- Erstelle Follow-up Queue Eintrag (wenn nicht schon vorhanden)
    INSERT INTO ghost_followup_queue (user_id, outreach_id, scheduled_for, priority, context)
    SELECT 
      rec.user_id,
      rec.id,
      NOW(),
      CASE 
        WHEN rec.ghost_followup_count = 0 THEN 8  -- Erstes Follow-up = hohe Prio
        WHEN rec.ghost_followup_count = 1 THEN 6
        ELSE 4
      END,
      jsonb_build_object(
        'platform', rec.platform,
        'contact_name', rec.contact_name,
        'original_message', rec.message_preview,
        'ghost_hours', EXTRACT(EPOCH FROM (NOW() - rec.seen_at)) / 3600,
        'followup_count', rec.ghost_followup_count
      )
    WHERE NOT EXISTS (
      SELECT 1 FROM ghost_followup_queue gfq 
      WHERE gfq.outreach_id = rec.id AND gfq.status = 'pending'
    );
    
    ghost_count := ghost_count + 1;
  END LOOP;
  
  RETURN ghost_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- SYSTEM TEMPLATES (Starter-Templates pro Plattform)
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
TRUE, ARRAY['followup', 'quick', 'ghost']);

-- ============================================================================
-- DEFAULT SEQUENCE: Standard Ghost-Sequenz
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
);

COMMENT ON TABLE outreach_messages IS 'Tracking aller ausgehenden Nachrichten auf Social Media Plattformen';
COMMENT ON TABLE ghost_followup_queue IS 'Queue für anstehende Follow-ups bei Ghost-Kontakten';
COMMENT ON COLUMN outreach_messages.is_ghost IS 'TRUE wenn Nachricht gelesen aber nicht beantwortet wurde (>24h)';


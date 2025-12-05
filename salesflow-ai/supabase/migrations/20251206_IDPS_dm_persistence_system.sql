-- ============================================================================
-- INTELLIGENTES DM-PERSISTENZ-SYSTEM (IDPS)
-- Non Plus Ultra: Unified Inbox über alle Plattformen
-- ============================================================================

-- ============================================================================
-- 1. DM CONVERSATIONS - Konsolidierte Gespräche über alle Plattformen
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.dm_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    contact_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    
    -- Plattform-Identifikation
    platform VARCHAR(30) NOT NULL CHECK (platform IN ('whatsapp', 'linkedin', 'instagram', 'facebook', 'email', 'sms')),
    platform_conversation_id VARCHAR(500),  -- Original-ID der Plattform
    platform_contact_handle VARCHAR(300),   -- Username/Handle/Nummer auf der Plattform
    
    -- Status-Management (IDPS Core)
    status VARCHAR(50) NOT NULL DEFAULT 'new' CHECK (status IN (
        'new',                      -- Neu, noch keine Nachricht
        'dm_initiated_no_response', -- DM gesendet, keine Antwort
        'read_no_reply',            -- Gelesen aber keine Antwort
        'replied',                  -- Kontakt hat geantwortet
        'needs_human_attention',    -- Braucht menschliche Intervention
        'in_sequence',              -- In automatischer Follow-up-Sequenz
        'delay_requested',          -- Kontakt bat um Verzögerung
        'converted',                -- Konvertiert (Termin/Sale)
        'archived',                 -- Archiviert/Abgeschlossen
        'unsubscribed'              -- Opt-out
    )),
    
    -- Follow-up Sequenz Tracking
    current_sequence_phase INTEGER DEFAULT 0,  -- P1, P2, P3, P4...
    last_sequence_action_at TIMESTAMPTZ,
    next_sequence_action_at TIMESTAMPTZ,
    sequence_paused BOOLEAN DEFAULT FALSE,
    pause_until TIMESTAMPTZ,
    
    -- Engagement Metrics
    messages_sent INTEGER DEFAULT 0,
    messages_received INTEGER DEFAULT 0,
    last_message_at TIMESTAMPTZ,
    last_inbound_at TIMESTAMPTZ,
    last_outbound_at TIMESTAMPTZ,
    avg_response_time_hours DECIMAL(10,2),
    
    -- Sentiment & Intent
    overall_sentiment VARCHAR(20) DEFAULT 'neutral' CHECK (overall_sentiment IN ('positive', 'neutral', 'negative', 'interested', 'hesitant')),
    detected_intent VARCHAR(50),
    priority_score INTEGER DEFAULT 50 CHECK (priority_score BETWEEN 0 AND 100),
    
    -- Platform-spezifische Metadaten
    platform_metadata JSONB DEFAULT '{}'::jsonb,
    /*
    Beispiel für LinkedIn:
    {
        "profile_url": "https://linkedin.com/in/...",
        "connections": 500,
        "headline": "CEO at...",
        "is_premium": true
    }
    */
    
    -- Deep-Link zurück zur Plattform
    deep_link_url TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_dm_conversations_user_status ON public.dm_conversations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_dm_conversations_platform ON public.dm_conversations(platform);
CREATE INDEX IF NOT EXISTS idx_dm_conversations_next_action ON public.dm_conversations(next_sequence_action_at) WHERE next_sequence_action_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dm_conversations_contact ON public.dm_conversations(contact_id) WHERE contact_id IS NOT NULL;

-- ============================================================================
-- 2. DM MESSAGES - Einzelne Nachrichten innerhalb einer Conversation
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.dm_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.dm_conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    
    -- Nachrichteninhalt
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    content TEXT NOT NULL,
    content_type VARCHAR(20) DEFAULT 'text' CHECK (content_type IN ('text', 'image', 'video', 'audio', 'file', 'link', 'emoji_reaction')),
    
    -- Plattform-spezifische IDs
    platform_message_id VARCHAR(500),
    
    -- Status
    delivery_status VARCHAR(20) DEFAULT 'sent' CHECK (delivery_status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    read_at TIMESTAMPTZ,
    
    -- KI-Generierung
    is_ai_generated BOOLEAN DEFAULT FALSE,
    ai_template_used VARCHAR(100),
    ai_persona_variant VARCHAR(50),
    
    -- Sequenz-Tracking
    sequence_phase INTEGER,
    sequence_message_type VARCHAR(50),  -- trust_message, clarity_message, pivot_message, etc.
    
    -- Analyse
    sentiment VARCHAR(20),
    contains_question BOOLEAN DEFAULT FALSE,
    contains_objection BOOLEAN DEFAULT FALSE,
    contains_interest_signal BOOLEAN DEFAULT FALSE,
    detected_keywords JSONB DEFAULT '[]'::jsonb,
    
    -- Timestamps
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_dm_messages_conversation ON public.dm_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_dm_messages_direction ON public.dm_messages(direction);
CREATE INDEX IF NOT EXISTS idx_dm_messages_sent_at ON public.dm_messages(sent_at DESC);

-- ============================================================================
-- 3. DM SEQUENCE TEMPLATES - Follow-up Sequenzen für IDPS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.dm_sequence_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,  -- NULL = globale Templates
    
    -- Template Info
    name VARCHAR(200) NOT NULL,
    description TEXT,
    platform VARCHAR(30),  -- NULL = alle Plattformen
    
    -- Sequenz-Definition (JSON Array)
    sequence_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    /*
    Format:
    [
        {
            "phase": 1,
            "name": "first_contact",
            "delay_hours": 0,
            "message_template": "Hey {{name}}! 👋...",
            "is_ai_generated": false
        },
        {
            "phase": 2,
            "name": "trust_message",
            "delay_hours": 48,
            "message_template": "Ich sehe, du hast meine letzte Nachricht...",
            "is_ai_generated": true,
            "ai_prompt": "Generiere eine Trust-Message..."
        },
        {
            "phase": 3,
            "name": "clarity_message",
            "delay_hours": 120,  // 5 Tage
            "message_template": "Mein System meldet...",
            "is_ai_generated": true
        },
        {
            "phase": 4,
            "name": "pivot_message",
            "delay_hours": 288,  // 12 Tage
            "message_template": null,  // Wird komplett von KI generiert
            "is_ai_generated": true,
            "ai_prompt": "Finde einen neuen Anknüpfungspunkt..."
        }
    ]
    */
    
    -- Performance
    times_used INTEGER DEFAULT 0,
    avg_response_rate DECIMAL(5,2),
    avg_conversion_rate DECIMAL(5,2),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. DM AUTOMATION RULES - Regeln für automatische Status-Änderungen
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.dm_automation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    
    -- Regel-Definition
    name VARCHAR(200) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 100,  -- Niedrigere Zahl = höhere Priorität
    
    -- Trigger-Bedingungen (JSON)
    trigger_conditions JSONB NOT NULL,
    /*
    Format:
    {
        "event_type": "message_received" | "message_read" | "no_response_timeout",
        "platform": "linkedin" | null,  // null = alle
        "conditions": [
            {"field": "content", "operator": "contains", "value": "keine Zeit"},
            {"field": "content", "operator": "contains", "value": "später"}
        ]
    }
    */
    
    -- Aktionen (JSON)
    actions JSONB NOT NULL,
    /*
    Format:
    {
        "set_status": "delay_requested",
        "set_pause_until": "+14 days",
        "generate_ai_reply": false,
        "send_notification": true,
        "add_tag": "delay_requested"
    }
    */
    
    -- Statistiken
    times_triggered INTEGER DEFAULT 0,
    last_triggered_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. PLATFORM CONNECTIONS - OAuth/API-Verbindungen zu Plattformen
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.platform_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    
    -- Plattform
    platform VARCHAR(30) NOT NULL CHECK (platform IN ('gmail', 'whatsapp_business', 'linkedin', 'instagram', 'facebook', 'outlook')),
    
    -- OAuth Tokens (verschlüsselt speichern!)
    access_token TEXT,  -- In Production: verschlüsselt
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    
    -- API Credentials (für WhatsApp Business etc.)
    api_key TEXT,
    api_secret TEXT,
    phone_number_id VARCHAR(100),  -- Für WhatsApp Business
    
    -- Webhook-Konfiguration
    webhook_url TEXT,
    webhook_secret VARCHAR(200),
    webhook_verified BOOLEAN DEFAULT FALSE,
    
    -- Sync-Status
    is_connected BOOLEAN DEFAULT FALSE,
    last_sync_at TIMESTAMPTZ,
    sync_cursor TEXT,  -- Für inkrementelle Syncs
    
    -- Metadaten
    account_email VARCHAR(300),
    account_name VARCHAR(200),
    account_id VARCHAR(200),
    
    -- Fehler-Tracking
    last_error TEXT,
    error_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, platform)
);

-- ============================================================================
-- 6. FUNCTIONS: Automatische Status-Updates
-- ============================================================================

-- Funktion: Aktualisiert Conversation-Stats nach neuer Nachricht
CREATE OR REPLACE FUNCTION update_conversation_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.dm_conversations
    SET
        messages_sent = CASE WHEN NEW.direction = 'outbound' THEN messages_sent + 1 ELSE messages_sent END,
        messages_received = CASE WHEN NEW.direction = 'inbound' THEN messages_received + 1 ELSE messages_received END,
        last_message_at = NEW.sent_at,
        last_inbound_at = CASE WHEN NEW.direction = 'inbound' THEN NEW.sent_at ELSE last_inbound_at END,
        last_outbound_at = CASE WHEN NEW.direction = 'outbound' THEN NEW.sent_at ELSE last_outbound_at END,
        updated_at = NOW(),
        -- Auto-Status-Update bei Inbound
        status = CASE 
            WHEN NEW.direction = 'inbound' AND status IN ('dm_initiated_no_response', 'read_no_reply', 'in_sequence') 
            THEN 'replied'
            ELSE status
        END
    WHERE id = NEW.conversation_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_conversation_stats ON public.dm_messages;
CREATE TRIGGER trg_update_conversation_stats
    AFTER INSERT ON public.dm_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_conversation_stats();

-- Funktion: Berechne Best Time to Contact
CREATE OR REPLACE FUNCTION calculate_best_contact_time(p_conversation_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
    best_hour INTEGER;
    best_day VARCHAR(10);
    result VARCHAR(50);
BEGIN
    -- Finde die Stunde mit den meisten Inbound-Nachrichten
    SELECT 
        EXTRACT(HOUR FROM sent_at)::INTEGER,
        TO_CHAR(sent_at, 'Day')
    INTO best_hour, best_day
    FROM public.dm_messages
    WHERE conversation_id = p_conversation_id
      AND direction = 'inbound'
    GROUP BY EXTRACT(HOUR FROM sent_at), TO_CHAR(sent_at, 'Day')
    ORDER BY COUNT(*) DESC
    LIMIT 1;
    
    IF best_hour IS NOT NULL THEN
        result := TRIM(best_day) || ' ' || LPAD(best_hour::TEXT, 2, '0') || ':00';
    ELSE
        result := 'Nicht genug Daten';
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. VIEWS für Unified Inbox
-- ============================================================================

-- Hauptansicht: Unified Inbox mit allen wichtigen Infos
CREATE OR REPLACE VIEW public.v_unified_inbox AS
SELECT 
    c.id,
    c.user_id,
    c.contact_id,
    c.platform,
    c.platform_contact_handle,
    c.status,
    c.current_sequence_phase,
    c.next_sequence_action_at,
    c.messages_sent,
    c.messages_received,
    c.last_message_at,
    c.overall_sentiment,
    c.priority_score,
    c.deep_link_url,
    c.created_at,
    -- Letzter Nachrichtentext
    (
        SELECT content 
        FROM public.dm_messages m 
        WHERE m.conversation_id = c.id 
        ORDER BY sent_at DESC 
        LIMIT 1
    ) AS last_message_preview,
    -- Letzte Nachricht Richtung
    (
        SELECT direction 
        FROM public.dm_messages m 
        WHERE m.conversation_id = c.id 
        ORDER BY sent_at DESC 
        LIMIT 1
    ) AS last_message_direction,
    -- Ungelesene Nachrichten (Inbound ohne Reply)
    (
        SELECT COUNT(*) 
        FROM public.dm_messages m 
        WHERE m.conversation_id = c.id 
          AND m.direction = 'inbound'
          AND m.sent_at > COALESCE(c.last_outbound_at, '1970-01-01')
    ) AS unread_count,
    -- Tage seit letztem Kontakt
    EXTRACT(DAY FROM NOW() - c.last_message_at) AS days_since_last_contact,
    -- Lead-Infos (falls verknüpft)
    l.name AS contact_name,
    l.email AS contact_email,
    l.p_score AS contact_p_score
FROM public.dm_conversations c
LEFT JOIN public.leads l ON c.contact_id = l.id;

-- Filter-View: Nur Conversations die Aufmerksamkeit brauchen
CREATE OR REPLACE VIEW public.v_inbox_needs_attention AS
SELECT * FROM public.v_unified_inbox
WHERE status IN ('needs_human_attention', 'replied')
   OR (status = 'in_sequence' AND next_sequence_action_at <= NOW())
   OR (status = 'dm_initiated_no_response' AND last_outbound_at < NOW() - INTERVAL '3 days')
ORDER BY 
    CASE status 
        WHEN 'needs_human_attention' THEN 1 
        WHEN 'replied' THEN 2 
        ELSE 3 
    END,
    priority_score DESC,
    last_message_at DESC;

-- ============================================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.dm_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_sequence_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dm_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_connections ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own conversations" ON public.dm_conversations
    FOR ALL TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can view messages in their conversations" ON public.dm_messages
    FOR ALL TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can view their own templates" ON public.dm_sequence_templates
    FOR ALL TO authenticated USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users can manage their own rules" ON public.dm_automation_rules
    FOR ALL TO authenticated USING (user_id IS NULL OR user_id = auth.uid());

CREATE POLICY "Users can manage their connections" ON public.platform_connections
    FOR ALL TO authenticated USING (user_id = auth.uid());

-- ============================================================================
-- 9. DEFAULT DATA: Standard-Sequenz-Template
-- ============================================================================

INSERT INTO public.dm_sequence_templates (name, description, sequence_steps, is_default)
VALUES (
    'IDPS Standard-Sequenz',
    'Die Non Plus Ultra 4-Phasen Follow-up Sequenz für DM-Akquise',
    '[
        {
            "phase": 1,
            "name": "first_contact",
            "delay_hours": 0,
            "message_template": null,
            "is_ai_generated": false,
            "description": "Manueller Erstkontakt für Authentizität"
        },
        {
            "phase": 2,
            "name": "trust_message",
            "delay_hours": 48,
            "message_template": "Ich sehe, du hast meine letzte Nachricht wahrscheinlich nur kurz überflogen oder bist gerade beschäftigt. Kein Problem! Ich wollte dir nur kurz einen Mehrwert bieten – {{value_content_link}}",
            "is_ai_generated": true,
            "ai_prompt": "Generiere eine nicht-invasive Trust-Message die Mehrwert bietet und Authentizität zeigt. Erwähne einen kostenlosen Branchen-Insight.",
            "description": "Stellt Echtheit her, bietet Wert, minimiert Scam-Gefühl"
        },
        {
            "phase": 3,
            "name": "clarity_message", 
            "delay_hours": 120,
            "message_template": "Mein System meldet, dass ich hier noch auf eine Antwort warte. Nur kurz zur Klarstellung: Ist das Thema aktuell irrelevant für dich, oder bist du gerade einfach nur im Stress und ich soll mich in 2 Wochen melden?",
            "is_ai_generated": true,
            "ai_prompt": "Generiere eine Clarity-Message die eine klare Statusänderung erzwingt (Stop oder Delay).",
            "description": "Erzwingt klare Statusänderung"
        },
        {
            "phase": 4,
            "name": "pivot_message",
            "delay_hours": 288,
            "message_template": null,
            "is_ai_generated": true,
            "ai_prompt": "Analysiere das LinkedIn/Instagram-Profil des Leads und finde einen neuen Berührungspunkt. Generiere eine Pivot-Message mit neuem Thema basierend auf Intent Data.",
            "description": "Findet neuen Berührungspunkt um ursprüngliche Blockade zu umgehen"
        }
    ]'::jsonb,
    TRUE
)
ON CONFLICT DO NOTHING;

-- Standard Automation Rules
INSERT INTO public.dm_automation_rules (name, description, trigger_conditions, actions, priority)
VALUES 
(
    'Delay bei Zeitangabe',
    'Wenn Kontakt "keine Zeit", "später", "Stress" erwähnt → 2 Wochen Pause',
    '{
        "event_type": "message_received",
        "conditions": [
            {"field": "content", "operator": "contains_any", "values": ["keine Zeit", "später", "Stress", "gerade busy", "melde mich"]}
        ]
    }'::jsonb,
    '{
        "set_status": "delay_requested",
        "set_pause_until": "+14 days",
        "send_notification": true,
        "notification_message": "Kontakt bat um Verzögerung - automatisch auf 2 Wochen gesetzt"
    }'::jsonb,
    10
),
(
    'Interesse erkannt',
    'Bei konkreten Fragen oder Interesse → Needs Human Attention',
    '{
        "event_type": "message_received",
        "conditions": [
            {"field": "content", "operator": "contains_any", "values": ["wie funktioniert", "was kostet", "interessiert mich", "erzähl mir mehr", "Termin", "Call"]}
        ]
    }'::jsonb,
    '{
        "set_status": "needs_human_attention",
        "generate_ai_draft": true,
        "send_notification": true,
        "notification_message": "🔥 Hot Lead! Interesse erkannt - sofortige Reaktion empfohlen"
    }'::jsonb,
    5
),
(
    'Opt-Out erkannt',
    'Bei Abmeldewunsch → Unsubscribe',
    '{
        "event_type": "message_received",
        "conditions": [
            {"field": "content", "operator": "contains_any", "values": ["nicht mehr schreiben", "stop", "unsubscribe", "kein Interesse mehr", "lass mich in Ruhe"]}
        ]
    }'::jsonb,
    '{
        "set_status": "unsubscribed",
        "stop_sequence": true,
        "send_notification": true
    }'::jsonb,
    1
)
ON CONFLICT DO NOTHING;

-- Kommentare
COMMENT ON TABLE public.dm_conversations IS 'IDPS: Konsolidierte DM-Gespräche über alle Plattformen (LinkedIn, Instagram, WhatsApp, etc.)';
COMMENT ON TABLE public.dm_messages IS 'IDPS: Einzelne Nachrichten innerhalb einer DM-Conversation';
COMMENT ON TABLE public.dm_sequence_templates IS 'IDPS: Follow-up Sequenz-Templates (P1, P2, P3, P4...)';
COMMENT ON TABLE public.dm_automation_rules IS 'IDPS: Automatische Status-Änderungen basierend auf Triggern';
COMMENT ON TABLE public.platform_connections IS 'OAuth/API-Verbindungen zu externen Plattformen';




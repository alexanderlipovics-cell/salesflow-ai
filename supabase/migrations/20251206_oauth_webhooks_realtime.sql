-- ============================================================================
-- OAUTH & WEBHOOKS ECHTZEIT-INTEGRATION
-- Non Plus Ultra: Gmail Push Notifications & WhatsApp Business API
-- ============================================================================

-- ============================================================================
-- 1. OAUTH TOKENS - Sichere Token-Speicherung (verschlüsselt)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.oauth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    
    -- Provider-Identifikation
    provider VARCHAR(50) NOT NULL CHECK (provider IN (
        'google',           -- Gmail, Calendar, etc.
        'microsoft',        -- Outlook, Teams
        'whatsapp_business',-- WhatsApp Business API (Meta)
        'linkedin',         -- LinkedIn API
        'facebook',         -- Facebook/Instagram Graph API
        'twitter',          -- Twitter API
        'calendly'          -- Calendly Integration
    )),
    
    -- OAuth Tokens (sollten in Production verschlüsselt sein!)
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_type VARCHAR(50) DEFAULT 'Bearer',
    
    -- Token-Metadata
    expires_at TIMESTAMPTZ,
    scopes TEXT[],  -- z.B. ['gmail.readonly', 'gmail.send']
    
    -- Provider-spezifische IDs
    provider_user_id VARCHAR(200),
    provider_email VARCHAR(300),
    
    -- Status
    is_valid BOOLEAN DEFAULT TRUE,
    last_refresh_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    
    -- Error Tracking
    refresh_error_count INTEGER DEFAULT 0,
    last_error TEXT,
    last_error_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, provider)
);

-- Index für schnelle Lookups
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_provider ON public.oauth_tokens(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_expires ON public.oauth_tokens(expires_at) WHERE is_valid = TRUE;

-- ============================================================================
-- 2. WEBHOOK SUBSCRIPTIONS - Push-Benachrichtigungen von Providern
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.webhook_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    
    -- Provider & Resource
    provider VARCHAR(50) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,  -- z.B. 'gmail_inbox', 'whatsapp_messages', 'calendar_events'
    resource_id VARCHAR(500),  -- Provider-spezifische Resource ID
    
    -- Webhook-Konfiguration
    webhook_url TEXT NOT NULL,
    webhook_secret VARCHAR(200),
    
    -- Google Watch spezifisch
    google_history_id VARCHAR(100),
    google_expiration TIMESTAMPTZ,
    
    -- Meta (WhatsApp/Instagram) spezifisch
    meta_verify_token VARCHAR(200),
    meta_app_secret VARCHAR(200),
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_notification_at TIMESTAMPTZ,
    notification_count INTEGER DEFAULT 0,
    
    -- Fehler
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    paused_until TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Index
CREATE INDEX IF NOT EXISTS idx_webhook_subs_user ON public.webhook_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_subs_active ON public.webhook_subscriptions(is_active) WHERE is_active = TRUE;

-- ============================================================================
-- 3. WEBHOOK EVENTS LOG - Eingehende Webhook-Events
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.webhook_events_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES public.webhook_subscriptions(id) ON DELETE SET NULL,
    user_id UUID,
    
    -- Event-Details
    provider VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,  -- z.B. 'email.received', 'message.delivered', 'calendar.updated'
    
    -- Payload (anonymisiert/gekürzt für Compliance)
    payload_hash VARCHAR(64),  -- SHA256 des Original-Payloads
    payload_summary JSONB,     -- Relevante Felder ohne PII
    
    -- Verarbeitung
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN (
        'pending',
        'processing',
        'processed',
        'failed',
        'skipped'
    )),
    processed_at TIMESTAMPTZ,
    processing_result JSONB,
    error_message TEXT,
    
    -- Deduplizierung
    idempotency_key VARCHAR(200),
    
    -- Timing
    received_at TIMESTAMPTZ DEFAULT NOW(),
    provider_timestamp TIMESTAMPTZ,
    processing_latency_ms INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_webhook_events_user ON public.webhook_events_log(user_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON public.webhook_events_log(processing_status) WHERE processing_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_webhook_events_idempotency ON public.webhook_events_log(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_webhook_events_received ON public.webhook_events_log(received_at DESC);

-- ============================================================================
-- 4. EMAIL SYNC STATE - Gmail Sync-Tracking
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.email_sync_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    
    -- Gmail-spezifisch
    gmail_history_id VARCHAR(100),
    gmail_next_page_token TEXT,
    
    -- Sync-Status
    last_full_sync_at TIMESTAMPTZ,
    last_incremental_sync_at TIMESTAMPTZ,
    messages_synced_count INTEGER DEFAULT 0,
    
    -- Labels/Folders die synchronisiert werden
    sync_labels TEXT[] DEFAULT ARRAY['INBOX', 'SENT'],
    
    -- Sync-Einstellungen
    sync_enabled BOOLEAN DEFAULT TRUE,
    sync_interval_minutes INTEGER DEFAULT 5,
    max_messages_per_sync INTEGER DEFAULT 50,
    
    -- Fehler
    consecutive_errors INTEGER DEFAULT 0,
    last_error TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- ============================================================================
-- 5. WHATSAPP BUSINESS CONFIG - WhatsApp Business API Konfiguration
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_business_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    
    -- Meta Business Account
    waba_id VARCHAR(100),  -- WhatsApp Business Account ID
    phone_number_id VARCHAR(100),
    display_phone_number VARCHAR(30),
    business_name VARCHAR(200),
    
    -- API Credentials
    access_token TEXT,  -- Long-lived Page Access Token
    app_secret VARCHAR(200),
    
    -- Webhook
    webhook_verify_token VARCHAR(200),
    webhook_registered BOOLEAN DEFAULT FALSE,
    
    -- Message Templates (vordefinierte Nachrichten für 24h-Fenster)
    approved_templates JSONB DEFAULT '[]'::jsonb,
    /*
    Format:
    [
        {
            "name": "follow_up_reminder",
            "language": "de",
            "category": "MARKETING",
            "status": "approved",
            "components": [...]
        }
    ]
    */
    
    -- Rate Limits
    daily_limit INTEGER DEFAULT 1000,
    messages_sent_today INTEGER DEFAULT 0,
    limit_reset_at TIMESTAMPTZ,
    
    -- Status
    is_verified BOOLEAN DEFAULT FALSE,
    quality_rating VARCHAR(20),  -- GREEN, YELLOW, RED
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- ============================================================================
-- 6. REALTIME MESSAGE QUEUE - Echtzeit-Nachrichten-Warteschlange
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.realtime_message_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    
    -- Nachricht
    channel VARCHAR(30) NOT NULL,
    direction VARCHAR(10) NOT NULL,
    
    -- Absender/Empfänger
    from_address TEXT NOT NULL,
    to_address TEXT NOT NULL,
    
    -- Inhalt
    subject TEXT,
    body TEXT NOT NULL,
    
    -- Provider-IDs
    provider_message_id VARCHAR(500),
    provider_thread_id VARCHAR(500),
    
    -- Lead-Zuordnung
    contact_id UUID,
    conversation_id UUID REFERENCES public.dm_conversations(id),
    
    -- Verarbeitung
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending',
        'matched',      -- Lead/Conversation zugeordnet
        'processed',    -- Autopilot hat verarbeitet
        'sent',         -- Outbound gesendet
        'failed'
    )),
    
    -- Matching
    matched_by VARCHAR(50),  -- email, phone, name, manual
    match_confidence DECIMAL(5,2),
    
    -- Timing
    received_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_realtime_queue_user ON public.realtime_message_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_realtime_queue_status ON public.realtime_message_queue(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_realtime_queue_contact ON public.realtime_message_queue(contact_id);

-- ============================================================================
-- 7. FUNCTIONS: Token-Refresh und Event-Processing
-- ============================================================================

-- Funktion: Prüft ob Token abgelaufen ist
CREATE OR REPLACE FUNCTION is_token_expired(p_user_id UUID, p_provider VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
    token_expires TIMESTAMPTZ;
BEGIN
    SELECT expires_at INTO token_expires
    FROM public.oauth_tokens
    WHERE user_id = p_user_id AND provider = p_provider AND is_valid = TRUE;
    
    IF token_expires IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- 5 Minuten Puffer
    RETURN token_expires < (NOW() + INTERVAL '5 minutes');
END;
$$ LANGUAGE plpgsql;

-- Funktion: Aktualisiert Token nach Refresh
CREATE OR REPLACE FUNCTION update_oauth_token(
    p_user_id UUID,
    p_provider VARCHAR,
    p_access_token TEXT,
    p_expires_in INTEGER DEFAULT 3600
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.oauth_tokens
    SET 
        access_token = p_access_token,
        expires_at = NOW() + (p_expires_in || ' seconds')::INTERVAL,
        last_refresh_at = NOW(),
        refresh_error_count = 0,
        last_error = NULL,
        updated_at = NOW()
    WHERE user_id = p_user_id AND provider = p_provider;
END;
$$ LANGUAGE plpgsql;

-- Funktion: Markiert Token als ungültig
CREATE OR REPLACE FUNCTION revoke_oauth_token(p_user_id UUID, p_provider VARCHAR)
RETURNS VOID AS $$
BEGIN
    UPDATE public.oauth_tokens
    SET 
        is_valid = FALSE,
        revoked_at = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id AND provider = p_provider;
    
    -- Auch Webhook-Subscriptions deaktivieren
    UPDATE public.webhook_subscriptions
    SET 
        is_active = FALSE,
        updated_at = NOW()
    WHERE user_id = p_user_id AND provider = p_provider;
END;
$$ LANGUAGE plpgsql;

-- Funktion: Match eingehende Nachricht zu Lead
CREATE OR REPLACE FUNCTION match_message_to_lead(p_queue_id UUID)
RETURNS TABLE(lead_id UUID, match_type VARCHAR, confidence DECIMAL) AS $$
DECLARE
    msg RECORD;
    found_lead UUID;
    match_conf DECIMAL := 0;
    match_method VARCHAR := 'none';
BEGIN
    -- Nachricht laden
    SELECT * INTO msg FROM public.realtime_message_queue WHERE id = p_queue_id;
    
    IF msg IS NULL THEN
        RETURN;
    END IF;
    
    -- 1. Exact Email Match
    SELECT id INTO found_lead
    FROM public.leads
    WHERE LOWER(email) = LOWER(msg.from_address)
    LIMIT 1;
    
    IF found_lead IS NOT NULL THEN
        match_conf := 1.0;
        match_method := 'email';
    ELSE
        -- 2. Phone Match (für WhatsApp)
        IF msg.channel = 'whatsapp' THEN
            -- Nummer normalisieren und suchen
            SELECT id INTO found_lead
            FROM public.leads
            WHERE REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '+', '') 
                LIKE '%' || REPLACE(REPLACE(REPLACE(msg.from_address, ' ', ''), '-', ''), '+', '') || '%'
            LIMIT 1;
            
            IF found_lead IS NOT NULL THEN
                match_conf := 0.95;
                match_method := 'phone';
            END IF;
        END IF;
    END IF;
    
    -- Ergebnis speichern
    IF found_lead IS NOT NULL THEN
        UPDATE public.realtime_message_queue
        SET 
            contact_id = found_lead,
            status = 'matched',
            matched_by = match_method,
            match_confidence = match_conf,
            processed_at = NOW()
        WHERE id = p_queue_id;
    END IF;
    
    RETURN QUERY SELECT found_lead, match_method, match_conf;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. VIEWS
-- ============================================================================

-- Aktive OAuth-Verbindungen pro User
CREATE OR REPLACE VIEW public.v_oauth_connections AS
SELECT 
    o.user_id,
    o.provider,
    o.provider_email,
    o.is_valid,
    o.expires_at,
    o.last_used_at,
    o.refresh_error_count,
    CASE 
        WHEN o.expires_at < NOW() THEN 'expired'
        WHEN o.is_valid = FALSE THEN 'revoked'
        WHEN o.refresh_error_count > 3 THEN 'error'
        ELSE 'active'
    END as connection_status,
    ws.is_active as webhook_active,
    ws.last_notification_at
FROM public.oauth_tokens o
LEFT JOIN public.webhook_subscriptions ws ON o.user_id = ws.user_id AND o.provider = ws.provider;

-- Pending Messages für Verarbeitung
CREATE OR REPLACE VIEW public.v_pending_messages AS
SELECT 
    q.*,
    l.name as lead_name,
    l.email as lead_email,
    l.p_score as lead_p_score
FROM public.realtime_message_queue q
LEFT JOIN public.leads l ON q.contact_id = l.id
WHERE q.status = 'pending'
ORDER BY q.received_at DESC;

-- ============================================================================
-- 9. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sync_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_business_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.realtime_message_queue ENABLE ROW LEVEL SECURITY;

-- Policies (User kann nur eigene Daten sehen)
CREATE POLICY "Users can manage their own OAuth tokens" ON public.oauth_tokens
    FOR ALL TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can manage their webhook subscriptions" ON public.webhook_subscriptions
    FOR ALL TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can view their webhook events" ON public.webhook_events_log
    FOR ALL TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can manage email sync state" ON public.email_sync_state
    FOR ALL TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can manage WhatsApp config" ON public.whatsapp_business_config
    FOR ALL TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can view their message queue" ON public.realtime_message_queue
    FOR ALL TO authenticated USING (user_id = auth.uid());

-- ============================================================================
-- 10. COMMENTS
-- ============================================================================

COMMENT ON TABLE public.oauth_tokens IS 'OAuth 2.0 Tokens für externe Provider (Gmail, WhatsApp, etc.)';
COMMENT ON TABLE public.webhook_subscriptions IS 'Push-Notification Subscriptions (Gmail Watch, Meta Webhooks)';
COMMENT ON TABLE public.webhook_events_log IS 'Log aller eingehenden Webhook-Events';
COMMENT ON TABLE public.email_sync_state IS 'Gmail Sync-Status pro User';
COMMENT ON TABLE public.whatsapp_business_config IS 'WhatsApp Business API Konfiguration';
COMMENT ON TABLE public.realtime_message_queue IS 'Echtzeit-Nachrichten-Warteschlange für Autopilot';




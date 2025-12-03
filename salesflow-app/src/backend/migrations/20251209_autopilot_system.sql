-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  CHIEF AUTOPILOT SYSTEM - Database Migration                              ║
-- ║  v3.2 Self-Driving Sales System                                           ║
-- ╚════════════════════════════════════════════════════════════════════════════╝
-- 
-- Erstellt alle Tabellen für das Autopilot-System:
-- 1. autopilot_settings - User-spezifische Einstellungen
-- 2. lead_autopilot_overrides - Per-Lead Override Settings
-- 3. autopilot_drafts - Entwürfe zur Prüfung
-- 4. autopilot_actions - Action Logs für Analytics
-- 5. lead_messages - Erweitert für Autopilot
-- 6. channel_mappings - Kanal-zu-User Zuordnung
-- 7. autopilot_stats_daily - Aggregierte Tagesstatistiken

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. AUTOPILOT SETTINGS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS autopilot_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Autonomy Level
    autonomy_level TEXT NOT NULL DEFAULT 'assistant'
        CHECK (autonomy_level IN ('observer', 'assistant', 'autopilot', 'full_auto')),
    
    -- Confidence Threshold (50-100)
    confidence_threshold INTEGER NOT NULL DEFAULT 90
        CHECK (confidence_threshold >= 50 AND confidence_threshold <= 100),
    
    -- Permissions
    auto_info_replies BOOLEAN NOT NULL DEFAULT true,
    auto_simple_questions BOOLEAN NOT NULL DEFAULT true,
    auto_followups BOOLEAN NOT NULL DEFAULT true,
    auto_scheduling BOOLEAN NOT NULL DEFAULT true,
    auto_calendar_booking BOOLEAN NOT NULL DEFAULT false,
    auto_price_replies BOOLEAN NOT NULL DEFAULT false,
    auto_objection_handling BOOLEAN NOT NULL DEFAULT false,
    auto_closing BOOLEAN NOT NULL DEFAULT false,
    
    -- Notifications
    notify_hot_lead BOOLEAN NOT NULL DEFAULT true,
    notify_human_needed BOOLEAN NOT NULL DEFAULT true,
    notify_daily_summary BOOLEAN NOT NULL DEFAULT true,
    notify_every_action BOOLEAN NOT NULL DEFAULT false,
    
    -- Working Hours
    working_hours_start TIME NOT NULL DEFAULT '09:00',
    working_hours_end TIME NOT NULL DEFAULT '20:00',
    send_on_weekends BOOLEAN NOT NULL DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    
    -- Constraints
    UNIQUE(user_id)
);

-- Indexes
CREATE INDEX idx_autopilot_settings_user ON autopilot_settings(user_id);

-- RLS
ALTER TABLE autopilot_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
    ON autopilot_settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
    ON autopilot_settings FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
    ON autopilot_settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. LEAD AUTOPILOT OVERRIDES
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS lead_autopilot_overrides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    
    -- Override Mode
    mode TEXT NOT NULL DEFAULT 'normal'
        CHECK (mode IN ('normal', 'careful', 'aggressive', 'disabled')),
    
    -- VIP Status
    is_vip BOOLEAN NOT NULL DEFAULT false,
    
    -- Reason for override
    reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    
    -- Constraints
    UNIQUE(lead_id)
);

-- Indexes
CREATE INDEX idx_lead_overrides_lead ON lead_autopilot_overrides(lead_id);
CREATE INDEX idx_lead_overrides_vip ON lead_autopilot_overrides(is_vip) WHERE is_vip = true;

-- RLS (via leads table)
ALTER TABLE lead_autopilot_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage overrides for own leads"
    ON lead_autopilot_overrides FOR ALL
    USING (
        lead_id IN (SELECT id FROM leads WHERE user_id = auth.uid())
    );


-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. AUTOPILOT DRAFTS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS autopilot_drafts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    
    -- Content
    content TEXT NOT NULL,
    intent TEXT NOT NULL,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'edited', 'expired')),
    
    -- Confidence
    confidence_score INTEGER,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    approved_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days')
);

-- Indexes
CREATE INDEX idx_autopilot_drafts_user ON autopilot_drafts(user_id);
CREATE INDEX idx_autopilot_drafts_lead ON autopilot_drafts(lead_id);
CREATE INDEX idx_autopilot_drafts_status ON autopilot_drafts(status);
CREATE INDEX idx_autopilot_drafts_pending ON autopilot_drafts(user_id, status) 
    WHERE status = 'pending';

-- RLS
ALTER TABLE autopilot_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own drafts"
    ON autopilot_drafts FOR ALL
    USING (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. AUTOPILOT ACTIONS (Logs)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS autopilot_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    
    -- Message Reference (optional, no FK constraint for flexibility)
    message_id UUID,
    
    -- Action Details
    action TEXT NOT NULL
        CHECK (action IN ('auto_send', 'draft_review', 'human_needed', 'archive', 'schedule')),
    
    -- Intent
    intent TEXT NOT NULL,
    
    -- Confidence
    confidence_score INTEGER NOT NULL,
    confidence_breakdown JSONB,
    
    -- Result
    response_sent BOOLEAN NOT NULL DEFAULT false,
    response_content TEXT,
    
    -- Outcome (für Learning)
    outcome TEXT,
    outcome_positive BOOLEAN,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_autopilot_actions_user ON autopilot_actions(user_id);
CREATE INDEX idx_autopilot_actions_lead ON autopilot_actions(lead_id);
CREATE INDEX idx_autopilot_actions_action ON autopilot_actions(action);
CREATE INDEX idx_autopilot_actions_created ON autopilot_actions(created_at DESC);
CREATE INDEX idx_autopilot_actions_user_date ON autopilot_actions(user_id, created_at DESC);

-- RLS
ALTER TABLE autopilot_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own actions"
    ON autopilot_actions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "System can insert actions"
    ON autopilot_actions FOR INSERT
    WITH CHECK (true);  -- Service Role only


-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. LEAD MESSAGES - Erweiterungen für Autopilot
-- ═══════════════════════════════════════════════════════════════════════════════

-- Falls lead_messages noch nicht existiert, erstellen
CREATE TABLE IF NOT EXISTS lead_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    
    -- Channel & Direction
    channel TEXT NOT NULL,
    direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    
    -- Content
    content_type TEXT NOT NULL DEFAULT 'text'
        CHECK (content_type IN ('text', 'image', 'voice', 'file')),
    content TEXT NOT NULL,
    media_url TEXT,
    
    -- External IDs
    external_id TEXT,
    
    -- Autopilot Flags
    auto_sent BOOLEAN DEFAULT false,
    user_approved BOOLEAN DEFAULT false,
    
    -- Raw Data
    raw_payload JSONB,
    
    -- Timestamps
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Neue Spalten hinzufügen falls Tabelle existiert
DO $$ 
BEGIN
    -- auto_sent
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lead_messages' AND column_name = 'auto_sent'
    ) THEN
        ALTER TABLE lead_messages ADD COLUMN auto_sent BOOLEAN DEFAULT false;
    END IF;
    
    -- user_approved
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lead_messages' AND column_name = 'user_approved'
    ) THEN
        ALTER TABLE lead_messages ADD COLUMN user_approved BOOLEAN DEFAULT false;
    END IF;
    
    -- raw_payload
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'lead_messages' AND column_name = 'raw_payload'
    ) THEN
        ALTER TABLE lead_messages ADD COLUMN raw_payload JSONB;
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lead_messages_lead ON lead_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_messages_timestamp ON lead_messages(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_lead_messages_direction ON lead_messages(direction);
CREATE INDEX IF NOT EXISTS idx_lead_messages_auto ON lead_messages(auto_sent) WHERE auto_sent = true;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. CHANNEL MAPPINGS
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS channel_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Channel Info
    channel TEXT NOT NULL
        CHECK (channel IN ('instagram', 'whatsapp', 'email', 'telegram', 'linkedin', 'facebook', 'sms')),
    
    -- External Account ID (z.B. Instagram Business ID)
    external_account_id TEXT NOT NULL,
    
    -- Credentials (encrypted)
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    
    -- Constraints
    UNIQUE(user_id, channel, external_account_id)
);

-- Indexes
CREATE INDEX idx_channel_mappings_user ON channel_mappings(user_id);
CREATE INDEX idx_channel_mappings_channel ON channel_mappings(channel, external_account_id);
CREATE INDEX idx_channel_mappings_active ON channel_mappings(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE channel_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own channel mappings"
    ON channel_mappings FOR ALL
    USING (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. AUTOPILOT STATS (Daily Aggregates)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS autopilot_stats_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    -- Volume
    total_inbound INTEGER NOT NULL DEFAULT 0,
    total_processed INTEGER NOT NULL DEFAULT 0,
    
    -- Actions
    auto_sent INTEGER NOT NULL DEFAULT 0,
    drafts_created INTEGER NOT NULL DEFAULT 0,
    drafts_approved INTEGER NOT NULL DEFAULT 0,
    drafts_rejected INTEGER NOT NULL DEFAULT 0,
    human_needed INTEGER NOT NULL DEFAULT 0,
    archived INTEGER NOT NULL DEFAULT 0,
    
    -- Outcomes
    positive_outcomes INTEGER NOT NULL DEFAULT 0,
    negative_outcomes INTEGER NOT NULL DEFAULT 0,
    
    -- Time
    estimated_time_saved_minutes INTEGER NOT NULL DEFAULT 0,
    user_active_time_minutes INTEGER NOT NULL DEFAULT 0,
    
    -- Confidence
    avg_confidence_score DECIMAL(5,2),
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    
    -- Constraints
    UNIQUE(user_id, date)
);

-- Indexes
CREATE INDEX idx_autopilot_stats_user_date ON autopilot_stats_daily(user_id, date DESC);

-- RLS
ALTER TABLE autopilot_stats_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own stats"
    ON autopilot_stats_daily FOR SELECT
    USING (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. LEADS TABLE - Neue Spalten für Autopilot
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$ 
BEGIN
    -- temperature (für Lead Scoring)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'temperature'
    ) THEN
        ALTER TABLE leads ADD COLUMN temperature TEXT DEFAULT 'warm'
            CHECK (temperature IN ('hot', 'warm', 'cold', 'dead'));
    END IF;
    
    -- external_id (für Channel Mapping)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'external_id'
    ) THEN
        ALTER TABLE leads ADD COLUMN external_id TEXT;
    END IF;
    
    -- channel
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'channel'
    ) THEN
        ALTER TABLE leads ADD COLUMN channel TEXT;
    END IF;
    
    -- estimated_value
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'estimated_value'
    ) THEN
        ALTER TABLE leads ADD COLUMN estimated_value DECIMAL(10,2) DEFAULT 0;
    END IF;
    
    -- archived_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'archived_at'
    ) THEN
        ALTER TABLE leads ADD COLUMN archived_at TIMESTAMPTZ;
    END IF;
    
    -- archive_reason
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'archive_reason'
    ) THEN
        ALTER TABLE leads ADD COLUMN archive_reason TEXT;
    END IF;
END $$;

-- Index für temperature
CREATE INDEX IF NOT EXISTS idx_leads_temperature ON leads(temperature);
CREATE INDEX IF NOT EXISTS idx_leads_channel ON leads(channel);
CREATE INDEX IF NOT EXISTS idx_leads_external ON leads(external_id);


-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Function: Ghost Leads finden
CREATE OR REPLACE FUNCTION get_ghost_leads(
    p_user_id UUID,
    p_cutoff_date TIMESTAMPTZ
)
RETURNS TABLE (
    lead_id UUID,
    lead_name TEXT,
    last_outbound_at TIMESTAMPTZ,
    last_outbound_content TEXT,
    last_topic TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id as lead_id,
        l.name as lead_name,
        MAX(CASE WHEN m.direction = 'outbound' THEN m.timestamp END) as last_outbound_at,
        (
            SELECT content FROM lead_messages 
            WHERE lead_id = l.id AND direction = 'outbound' 
            ORDER BY timestamp DESC LIMIT 1
        ) as last_outbound_content,
        l.notes as last_topic
    FROM leads l
    JOIN lead_messages m ON l.id = m.lead_id
    WHERE l.user_id = p_user_id
      AND l.status NOT IN ('closed', 'archived')
    GROUP BY l.id, l.name, l.notes
    HAVING 
        -- Letzte Nachricht war von uns (outbound)
        MAX(CASE WHEN m.direction = 'outbound' THEN m.timestamp END) > 
        COALESCE(MAX(CASE WHEN m.direction = 'inbound' THEN m.timestamp END), '1970-01-01')
        -- Und ist älter als cutoff
        AND MAX(CASE WHEN m.direction = 'outbound' THEN m.timestamp END) < p_cutoff_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function: Autopilot Stats aggregieren
CREATE OR REPLACE FUNCTION aggregate_autopilot_stats(
    p_user_id UUID,
    p_date DATE
)
RETURNS void AS $$
DECLARE
    v_stats RECORD;
BEGIN
    -- Stats berechnen
    SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE action = 'auto_send') as auto_sent,
        COUNT(*) FILTER (WHERE action = 'draft_review') as drafts,
        COUNT(*) FILTER (WHERE action = 'human_needed') as human_needed,
        COUNT(*) FILTER (WHERE action = 'archive') as archived,
        AVG(confidence_score) as avg_confidence,
        COUNT(*) FILTER (WHERE outcome_positive = true) as positive,
        COUNT(*) FILTER (WHERE outcome_positive = false) as negative
    INTO v_stats
    FROM autopilot_actions
    WHERE user_id = p_user_id
      AND created_at::date = p_date;
    
    -- Upsert
    INSERT INTO autopilot_stats_daily (
        user_id, date,
        total_inbound, total_processed,
        auto_sent, drafts_created, human_needed, archived,
        positive_outcomes, negative_outcomes,
        estimated_time_saved_minutes,
        avg_confidence_score
    ) VALUES (
        p_user_id, p_date,
        v_stats.total, v_stats.total,
        v_stats.auto_sent, v_stats.drafts, v_stats.human_needed, v_stats.archived,
        v_stats.positive, v_stats.negative,
        v_stats.auto_sent * 3,  -- 3 Min pro Auto-Send gespart
        v_stats.avg_confidence
    )
    ON CONFLICT (user_id, date) DO UPDATE SET
        total_inbound = EXCLUDED.total_inbound,
        total_processed = EXCLUDED.total_processed,
        auto_sent = EXCLUDED.auto_sent,
        drafts_created = EXCLUDED.drafts_created,
        human_needed = EXCLUDED.human_needed,
        archived = EXCLUDED.archived,
        positive_outcomes = EXCLUDED.positive_outcomes,
        negative_outcomes = EXCLUDED.negative_outcomes,
        estimated_time_saved_minutes = EXCLUDED.estimated_time_saved_minutes,
        avg_confidence_score = EXCLUDED.avg_confidence_score,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 10. TRIGGERS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Trigger: Auto-Update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables
DROP TRIGGER IF EXISTS autopilot_settings_updated_at ON autopilot_settings;
CREATE TRIGGER autopilot_settings_updated_at
    BEFORE UPDATE ON autopilot_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS lead_overrides_updated_at ON lead_autopilot_overrides;
CREATE TRIGGER lead_overrides_updated_at
    BEFORE UPDATE ON lead_autopilot_overrides
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS channel_mappings_updated_at ON channel_mappings;
CREATE TRIGGER channel_mappings_updated_at
    BEFORE UPDATE ON channel_mappings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ═══════════════════════════════════════════════════════════════════════════════
-- DONE!
-- ═══════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE autopilot_settings IS 'User-spezifische Autopilot-Einstellungen (Autonomy Level, Permissions, etc.)';
COMMENT ON TABLE lead_autopilot_overrides IS 'Per-Lead Override Settings für VIPs oder spezielle Behandlung';
COMMENT ON TABLE autopilot_drafts IS 'Entwürfe die vom User geprüft werden müssen';
COMMENT ON TABLE autopilot_actions IS 'Vollständiges Log aller Autopilot-Aktionen für Analytics';
COMMENT ON TABLE channel_mappings IS 'Zuordnung von externen Kanälen (Instagram, WhatsApp) zu Users';
COMMENT ON TABLE autopilot_stats_daily IS 'Aggregierte Tagesstatistiken für Performance-Tracking';


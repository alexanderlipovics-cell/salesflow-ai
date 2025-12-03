-- ============================================================================
-- LEARNING SYSTEM: Events + Aggregates
-- Basis für selbstlernendes Sales-OS
-- Migration: 20251202_learning_system.sql
-- ============================================================================

-- 1. LEARNING EVENT TYPES
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'learning_event_type') THEN
        CREATE TYPE learning_event_type AS ENUM (
            'message_suggested',      -- CHIEF hat Nachricht vorgeschlagen
            'message_sent',           -- User hat Nachricht gesendet
            'message_edited',         -- User hat vor Senden editiert
            'message_replied',        -- Lead hat geantwortet
            'message_positive_reply', -- Positive Antwort
            'message_negative_reply', -- Negative Antwort (Absage)
            'message_no_reply',       -- Keine Antwort nach X Tagen
            'deal_won',               -- Abschluss
            'deal_lost',              -- Verloren
            'call_booked',            -- Call gebucht
            'meeting_held'            -- Meeting durchgeführt
        );
    END IF;
END$$;

-- 2. LEARNING EVENTS (Rohdaten)
-- ============================================================================

CREATE TABLE IF NOT EXISTS learning_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Tenant
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Context
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    template_id UUID,  -- FK wird später hinzugefügt, wenn message_templates existiert
    channel TEXT,                    -- 'instagram_dm', 'whatsapp', 'linkedin', 'email', etc.
    vertical_id TEXT,                -- 'network_marketing', 'real_estate', etc.
    
    -- Event
    event_type learning_event_type NOT NULL,
    
    -- Details
    message_preview TEXT,            -- Erste 200 Zeichen
    outcome_label TEXT,              -- z.B. 'positive', 'objection_price', 'no_interest'
    response_time_hours NUMERIC,     -- Zeit bis Antwort
    
    -- Meta
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes für Learning Events
CREATE INDEX IF NOT EXISTS idx_learning_events_company ON learning_events(company_id);
CREATE INDEX IF NOT EXISTS idx_learning_events_user ON learning_events(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_events_template ON learning_events(template_id);
CREATE INDEX IF NOT EXISTS idx_learning_events_created ON learning_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_events_type ON learning_events(event_type);
CREATE INDEX IF NOT EXISTS idx_learning_events_channel ON learning_events(channel);
CREATE INDEX IF NOT EXISTS idx_learning_events_vertical ON learning_events(vertical_id);
CREATE INDEX IF NOT EXISTS idx_learning_events_lead ON learning_events(lead_id);

-- Composite Index für häufige Abfragen
CREATE INDEX IF NOT EXISTS idx_learning_events_company_created 
    ON learning_events(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_events_company_type 
    ON learning_events(company_id, event_type);


-- 3. LEARNING AGGREGATES (Voraggregiert für Performance)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'learning_agg_granularity') THEN
        CREATE TYPE learning_agg_granularity AS ENUM ('day', 'week', 'month');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS learning_aggregates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Dimensions
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    template_id UUID,  -- FK wird später hinzugefügt
    channel TEXT,
    vertical_id TEXT,
    
    -- Time
    period_start DATE NOT NULL,
    agg_granularity learning_agg_granularity NOT NULL DEFAULT 'day',
    
    -- Counters
    events_suggested INT NOT NULL DEFAULT 0,
    events_sent INT NOT NULL DEFAULT 0,
    events_edited INT NOT NULL DEFAULT 0,
    events_replied INT NOT NULL DEFAULT 0,
    events_positive_reply INT NOT NULL DEFAULT 0,
    events_negative_reply INT NOT NULL DEFAULT 0,
    events_no_reply INT NOT NULL DEFAULT 0,
    events_deal_won INT NOT NULL DEFAULT 0,
    events_deal_lost INT NOT NULL DEFAULT 0,
    events_call_booked INT NOT NULL DEFAULT 0,
    events_meeting_held INT NOT NULL DEFAULT 0,
    
    -- Calculated Rates (für schnellen Zugriff)
    reply_rate NUMERIC(5,4),              -- events_replied / events_sent
    positive_reply_rate NUMERIC(5,4),     -- events_positive_reply / events_sent
    win_rate NUMERIC(5,4),                -- events_deal_won / events_sent
    edit_rate NUMERIC(5,4),               -- events_edited / events_suggested (wie oft editiert User CHIEF-Vorschläge?)
    avg_response_time_hours NUMERIC,      -- Durchschnittliche Antwortzeit
    
    -- Meta
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique Index für Upsert (Bucket-Identifikation)
CREATE UNIQUE INDEX IF NOT EXISTS learning_aggregates_bucket_idx ON learning_aggregates (
    company_id,
    COALESCE(template_id, '00000000-0000-0000-0000-000000000000'::uuid),
    COALESCE(channel, '__null__'),
    COALESCE(vertical_id, '__null__'),
    period_start,
    agg_granularity
);

-- Weitere Indexes für Learning Aggregates
CREATE INDEX IF NOT EXISTS idx_learning_aggregates_company ON learning_aggregates(company_id);
CREATE INDEX IF NOT EXISTS idx_learning_aggregates_company_period 
    ON learning_aggregates(company_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_learning_aggregates_template ON learning_aggregates(template_id);
CREATE INDEX IF NOT EXISTS idx_learning_aggregates_channel ON learning_aggregates(channel);
CREATE INDEX IF NOT EXISTS idx_learning_aggregates_vertical ON learning_aggregates(vertical_id);


-- 4. MESSAGE TEMPLATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Identifikation
    name TEXT NOT NULL,
    slug TEXT,  -- Für einfache Referenz: 'cold_outreach_v1'
    
    -- Content
    content TEXT NOT NULL,
    subject TEXT,                    -- Für Email-Templates
    
    -- Kategorisierung
    channel TEXT,                    -- 'instagram_dm', 'whatsapp', 'linkedin', 'email', etc.
    vertical_id TEXT,
    category TEXT,                   -- 'cold_outreach', 'followup', 'reactivation', 'objection_response'
    stage TEXT,                      -- 'initial', 'first_followup', 'second_followup', etc.
    
    -- Meta
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false, -- Von System erstellt vs. User
    is_ai_generated BOOLEAN DEFAULT false,
    tags TEXT[] DEFAULT '{}',
    
    -- Performance Snapshot (für schnellen Zugriff)
    total_sent INT DEFAULT 0,
    total_replied INT DEFAULT 0,
    total_won INT DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    
    -- Audit
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes für Message Templates
CREATE INDEX IF NOT EXISTS idx_message_templates_company ON message_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_channel ON message_templates(channel);
CREATE INDEX IF NOT EXISTS idx_message_templates_category ON message_templates(category);
CREATE INDEX IF NOT EXISTS idx_message_templates_active ON message_templates(company_id, is_active) 
    WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_message_templates_slug ON message_templates(company_id, slug);

-- Unique Slug pro Company
CREATE UNIQUE INDEX IF NOT EXISTS idx_message_templates_company_slug 
    ON message_templates(company_id, slug) WHERE slug IS NOT NULL;


-- 5. TEMPLATE VERSIONS (Optional: Für A/B Testing)
-- ============================================================================

CREATE TABLE IF NOT EXISTS message_template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES message_templates(id) ON DELETE CASCADE,
    
    version_number INT NOT NULL DEFAULT 1,
    content TEXT NOT NULL,
    subject TEXT,
    
    -- A/B Testing
    variant_name TEXT,  -- 'A', 'B', 'control'
    traffic_weight NUMERIC(3,2) DEFAULT 1.0,  -- 0.5 = 50% Traffic
    
    -- Performance
    total_sent INT DEFAULT 0,
    total_replied INT DEFAULT 0,
    total_won INT DEFAULT 0,
    
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_template_versions_template 
    ON message_template_versions(template_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_template_versions_template_number 
    ON message_template_versions(template_id, version_number);


-- 6. FOREIGN KEYS (Nachträglich hinzufügen)
-- ============================================================================

-- FK von learning_events zu message_templates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'learning_events_template_id_fkey'
    ) THEN
        ALTER TABLE learning_events 
            ADD CONSTRAINT learning_events_template_id_fkey 
            FOREIGN KEY (template_id) REFERENCES message_templates(id) ON DELETE SET NULL;
    END IF;
END$$;

-- FK von learning_aggregates zu message_templates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'learning_aggregates_template_id_fkey'
    ) THEN
        ALTER TABLE learning_aggregates 
            ADD CONSTRAINT learning_aggregates_template_id_fkey 
            FOREIGN KEY (template_id) REFERENCES message_templates(id) ON DELETE SET NULL;
    END IF;
END$$;


-- 7. RLS POLICIES
-- ============================================================================

ALTER TABLE learning_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_template_versions ENABLE ROW LEVEL SECURITY;

-- Learning Events RLS
DROP POLICY IF EXISTS "Users see own company events" ON learning_events;
CREATE POLICY "Users see own company events" ON learning_events
    FOR ALL USING (company_id IN (
        SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
    ));

-- Learning Aggregates RLS
DROP POLICY IF EXISTS "Users see own company aggregates" ON learning_aggregates;
CREATE POLICY "Users see own company aggregates" ON learning_aggregates
    FOR ALL USING (company_id IN (
        SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
    ));

-- Message Templates RLS
DROP POLICY IF EXISTS "Users see own company templates" ON message_templates;
CREATE POLICY "Users see own company templates" ON message_templates
    FOR ALL USING (company_id IN (
        SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
    ));

-- Template Versions RLS (via Template)
DROP POLICY IF EXISTS "Users see own company template versions" ON message_template_versions;
CREATE POLICY "Users see own company template versions" ON message_template_versions
    FOR ALL USING (template_id IN (
        SELECT id FROM message_templates WHERE company_id IN (
            SELECT company_id FROM user_profiles WHERE user_id = auth.uid()
        )
    ));


-- 8. TRIGGER: Update updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_learning_aggregates_updated_at ON learning_aggregates;
CREATE TRIGGER update_learning_aggregates_updated_at
    BEFORE UPDATE ON learning_aggregates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_message_templates_updated_at ON message_templates;
CREATE TRIGGER update_message_templates_updated_at
    BEFORE UPDATE ON message_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_template_versions_updated_at ON message_template_versions;
CREATE TRIGGER update_template_versions_updated_at
    BEFORE UPDATE ON message_template_versions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- 9. HELPER FUNCTIONS
-- ============================================================================

-- Funktion: Update Template Performance Snapshot
CREATE OR REPLACE FUNCTION update_template_performance_snapshot(p_template_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE message_templates
    SET 
        total_sent = COALESCE((
            SELECT SUM(events_sent) 
            FROM learning_aggregates 
            WHERE template_id = p_template_id
        ), 0),
        total_replied = COALESCE((
            SELECT SUM(events_replied) 
            FROM learning_aggregates 
            WHERE template_id = p_template_id
        ), 0),
        total_won = COALESCE((
            SELECT SUM(events_deal_won) 
            FROM learning_aggregates 
            WHERE template_id = p_template_id
        ), 0),
        updated_at = NOW()
    WHERE id = p_template_id;
END;
$$ LANGUAGE plpgsql;

-- Funktion: Get Template Performance
CREATE OR REPLACE FUNCTION get_template_performance(
    p_template_id UUID,
    p_from_date DATE DEFAULT NULL,
    p_to_date DATE DEFAULT NULL
)
RETURNS TABLE (
    template_id UUID,
    events_sent BIGINT,
    events_replied BIGINT,
    events_positive_reply BIGINT,
    events_deal_won BIGINT,
    reply_rate NUMERIC,
    positive_reply_rate NUMERIC,
    win_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        la.template_id,
        SUM(la.events_sent)::BIGINT,
        SUM(la.events_replied)::BIGINT,
        SUM(la.events_positive_reply)::BIGINT,
        SUM(la.events_deal_won)::BIGINT,
        CASE WHEN SUM(la.events_sent) > 0 
            THEN (SUM(la.events_replied)::NUMERIC / SUM(la.events_sent)) 
            ELSE NULL END,
        CASE WHEN SUM(la.events_sent) > 0 
            THEN (SUM(la.events_positive_reply)::NUMERIC / SUM(la.events_sent)) 
            ELSE NULL END,
        CASE WHEN SUM(la.events_sent) > 0 
            THEN (SUM(la.events_deal_won)::NUMERIC / SUM(la.events_sent)) 
            ELSE NULL END
    FROM learning_aggregates la
    WHERE la.template_id = p_template_id
        AND (p_from_date IS NULL OR la.period_start >= p_from_date)
        AND (p_to_date IS NULL OR la.period_start <= p_to_date)
    GROUP BY la.template_id;
END;
$$ LANGUAGE plpgsql;


-- 10. INITIAL SEED: System Templates (Optional)
-- ============================================================================

-- Beispiel-Templates können per Seed-Script eingefügt werden
-- INSERT INTO message_templates (company_id, name, content, channel, category, is_system)
-- VALUES (...);


-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON TABLE learning_events IS 
    'Rohdaten aller Learning Events - jede Interaktion wird geloggt';
COMMENT ON TABLE learning_aggregates IS 
    'Voraggregierte Performance-Daten für schnelle Analytics-Abfragen';
COMMENT ON TABLE message_templates IS 
    'Nachrichtenvorlagen mit Performance-Tracking';
COMMENT ON TABLE message_template_versions IS 
    'Versionierung und A/B Testing für Templates';


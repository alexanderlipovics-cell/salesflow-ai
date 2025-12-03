-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  MIGRATION 014: LEARNING SYSTEM                                           ║
-- ║  Template-Performance Tracking & Analytics                                ║
-- ╚════════════════════════════════════════════════════════════════════════════╝
--
-- Features:
-- - learning_events: Einzelne Template-Nutzungen tracken
-- - learning_aggregates: Tägliche/wöchentliche Aggregationen
-- - Automatische Performance-Metriken (Conversion, Response Time, etc.)
--
-- Run: supabase db push

-- ═══════════════════════════════════════════════════════════════════════════
-- ENUM TYPES
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
    CREATE TYPE learning_event_type AS ENUM (
        'template_used',        -- Template wurde verwendet
        'template_edited',      -- Template wurde angepasst
        'response_received',    -- Antwort erhalten
        'positive_outcome',     -- Positives Ergebnis (Termin, Abschluss)
        'negative_outcome',     -- Negatives Ergebnis (Absage, Ghost)
        'objection_handled',    -- Einwand bearbeitet
        'follow_up_sent'        -- Follow-up gesendet
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE outcome_type AS ENUM (
        'appointment_booked',   -- Termin gebucht
        'deal_closed',          -- Abschluss
        'info_sent',            -- Infos geschickt
        'follow_up_scheduled',  -- Follow-up geplant
        'objection_overcome',   -- Einwand überwunden
        'no_response',          -- Keine Antwort
        'rejected',             -- Abgelehnt
        'ghosted'               -- Ghost (kein Kontakt mehr)
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE template_category AS ENUM (
        'first_contact',        -- Erstkontakt
        'follow_up',            -- Follow-up
        'reactivation',         -- Reaktivierung
        'objection_handler',    -- Einwand-Antwort
        'closing',              -- Abschluss
        'appointment_booking',  -- Terminvereinbarung
        'info_request',         -- Info-Anfrage
        'custom'                -- Benutzerdefiniert
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- TEMPLATES TABLE (Reference for Learning)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Template Details
    name VARCHAR(200) NOT NULL,
    category template_category NOT NULL DEFAULT 'custom',
    content TEXT NOT NULL,
    
    -- Targeting
    target_channel VARCHAR(50),         -- instagram, whatsapp, etc.
    target_temperature VARCHAR(20),     -- cold, warm, hot
    target_stage VARCHAR(50),           -- funnel stage
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    is_shared BOOLEAN DEFAULT FALSE,    -- Für Team sichtbar
    
    -- AI Generated
    is_ai_generated BOOLEAN DEFAULT FALSE,
    ai_generation_context JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- LEARNING EVENTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS learning_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Event Details
    event_type learning_event_type NOT NULL,
    
    -- Template Reference (optional - nicht alle Events haben Templates)
    template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
    template_category template_category,
    template_name VARCHAR(200),
    
    -- Lead Context (optional)
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    lead_status VARCHAR(50),
    lead_temperature VARCHAR(20),
    
    -- Event Data
    channel VARCHAR(50),                -- instagram, whatsapp, etc.
    message_text TEXT,                  -- Gesendete Nachricht (anonymisiert)
    message_word_count INTEGER,
    
    -- Outcome (für positive/negative outcomes)
    outcome outcome_type,
    outcome_value DECIMAL(10,2),        -- z.B. Deal-Wert
    
    -- Response Metrics
    response_received BOOLEAN DEFAULT FALSE,
    response_time_hours DECIMAL(10,2),  -- Zeit bis Antwort
    
    -- Conversion Tracking
    converted_to_next_stage BOOLEAN DEFAULT FALSE,
    conversion_stage VARCHAR(50),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- LEARNING AGGREGATES TABLE (Pre-computed Analytics)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS learning_aggregates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Aggregation Scope
    aggregate_type VARCHAR(20) NOT NULL,    -- 'daily', 'weekly', 'monthly'
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Template Scope (NULL = Company-wide)
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    template_category template_category,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Volume Metrics
    total_events INTEGER DEFAULT 0,
    templates_used INTEGER DEFAULT 0,
    unique_leads INTEGER DEFAULT 0,
    
    -- Response Metrics
    responses_received INTEGER DEFAULT 0,
    response_rate DECIMAL(5,2) DEFAULT 0,       -- Prozent
    avg_response_time_hours DECIMAL(10,2),
    
    -- Conversion Metrics
    positive_outcomes INTEGER DEFAULT 0,
    negative_outcomes INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,     -- Prozent
    
    -- Outcome Breakdown
    appointments_booked INTEGER DEFAULT 0,
    deals_closed INTEGER DEFAULT 0,
    total_deal_value DECIMAL(12,2) DEFAULT 0,
    
    -- Channel Breakdown
    channel_breakdown JSONB DEFAULT '{}',
    -- Format: {"instagram": {"sent": 50, "responses": 20}, ...}
    
    -- Top Performers
    top_templates JSONB DEFAULT '[]',
    -- Format: [{"id": "...", "name": "...", "conversion_rate": 45.2}, ...]
    
    -- Metadata
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique Constraint
    UNIQUE(company_id, aggregate_type, period_start, template_id, user_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- TEMPLATE PERFORMANCE TABLE (Running Stats per Template)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS template_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Lifetime Stats
    total_uses INTEGER DEFAULT 0,
    total_responses INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    
    -- Rates (calculated)
    response_rate DECIMAL(5,2) DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Time Metrics
    avg_response_time_hours DECIMAL(10,2),
    
    -- Last 30 Days Stats
    uses_last_30d INTEGER DEFAULT 0,
    responses_last_30d INTEGER DEFAULT 0,
    conversions_last_30d INTEGER DEFAULT 0,
    response_rate_30d DECIMAL(5,2) DEFAULT 0,
    conversion_rate_30d DECIMAL(5,2) DEFAULT 0,
    
    -- Quality Score (0-100)
    quality_score DECIMAL(5,2) DEFAULT 50,
    
    -- Trend
    trend VARCHAR(20) DEFAULT 'stable',  -- 'improving', 'declining', 'stable'
    
    -- Timestamps
    last_used_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(template_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

-- learning_events indexes
CREATE INDEX IF NOT EXISTS idx_learning_events_company 
    ON learning_events(company_id);
CREATE INDEX IF NOT EXISTS idx_learning_events_user 
    ON learning_events(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_events_template 
    ON learning_events(template_id);
CREATE INDEX IF NOT EXISTS idx_learning_events_created 
    ON learning_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_learning_events_type 
    ON learning_events(event_type);
CREATE INDEX IF NOT EXISTS idx_learning_events_category 
    ON learning_events(template_category);

-- learning_aggregates indexes
CREATE INDEX IF NOT EXISTS idx_learning_aggregates_company 
    ON learning_aggregates(company_id);
CREATE INDEX IF NOT EXISTS idx_learning_aggregates_period 
    ON learning_aggregates(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_learning_aggregates_type 
    ON learning_aggregates(aggregate_type);

-- template_performance indexes
CREATE INDEX IF NOT EXISTS idx_template_performance_template 
    ON template_performance(template_id);
CREATE INDEX IF NOT EXISTS idx_template_performance_score 
    ON template_performance(quality_score DESC);

-- templates indexes
CREATE INDEX IF NOT EXISTS idx_templates_company 
    ON templates(company_id);
CREATE INDEX IF NOT EXISTS idx_templates_category 
    ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_active 
    ON templates(is_active) WHERE is_active = TRUE;

-- ═══════════════════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE learning_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_aggregates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Templates: Company-based access
CREATE POLICY "templates_company_access" ON templates
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Learning Events: User can see own + team if leader
CREATE POLICY "learning_events_access" ON learning_events
    FOR ALL USING (
        user_id = auth.uid()
        OR company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_id = auth.uid() AND role IN ('admin', 'leader')
        )
    );

-- Learning Aggregates: Company-based access
CREATE POLICY "learning_aggregates_access" ON learning_aggregates
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- Template Performance: Company-based access
CREATE POLICY "template_performance_access" ON template_performance
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_id = auth.uid()
        )
    );

-- ═══════════════════════════════════════════════════════════════════════════
-- TRIGGER: Update template_performance on learning_event
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_template_performance()
RETURNS TRIGGER AS $$
BEGIN
    -- Skip if no template_id
    IF NEW.template_id IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Upsert template_performance
    INSERT INTO template_performance (template_id, company_id, total_uses, last_used_at)
    VALUES (NEW.template_id, NEW.company_id, 1, NOW())
    ON CONFLICT (template_id) DO UPDATE SET
        total_uses = template_performance.total_uses + 1,
        total_responses = template_performance.total_responses + 
            CASE WHEN NEW.response_received THEN 1 ELSE 0 END,
        total_conversions = template_performance.total_conversions + 
            CASE WHEN NEW.converted_to_next_stage THEN 1 ELSE 0 END,
        last_used_at = NOW(),
        updated_at = NOW();
    
    -- Recalculate rates
    UPDATE template_performance SET
        response_rate = CASE 
            WHEN total_uses > 0 THEN (total_responses::DECIMAL / total_uses) * 100 
            ELSE 0 
        END,
        conversion_rate = CASE 
            WHEN total_uses > 0 THEN (total_conversions::DECIMAL / total_uses) * 100 
            ELSE 0 
        END
    WHERE template_id = NEW.template_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_template_performance
    AFTER INSERT ON learning_events
    FOR EACH ROW
    EXECUTE FUNCTION update_template_performance();

-- ═══════════════════════════════════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- Get top templates for a company
CREATE OR REPLACE FUNCTION get_top_templates(
    p_company_id UUID,
    p_limit INTEGER DEFAULT 10,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    template_id UUID,
    template_name VARCHAR,
    category template_category,
    total_uses INTEGER,
    response_rate DECIMAL,
    conversion_rate DECIMAL,
    quality_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.category,
        COALESCE(tp.uses_last_30d, 0)::INTEGER,
        COALESCE(tp.response_rate_30d, 0),
        COALESCE(tp.conversion_rate_30d, 0),
        COALESCE(tp.quality_score, 50)
    FROM templates t
    LEFT JOIN template_performance tp ON tp.template_id = t.id
    WHERE t.company_id = p_company_id
        AND t.is_active = TRUE
    ORDER BY tp.quality_score DESC NULLS LAST, tp.uses_last_30d DESC NULLS LAST
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Record a learning event (convenience function)
CREATE OR REPLACE FUNCTION record_learning_event(
    p_company_id UUID,
    p_user_id UUID,
    p_event_type learning_event_type,
    p_template_id UUID DEFAULT NULL,
    p_lead_id UUID DEFAULT NULL,
    p_channel VARCHAR DEFAULT NULL,
    p_response_received BOOLEAN DEFAULT FALSE,
    p_outcome outcome_type DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    v_event_id UUID;
    v_template_name VARCHAR;
    v_template_category template_category;
BEGIN
    -- Get template info if provided
    IF p_template_id IS NOT NULL THEN
        SELECT name, category INTO v_template_name, v_template_category
        FROM templates WHERE id = p_template_id;
    END IF;
    
    -- Insert event
    INSERT INTO learning_events (
        company_id, user_id, event_type,
        template_id, template_name, template_category,
        lead_id, channel, response_received, outcome, metadata
    ) VALUES (
        p_company_id, p_user_id, p_event_type,
        p_template_id, v_template_name, v_template_category,
        p_lead_id, p_channel, p_response_received, p_outcome, p_metadata
    )
    RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- SAMPLE DATA (Development Only)
-- ═══════════════════════════════════════════════════════════════════════════

-- Uncomment for development testing:
/*
INSERT INTO templates (company_id, name, category, content, target_channel) VALUES
    ('YOUR_COMPANY_ID', 'Erstkontakt Warm', 'first_contact', 
     'Hey {{name}}! 👋 Bin gerade auf dein Profil gestoßen...', 'instagram'),
    ('YOUR_COMPANY_ID', 'Follow-up nach Interesse', 'follow_up',
     'Hey {{name}}! Wollte mal nachfragen, ob du dir die Infos schon ansehen konntest? 😊', 'instagram'),
    ('YOUR_COMPANY_ID', 'Zeit-Einwand', 'objection_handler',
     'Verstehe total! Gerade deshalb ist das so spannend - dauert nur 15 Min...', 'whatsapp');
*/

-- ═══════════════════════════════════════════════════════════════════════════
-- DONE
-- ═══════════════════════════════════════════════════════════════════════════


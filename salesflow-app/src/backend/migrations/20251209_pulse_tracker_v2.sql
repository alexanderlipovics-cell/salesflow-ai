-- ============================================================================
-- PULSE TRACKER & BEHAVIORAL INTELLIGENCE v2.0
-- Mit verbesserter RLS, Auto-Inference, Intent Learning
-- ============================================================================

-- ===================
-- ENUMS (ERWEITERT)
-- ===================

-- Prüfe ob ENUM existiert, sonst erstelle
DO $$ BEGIN
    CREATE TYPE message_status AS ENUM (
        'sent',           -- Gesendet
        'delivered',      -- Zugestellt (falls erkennbar)
        'seen',           -- Gelesen, keine Antwort
        'replied',        -- Antwort erhalten
        'ghosted',        -- Gelesen, lange keine Antwort (>48h)
        'invisible',      -- Nicht gelesen (Request Folder, Spam)
        'stale',          -- NEU: Zu alt, nie gecheckt (Auto-Inference)
        'skipped'         -- NEU: User hat Check-in übersprungen
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE follow_up_strategy AS ENUM (
        'none',
        'ghost_buster',       -- Humorvoller Reaktivierungs-Text
        'cross_channel',      -- Kommentar unter Post, andere Plattform
        'value_add',          -- Inhalt/Mehrwert senden
        'story_reply',        -- Auf Story reagieren
        'voice_note',         -- Persönliche Sprachnachricht
        'direct_ask',         -- Direkte Frage
        'takeaway'            -- "Vielleicht ist es nichts für dich..."
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE contact_mood AS ENUM (
        'enthusiastic',       -- Begeistert
        'positive',           -- Positiv, freundlich
        'neutral',            -- Neutral
        'cautious',           -- Vorsichtig, abwartend
        'stressed',           -- Gestresst, überlastet
        'skeptical',          -- Skeptisch
        'annoyed',            -- Genervt
        'unknown'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE decision_tendency AS ENUM (
        'leaning_yes',        -- Tendenz zu Ja
        'leaning_no',         -- Tendenz zu Nein
        'undecided',          -- Unentschlossen
        'deferred',           -- Vertagt (später)
        'committed',          -- Hat zugesagt
        'rejected'            -- Hat abgelehnt
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ===================
-- PULSE OUTREACH MESSAGES (Erweitert)
-- ===================

CREATE TABLE IF NOT EXISTS pulse_outreach_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id),
    
    -- Message Content
    message_text TEXT NOT NULL,
    message_type TEXT DEFAULT 'initial',
    -- 'initial', 'follow_up', 'reactivation', 'ghost_buster', 'cross_channel'
    
    -- Channel Info
    channel TEXT NOT NULL,
    platform_message_id TEXT,
    
    -- Status Tracking
    status message_status DEFAULT 'sent',
    status_updated_at TIMESTAMPTZ,
    status_source TEXT DEFAULT 'manual',
    -- 'manual', 'screenshot_ocr', 'api_webhook', 'auto_inferred'
    
    -- Auto-Inference Tracking
    auto_inferred BOOLEAN DEFAULT false,
    inference_reason TEXT,
    
    -- Timing
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    seen_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ,
    
    -- Check-in Scheduling
    check_in_due_at TIMESTAMPTZ,
    check_in_completed BOOLEAN DEFAULT false,
    check_in_skipped BOOLEAN DEFAULT false,
    check_in_reminder_count INTEGER DEFAULT 0,
    
    -- Follow-up
    suggested_strategy follow_up_strategy,
    suggested_follow_up_text TEXT,
    follow_up_sent BOOLEAN DEFAULT false,
    follow_up_message_id UUID,
    
    -- Template Reference
    template_id UUID,
    template_variant TEXT,
    
    -- Analytics
    response_time_hours NUMERIC,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================
-- INTENT CORRECTIONS (NEU - Für lernende Detection)
-- ===================

CREATE TABLE IF NOT EXISTS intent_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id),
    
    -- Original Query
    query_text TEXT NOT NULL,
    original_language TEXT DEFAULT 'de',
    
    -- Detection
    detected_intent TEXT NOT NULL,
    detected_objection_type TEXT,
    
    -- Correction
    corrected_intent TEXT NOT NULL,
    corrected_objection_type TEXT,
    
    -- Learning
    correction_reason TEXT,
    applied_to_keywords BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================
-- BEHAVIORAL ANALYSIS (Pro Lead, aggregiert)
-- ===================

CREATE TABLE IF NOT EXISTS lead_behavior_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id),
    
    -- Emotion & Mood
    current_mood contact_mood DEFAULT 'unknown',
    mood_confidence NUMERIC(3,2),
    mood_history JSONB DEFAULT '[]',
    sentiment_trajectory TEXT,
    
    -- Engagement Metrics
    engagement_level INTEGER DEFAULT 3 CHECK (engagement_level BETWEEN 1 AND 5),
    avg_response_time_hours NUMERIC,
    avg_message_length INTEGER,
    asks_questions BOOLEAN DEFAULT false,
    proactive_contact BOOLEAN DEFAULT false,
    uses_emojis BOOLEAN DEFAULT false,
    
    -- Decision Analysis
    decision_tendency decision_tendency DEFAULT 'undecided',
    commitment_strength INTEGER DEFAULT 3 CHECK (commitment_strength BETWEEN 1 AND 5),
    objections_raised TEXT[] DEFAULT '{}',
    
    -- Trust Assessment
    trust_level INTEGER DEFAULT 3 CHECK (trust_level BETWEEN 1 AND 5),
    risk_flags TEXT[] DEFAULT '{}',
    
    -- Coherence
    reliability_score INTEGER DEFAULT 3 CHECK (reliability_score BETWEEN 1 AND 5),
    appointments_scheduled INTEGER DEFAULT 0,
    appointments_kept INTEGER DEFAULT 0,
    appointments_cancelled INTEGER DEFAULT 0,
    coherence_notes TEXT,
    
    -- Communication Style
    communication_style TEXT,
    preferred_channel TEXT,
    best_contact_time TEXT,
    preferred_language TEXT DEFAULT 'de',
    
    -- Strategy Recommendations
    recommended_approach TEXT,
    recommended_tone TEXT,
    recommended_message_length TEXT,
    
    last_analyzed_at TIMESTAMPTZ,
    analysis_source TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(lead_id)
);

-- ===================
-- CONVERSION FUNNEL (VERBESSERT - mit Datenqualität)
-- ===================

CREATE TABLE IF NOT EXISTS conversion_funnel_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Outreach
    messages_sent INTEGER DEFAULT 0,
    unique_leads_contacted INTEGER DEFAULT 0,
    
    -- Visibility (BESTÄTIGT)
    messages_seen INTEGER DEFAULT 0,
    messages_not_seen INTEGER DEFAULT 0,
    open_rate NUMERIC(5,2),
    
    -- Response (BESTÄTIGT)
    messages_replied INTEGER DEFAULT 0,
    reply_rate NUMERIC(5,2),
    
    -- Ghosting
    messages_ghosted INTEGER DEFAULT 0,
    ghost_rate NUMERIC(5,2),
    
    -- Recovery
    ghosts_reactivated INTEGER DEFAULT 0,
    ghost_buster_rate NUMERIC(5,2),
    
    -- Unbestätigte Daten
    messages_unconfirmed INTEGER DEFAULT 0,
    messages_stale INTEGER DEFAULT 0,
    messages_skipped INTEGER DEFAULT 0,
    
    -- Datenqualität
    check_in_completion_rate NUMERIC(5,2),
    data_quality_score INTEGER DEFAULT 0 CHECK (data_quality_score BETWEEN 0 AND 100),
    
    -- Outcomes
    appointments_set INTEGER DEFAULT 0,
    sales_made INTEGER DEFAULT 0,
    
    -- Channel Breakdown
    channel_breakdown JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, company_id, date)
);

-- ===================
-- GHOST BUSTER TEMPLATES (ERWEITERT)
-- ===================

CREATE TABLE IF NOT EXISTS ghost_buster_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    
    name TEXT NOT NULL,
    template_text TEXT NOT NULL,
    template_text_short TEXT,
    
    strategy follow_up_strategy NOT NULL,
    tone TEXT,
    
    -- Targeting
    works_for_mood contact_mood[] DEFAULT '{}',
    works_for_decision decision_tendency[] DEFAULT '{}',
    days_since_ghost INTEGER,
    
    -- Mehrsprachigkeit
    language TEXT DEFAULT 'de',
    
    -- Performance
    times_used INTEGER DEFAULT 0,
    times_successful INTEGER DEFAULT 0,
    success_rate NUMERIC(5,2),
    
    example_context TEXT,
    
    is_system BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================
-- CROSS-CHANNEL STRATEGIES
-- ===================

CREATE TABLE IF NOT EXISTS cross_channel_strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    primary_channel TEXT NOT NULL,
    alternative_channel TEXT NOT NULL,
    action_description TEXT NOT NULL,
    template_text TEXT,
    timing_description TEXT,
    priority INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================
-- VERBESSERTE RLS POLICIES (Tenant-Isolation)
-- ===================

ALTER TABLE pulse_outreach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_behavior_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_funnel_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE ghost_buster_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE intent_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_channel_strategies ENABLE ROW LEVEL SECURITY;

-- Policies für pulse_outreach_messages
DROP POLICY IF EXISTS "Users manage own outreach within company" ON pulse_outreach_messages;
CREATE POLICY "Users manage own outreach within company" ON pulse_outreach_messages
    FOR ALL USING (
        user_id = auth.uid()
        OR (
            company_id IS NOT NULL 
            AND company_id IN (
                SELECT company_id FROM user_company_memberships 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Policies für lead_behavior_profiles
DROP POLICY IF EXISTS "Users manage behavior profiles within company" ON lead_behavior_profiles;
CREATE POLICY "Users manage behavior profiles within company" ON lead_behavior_profiles
    FOR ALL USING (
        user_id = auth.uid()
        OR (
            company_id IS NOT NULL 
            AND company_id IN (
                SELECT company_id FROM user_company_memberships 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Policies für conversion_funnel_daily
DROP POLICY IF EXISTS "Users view funnel within company" ON conversion_funnel_daily;
CREATE POLICY "Users view funnel within company" ON conversion_funnel_daily
    FOR SELECT USING (
        user_id = auth.uid()
        OR (
            company_id IS NOT NULL 
            AND company_id IN (
                SELECT company_id FROM user_company_memberships 
                WHERE user_id = auth.uid()
            )
        )
    );

-- Policies für ghost_buster_templates
DROP POLICY IF EXISTS "Users read system and company templates" ON ghost_buster_templates;
CREATE POLICY "Users read system and company templates" ON ghost_buster_templates
    FOR SELECT USING (
        is_system = true
        OR company_id IS NULL
        OR company_id IN (
            SELECT company_id FROM user_company_memberships 
            WHERE user_id = auth.uid()
        )
    );

-- Policies für intent_corrections
DROP POLICY IF EXISTS "Users manage own corrections" ON intent_corrections;
CREATE POLICY "Users manage own corrections" ON intent_corrections
    FOR ALL USING (user_id = auth.uid());

-- Policies für cross_channel_strategies
DROP POLICY IF EXISTS "Anyone can read cross channel strategies" ON cross_channel_strategies;
CREATE POLICY "Anyone can read cross channel strategies" ON cross_channel_strategies
    FOR SELECT USING (true);

-- ===================
-- INDEXES
-- ===================

CREATE INDEX IF NOT EXISTS idx_pulse_outreach_user ON pulse_outreach_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_pulse_outreach_company ON pulse_outreach_messages(company_id);
CREATE INDEX IF NOT EXISTS idx_pulse_outreach_lead ON pulse_outreach_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_pulse_outreach_status ON pulse_outreach_messages(status);
CREATE INDEX IF NOT EXISTS idx_pulse_outreach_checkin_pending ON pulse_outreach_messages(user_id, check_in_due_at) 
    WHERE check_in_completed = false AND check_in_skipped = false;
CREATE INDEX IF NOT EXISTS idx_pulse_outreach_ghosted ON pulse_outreach_messages(user_id, status) 
    WHERE status = 'ghosted';
CREATE INDEX IF NOT EXISTS idx_pulse_outreach_stale_candidates ON pulse_outreach_messages(sent_at, status)
    WHERE status = 'sent' AND check_in_completed = false;

CREATE INDEX IF NOT EXISTS idx_behavior_lead ON lead_behavior_profiles(lead_id);
CREATE INDEX IF NOT EXISTS idx_behavior_company ON lead_behavior_profiles(company_id);

CREATE INDEX IF NOT EXISTS idx_funnel_user_date ON conversion_funnel_daily(user_id, date);
CREATE INDEX IF NOT EXISTS idx_funnel_company_date ON conversion_funnel_daily(company_id, date);

CREATE INDEX IF NOT EXISTS idx_corrections_company ON intent_corrections(company_id);
CREATE INDEX IF NOT EXISTS idx_corrections_intent ON intent_corrections(detected_intent, corrected_intent);

CREATE INDEX IF NOT EXISTS idx_ghost_templates_strategy ON ghost_buster_templates(strategy);
CREATE INDEX IF NOT EXISTS idx_ghost_templates_active ON ghost_buster_templates(is_active) WHERE is_active = true;

-- ===================
-- AUTO-INFERENCE FUNCTION (Nach 7 Tagen → stale)
-- ===================

CREATE OR REPLACE FUNCTION auto_infer_stale_outreach()
RETURNS INTEGER AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    -- Nach 7 Tagen ohne Check-in → stale
    UPDATE pulse_outreach_messages SET
        status = 'stale',
        auto_inferred = true,
        inference_reason = 'No check-in after 7 days',
        status_updated_at = NOW()
    WHERE status = 'sent'
      AND check_in_completed = false
      AND check_in_skipped = false
      AND sent_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================
-- BULK CHECK-IN FUNCTION
-- ===================

CREATE OR REPLACE FUNCTION bulk_update_checkin_status(
    p_user_id UUID,
    p_outreach_ids UUID[],
    p_status message_status
)
RETURNS INTEGER AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    UPDATE pulse_outreach_messages SET
        status = p_status,
        status_updated_at = NOW(),
        check_in_completed = true,
        status_source = 'bulk_update'
    WHERE id = ANY(p_outreach_ids)
      AND user_id = p_user_id;
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================
-- SKIP ALL CHECK-INS FUNCTION
-- ===================

CREATE OR REPLACE FUNCTION bulk_skip_checkins(
    p_user_id UUID,
    p_outreach_ids UUID[]
)
RETURNS INTEGER AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    UPDATE pulse_outreach_messages SET
        check_in_skipped = true,
        status = 'skipped',
        status_updated_at = NOW()
    WHERE id = ANY(p_outreach_ids)
      AND user_id = p_user_id
      AND check_in_completed = false;
    
    GET DIAGNOSTICS affected_count = ROW_COUNT;
    RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================
-- ACCURATE FUNNEL METRICS (Bestätigt vs. Unbestätigt)
-- ===================

CREATE OR REPLACE FUNCTION get_accurate_funnel(p_user_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    -- Confirmed
    confirmed_sent INTEGER,
    confirmed_seen INTEGER,
    confirmed_replied INTEGER,
    confirmed_ghosted INTEGER,
    confirmed_invisible INTEGER,
    
    -- Unconfirmed
    unconfirmed_count INTEGER,
    stale_count INTEGER,
    skipped_count INTEGER,
    
    -- Rates (nur bestätigte Daten)
    confirmed_open_rate NUMERIC,
    confirmed_reply_rate NUMERIC,
    confirmed_ghost_rate NUMERIC,
    
    -- Data Quality
    check_in_completion_rate NUMERIC,
    data_quality_score INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- Confirmed
        COUNT(*) FILTER (WHERE check_in_completed = true)::INTEGER,
        COUNT(*) FILTER (WHERE status IN ('seen', 'replied', 'ghosted') AND check_in_completed = true)::INTEGER,
        COUNT(*) FILTER (WHERE status = 'replied')::INTEGER,
        COUNT(*) FILTER (WHERE status = 'ghosted')::INTEGER,
        COUNT(*) FILTER (WHERE status = 'invisible')::INTEGER,
        
        -- Unconfirmed
        COUNT(*) FILTER (WHERE status = 'sent' AND check_in_completed = false AND check_in_skipped = false)::INTEGER,
        COUNT(*) FILTER (WHERE status = 'stale')::INTEGER,
        COUNT(*) FILTER (WHERE check_in_skipped = true)::INTEGER,
        
        -- Rates
        CASE 
            WHEN COUNT(*) FILTER (WHERE check_in_completed = true) > 0 
            THEN ROUND((COUNT(*) FILTER (WHERE status IN ('seen', 'replied', 'ghosted'))::NUMERIC / 
                  COUNT(*) FILTER (WHERE check_in_completed = true) * 100), 1)
            ELSE 0 
        END,
        
        CASE 
            WHEN COUNT(*) FILTER (WHERE status IN ('seen', 'replied', 'ghosted')) > 0 
            THEN ROUND((COUNT(*) FILTER (WHERE status = 'replied')::NUMERIC / 
                  COUNT(*) FILTER (WHERE status IN ('seen', 'replied', 'ghosted')) * 100), 1)
            ELSE 0 
        END,
        
        CASE 
            WHEN COUNT(*) FILTER (WHERE status IN ('seen', 'replied', 'ghosted')) > 0 
            THEN ROUND((COUNT(*) FILTER (WHERE status = 'ghosted')::NUMERIC / 
                  COUNT(*) FILTER (WHERE status IN ('seen', 'replied', 'ghosted')) * 100), 1)
            ELSE 0 
        END,
        
        -- Data Quality
        CASE 
            WHEN COUNT(*) > 0 
            THEN ROUND((COUNT(*) FILTER (WHERE check_in_completed = true OR status = 'stale')::NUMERIC / COUNT(*) * 100), 1)
            ELSE 0 
        END,
        
        -- Quality Score (0-100)
        CASE 
            WHEN COUNT(*) = 0 THEN 0
            WHEN COUNT(*) FILTER (WHERE check_in_completed = true)::NUMERIC / COUNT(*) >= 0.9 THEN 100
            WHEN COUNT(*) FILTER (WHERE check_in_completed = true)::NUMERIC / COUNT(*) >= 0.7 THEN 80
            WHEN COUNT(*) FILTER (WHERE check_in_completed = true)::NUMERIC / COUNT(*) >= 0.5 THEN 60
            WHEN COUNT(*) FILTER (WHERE check_in_completed = true)::NUMERIC / COUNT(*) >= 0.3 THEN 40
            ELSE 20
        END::INTEGER
        
    FROM pulse_outreach_messages
    WHERE user_id = p_user_id
      AND DATE(sent_at) = p_date;
END;
$$ LANGUAGE plpgsql;

-- ===================
-- PENDING CHECK-INS MIT PRIORITY
-- ===================

CREATE OR REPLACE FUNCTION get_pending_checkins_prioritized(p_user_id UUID)
RETURNS TABLE (
    outreach_id UUID,
    lead_id UUID,
    lead_name TEXT,
    message_text TEXT,
    channel TEXT,
    sent_at TIMESTAMPTZ,
    hours_since_sent NUMERIC,
    priority INTEGER,
    reminder_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        om.id as outreach_id,
        om.lead_id,
        l.name as lead_name,
        om.message_text,
        om.channel,
        om.sent_at,
        ROUND(EXTRACT(EPOCH FROM (NOW() - om.sent_at)) / 3600, 1) as hours_since_sent,
        -- Priority: Ältere zuerst, mehr Reminder = höhere Prio
        CASE 
            WHEN om.sent_at < NOW() - INTERVAL '5 days' THEN 1
            WHEN om.sent_at < NOW() - INTERVAL '3 days' THEN 2
            WHEN om.check_in_reminder_count >= 2 THEN 2
            ELSE 3
        END as priority,
        om.check_in_reminder_count as reminder_count
    FROM pulse_outreach_messages om
    LEFT JOIN leads l ON l.id = om.lead_id
    WHERE om.user_id = p_user_id
      AND om.status = 'sent'
      AND om.check_in_completed = false
      AND om.check_in_skipped = false
      AND (om.check_in_due_at IS NULL OR om.check_in_due_at <= NOW())
      AND om.sent_at < NOW() - INTERVAL '20 hours'
    ORDER BY priority ASC, om.sent_at ASC
    LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================
-- GET GHOST LEADS FUNCTION
-- ===================

CREATE OR REPLACE FUNCTION get_ghost_leads(
    p_user_id UUID,
    p_min_hours INTEGER DEFAULT 48,
    p_max_days INTEGER DEFAULT 14
)
RETURNS TABLE (
    lead_id UUID,
    lead_name TEXT,
    last_message_text TEXT,
    channel TEXT,
    seen_at TIMESTAMPTZ,
    hours_ghosted NUMERIC,
    behavior_mood contact_mood,
    behavior_decision decision_tendency,
    suggested_strategy follow_up_strategy
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        om.lead_id,
        l.name as lead_name,
        om.message_text as last_message_text,
        om.channel,
        om.seen_at,
        ROUND(EXTRACT(EPOCH FROM (NOW() - om.seen_at)) / 3600, 1) as hours_ghosted,
        COALESCE(bp.current_mood, 'unknown'::contact_mood) as behavior_mood,
        COALESCE(bp.decision_tendency, 'undecided'::decision_tendency) as behavior_decision,
        om.suggested_strategy
    FROM pulse_outreach_messages om
    LEFT JOIN leads l ON l.id = om.lead_id
    LEFT JOIN lead_behavior_profiles bp ON bp.lead_id = om.lead_id
    WHERE om.user_id = p_user_id
      AND om.status = 'ghosted'
      AND om.seen_at IS NOT NULL
      AND om.seen_at > NOW() - (p_max_days || ' days')::INTERVAL
      AND om.seen_at < NOW() - (p_min_hours || ' hours')::INTERVAL
      AND om.follow_up_sent = false
    ORDER BY om.seen_at DESC
    LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================
-- UPDATE CONVERSION FUNNEL FUNCTION
-- ===================

CREATE OR REPLACE FUNCTION update_conversion_funnel(p_user_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
DECLARE
    v_sent INTEGER;
    v_seen INTEGER;
    v_replied INTEGER;
    v_ghosted INTEGER;
    v_unique_leads INTEGER;
    v_open_rate NUMERIC;
    v_reply_rate NUMERIC;
    v_ghost_rate NUMERIC;
BEGIN
    -- Berechne Metriken
    SELECT 
        COUNT(*),
        COUNT(*) FILTER (WHERE status IN ('seen', 'replied', 'ghosted')),
        COUNT(*) FILTER (WHERE status = 'replied'),
        COUNT(*) FILTER (WHERE status = 'ghosted'),
        COUNT(DISTINCT lead_id)
    INTO v_sent, v_seen, v_replied, v_ghosted, v_unique_leads
    FROM pulse_outreach_messages
    WHERE user_id = p_user_id
      AND DATE(sent_at) = p_date;
    
    -- Berechne Rates
    v_open_rate := CASE WHEN v_sent > 0 THEN ROUND((v_seen::NUMERIC / v_sent * 100), 2) ELSE 0 END;
    v_reply_rate := CASE WHEN v_seen > 0 THEN ROUND((v_replied::NUMERIC / v_seen * 100), 2) ELSE 0 END;
    v_ghost_rate := CASE WHEN v_seen > 0 THEN ROUND((v_ghosted::NUMERIC / v_seen * 100), 2) ELSE 0 END;
    
    -- Upsert Funnel
    INSERT INTO conversion_funnel_daily (
        user_id, date, messages_sent, messages_seen, messages_replied,
        messages_ghosted, unique_leads_contacted, open_rate, reply_rate, ghost_rate
    ) VALUES (
        p_user_id, p_date, v_sent, v_seen, v_replied,
        v_ghosted, v_unique_leads, v_open_rate, v_reply_rate, v_ghost_rate
    )
    ON CONFLICT (user_id, company_id, date) DO UPDATE SET
        messages_sent = EXCLUDED.messages_sent,
        messages_seen = EXCLUDED.messages_seen,
        messages_replied = EXCLUDED.messages_replied,
        messages_ghosted = EXCLUDED.messages_ghosted,
        unique_leads_contacted = EXCLUDED.unique_leads_contacted,
        open_rate = EXCLUDED.open_rate,
        reply_rate = EXCLUDED.reply_rate,
        ghost_rate = EXCLUDED.ghost_rate;
END;
$$ LANGUAGE plpgsql;

-- ===================
-- TRIGGER: Auto-Update Timestamps
-- ===================

CREATE OR REPLACE FUNCTION update_pulse_outreach_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    
    -- Wenn Status auf 'seen' wechselt
    IF NEW.status = 'seen' AND (OLD.status IS NULL OR OLD.status != 'seen') THEN
        NEW.seen_at := COALESCE(NEW.seen_at, NOW());
    END IF;
    
    -- Wenn Status auf 'replied' wechselt
    IF NEW.status = 'replied' AND (OLD.status IS NULL OR OLD.status != 'replied') THEN
        NEW.replied_at := COALESCE(NEW.replied_at, NOW());
        -- Berechne Response-Time
        IF NEW.sent_at IS NOT NULL THEN
            NEW.response_time_hours := ROUND(EXTRACT(EPOCH FROM (NEW.replied_at - NEW.sent_at)) / 3600, 2);
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_pulse_outreach_timestamps ON pulse_outreach_messages;
CREATE TRIGGER trigger_update_pulse_outreach_timestamps
    BEFORE UPDATE ON pulse_outreach_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_pulse_outreach_timestamps();

-- ===================
-- COMMENTS
-- ===================

COMMENT ON TABLE pulse_outreach_messages IS 'Pulse Tracker: Tracking aller ausgehenden Nachrichten mit Status, Check-ins und Follow-ups';
COMMENT ON TABLE lead_behavior_profiles IS 'Behavioral Intelligence: Emotions-, Engagement- und Entscheidungs-Profile pro Lead';
COMMENT ON TABLE conversion_funnel_daily IS 'Tägliche Conversion Funnel Metriken mit Datenqualitäts-Score';
COMMENT ON TABLE ghost_buster_templates IS 'Templates für Ghost-Buster Reaktivierungs-Nachrichten';
COMMENT ON TABLE intent_corrections IS 'User-Korrekturen für Intent-Detection Training';

COMMENT ON COLUMN pulse_outreach_messages.status IS 'sent, delivered, seen, replied, ghosted, invisible, stale, skipped';
COMMENT ON COLUMN pulse_outreach_messages.auto_inferred IS 'TRUE wenn Status automatisch inferiert wurde (z.B. nach 7 Tagen ohne Check-in)';
COMMENT ON COLUMN lead_behavior_profiles.coherence_notes IS 'Notizen zu Words vs. Behavior Inkonsistenzen';
COMMENT ON COLUMN conversion_funnel_daily.data_quality_score IS '0-100: Wie viele Check-ins wurden abgeschlossen';


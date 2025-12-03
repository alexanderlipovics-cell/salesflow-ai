-- ============================================================================
-- PULSE TRACKER & BEHAVIORAL INTELLIGENCE v2.1
-- NEU: Message Intent, Dynamic Ghost Thresholds, Soft/Hard Ghosting,
--      Smart Status Inference, Dynamic Check-in Timing, A/B by Profile
-- ============================================================================

-- ===================
-- NEUE ENUMS v2.1
-- ===================

-- Message Intent (für Intent-basiertes Tracking)
DO $$ BEGIN
    CREATE TYPE message_intent AS ENUM (
        'intro',          -- Erste Kontaktaufnahme
        'discovery',      -- Bedarfsermittlung, Fragen stellen
        'pitch',          -- Produkt/Opportunity präsentieren
        'scheduling',     -- Termin vereinbaren
        'closing',        -- Abschluss-Versuch
        'follow_up',      -- Nach-fassen
        'reactivation'    -- Ghost reaktivieren
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Ghost Type (Soft vs Hard Ghosting)
DO $$ BEGIN
    CREATE TYPE ghost_type AS ENUM (
        'soft',           -- Kürzlich gesehen, evtl. busy
        'hard'            -- Lang gesehen, ignoriert aktiv
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ===================
-- TABELLEN ERWEITERN: pulse_outreach_messages
-- ===================

-- Intent Column hinzufügen
ALTER TABLE pulse_outreach_messages 
ADD COLUMN IF NOT EXISTS intent message_intent DEFAULT 'follow_up';

-- Ghost Type & Detection
ALTER TABLE pulse_outreach_messages 
ADD COLUMN IF NOT EXISTS ghost_type ghost_type;

ALTER TABLE pulse_outreach_messages 
ADD COLUMN IF NOT EXISTS ghost_detected_at TIMESTAMPTZ;

-- Dynamic Check-in Timing
ALTER TABLE pulse_outreach_messages 
ADD COLUMN IF NOT EXISTS check_in_hours_used INTEGER;

-- ===================
-- TABELLEN ERWEITERN: lead_behavior_profiles
-- ===================

-- Dynamic Timing Columns
ALTER TABLE lead_behavior_profiles 
ADD COLUMN IF NOT EXISTS predicted_ghost_threshold_hours INTEGER DEFAULT 48;

ALTER TABLE lead_behavior_profiles 
ADD COLUMN IF NOT EXISTS predicted_check_in_hours INTEGER DEFAULT 24;

ALTER TABLE lead_behavior_profiles 
ADD COLUMN IF NOT EXISTS last_response_time_hours NUMERIC;

ALTER TABLE lead_behavior_profiles 
ADD COLUMN IF NOT EXISTS response_time_trend TEXT;

-- A/B Testing by Profile
ALTER TABLE lead_behavior_profiles 
ADD COLUMN IF NOT EXISTS best_template_variant TEXT;

ALTER TABLE lead_behavior_profiles 
ADD COLUMN IF NOT EXISTS best_template_mood_match JSONB DEFAULT '{}';

-- ===================
-- TABELLEN ERWEITERN: conversion_funnel_daily
-- ===================

-- Soft vs Hard Ghost Tracking
ALTER TABLE conversion_funnel_daily 
ADD COLUMN IF NOT EXISTS soft_ghosts INTEGER DEFAULT 0;

ALTER TABLE conversion_funnel_daily 
ADD COLUMN IF NOT EXISTS hard_ghosts INTEGER DEFAULT 0;

-- Intent Breakdown
ALTER TABLE conversion_funnel_daily 
ADD COLUMN IF NOT EXISTS intent_breakdown JSONB DEFAULT '{}';

-- ===================
-- TABELLEN ERWEITERN: outreach_campaigns
-- ===================

-- Falls Tabelle noch nicht existiert, erstellen
CREATE TABLE IF NOT EXISTS outreach_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id),
    
    name TEXT NOT NULL,
    description TEXT,
    
    -- Templates
    template_variants JSONB NOT NULL DEFAULT '[]',
    
    -- Targeting
    target_channel TEXT,
    target_vertical TEXT,
    target_lead_status TEXT[] DEFAULT '{}',
    target_intent message_intent,
    
    -- Overall Metrics
    messages_sent INTEGER DEFAULT 0,
    messages_seen INTEGER DEFAULT 0,
    messages_replied INTEGER DEFAULT 0,
    messages_ghosted INTEGER DEFAULT 0,
    
    -- Performance per Variant
    variant_performance JSONB DEFAULT '{}',
    
    -- Performance per Variant BY MOOD (NEU v2.1)
    variant_performance_by_mood JSONB DEFAULT '{}',
    
    -- Performance per Variant BY INTENT (NEU v2.1)
    variant_performance_by_intent JSONB DEFAULT '{}',
    
    -- Status
    status TEXT DEFAULT 'draft',
    
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================
-- NEUE INDEXES v2.1
-- ===================

CREATE INDEX IF NOT EXISTS idx_pulse_outreach_intent 
ON pulse_outreach_messages(intent);

CREATE INDEX IF NOT EXISTS idx_pulse_outreach_ghost_type 
ON pulse_outreach_messages(ghost_type) WHERE ghost_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pulse_outreach_intent_status 
ON pulse_outreach_messages(intent, status);

CREATE INDEX IF NOT EXISTS idx_campaigns_user 
ON outreach_campaigns(user_id);

CREATE INDEX IF NOT EXISTS idx_campaigns_status 
ON outreach_campaigns(status) WHERE status = 'active';

-- ===================
-- DYNAMIC TIMING FUNCTIONS (NEU v2.1)
-- ===================

-- Berechnet dynamische Check-in Zeit basierend auf Lead-Engagement
CREATE OR REPLACE FUNCTION calculate_dynamic_check_in_hours(p_lead_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_avg_response NUMERIC;
    v_engagement INTEGER;
    v_check_in_hours INTEGER;
BEGIN
    -- Hole Lead Behavior Profile
    SELECT avg_response_time_hours, engagement_level
    INTO v_avg_response, v_engagement
    FROM lead_behavior_profiles
    WHERE lead_id = p_lead_id;
    
    -- Fallback wenn kein Profil existiert
    IF v_avg_response IS NULL THEN
        RETURN 24;  -- Default
    END IF;
    
    -- Berechnung basierend auf Engagement Level
    CASE v_engagement
        WHEN 5 THEN v_check_in_hours := GREATEST(6, (v_avg_response * 2)::INTEGER);   -- High: 2x avg
        WHEN 4 THEN v_check_in_hours := GREATEST(12, (v_avg_response * 2.5)::INTEGER);
        WHEN 3 THEN v_check_in_hours := GREATEST(24, (v_avg_response * 3)::INTEGER);  -- Medium: 3x avg
        WHEN 2 THEN v_check_in_hours := GREATEST(36, (v_avg_response * 3)::INTEGER);
        ELSE v_check_in_hours := GREATEST(48, (v_avg_response * 4)::INTEGER);         -- Low: 4x avg
    END CASE;
    
    -- Cap at 72 hours max
    RETURN LEAST(v_check_in_hours, 72);
END;
$$ LANGUAGE plpgsql;

-- Berechnet dynamische Ghost-Schwelle basierend auf Lead-Verhalten
CREATE OR REPLACE FUNCTION calculate_ghost_threshold_hours(p_lead_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_avg_response NUMERIC;
    v_threshold INTEGER;
    GHOST_MULTIPLIER CONSTANT NUMERIC := 3;
BEGIN
    SELECT avg_response_time_hours
    INTO v_avg_response
    FROM lead_behavior_profiles
    WHERE lead_id = p_lead_id;
    
    IF v_avg_response IS NULL THEN
        RETURN 48;  -- Default
    END IF;
    
    -- Ghost = avg_response * 3 (aber mindestens 8h, maximal 168h/7 Tage)
    v_threshold := GREATEST(8, LEAST(168, (v_avg_response * GHOST_MULTIPLIER)::INTEGER));
    
    RETURN v_threshold;
END;
$$ LANGUAGE plpgsql;

-- Klassifiziert Ghost als SOFT oder HARD
CREATE OR REPLACE FUNCTION classify_ghost_type(
    p_seen_at TIMESTAMPTZ,
    p_lead_was_online_since BOOLEAN DEFAULT NULL,
    p_lead_posted_since BOOLEAN DEFAULT NULL
)
RETURNS ghost_type AS $$
DECLARE
    v_hours_since_seen NUMERIC;
BEGIN
    IF p_seen_at IS NULL THEN
        RETURN NULL;
    END IF;
    
    v_hours_since_seen := EXTRACT(EPOCH FROM (NOW() - p_seen_at)) / 3600;
    
    -- HARD Ghost: Lange her UND Lead war aktiv
    IF v_hours_since_seen > 72 AND (p_lead_was_online_since = true OR p_lead_posted_since = true) THEN
        RETURN 'hard';
    -- HARD Ghost: Sehr lange her
    ELSIF v_hours_since_seen > 120 THEN
        RETURN 'hard';
    -- SOFT Ghost: Kürzlich oder keine Aktivitäts-Info
    ELSE
        RETURN 'soft';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ===================
-- SMART STATUS INFERENCE (NEU v2.1)
-- ===================

-- Inferiert Status aus Chat-Import automatisch
CREATE OR REPLACE FUNCTION smart_infer_status_from_chat(
    p_user_id UUID,
    p_lead_id UUID,
    p_latest_sender TEXT,  -- 'lead' oder 'user'
    p_has_unread_from_lead BOOLEAN
)
RETURNS TABLE (
    outreach_id UUID,
    old_status message_status,
    new_status message_status,
    inference_reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH pending_outreach AS (
        SELECT om.id, om.status
        FROM pulse_outreach_messages om
        WHERE om.user_id = p_user_id
          AND om.lead_id = p_lead_id
          AND om.status IN ('sent', 'delivered', 'seen')
          AND om.check_in_completed = false
    ),
    updated AS (
        UPDATE pulse_outreach_messages om SET
            status = CASE 
                WHEN p_latest_sender = 'lead' THEN 'replied'::message_status
                WHEN p_has_unread_from_lead THEN 'replied'::message_status
                ELSE om.status
            END,
            status_updated_at = NOW(),
            status_source = 'chat_import',
            auto_inferred = true,
            inference_reason = CASE 
                WHEN p_latest_sender = 'lead' THEN 'Lead replied (detected from chat import)'
                WHEN p_has_unread_from_lead THEN 'Unread messages from lead detected'
                ELSE NULL
            END,
            check_in_completed = CASE 
                WHEN p_latest_sender = 'lead' OR p_has_unread_from_lead THEN true
                ELSE om.check_in_completed
            END,
            replied_at = CASE 
                WHEN (p_latest_sender = 'lead' OR p_has_unread_from_lead) AND om.replied_at IS NULL THEN NOW()
                ELSE om.replied_at
            END
        FROM pending_outreach po
        WHERE om.id = po.id
          AND (p_latest_sender = 'lead' OR p_has_unread_from_lead)
        RETURNING om.id, po.status AS old_status, om.status AS new_status, om.inference_reason
    )
    SELECT * FROM updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================
-- FUNNEL BY INTENT (NEU v2.1)
-- ===================

CREATE OR REPLACE FUNCTION get_funnel_by_intent(
    p_user_id UUID,
    p_start_date DATE DEFAULT CURRENT_DATE - 30,
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    intent message_intent,
    sent_count INTEGER,
    seen_count INTEGER,
    replied_count INTEGER,
    ghosted_count INTEGER,
    reply_rate NUMERIC,
    ghost_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        om.intent,
        COUNT(*)::INTEGER as sent_count,
        COUNT(*) FILTER (WHERE om.status IN ('seen', 'replied', 'ghosted'))::INTEGER as seen_count,
        COUNT(*) FILTER (WHERE om.status = 'replied')::INTEGER as replied_count,
        COUNT(*) FILTER (WHERE om.status = 'ghosted')::INTEGER as ghosted_count,
        CASE 
            WHEN COUNT(*) FILTER (WHERE om.status IN ('seen', 'replied', 'ghosted')) > 0
            THEN ROUND(100.0 * COUNT(*) FILTER (WHERE om.status = 'replied') / 
                 COUNT(*) FILTER (WHERE om.status IN ('seen', 'replied', 'ghosted')), 1)
            ELSE 0
        END as reply_rate,
        CASE 
            WHEN COUNT(*) FILTER (WHERE om.status IN ('seen', 'replied', 'ghosted')) > 0
            THEN ROUND(100.0 * COUNT(*) FILTER (WHERE om.status = 'ghosted') / 
                 COUNT(*) FILTER (WHERE om.status IN ('seen', 'replied', 'ghosted')), 1)
            ELSE 0
        END as ghost_rate
    FROM pulse_outreach_messages om
    WHERE om.user_id = p_user_id
      AND DATE(om.sent_at) BETWEEN p_start_date AND p_end_date
      AND om.intent IS NOT NULL
    GROUP BY om.intent
    ORDER BY sent_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================
-- DYNAMIC GHOST DETECTION (NEU v2.1)
-- ===================

CREATE OR REPLACE FUNCTION detect_and_classify_ghosts(p_user_id UUID)
RETURNS TABLE (
    outreach_id UUID,
    lead_id UUID,
    hours_since_seen NUMERIC,
    dynamic_threshold INTEGER,
    ghost_type ghost_type,
    is_new_ghost BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH ghost_candidates AS (
        SELECT 
            om.id AS outreach_id,
            om.lead_id,
            om.seen_at,
            EXTRACT(EPOCH FROM (NOW() - om.seen_at)) / 3600 AS hours_since_seen,
            COALESCE(bp.predicted_ghost_threshold_hours, 48) AS dynamic_threshold,
            om.ghost_type AS current_ghost_type
        FROM pulse_outreach_messages om
        LEFT JOIN lead_behavior_profiles bp ON bp.lead_id = om.lead_id
        WHERE om.user_id = p_user_id
          AND om.status = 'seen'
          AND om.seen_at IS NOT NULL
          AND om.check_in_completed = true
    )
    SELECT 
        gc.outreach_id,
        gc.lead_id,
        ROUND(gc.hours_since_seen, 1) AS hours_since_seen,
        gc.dynamic_threshold,
        CASE 
            WHEN gc.hours_since_seen > 120 THEN 'hard'::ghost_type
            WHEN gc.hours_since_seen > 72 THEN 'hard'::ghost_type
            ELSE 'soft'::ghost_type
        END AS ghost_type,
        gc.current_ghost_type IS NULL AS is_new_ghost
    FROM ghost_candidates gc
    WHERE gc.hours_since_seen >= gc.dynamic_threshold;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-Update Ghosts mit dynamischem Threshold
CREATE OR REPLACE FUNCTION auto_detect_ghosts_dynamic()
RETURNS INTEGER AS $$
DECLARE
    affected_count INTEGER := 0;
    r RECORD;
BEGIN
    FOR r IN 
        SELECT * FROM detect_and_classify_ghosts(NULL)
        WHERE is_new_ghost = true
    LOOP
        UPDATE pulse_outreach_messages SET
            status = 'ghosted',
            ghost_type = r.ghost_type,
            ghost_detected_at = NOW(),
            status_updated_at = NOW()
        WHERE id = r.outreach_id;
        
        affected_count := affected_count + 1;
    END LOOP;
    
    RETURN affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================
-- UPDATE BEHAVIOR PROFILE MIT DYNAMIC THRESHOLDS
-- ===================

CREATE OR REPLACE FUNCTION update_lead_dynamic_thresholds(p_lead_id UUID)
RETURNS VOID AS $$
DECLARE
    v_avg_response NUMERIC;
    v_engagement INTEGER;
    v_check_in_hours INTEGER;
    v_ghost_threshold INTEGER;
BEGIN
    -- Berechne avg Response Time aus Outreach
    SELECT 
        AVG(response_time_hours),
        bp.engagement_level
    INTO v_avg_response, v_engagement
    FROM pulse_outreach_messages om
    LEFT JOIN lead_behavior_profiles bp ON bp.lead_id = om.lead_id
    WHERE om.lead_id = p_lead_id
      AND om.response_time_hours IS NOT NULL
    GROUP BY bp.engagement_level;
    
    IF v_avg_response IS NULL THEN
        RETURN;
    END IF;
    
    -- Berechne Dynamic Thresholds
    v_check_in_hours := calculate_dynamic_check_in_hours(p_lead_id);
    v_ghost_threshold := calculate_ghost_threshold_hours(p_lead_id);
    
    -- Update Profile
    UPDATE lead_behavior_profiles SET
        avg_response_time_hours = v_avg_response,
        predicted_check_in_hours = v_check_in_hours,
        predicted_ghost_threshold_hours = v_ghost_threshold,
        updated_at = NOW()
    WHERE lead_id = p_lead_id;
END;
$$ LANGUAGE plpgsql;

-- ===================
-- A/B TESTING BY MOOD (NEU v2.1)
-- ===================

CREATE OR REPLACE FUNCTION get_best_template_for_lead(
    p_lead_id UUID,
    p_campaign_id UUID DEFAULT NULL
)
RETURNS TABLE (
    recommended_variant TEXT,
    expected_reply_rate NUMERIC,
    reasoning TEXT
) AS $$
DECLARE
    v_mood contact_mood;
    v_performance JSONB;
BEGIN
    -- Hole Lead Mood
    SELECT current_mood INTO v_mood
    FROM lead_behavior_profiles
    WHERE lead_id = p_lead_id;
    
    IF v_mood IS NULL THEN
        v_mood := 'neutral';
    END IF;
    
    -- Hole Performance by Mood aus Campaign
    IF p_campaign_id IS NOT NULL THEN
        SELECT variant_performance_by_mood INTO v_performance
        FROM outreach_campaigns
        WHERE id = p_campaign_id;
        
        IF v_performance IS NOT NULL AND v_performance ? v_mood::TEXT THEN
            RETURN QUERY
            SELECT 
                key AS recommended_variant,
                (value->>v_mood::TEXT)::NUMERIC AS expected_reply_rate,
                format('Beste Variante für %s Leads basierend auf historischer Performance', v_mood) AS reasoning
            FROM jsonb_each(v_performance)
            ORDER BY (value->>v_mood::TEXT)::NUMERIC DESC NULLS LAST
            LIMIT 1;
            RETURN;
        END IF;
    END IF;
    
    -- Fallback: Random variant
    RETURN QUERY
    SELECT 
        'A'::TEXT AS recommended_variant,
        0::NUMERIC AS expected_reply_rate,
        'Keine historischen Daten - Standard-Variante'::TEXT AS reasoning;
END;
$$ LANGUAGE plpgsql;

-- ===================
-- COACHING INSIGHTS BY INTENT
-- ===================

CREATE OR REPLACE FUNCTION get_intent_coaching_insights(
    p_user_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    intent message_intent,
    sent_count INTEGER,
    reply_rate NUMERIC,
    performance_level TEXT,  -- 'strong', 'average', 'weak'
    coaching_tip TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH intent_stats AS (
        SELECT * FROM get_funnel_by_intent(p_user_id, CURRENT_DATE - p_days, CURRENT_DATE)
    ),
    avg_rate AS (
        SELECT AVG(reply_rate) AS overall_avg FROM intent_stats WHERE sent_count >= 5
    )
    SELECT 
        ist.intent,
        ist.sent_count,
        ist.reply_rate,
        CASE 
            WHEN ist.reply_rate >= ar.overall_avg * 1.3 THEN 'strong'
            WHEN ist.reply_rate >= ar.overall_avg * 0.7 THEN 'average'
            ELSE 'weak'
        END::TEXT AS performance_level,
        CASE ist.intent
            WHEN 'intro' THEN 
                CASE WHEN ist.reply_rate < 50 THEN 'Deine Intro-Messages performen unter dem Schnitt. Teste persönlichere Hooks.' 
                ELSE 'Gute Intro-Performance! Halte diesen Stil bei.' END
            WHEN 'discovery' THEN 
                CASE WHEN ist.reply_rate < 40 THEN 'Stelle mehr offene Fragen in der Discovery-Phase.' 
                ELSE 'Discovery läuft gut. Nutze die Insights für bessere Pitches.' END
            WHEN 'pitch' THEN 
                CASE WHEN ist.reply_rate < 25 THEN 'Pitch-Messages zu lang? Fokussiere auf 1-2 Kernbenefits.' 
                ELSE 'Deine Pitches überzeugen. Weiter so!' END
            WHEN 'closing' THEN 
                CASE WHEN ist.reply_rate < 20 THEN 'Closing Messages performan schlecht. Teste kürzere, direktere Fragen.' 
                ELSE 'Gute Closing-Rate! Du machst den Sack zu.' END
            WHEN 'follow_up' THEN 
                CASE WHEN ist.reply_rate < 30 THEN 'Follow-ups zu werblich? Mehr Value, weniger Push.' 
                ELSE 'Solide Follow-up Performance.' END
            WHEN 'reactivation' THEN 
                CASE WHEN ist.reply_rate < 15 THEN 'Ghost-Reaktivierung schwach. Teste Humor oder Pattern Interrupts.' 
                ELSE 'Du holst Ghosts gut zurück!' END
            ELSE 'Weiter beobachten.'
        END AS coaching_tip
    FROM intent_stats ist
    CROSS JOIN avg_rate ar
    WHERE ist.sent_count >= 3
    ORDER BY ist.sent_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================
-- TRIGGER: Auto-Set Dynamic Check-in bei Outreach
-- ===================

CREATE OR REPLACE FUNCTION set_dynamic_check_in_on_outreach()
RETURNS TRIGGER AS $$
DECLARE
    v_check_in_hours INTEGER;
BEGIN
    -- Nur für neue Outreach
    IF TG_OP = 'INSERT' THEN
        -- Berechne dynamische Check-in Zeit
        v_check_in_hours := calculate_dynamic_check_in_hours(NEW.lead_id);
        
        NEW.check_in_due_at := NOW() + (v_check_in_hours || ' hours')::INTERVAL;
        NEW.check_in_hours_used := v_check_in_hours;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop alter Trigger falls vorhanden, dann neu erstellen
DROP TRIGGER IF EXISTS trigger_set_dynamic_check_in ON pulse_outreach_messages;
CREATE TRIGGER trigger_set_dynamic_check_in
    BEFORE INSERT ON pulse_outreach_messages
    FOR EACH ROW
    EXECUTE FUNCTION set_dynamic_check_in_on_outreach();

-- ===================
-- RLS POLICIES FÜR NEUE TABELLEN
-- ===================

ALTER TABLE outreach_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own campaigns" ON outreach_campaigns;
CREATE POLICY "Users manage own campaigns" ON outreach_campaigns
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

-- ===================
-- COMMENTS
-- ===================

COMMENT ON COLUMN pulse_outreach_messages.intent IS 'NEU v2.1: Message Intent (intro, discovery, pitch, scheduling, closing, follow_up, reactivation)';
COMMENT ON COLUMN pulse_outreach_messages.ghost_type IS 'NEU v2.1: Soft (kürzlich, evtl. busy) vs Hard (lange her, ignoriert aktiv)';
COMMENT ON COLUMN pulse_outreach_messages.check_in_hours_used IS 'NEU v2.1: Welche dynamische Check-in Zeit wurde berechnet';

COMMENT ON COLUMN lead_behavior_profiles.predicted_ghost_threshold_hours IS 'NEU v2.1: Dynamische Ghost-Schwelle basierend auf avg_response_time * 3';
COMMENT ON COLUMN lead_behavior_profiles.predicted_check_in_hours IS 'NEU v2.1: Dynamische Check-in Zeit basierend auf Engagement';
COMMENT ON COLUMN lead_behavior_profiles.best_template_mood_match IS 'NEU v2.1: Beste Template-Variante pro Mood {"enthusiastic": "A", "cautious": "B"}';

COMMENT ON COLUMN conversion_funnel_daily.intent_breakdown IS 'NEU v2.1: Funnel-Metriken pro Intent {"intro": {"sent": 50, "replied": 35}}';

COMMENT ON FUNCTION calculate_dynamic_check_in_hours IS 'NEU v2.1: Berechnet dynamische Check-in Zeit basierend auf Lead-Engagement (6h-72h)';
COMMENT ON FUNCTION calculate_ghost_threshold_hours IS 'NEU v2.1: Berechnet dynamische Ghost-Schwelle (avg_response * 3, min 8h, max 168h)';
COMMENT ON FUNCTION classify_ghost_type IS 'NEU v2.1: Klassifiziert Ghost als Soft oder Hard';
COMMENT ON FUNCTION smart_infer_status_from_chat IS 'NEU v2.1: Automatische Status-Erkennung aus Chat-Import';
COMMENT ON FUNCTION get_funnel_by_intent IS 'NEU v2.1: Funnel-Metriken aufgeschlüsselt nach Message Intent';

-- ===================
-- SUCCESS MESSAGE
-- ===================

DO $$
BEGIN
    RAISE NOTICE 'Pulse Tracker v2.1 Migration erfolgreich!';
    RAISE NOTICE 'Neue Features:';
    RAISE NOTICE '  - Message Intent Tracking (intro, discovery, pitch, scheduling, closing, follow_up, reactivation)';
    RAISE NOTICE '  - Dynamic Ghost Thresholds (personalisiert pro Lead)';
    RAISE NOTICE '  - Soft vs. Hard Ghosting Klassifikation';
    RAISE NOTICE '  - Smart Status Inference aus Chat-Import';
    RAISE NOTICE '  - Dynamic Check-in Timing (basierend auf Engagement)';
    RAISE NOTICE '  - A/B Testing by Behavioral Profile';
    RAISE NOTICE '  - Intent-basiertes Funnel Analytics & Coaching';
END $$;


-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  DAILY FLOW & LEADS SUPABASE FUNCTIONS                                    ║
-- ║  SQL-Funktionen für Lead-Scoring und Daily Flow Status                    ║
-- ╚════════════════════════════════════════════════════════════════════════════╝
--
-- Diese Funktionen in Supabase SQL Editor ausführen.
-- Gehe zu: Supabase Dashboard → SQL Editor → New Query

-- =============================================================================
-- FUNCTION: get_leads_by_score
-- Holt Leads nach Score sortiert
-- =============================================================================

CREATE OR REPLACE FUNCTION get_leads_by_score(
    p_user_id UUID DEFAULT NULL,
    p_min_score INTEGER DEFAULT 0,
    p_max_score INTEGER DEFAULT 100,
    p_status TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    email TEXT,
    phone TEXT,
    status TEXT,
    source TEXT,
    score INTEGER,
    disc_style TEXT,
    last_contact_at TIMESTAMPTZ,
    next_followup_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.name,
        l.email,
        l.phone,
        l.status,
        l.source,
        COALESCE(l.score, 50)::INTEGER as score,
        l.disc_style,
        l.last_contact_at,
        l.next_followup_at,
        l.created_at,
        l.updated_at
    FROM leads l
    WHERE 
        (p_user_id IS NULL OR l.user_id = p_user_id)
        AND COALESCE(l.score, 50) >= p_min_score
        AND COALESCE(l.score, 50) <= p_max_score
        AND (p_status IS NULL OR l.status = p_status)
    ORDER BY COALESCE(l.score, 50) DESC
    LIMIT p_limit;
END;
$$;

-- =============================================================================
-- FUNCTION: get_lead_score_stats  
-- Statistiken zu Lead-Scores
-- =============================================================================

CREATE OR REPLACE FUNCTION get_lead_score_stats(
    p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    total_leads BIGINT,
    avg_score NUMERIC,
    hot_leads BIGINT,
    warm_leads BIGINT,
    cold_leads BIGINT,
    unscored_leads BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::BIGINT as total_leads,
        ROUND(AVG(COALESCE(l.score, 50)), 1) as avg_score,
        COUNT(*) FILTER (WHERE COALESCE(l.score, 50) >= 75)::BIGINT as hot_leads,
        COUNT(*) FILTER (WHERE COALESCE(l.score, 50) >= 40 AND COALESCE(l.score, 50) < 75)::BIGINT as warm_leads,
        COUNT(*) FILTER (WHERE COALESCE(l.score, 50) < 40)::BIGINT as cold_leads,
        COUNT(*) FILTER (WHERE l.score IS NULL)::BIGINT as unscored_leads
    FROM leads l
    WHERE (p_user_id IS NULL OR l.user_id = p_user_id);
END;
$$;

-- =============================================================================
-- FUNCTION: get_daily_flow_status
-- Holt den Daily-Flow-Status für einen Benutzer
-- =============================================================================

CREATE OR REPLACE FUNCTION get_daily_flow_status(
    p_user_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    date DATE,
    calls_completed INTEGER,
    calls_target INTEGER,
    messages_completed INTEGER,
    messages_target INTEGER,
    meetings_completed INTEGER,
    meetings_target INTEGER,
    streak_days INTEGER,
    goals_met BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_streak INTEGER := 0;
    v_check_date DATE;
    v_goals_met BOOLEAN;
BEGIN
    -- Berechne Streak
    v_check_date := p_date - INTERVAL '1 day';
    
    WHILE EXISTS (
        SELECT 1 FROM daily_flow_status dfs
        WHERE dfs.user_id = p_user_id 
        AND dfs.date = v_check_date
        AND dfs.goals_met = TRUE
    ) LOOP
        v_streak := v_streak + 1;
        v_check_date := v_check_date - INTERVAL '1 day';
    END LOOP;
    
    RETURN QUERY
    SELECT 
        COALESCE(dfs.date, p_date) as date,
        COALESCE(dfs.calls_completed, 0)::INTEGER,
        COALESCE(dfs.calls_target, 5)::INTEGER,
        COALESCE(dfs.messages_completed, 0)::INTEGER,
        COALESCE(dfs.messages_target, 10)::INTEGER,
        COALESCE(dfs.meetings_completed, 0)::INTEGER,
        COALESCE(dfs.meetings_target, 1)::INTEGER,
        v_streak::INTEGER as streak_days,
        COALESCE(dfs.goals_met, FALSE) as goals_met
    FROM daily_flow_status dfs
    WHERE dfs.user_id = p_user_id AND dfs.date = p_date;
    
    -- Falls kein Eintrag existiert, gib Default-Werte zurück
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            p_date as date,
            0::INTEGER as calls_completed,
            5::INTEGER as calls_target,
            0::INTEGER as messages_completed,
            10::INTEGER as messages_target,
            0::INTEGER as meetings_completed,
            1::INTEGER as meetings_target,
            v_streak::INTEGER as streak_days,
            FALSE as goals_met;
    END IF;
END;
$$;

-- =============================================================================
-- TABLE: daily_flow_status (falls nicht existiert)
-- Speichert den täglichen Status
-- =============================================================================

CREATE TABLE IF NOT EXISTS daily_flow_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    calls_completed INTEGER DEFAULT 0,
    calls_target INTEGER DEFAULT 5,
    messages_completed INTEGER DEFAULT 0,
    messages_target INTEGER DEFAULT 10,
    meetings_completed INTEGER DEFAULT 0,
    meetings_target INTEGER DEFAULT 1,
    goals_met BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_daily_flow_status_user_date 
ON daily_flow_status(user_id, date DESC);

-- RLS aktivieren
ALTER TABLE daily_flow_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own daily flow status" ON daily_flow_status
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own daily flow status" ON daily_flow_status
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily flow status" ON daily_flow_status
    FOR UPDATE USING (auth.uid() = user_id);

-- =============================================================================
-- FUNCTION: update_daily_flow_activity
-- Aktualisiert eine Aktivität im Daily-Flow
-- =============================================================================

CREATE OR REPLACE FUNCTION update_daily_flow_activity(
    p_user_id UUID,
    p_activity_type TEXT,  -- 'call', 'message', 'meeting'
    p_increment INTEGER DEFAULT 1,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    success BOOLEAN,
    new_count INTEGER,
    target INTEGER,
    target_met BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
    v_target INTEGER;
    v_target_met BOOLEAN;
BEGIN
    -- Upsert daily_flow_status
    INSERT INTO daily_flow_status (user_id, date)
    VALUES (p_user_id, p_date)
    ON CONFLICT (user_id, date) DO NOTHING;
    
    -- Update basierend auf Aktivitätstyp
    IF p_activity_type = 'call' THEN
        UPDATE daily_flow_status
        SET calls_completed = calls_completed + p_increment,
            updated_at = NOW()
        WHERE user_id = p_user_id AND date = p_date
        RETURNING calls_completed, calls_target INTO v_count, v_target;
    ELSIF p_activity_type = 'message' THEN
        UPDATE daily_flow_status
        SET messages_completed = messages_completed + p_increment,
            updated_at = NOW()
        WHERE user_id = p_user_id AND date = p_date
        RETURNING messages_completed, messages_target INTO v_count, v_target;
    ELSIF p_activity_type = 'meeting' THEN
        UPDATE daily_flow_status
        SET meetings_completed = meetings_completed + p_increment,
            updated_at = NOW()
        WHERE user_id = p_user_id AND date = p_date
        RETURNING meetings_completed, meetings_target INTO v_count, v_target;
    ELSE
        RETURN QUERY SELECT FALSE, 0, 0, FALSE;
        RETURN;
    END IF;
    
    v_target_met := v_count >= v_target;
    
    -- Update goals_met wenn alle Ziele erreicht
    UPDATE daily_flow_status
    SET goals_met = (
        calls_completed >= calls_target 
        AND messages_completed >= messages_target 
        AND meetings_completed >= meetings_target
    )
    WHERE user_id = p_user_id AND date = p_date;
    
    RETURN QUERY SELECT TRUE, v_count, v_target, v_target_met;
END;
$$;

-- =============================================================================
-- GRANTS für anon und authenticated Rollen
-- =============================================================================

GRANT EXECUTE ON FUNCTION get_leads_by_score TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_lead_score_stats TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_daily_flow_status TO authenticated;
GRANT EXECUTE ON FUNCTION update_daily_flow_activity TO authenticated;

-- =============================================================================
-- Füge score Spalte zu leads hinzu (falls nicht vorhanden)
-- =============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'score'
    ) THEN
        ALTER TABLE leads ADD COLUMN score INTEGER DEFAULT 50;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'disc_style'
    ) THEN
        ALTER TABLE leads ADD COLUMN disc_style TEXT;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'last_contact_at'
    ) THEN
        ALTER TABLE leads ADD COLUMN last_contact_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'next_followup_at'
    ) THEN
        ALTER TABLE leads ADD COLUMN next_followup_at TIMESTAMPTZ;
    END IF;
END $$;

-- ✅ FERTIG!
-- Führe dieses SQL im Supabase SQL Editor aus.


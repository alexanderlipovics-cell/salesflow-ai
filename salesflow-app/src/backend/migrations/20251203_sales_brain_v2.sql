-- ============================================================================
-- SALES BRAIN v2: Self-Learning Rules + Gamification + Push System
-- ============================================================================
-- 
-- Migration: 20251203_sales_brain_v2.sql
-- Beschreibung: Erweitert Sales Brain um Gamification (Streaks, Achievements)
--               und verbesserte Korrektur-Erkennung
-- 
-- Voraussetzung: 20251203_sales_brain.sql muss bereits ausgeführt sein
-- ============================================================================

-- ===================
-- NEUE ENUMS
-- ===================

-- Erweiterte Rule Types (fehlende hinzufügen)
DO $$
BEGIN
    -- Prüfen ob emoji existiert, sonst hinzufügen
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'emoji' AND enumtypid = 'rule_type'::regtype) THEN
        ALTER TYPE rule_type ADD VALUE 'emoji';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'length' AND enumtypid = 'rule_type'::regtype) THEN
        ALTER TYPE rule_type ADD VALUE 'length';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'greeting' AND enumtypid = 'rule_type'::regtype) THEN
        ALTER TYPE rule_type ADD VALUE 'greeting';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'closing' AND enumtypid = 'rule_type'::regtype) THEN
        ALTER TYPE rule_type ADD VALUE 'closing';
    END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Correction Status
DO $$
BEGIN
    CREATE TYPE correction_status AS ENUM (
        'pending',           -- Wartet auf User-Feedback
        'processed',         -- Feedback erhalten
        'rule_created',      -- Regel wurde erstellt
        'ignored',           -- User hat ignoriert
        'expired'            -- Zu alt, nicht mehr relevant
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Achievement Type
DO $$
BEGIN
    CREATE TYPE achievement_type AS ENUM (
        'streak',            -- X Tage in Folge aktiv
        'rules_created',     -- X Regeln gelernt
        'messages_sent',     -- X Nachrichten gesendet
        'deals_closed',      -- X Deals abgeschlossen
        'reply_rate',        -- X% Reply Rate erreicht
        'daily_complete',    -- Tagesziel X mal erreicht
        'team_contributor',  -- X Team-Regeln erstellt
        'fast_learner',      -- X Regeln in einer Woche
        'consistency'        -- X Wochen ohne Aussetzer
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===================
-- EXTEND user_corrections
-- ===================

-- Neue Spalten für erweiterte Analyse
DO $$
BEGIN
    -- AI Analysis JSON
    ALTER TABLE user_corrections ADD COLUMN IF NOT EXISTS ai_analysis JSONB;
    
    -- Suggested Rule JSON
    ALTER TABLE user_corrections ADD COLUMN IF NOT EXISTS suggested_rule JSONB;
    
    -- Status (migration von boolean)
    ALTER TABLE user_corrections ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
    
    -- Modal State
    ALTER TABLE user_corrections ADD COLUMN IF NOT EXISTS modal_shown BOOLEAN DEFAULT false;
    ALTER TABLE user_corrections ADD COLUMN IF NOT EXISTS modal_shown_at TIMESTAMPTZ;
    
    -- Character Diff
    ALTER TABLE user_corrections ADD COLUMN IF NOT EXISTS char_diff INTEGER;
    
    -- Expiry
    ALTER TABLE user_corrections ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days');
    
    -- Feedback Timestamp
    ALTER TABLE user_corrections ADD COLUMN IF NOT EXISTS feedback_at TIMESTAMPTZ;
    
    -- DISG Type
    ALTER TABLE user_corrections ADD COLUMN IF NOT EXISTS disg_type TEXT;
END $$;

-- ===================
-- EXTEND rule_applications
-- ===================

DO $$
BEGIN
    -- Output Text (was CHIEF generiert hat)
    ALTER TABLE rule_applications ADD COLUMN IF NOT EXISTS output_text TEXT;
    
    -- Was Accepted (User hat Output unverändert gesendet)
    ALTER TABLE rule_applications ADD COLUMN IF NOT EXISTS was_accepted BOOLEAN;
    
    -- Was Modified (User hat geändert)
    ALTER TABLE rule_applications ADD COLUMN IF NOT EXISTS was_modified BOOLEAN;
    
    -- Feedback Timestamp
    ALTER TABLE rule_applications ADD COLUMN IF NOT EXISTS feedback_at TIMESTAMPTZ;
END $$;

-- ===================
-- EXTEND sales_brain_rules
-- ===================

DO $$
BEGIN
    -- Examples as JSONB array
    ALTER TABLE sales_brain_rules ADD COLUMN IF NOT EXISTS examples JSONB DEFAULT '[]';
    
    -- Times Accepted
    ALTER TABLE sales_brain_rules ADD COLUMN IF NOT EXISTS times_accepted INTEGER DEFAULT 0;
    
    -- Times Modified
    ALTER TABLE sales_brain_rules ADD COLUMN IF NOT EXISTS times_modified INTEGER DEFAULT 0;
    
    -- Last Applied At
    ALTER TABLE sales_brain_rules ADD COLUMN IF NOT EXISTS last_applied_at TIMESTAMPTZ;
END $$;

-- ===================
-- EXTEND push_schedules
-- ===================

DO $$
BEGIN
    -- Reminder Push
    ALTER TABLE push_schedules ADD COLUMN IF NOT EXISTS reminder_enabled BOOLEAN DEFAULT true;
    ALTER TABLE push_schedules ADD COLUMN IF NOT EXISTS reminder_time TIME DEFAULT '14:00';
    
    -- Achievement Push
    ALTER TABLE push_schedules ADD COLUMN IF NOT EXISTS achievement_push_enabled BOOLEAN DEFAULT true;
    
    -- Streak Warning
    ALTER TABLE push_schedules ADD COLUMN IF NOT EXISTS streak_warning_enabled BOOLEAN DEFAULT true;
    ALTER TABLE push_schedules ADD COLUMN IF NOT EXISTS streak_warning_time TIME DEFAULT '20:00';
    
    -- Quiet Hours
    ALTER TABLE push_schedules ADD COLUMN IF NOT EXISTS quiet_hours_start TIME DEFAULT '22:00';
    ALTER TABLE push_schedules ADD COLUMN IF NOT EXISTS quiet_hours_end TIME DEFAULT '07:00';
END $$;

-- ===================
-- GAMIFICATION TABLES
-- ===================

-- 1. USER STREAKS
CREATE TABLE IF NOT EXISTS user_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Current Streak
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    
    -- Weekly Stats
    current_week_days INTEGER DEFAULT 0,   -- Aktive Tage diese Woche
    total_active_days INTEGER DEFAULT 0,
    
    -- Streak Recovery
    freeze_available BOOLEAN DEFAULT false, -- Einmal pro Woche Streak "retten"
    freeze_used_at DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT user_streaks_user_unique UNIQUE (user_id)
);

-- 2. ACHIEVEMENT DEFINITIONS
CREATE TABLE IF NOT EXISTS achievement_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    achievement_type TEXT NOT NULL,
    level INTEGER NOT NULL,
    
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    emoji TEXT NOT NULL,
    
    target_value INTEGER NOT NULL,
    
    -- Rewards
    reward_type TEXT,                       -- 'badge', 'feature_unlock', 'bonus'
    reward_data JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT achievement_defs_unique UNIQUE (achievement_type, level)
);

-- 3. USER ACHIEVEMENTS
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    achievement_type TEXT NOT NULL,
    achievement_level INTEGER DEFAULT 1,    -- Bronze=1, Silver=2, Gold=3, Platinum=4
    achievement_name TEXT NOT NULL,
    achievement_description TEXT,
    
    -- Progress
    current_value INTEGER DEFAULT 0,
    target_value INTEGER NOT NULL,
    progress_percent NUMERIC(5,2),
    
    -- Status
    unlocked BOOLEAN DEFAULT false,
    unlocked_at TIMESTAMPTZ,
    notified BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT user_achievements_unique UNIQUE (user_id, achievement_type, achievement_level)
);

-- ===================
-- INSERT ACHIEVEMENT DEFINITIONS
-- ===================

INSERT INTO achievement_definitions (achievement_type, level, name, description, emoji, target_value) VALUES
-- Streaks
('streak', 1, 'Erste Schritte', '3 Tage in Folge aktiv', '🔥', 3),
('streak', 2, 'Auf Kurs', '7 Tage in Folge aktiv', '🔥🔥', 7),
('streak', 3, 'Unstoppable', '30 Tage in Folge aktiv', '🔥🔥🔥', 30),
('streak', 4, 'Sales Machine', '100 Tage in Folge aktiv', '💎', 100),

-- Rules Created
('rules_created', 1, 'Erster Lernschritt', '1 Regel gelernt', '🧠', 1),
('rules_created', 2, 'Schneller Lerner', '5 Regeln gelernt', '🧠🧠', 5),
('rules_created', 3, 'Experte', '20 Regeln gelernt', '🧠🧠🧠', 20),
('rules_created', 4, 'Meister', '50 Regeln gelernt', '🎓', 50),

-- Messages Sent
('messages_sent', 1, 'Kontaktfreudig', '10 Nachrichten gesendet', '💬', 10),
('messages_sent', 2, 'Kommunikator', '100 Nachrichten gesendet', '💬💬', 100),
('messages_sent', 3, 'Networker', '500 Nachrichten gesendet', '💬💬💬', 500),
('messages_sent', 4, 'Influencer', '1000 Nachrichten gesendet', '⭐', 1000),

-- Deals
('deals_closed', 1, 'Erster Deal', '1 Deal abgeschlossen', '🤝', 1),
('deals_closed', 2, 'Sales Star', '10 Deals abgeschlossen', '🌟', 10),
('deals_closed', 3, 'Top Performer', '50 Deals abgeschlossen', '🏆', 50),
('deals_closed', 4, 'Legende', '100 Deals abgeschlossen', '👑', 100),

-- Daily Complete
('daily_complete', 1, 'Zielorientiert', '5x Tagesziel erreicht', '🎯', 5),
('daily_complete', 2, 'Diszipliniert', '20x Tagesziel erreicht', '🎯🎯', 20),
('daily_complete', 3, 'Unaufhaltsam', '50x Tagesziel erreicht', '🎯🎯🎯', 50),

-- Team Contributor
('team_contributor', 1, 'Teamplayer', '1 Team-Regel erstellt', '👥', 1),
('team_contributor', 2, 'Mentor', '5 Team-Regeln erstellt', '👥👥', 5),
('team_contributor', 3, 'Leader', '10 Team-Regeln erstellt', '🏅', 10)
ON CONFLICT (achievement_type, level) DO NOTHING;

-- ===================
-- INDEXES
-- ===================

-- User Streaks
CREATE INDEX IF NOT EXISTS idx_user_streaks_user ON user_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_streaks_last_activity ON user_streaks(last_activity_date DESC);

-- User Achievements
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_unlocked ON user_achievements(user_id, unlocked) WHERE unlocked = true;
CREATE INDEX IF NOT EXISTS idx_user_achievements_type ON user_achievements(achievement_type);

-- Achievement Definitions
CREATE INDEX IF NOT EXISTS idx_achievement_defs_type ON achievement_definitions(achievement_type);

-- User Corrections (erweitert)
CREATE INDEX IF NOT EXISTS idx_corrections_status ON user_corrections(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_corrections_expires ON user_corrections(expires_at);

-- ===================
-- ROW LEVEL SECURITY
-- ===================

ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievement_definitions ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "own_streaks" ON user_streaks;
CREATE POLICY "own_streaks" ON user_streaks
    FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "own_achievements" ON user_achievements;
CREATE POLICY "own_achievements" ON user_achievements
    FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "view_achievement_definitions" ON achievement_definitions;
CREATE POLICY "view_achievement_definitions" ON achievement_definitions
    FOR SELECT USING (true);

-- ===================
-- FUNCTIONS
-- ===================

-- Update streak on activity
CREATE OR REPLACE FUNCTION update_user_streak()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_activity_date, total_active_days)
    VALUES (NEW.user_id, 1, 1, CURRENT_DATE, 1)
    ON CONFLICT (user_id) DO UPDATE SET
        current_streak = CASE
            WHEN user_streaks.last_activity_date = CURRENT_DATE THEN user_streaks.current_streak
            WHEN user_streaks.last_activity_date = CURRENT_DATE - 1 THEN user_streaks.current_streak + 1
            ELSE 1
        END,
        longest_streak = GREATEST(
            user_streaks.longest_streak,
            CASE
                WHEN user_streaks.last_activity_date = CURRENT_DATE - 1 
                THEN user_streaks.current_streak + 1
                WHEN user_streaks.last_activity_date = CURRENT_DATE
                THEN user_streaks.current_streak
                ELSE 1
            END
        ),
        last_activity_date = CURRENT_DATE,
        total_active_days = user_streaks.total_active_days + 
            CASE WHEN user_streaks.last_activity_date < CURRENT_DATE THEN 1 ELSE 0 END,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on learning_events
DROP TRIGGER IF EXISTS update_streak_on_activity ON learning_events;
CREATE TRIGGER update_streak_on_activity
    AFTER INSERT ON learning_events
    FOR EACH ROW
    WHEN (NEW.event_type = 'message_sent')
    EXECUTE FUNCTION update_user_streak();

-- Calculate rule effectiveness (erweitert)
CREATE OR REPLACE FUNCTION recalculate_rule_effectiveness(p_rule_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE sales_brain_rules
    SET 
        effectiveness_score = (
            SELECT CASE 
                WHEN COUNT(*) > 0 
                THEN COUNT(*) FILTER (WHERE was_accepted = true)::numeric / COUNT(*)
                ELSE NULL
            END
            FROM rule_applications
            WHERE rule_id = p_rule_id AND was_accepted IS NOT NULL
        ),
        times_accepted = (
            SELECT COUNT(*) FROM rule_applications 
            WHERE rule_id = p_rule_id AND was_accepted = true
        ),
        times_modified = (
            SELECT COUNT(*) FROM rule_applications 
            WHERE rule_id = p_rule_id AND was_modified = true
        ),
        updated_at = NOW()
    WHERE id = p_rule_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger für Effectiveness Update
DROP TRIGGER IF EXISTS trg_recalc_effectiveness ON rule_applications;
CREATE OR REPLACE FUNCTION trigger_recalc_effectiveness()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM recalculate_rule_effectiveness(NEW.rule_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recalc_effectiveness
    AFTER INSERT OR UPDATE OF was_accepted, was_modified ON rule_applications
    FOR EACH ROW
    EXECUTE FUNCTION trigger_recalc_effectiveness();

-- Get streak for user
CREATE OR REPLACE FUNCTION get_user_streak(p_user_id UUID)
RETURNS TABLE (
    current_streak INTEGER,
    longest_streak INTEGER,
    last_activity_date DATE,
    total_active_days INTEGER,
    freeze_available BOOLEAN,
    streak_status TEXT
) AS $$
DECLARE
    v_last_date DATE;
    v_days_since INTEGER;
BEGIN
    SELECT us.current_streak, us.longest_streak, us.last_activity_date, 
           us.total_active_days, us.freeze_available
    INTO current_streak, longest_streak, last_activity_date, 
         total_active_days, freeze_available
    FROM user_streaks us
    WHERE us.user_id = p_user_id;
    
    IF NOT FOUND THEN
        current_streak := 0;
        longest_streak := 0;
        last_activity_date := NULL;
        total_active_days := 0;
        freeze_available := false;
        streak_status := 'inactive';
        RETURN NEXT;
        RETURN;
    END IF;
    
    IF last_activity_date IS NULL THEN
        streak_status := 'inactive';
    ELSE
        v_days_since := CURRENT_DATE - last_activity_date;
        IF v_days_since = 0 THEN
            streak_status := 'active_today';
        ELSIF v_days_since = 1 THEN
            streak_status := 'at_risk';
        ELSE
            streak_status := 'broken';
            current_streak := 0;
        END IF;
    END IF;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get users for streak warning
CREATE OR REPLACE FUNCTION get_users_for_streak_warning()
RETURNS TABLE (
    user_id UUID,
    current_streak INTEGER,
    push_token TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        us.user_id,
        us.current_streak,
        ps.push_token
    FROM user_streaks us
    JOIN push_schedules ps ON us.user_id = ps.user_id
    WHERE us.last_activity_date = CURRENT_DATE - 1
      AND us.current_streak >= 3
      AND ps.streak_warning_enabled = true
      AND ps.push_token IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM learning_events le
          WHERE le.user_id = us.user_id
            AND le.created_at::date = CURRENT_DATE
            AND le.event_type = 'message_sent'
      );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================
-- COMMENTS
-- ===================

COMMENT ON TABLE user_streaks IS 'Streak-Tracking für Gamification';
COMMENT ON TABLE user_achievements IS 'Freigeschaltete Achievements pro User';
COMMENT ON TABLE achievement_definitions IS 'Definition aller verfügbaren Achievements';

COMMENT ON COLUMN user_streaks.freeze_available IS 'Einmal pro Woche kann ein verpasster Tag überbrückt werden';
COMMENT ON COLUMN user_achievements.progress_percent IS 'Fortschritt zum Freischalten (0-100)';

-- ===================
-- MIGRATION COMPLETE
-- ===================



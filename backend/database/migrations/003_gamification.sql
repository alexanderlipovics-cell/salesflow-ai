-- =====================================================
-- GAMIFICATION SYSTEM TABLES
-- Badges, Achievements, Streaks, Leaderboards
-- =====================================================

-- Badges
CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Badge Details
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT, -- URL or emoji
    
    -- Tier
    tier TEXT NOT NULL, -- 'bronze', 'silver', 'gold', 'platinum'
    
    -- Criteria (JSON)
    criteria JSONB NOT NULL,
    -- Example: {"type": "lead_count", "threshold": 100}
    -- Types: lead_count, deal_count, activity_count, streak, email_sent, follow_up
    
    -- Points
    points INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    INDEX idx_badges_tier (tier),
    INDEX idx_badges_active (is_active)
);

-- User Achievements
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    
    earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE (user_id, badge_id),
    INDEX idx_user_achievements_user (user_id),
    INDEX idx_user_achievements_badge (badge_id),
    INDEX idx_user_achievements_earned_at (earned_at DESC)
);

-- Daily Streaks
CREATE TABLE IF NOT EXISTS daily_streaks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    
    last_activity_date DATE,
    streak_start_date DATE,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    INDEX idx_daily_streaks_user (user_id),
    INDEX idx_daily_streaks_current (current_streak DESC)
);

-- Leaderboard Entries
CREATE TABLE IF NOT EXISTS leaderboard_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Leaderboard Type
    leaderboard_type TEXT NOT NULL, -- 'most_leads', 'most_deals', 'most_activities', 'longest_streak'
    
    -- Period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Entry
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    rank INTEGER NOT NULL,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE (leaderboard_type, period_start, period_end, user_id),
    INDEX idx_leaderboard_type_period (leaderboard_type, period_start, period_end),
    INDEX idx_leaderboard_rank (leaderboard_type, period_start, period_end, rank)
);

-- Squad Challenges (Team Competitions)
CREATE TABLE IF NOT EXISTS squad_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    name TEXT NOT NULL,
    description TEXT,
    
    -- Challenge Type
    challenge_type TEXT NOT NULL, -- 'most_leads', 'most_deals', 'most_activities'
    
    -- Participants
    squad_ids UUID[], -- Array of squad IDs
    
    -- Duration
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    
    -- Prize
    prize_description TEXT,
    
    -- Status
    status TEXT DEFAULT 'active', -- 'active', 'completed', 'cancelled'
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    INDEX idx_squad_challenges_status (status),
    INDEX idx_squad_challenges_dates (start_date, end_date)
);

-- Challenge Entries
CREATE TABLE IF NOT EXISTS challenge_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id UUID NOT NULL REFERENCES squad_challenges(id) ON DELETE CASCADE,
    squad_id UUID NOT NULL,
    
    score INTEGER DEFAULT 0,
    rank INTEGER,
    
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE (challenge_id, squad_id),
    INDEX idx_challenge_entries_challenge (challenge_id),
    INDEX idx_challenge_entries_rank (challenge_id, rank)
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_daily_streaks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_daily_streaks_updated_at
    BEFORE UPDATE ON daily_streaks
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_streaks_updated_at();

-- Seed Default Badges
INSERT INTO badges (name, description, icon, tier, criteria, points) VALUES
('First Lead', 'Erstelle deinen ersten Lead', '🎯', 'bronze', '{"type": "lead_count", "threshold": 1}', 10),
('10 Leads', 'Erstelle 10 Leads', '📊', 'bronze', '{"type": "lead_count", "threshold": 10}', 50),
('50 Leads', 'Erstelle 50 Leads', '🚀', 'silver', '{"type": "lead_count", "threshold": 50}', 200),
('100 Leads', 'Erstelle 100 Leads', '💯', 'gold', '{"type": "lead_count", "threshold": 100}', 500),
('500 Leads', 'Erstelle 500 Leads', '🎖️', 'platinum', '{"type": "lead_count", "threshold": 500}', 2000),

('First Deal', 'Schließe deinen ersten Deal', '💰', 'bronze', '{"type": "deal_count", "threshold": 1}', 25),
('10 Deals', 'Schließe 10 Deals', '💵', 'silver', '{"type": "deal_count", "threshold": 10}', 250),
('50 Deals', 'Schließe 50 Deals', '🏆', 'gold', '{"type": "deal_count", "threshold": 50}', 1000),
('100 Deals', 'Schließe 100 Deals', '👑', 'platinum', '{"type": "deal_count", "threshold": 100}', 5000),

('7 Day Streak', '7 Tage am Stück aktiv', '🔥', 'bronze', '{"type": "streak", "threshold": 7}', 100),
('30 Day Streak', '30 Tage am Stück aktiv', '⚡', 'silver', '{"type": "streak", "threshold": 30}', 500),
('100 Day Streak', '100 Tage am Stück aktiv', '💥', 'gold', '{"type": "streak", "threshold": 100}', 2000),

('Communicator', 'Sende 50 Emails', '📧', 'bronze', '{"type": "email_sent", "threshold": 50}', 100),
('Follow-Up Pro', 'Schließe 25 Follow-ups ab', '📞', 'silver', '{"type": "follow_up", "threshold": 25}', 200),
('Activity Master', 'Erstelle 100 Aktivitäten', '✅', 'gold', '{"type": "activity_count", "threshold": 100}', 500)
ON CONFLICT DO NOTHING;

-- Comments
COMMENT ON TABLE badges IS 'Available badges/achievements';
COMMENT ON TABLE user_achievements IS 'User-earned badges';
COMMENT ON TABLE daily_streaks IS 'User daily activity streaks';
COMMENT ON TABLE leaderboard_entries IS 'Leaderboard rankings';
COMMENT ON TABLE squad_challenges IS 'Team challenges/competitions';
COMMENT ON TABLE challenge_entries IS 'Squad scores in challenges';


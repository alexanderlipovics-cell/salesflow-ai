-- =====================================================
-- SALES FLOW AI - COMPLETE FEATURE DEPLOYMENT
-- Email Integration + Import/Export + Gamification
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- 1. EMAIL INTEGRATION
-- =====================================================

\echo '📧 Installing Email Integration Tables...'

-- OAuth States
CREATE TABLE IF NOT EXISTS oauth_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    state TEXT NOT NULL,
    provider TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '10 minutes'
);
CREATE INDEX IF NOT EXISTS idx_oauth_states_user_provider ON oauth_states(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_oauth_states_state ON oauth_states(state);

-- Email Accounts
CREATE TABLE IF NOT EXISTS email_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    email_address TEXT NOT NULL,
    display_name TEXT,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    sync_enabled BOOLEAN DEFAULT TRUE,
    sync_status TEXT DEFAULT 'active',
    sync_error TEXT,
    last_sync_at TIMESTAMPTZ,
    total_emails_synced INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, email_address)
);
CREATE INDEX IF NOT EXISTS idx_email_accounts_user ON email_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_email_accounts_provider ON email_accounts(provider);

-- Email Messages
CREATE TABLE IF NOT EXISTS email_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_account_id UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    message_id TEXT UNIQUE NOT NULL,
    thread_id TEXT,
    from_address TEXT NOT NULL,
    to_addresses TEXT[] NOT NULL,
    cc_addresses TEXT[],
    bcc_addresses TEXT[],
    subject TEXT,
    body_text TEXT,
    body_html TEXT,
    direction TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    is_starred BOOLEAN DEFAULT FALSE,
    has_attachments BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_messages_account ON email_messages(email_account_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_lead ON email_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_direction ON email_messages(direction);
CREATE INDEX IF NOT EXISTS idx_email_messages_sent_at ON email_messages(sent_at DESC);

-- Email Attachments
CREATE TABLE IF NOT EXISTS email_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_message_id UUID NOT NULL REFERENCES email_messages(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    content_type TEXT,
    file_size INTEGER,
    file_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_attachments_message ON email_attachments(email_message_id);

\echo '✅ Email Integration installed!'

-- =====================================================
-- 2. IMPORT/EXPORT SYSTEM
-- =====================================================

\echo '📊 Installing Import/Export System...'

-- Import Jobs
CREATE TABLE IF NOT EXISTS import_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    import_type TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size INTEGER,
    field_mapping JSONB,
    status TEXT NOT NULL DEFAULT 'processing',
    total_rows INTEGER DEFAULT 0,
    processed_rows INTEGER DEFAULT 0,
    created_leads INTEGER DEFAULT 0,
    updated_leads INTEGER DEFAULT 0,
    skipped_rows INTEGER DEFAULT 0,
    errors JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_import_jobs_user ON import_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_import_jobs_created_at ON import_jobs(created_at DESC);

-- Export Jobs
CREATE TABLE IF NOT EXISTS export_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    export_type TEXT NOT NULL,
    export_scope TEXT NOT NULL,
    filters JSONB,
    file_path TEXT,
    file_size INTEGER,
    content_type TEXT,
    download_url TEXT,
    status TEXT NOT NULL DEFAULT 'processing',
    total_records INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_export_jobs_user ON export_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON export_jobs(status);
CREATE INDEX IF NOT EXISTS idx_export_jobs_created_at ON export_jobs(created_at DESC);

\echo '✅ Import/Export System installed!'

-- =====================================================
-- 3. GAMIFICATION SYSTEM
-- =====================================================

\echo '🎮 Installing Gamification System...'

-- Badges
CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT,
    tier TEXT NOT NULL,
    criteria JSONB NOT NULL,
    points INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_badges_tier ON badges(tier);
CREATE INDEX IF NOT EXISTS idx_badges_active ON badges(is_active);

-- User Achievements
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, badge_id)
);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_badge ON user_achievements(badge_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_earned_at ON user_achievements(earned_at DESC);

-- Daily Streaks
CREATE TABLE IF NOT EXISTS daily_streaks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    streak_start_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_daily_streaks_user ON daily_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_streaks_current ON daily_streaks(current_streak DESC);

-- Leaderboard Entries
CREATE TABLE IF NOT EXISTS leaderboard_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    leaderboard_type TEXT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER DEFAULT 0,
    rank INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (leaderboard_type, period_start, period_end, user_id)
);
CREATE INDEX IF NOT EXISTS idx_leaderboard_type_period ON leaderboard_entries(leaderboard_type, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_leaderboard_rank ON leaderboard_entries(leaderboard_type, period_start, period_end, rank);

-- Squad Challenges
CREATE TABLE IF NOT EXISTS squad_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    challenge_type TEXT NOT NULL,
    squad_ids UUID[],
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    prize_description TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_squad_challenges_status ON squad_challenges(status);
CREATE INDEX IF NOT EXISTS idx_squad_challenges_dates ON squad_challenges(start_date, end_date);

-- Challenge Entries
CREATE TABLE IF NOT EXISTS challenge_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id UUID NOT NULL REFERENCES squad_challenges(id) ON DELETE CASCADE,
    squad_id UUID NOT NULL,
    score INTEGER DEFAULT 0,
    rank INTEGER,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (challenge_id, squad_id)
);
CREATE INDEX IF NOT EXISTS idx_challenge_entries_challenge ON challenge_entries(challenge_id);
CREATE INDEX IF NOT EXISTS idx_challenge_entries_rank ON challenge_entries(challenge_id, rank);

\echo '✅ Gamification System installed!'

-- =====================================================
-- 4. SEED DEFAULT BADGES
-- =====================================================

\echo '🎖️ Seeding default badges...'

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

\echo '✅ Default badges seeded!'

-- =====================================================
-- 5. FUNCTIONS & TRIGGERS
-- =====================================================

\echo '⚙️ Creating functions and triggers...'

-- Auto-update email_accounts.updated_at
CREATE OR REPLACE FUNCTION update_email_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_email_accounts_updated_at ON email_accounts;
CREATE TRIGGER trigger_update_email_accounts_updated_at
    BEFORE UPDATE ON email_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_email_accounts_updated_at();

-- Auto-update daily_streaks.updated_at
CREATE OR REPLACE FUNCTION update_daily_streaks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_daily_streaks_updated_at ON daily_streaks;
CREATE TRIGGER trigger_update_daily_streaks_updated_at
    BEFORE UPDATE ON daily_streaks
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_streaks_updated_at();

\echo '✅ Functions and triggers created!'

-- =====================================================
-- DEPLOYMENT COMPLETE
-- =====================================================

\echo ''
\echo '🎉 =========================================='
\echo '🎉  ALL FEATURES DEPLOYED SUCCESSFULLY!'
\echo '🎉 =========================================='
\echo ''
\echo '📧 Email Integration: ✅'
\echo '📊 Import/Export System: ✅'
\echo '🎮 Gamification System: ✅'
\echo ''
\echo 'Next steps:'
\echo '1. Update backend/requirements.txt'
\echo '2. Set environment variables (Gmail/Outlook OAuth)'
\echo '3. Register routes in main.py'
\echo '4. Test the new features!'
\echo ''


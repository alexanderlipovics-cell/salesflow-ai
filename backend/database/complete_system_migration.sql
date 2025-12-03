-- ╔════════════════════════════════════════════════════════════════╗
-- ║  SALES FLOW AI - COMPLETE SYSTEM MIGRATION                     ║
-- ║  Alle Tabellen, Views, Functions für vollständiges System      ║
-- ╚════════════════════════════════════════════════════════════════╝

-- === EXTENSIONS ===
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ═══════════════════════════════════════════════════════════════
-- EMAIL INTEGRATION TABLES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS email_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'gmail', 'outlook', 'exchange', 'imap'
    email_address VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    
    -- OAuth Credentials (encrypted)
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP,
    
    -- IMAP/SMTP Settings (for non-OAuth)
    imap_host VARCHAR(255),
    imap_port INTEGER,
    smtp_host VARCHAR(255),
    smtp_port INTEGER,
    
    -- Sync Settings
    sync_enabled BOOLEAN DEFAULT TRUE,
    sync_frequency_minutes INTEGER DEFAULT 15, -- How often to sync
    last_sync_at TIMESTAMP,
    sync_status VARCHAR(50) DEFAULT 'active', -- 'active', 'paused', 'error'
    sync_error TEXT,
    
    -- Stats
    total_emails_synced INTEGER DEFAULT 0,
    last_email_received_at TIMESTAMP,
    
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_accounts_user_email ON email_accounts(user_id, email_address);
CREATE INDEX IF NOT EXISTS idx_email_accounts_user ON email_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_email_accounts_sync_status ON email_accounts(sync_status);

CREATE TABLE IF NOT EXISTS email_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_account_id UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    
    -- Email Identifiers
    message_id VARCHAR(500) NOT NULL, -- RFC 2822 Message-ID
    thread_id VARCHAR(500), -- For threading
    
    -- Email Headers
    from_address VARCHAR(255) NOT NULL,
    from_name VARCHAR(255),
    to_addresses TEXT[], -- Array of recipients
    cc_addresses TEXT[],
    bcc_addresses TEXT[],
    subject TEXT,
    
    -- Content
    body_text TEXT,
    body_html TEXT,
    
    -- Metadata
    direction VARCHAR(20) NOT NULL, -- 'inbound', 'outbound'
    sent_at TIMESTAMP NOT NULL,
    received_at TIMESTAMP,
    
    -- Flags
    is_read BOOLEAN DEFAULT FALSE,
    is_starred BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    
    -- Attachments
    has_attachments BOOLEAN DEFAULT FALSE,
    attachment_count INTEGER DEFAULT 0,
    attachments JSONB, -- [{name, size, mime_type, url}, ...]
    
    -- AI Analysis
    sentiment VARCHAR(50), -- 'positive', 'neutral', 'negative'
    key_points TEXT[],
    action_items TEXT[],
    ai_summary TEXT,
    
    -- Sync
    synced_at TIMESTAMP DEFAULT NOW(),
    
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_messages_message_id ON email_messages(message_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_account ON email_messages(email_account_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_lead ON email_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_thread ON email_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_messages_sent_at ON email_messages(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_messages_direction ON email_messages(direction);

CREATE TABLE IF NOT EXISTS email_threads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_account_id UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    
    thread_id VARCHAR(500) NOT NULL,
    subject TEXT,
    
    -- Participants
    participants TEXT[], -- All email addresses in thread
    
    -- Stats
    message_count INTEGER DEFAULT 0,
    last_message_at TIMESTAMP,
    first_message_at TIMESTAMP,
    
    -- Status
    is_archived BOOLEAN DEFAULT FALSE,
    is_important BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_threads_thread_id ON email_threads(thread_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_account ON email_threads(email_account_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_lead ON email_threads(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_threads_last_message ON email_threads(last_message_at DESC);

CREATE TABLE IF NOT EXISTS email_sync_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_account_id UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
    
    sync_started_at TIMESTAMP NOT NULL,
    sync_completed_at TIMESTAMP,
    
    status VARCHAR(50) NOT NULL, -- 'running', 'completed', 'failed'
    
    -- Stats
    emails_processed INTEGER DEFAULT 0,
    emails_created INTEGER DEFAULT 0,
    emails_updated INTEGER DEFAULT 0,
    
    error_message TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_sync_account ON email_sync_status(email_account_id);
CREATE INDEX IF NOT EXISTS idx_email_sync_status_status ON email_sync_status(status);
CREATE INDEX IF NOT EXISTS idx_email_sync_started ON email_sync_status(sync_started_at DESC);

-- ═══════════════════════════════════════════════════════════════
-- IMPORT/EXPORT TABLES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS import_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    import_type VARCHAR(50) NOT NULL, -- 'csv', 'salesforce', 'hubspot', 'pipedrive', 'excel'
    
    -- File Info
    file_name VARCHAR(500),
    file_size INTEGER,
    file_url TEXT,
    
    -- Mapping
    field_mapping JSONB NOT NULL, -- {csv_column: our_field, ...}
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    
    -- Progress
    total_rows INTEGER,
    processed_rows INTEGER DEFAULT 0,
    created_leads INTEGER DEFAULT 0,
    updated_leads INTEGER DEFAULT 0,
    skipped_rows INTEGER DEFAULT 0,
    error_rows INTEGER DEFAULT 0,
    
    -- Results
    errors JSONB, -- [{row: 5, error: "Invalid email"}, ...]
    warnings JSONB,
    
    -- Processing
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    error_message TEXT,
    
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_jobs_user ON import_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_import_jobs_created ON import_jobs(created_at DESC);

CREATE TABLE IF NOT EXISTS export_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    export_type VARCHAR(50) NOT NULL, -- 'csv', 'excel', 'json', 'pdf'
    export_scope VARCHAR(50) NOT NULL, -- 'all_leads', 'filtered_leads', 'all_data', 'gdpr'
    
    -- Filters (if filtered export)
    filters JSONB,
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    
    -- Results
    total_records INTEGER,
    file_path TEXT,
    file_size INTEGER,
    download_url TEXT,
    expires_at TIMESTAMP, -- Download link expires after X hours
    
    -- Processing
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    error_message TEXT,
    
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_export_jobs_user ON export_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON export_jobs(status);
CREATE INDEX IF NOT EXISTS idx_export_jobs_expires ON export_jobs(expires_at);

CREATE TABLE IF NOT EXISTS data_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    mapping_name VARCHAR(255) NOT NULL,
    source_system VARCHAR(100) NOT NULL, -- 'salesforce', 'hubspot', 'csv_template_1'
    
    field_mappings JSONB NOT NULL,
    /*
    Example:
    {
      "First Name": "name",
      "Email Address": "email",
      "Phone": "phone",
      "Company": "company",
      "Status": "status"
    }
    */
    
    -- Transformation Rules
    transformations JSONB,
    /*
    Example:
    {
      "phone": {"type": "format", "pattern": "international"},
      "status": {"type": "map", "values": {"Open": "new", "Qualified": "qualified"}}
    }
    */
    
    is_default BOOLEAN DEFAULT FALSE,
    last_used_at TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_mappings_user ON data_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_data_mappings_source ON data_mappings(source_system);

-- ═══════════════════════════════════════════════════════════════
-- GAMIFICATION TABLES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    badge_key VARCHAR(100) NOT NULL, -- 'first_lead', 'week_warrior', 'deal_closer'
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon_url TEXT,
    
    category VARCHAR(50), -- 'milestone', 'streak', 'performance', 'social'
    tier VARCHAR(20) DEFAULT 'bronze', -- 'bronze', 'silver', 'gold', 'platinum'
    
    -- Unlock Criteria
    criteria JSONB NOT NULL,
    /*
    Example:
    {
      "type": "lead_count",
      "threshold": 10
    }
    OR
    {
      "type": "streak",
      "days": 7
    }
    */
    
    points_value INTEGER DEFAULT 0,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_badges_key ON badges(badge_key);
CREATE INDEX IF NOT EXISTS idx_badges_category ON badges(category);
CREATE INDEX IF NOT EXISTS idx_badges_tier ON badges(tier);

CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    
    earned_at TIMESTAMP DEFAULT NOW(),
    
    -- Context when earned
    context JSONB,
    
    -- Notification
    seen BOOLEAN DEFAULT FALSE,
    celebrated BOOLEAN DEFAULT FALSE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_achievements_user_badge ON user_achievements(user_id, badge_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_earned ON user_achievements(earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_achievements_seen ON user_achievements(seen);

CREATE TABLE IF NOT EXISTS daily_streaks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    
    last_activity_date DATE,
    streak_start_date DATE,
    
    -- What counts as "activity"
    total_logins INTEGER DEFAULT 0,
    total_leads_added INTEGER DEFAULT 0,
    total_activities_logged INTEGER DEFAULT 0,
    
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_streaks_user ON daily_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_streaks_current ON daily_streaks(current_streak DESC);
CREATE INDEX IF NOT EXISTS idx_daily_streaks_last_activity ON daily_streaks(last_activity_date DESC);

CREATE TABLE IF NOT EXISTS leaderboard_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    leaderboard_type VARCHAR(50) NOT NULL, -- 'weekly_calls', 'monthly_deals', 'squad_performance'
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    squad_id UUID REFERENCES squads(id) ON DELETE CASCADE,
    
    score DECIMAL(10, 2) NOT NULL,
    rank INTEGER NOT NULL,
    
    -- Details
    details JSONB,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_type_period ON leaderboard_entries(leaderboard_type, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_leaderboard_user ON leaderboard_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_squad ON leaderboard_entries(squad_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_rank ON leaderboard_entries(rank ASC);

CREATE TABLE IF NOT EXISTS squad_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    squad_id UUID NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
    
    challenge_type VARCHAR(50) NOT NULL, -- 'total_calls', 'new_leads', 'deals_closed'
    title VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Goal
    target_value DECIMAL(10, 2) NOT NULL,
    current_value DECIMAL(10, 2) DEFAULT 0,
    
    -- Timing
    starts_at TIMESTAMP NOT NULL,
    ends_at TIMESTAMP NOT NULL,
    
    -- Status
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'failed'
    
    -- Rewards
    rewards JSONB,
    
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_squad_challenges_squad ON squad_challenges(squad_id);
CREATE INDEX IF NOT EXISTS idx_squad_challenges_status ON squad_challenges(status);
CREATE INDEX IF NOT EXISTS idx_squad_challenges_dates ON squad_challenges(starts_at, ends_at);

-- ═══════════════════════════════════════════════════════════════
-- VIDEO CONFERENCING TABLES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS video_meetings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    
    platform VARCHAR(50) NOT NULL, -- 'zoom', 'teams', 'google_meet'
    platform_meeting_id VARCHAR(255),
    
    title VARCHAR(500),
    description TEXT,
    
    -- Meeting Link
    join_url TEXT,
    host_url TEXT,
    
    -- Timing
    scheduled_start TIMESTAMP NOT NULL,
    scheduled_end TIMESTAMP,
    actual_start TIMESTAMP,
    actual_end TIMESTAMP,
    duration_minutes INTEGER,
    
    -- Status
    status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'completed', 'cancelled', 'no_show'
    
    -- Participants
    participants JSONB, -- [{name, email, joined_at, left_at}, ...]
    
    -- Recording
    has_recording BOOLEAN DEFAULT FALSE,
    recording_url TEXT,
    recording_size_mb DECIMAL(10, 2),
    
    -- Transcript
    has_transcript BOOLEAN DEFAULT FALSE,
    transcript_url TEXT,
    
    -- AI Analysis
    ai_summary TEXT,
    key_topics TEXT[],
    action_items TEXT[],
    sentiment_analysis JSONB,
    
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_meetings_user ON video_meetings(user_id);
CREATE INDEX IF NOT EXISTS idx_video_meetings_lead ON video_meetings(lead_id);
CREATE INDEX IF NOT EXISTS idx_video_meetings_scheduled ON video_meetings(scheduled_start DESC);
CREATE INDEX IF NOT EXISTS idx_video_meetings_status ON video_meetings(status);

CREATE TABLE IF NOT EXISTS meeting_recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_id UUID NOT NULL REFERENCES video_meetings(id) ON DELETE CASCADE,
    
    file_name VARCHAR(500),
    file_size_mb DECIMAL(10, 2),
    file_url TEXT NOT NULL,
    
    duration_minutes INTEGER,
    
    -- Processing
    processed BOOLEAN DEFAULT FALSE,
    transcript_generated BOOLEAN DEFAULT FALSE,
    ai_analysis_complete BOOLEAN DEFAULT FALSE,
    
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_recordings_meeting ON meeting_recordings(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_recordings_processed ON meeting_recordings(processed);

CREATE TABLE IF NOT EXISTS meeting_transcripts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meeting_id UUID NOT NULL REFERENCES video_meetings(id) ON DELETE CASCADE,
    
    transcript_text TEXT NOT NULL,
    
    -- Structured Transcript
    segments JSONB,
    /*
    [{
      "speaker": "John Doe",
      "timestamp": "00:05:30",
      "text": "I think we should proceed with..."
    }, ...]
    */
    
    -- AI Extracted
    speakers TEXT[],
    language VARCHAR(10) DEFAULT 'en',
    
    confidence_score DECIMAL(3, 2), -- 0.00 to 1.00
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_meeting_transcripts_meeting ON meeting_transcripts(meeting_id);

-- ═══════════════════════════════════════════════════════════════
-- LEAD ENRICHMENT TABLES
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS lead_enrichment_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    
    enrichment_type VARCHAR(50) NOT NULL, -- 'email_lookup', 'company_data', 'social_profiles', 'full'
    
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'no_data'
    
    -- Data Sources Used
    sources_queried TEXT[], -- ['clearbit', 'hunter', 'linkedin']
    
    -- Results
    data_found BOOLEAN DEFAULT FALSE,
    enriched_fields TEXT[], -- ['job_title', 'company', 'linkedin_url']
    
    -- Processing
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    
    error_message TEXT,
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_enrichment_lead ON lead_enrichment_jobs(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_enrichment_status ON lead_enrichment_jobs(status);
CREATE INDEX IF NOT EXISTS idx_lead_enrichment_type ON lead_enrichment_jobs(enrichment_type);

CREATE TABLE IF NOT EXISTS enriched_data_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Lookup Key
    lookup_type VARCHAR(50) NOT NULL, -- 'email', 'domain', 'linkedin_url'
    lookup_value VARCHAR(500) NOT NULL,
    
    -- Data Source
    source VARCHAR(50) NOT NULL, -- 'clearbit', 'hunter', 'zoominfo'
    
    -- Enriched Data
    data JSONB NOT NULL,
    
    -- Cache Control
    cached_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP, -- Cache expiration (e.g., 30 days)
    hit_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_enriched_cache_lookup_source ON enriched_data_cache(lookup_type, lookup_value, source);
CREATE INDEX IF NOT EXISTS idx_enriched_cache_lookup ON enriched_data_cache(lookup_type, lookup_value);
CREATE INDEX IF NOT EXISTS idx_enriched_cache_expires ON enriched_data_cache(expires_at);

-- ═══════════════════════════════════════════════════════════════
-- MATERIALIZED VIEWS
-- ═══════════════════════════════════════════════════════════════

-- User Activity Summary
CREATE MATERIALIZED VIEW IF NOT EXISTS view_user_activity_summary AS
SELECT 
    u.id AS user_id,
    u.email,
    COUNT(DISTINCT l.id) AS total_leads,
    COUNT(DISTINCT CASE WHEN l.status = 'won' THEN l.id END) AS won_deals,
    COUNT(DISTINCT a.id) AS total_activities,
    COUNT(DISTINCT m.id) AS total_messages,
    MAX(a.created_at) AS last_activity_at,
    ds.current_streak,
    ds.longest_streak,
    COUNT(DISTINCT ua.id) AS total_badges
FROM users u
LEFT JOIN leads l ON u.id = l.user_id
LEFT JOIN activities a ON l.id = a.lead_id
LEFT JOIN messages m ON l.id = m.lead_id
LEFT JOIN daily_streaks ds ON u.id = ds.user_id
LEFT JOIN user_achievements ua ON u.id = ua.user_id
GROUP BY u.id, u.email, ds.current_streak, ds.longest_streak;

CREATE INDEX IF NOT EXISTS idx_view_user_activity_user ON view_user_activity_summary(user_id);

-- Squad Performance View
CREATE MATERIALIZED VIEW IF NOT EXISTS view_squad_performance AS
SELECT 
    s.id AS squad_id,
    s.name AS squad_name,
    COUNT(DISTINCT u.id) AS member_count,
    COUNT(DISTINCT l.id) AS total_leads,
    COUNT(DISTINCT CASE WHEN l.status = 'won' THEN l.id END) AS won_deals,
    COUNT(DISTINCT a.id) AS total_activities,
    MAX(a.created_at) AS last_activity_at
FROM squads s
LEFT JOIN users u ON s.id = u.squad_id
LEFT JOIN leads l ON u.id = l.user_id
LEFT JOIN activities a ON l.id = a.lead_id
GROUP BY s.id, s.name;

CREATE INDEX IF NOT EXISTS idx_view_squad_performance_squad ON view_squad_performance(squad_id);

-- ═══════════════════════════════════════════════════════════════
-- FUNCTIONS (RPCs)
-- ═══════════════════════════════════════════════════════════════

-- Check if user can add more leads (tier limits)
CREATE OR REPLACE FUNCTION check_lead_limit(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_tier VARCHAR(50);
    v_lead_count INTEGER;
    v_limit INTEGER;
    v_can_add BOOLEAN;
BEGIN
    -- Get user's tier
    SELECT st.tier_name INTO v_tier
    FROM users u
    LEFT JOIN user_subscriptions us ON u.id = us.user_id AND us.status = 'active'
    LEFT JOIN subscription_tiers st ON us.tier_id = st.id
    WHERE u.id = p_user_id
    LIMIT 1;
    
    IF v_tier IS NULL THEN
        v_tier := 'free';
    END IF;
    
    -- Get lead count
    SELECT COUNT(*) INTO v_lead_count
    FROM leads
    WHERE user_id = p_user_id;
    
    -- Get limit for tier
    v_limit := CASE v_tier
        WHEN 'free' THEN 25
        WHEN 'starter' THEN 200
        WHEN 'pro' THEN 500
        WHEN 'premium' THEN 999999 -- "unlimited"
        WHEN 'enterprise' THEN 999999
        ELSE 25
    END;
    
    v_can_add := v_lead_count < v_limit;
    
    RETURN jsonb_build_object(
        'tier', v_tier,
        'current_leads', v_lead_count,
        'limit', v_limit,
        'can_add', v_can_add,
        'remaining', v_limit - v_lead_count
    );
END;
$$ LANGUAGE plpgsql;

-- Auto-assign lead to email based on sender
CREATE OR REPLACE FUNCTION auto_link_email_to_lead(p_email_message_id UUID)
RETURNS UUID AS $$
DECLARE
    v_lead_id UUID;
    v_from_address VARCHAR(255);
    v_account_user_id UUID;
BEGIN
    -- Get email info
    SELECT em.from_address, ea.user_id
    INTO v_from_address, v_account_user_id
    FROM email_messages em
    JOIN email_accounts ea ON em.email_account_id = ea.id
    WHERE em.id = p_email_message_id;
    
    -- Try to find matching lead by email
    SELECT id INTO v_lead_id
    FROM leads
    WHERE user_id = v_account_user_id 
      AND (email = v_from_address OR email ILIKE '%' || v_from_address || '%')
    LIMIT 1;
    
    -- If found, link it
    IF v_lead_id IS NOT NULL THEN
        UPDATE email_messages
        SET lead_id = v_lead_id
        WHERE id = p_email_message_id;
    END IF;
    
    RETURN v_lead_id;
END;
$$ LANGUAGE plpgsql;

-- Calculate badge progress for user
CREATE OR REPLACE FUNCTION calculate_badge_progress(p_user_id UUID, p_badge_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_criteria JSONB;
    v_type VARCHAR(50);
    v_threshold INTEGER;
    v_current_value INTEGER;
    v_progress DECIMAL(5,2);
    v_completed BOOLEAN;
BEGIN
    -- Get badge criteria
    SELECT criteria INTO v_criteria
    FROM badges
    WHERE id = p_badge_id;
    
    v_type := v_criteria->>'type';
    v_threshold := (v_criteria->>'threshold')::INTEGER;
    
    -- Calculate current value based on type
    CASE v_type
        WHEN 'lead_count' THEN
            SELECT COUNT(*) INTO v_current_value
            FROM leads WHERE user_id = p_user_id;
            
        WHEN 'deal_count' THEN
            SELECT COUNT(*) INTO v_current_value
            FROM leads WHERE user_id = p_user_id AND status = 'won';
            
        WHEN 'activity_count' THEN
            SELECT COUNT(*) INTO v_current_value
            FROM activities a
            JOIN leads l ON a.lead_id = l.id
            WHERE l.user_id = p_user_id;
            
        WHEN 'streak' THEN
            SELECT current_streak INTO v_current_value
            FROM daily_streaks WHERE user_id = p_user_id;
            
        ELSE
            v_current_value := 0;
    END CASE;
    
    v_progress := LEAST((v_current_value::DECIMAL / v_threshold) * 100, 100);
    v_completed := v_current_value >= v_threshold;
    
    RETURN jsonb_build_object(
        'badge_id', p_badge_id,
        'type', v_type,
        'current_value', v_current_value,
        'threshold', v_threshold,
        'progress', v_progress,
        'completed', v_completed
    );
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════
-- TRIGGERS
-- ═══════════════════════════════════════════════════════════════

-- Auto-link emails to leads when received
CREATE OR REPLACE FUNCTION trigger_auto_link_email()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM auto_link_email_to_lead(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_link_email_after_insert ON email_messages;
CREATE TRIGGER auto_link_email_after_insert
AFTER INSERT ON email_messages
FOR EACH ROW
EXECUTE FUNCTION trigger_auto_link_email();

-- Update daily streak on activity
CREATE OR REPLACE FUNCTION trigger_update_daily_streak()
RETURNS TRIGGER AS $$
DECLARE
    v_last_date DATE;
    v_current_streak INTEGER;
BEGIN
    -- Get lead's user
    SELECT last_activity_date, current_streak
    INTO v_last_date, v_current_streak
    FROM daily_streaks ds
    JOIN leads l ON l.user_id = ds.user_id
    WHERE l.id = NEW.lead_id;
    
    -- If activity is today
    IF DATE(NEW.created_at) = CURRENT_DATE THEN
        -- If last activity was yesterday, increment streak
        IF v_last_date = CURRENT_DATE - INTERVAL '1 day' THEN
            UPDATE daily_streaks
            SET current_streak = current_streak + 1,
                longest_streak = GREATEST(longest_streak, current_streak + 1),
                last_activity_date = CURRENT_DATE,
                updated_at = NOW()
            FROM leads l
            WHERE l.id = NEW.lead_id AND daily_streaks.user_id = l.user_id;
        -- If last activity was today, do nothing
        ELSIF v_last_date = CURRENT_DATE THEN
            -- Already counted today
            NULL;
        -- If last activity was before yesterday, reset streak
        ELSE
            UPDATE daily_streaks
            SET current_streak = 1,
                last_activity_date = CURRENT_DATE,
                streak_start_date = CURRENT_DATE,
                updated_at = NOW()
            FROM leads l
            WHERE l.id = NEW.lead_id AND daily_streaks.user_id = l.user_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_daily_streak_after_activity ON activities;
CREATE TRIGGER update_daily_streak_after_activity
AFTER INSERT ON activities
FOR EACH ROW
EXECUTE FUNCTION trigger_update_daily_streak();

-- Refresh materialized views periodically
-- (Note: This should be called via cron job or scheduled task)
CREATE OR REPLACE FUNCTION refresh_all_materialized_views()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY view_user_activity_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY view_squad_performance;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════
-- SEED DATA
-- ═══════════════════════════════════════════════════════════════

-- Insert default badges
INSERT INTO badges (badge_key, name, description, category, tier, criteria, points_value)
VALUES
    ('first_lead', 'First Lead', 'Created your first lead', 'milestone', 'bronze', '{"type": "lead_count", "threshold": 1}', 10),
    ('lead_master_10', '10 Leads', 'Reached 10 leads', 'milestone', 'bronze', '{"type": "lead_count", "threshold": 10}', 50),
    ('lead_master_50', '50 Leads', 'Reached 50 leads', 'milestone', 'silver', '{"type": "lead_count", "threshold": 50}', 200),
    ('lead_master_100', '100 Leads', 'Reached 100 leads', 'milestone', 'gold', '{"type": "lead_count", "threshold": 100}', 500),
    
    ('first_deal', 'First Deal Closed', 'Closed your first deal', 'milestone', 'bronze', '{"type": "deal_count", "threshold": 1}', 100),
    ('deal_closer_10', '10 Deals', 'Closed 10 deals', 'milestone', 'silver', '{"type": "deal_count", "threshold": 10}', 500),
    ('deal_closer_50', '50 Deals', 'Closed 50 deals', 'milestone', 'gold', '{"type": "deal_count", "threshold": 50}', 2000),
    
    ('week_warrior', 'Week Warrior', '7 day streak', 'streak', 'bronze', '{"type": "streak", "days": 7}', 100),
    ('month_master', 'Month Master', '30 day streak', 'streak', 'silver', '{"type": "streak", "days": 30}', 500),
    ('unstoppable', 'Unstoppable', '100 day streak', 'streak', 'gold', '{"type": "streak", "days": 100}', 2000),
    
    ('activity_beast_100', 'Activity Beast', '100 activities logged', 'performance', 'bronze', '{"type": "activity_count", "threshold": 100}', 200),
    ('activity_beast_500', 'Activity Machine', '500 activities logged', 'performance', 'silver', '{"type": "activity_count", "threshold": 500}', 1000)
ON CONFLICT (badge_key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- COMPLETION
-- ═══════════════════════════════════════════════════════════════

COMMENT ON TABLE email_accounts IS 'User email account integrations (Gmail, Outlook, etc.)';
COMMENT ON TABLE email_messages IS 'All email messages synced from connected accounts';
COMMENT ON TABLE import_jobs IS 'Bulk import jobs from CSV, Salesforce, etc.';
COMMENT ON TABLE export_jobs IS 'Data export jobs for users';
COMMENT ON TABLE badges IS 'Achievement badges users can earn';
COMMENT ON TABLE user_achievements IS 'Badges earned by users';
COMMENT ON TABLE daily_streaks IS 'User daily activity streaks';
COMMENT ON TABLE leaderboard_entries IS 'Leaderboard rankings';
COMMENT ON TABLE video_meetings IS 'Video conference meetings (Zoom, Teams, etc.)';
COMMENT ON TABLE lead_enrichment_jobs IS 'Jobs to enrich lead data from external sources';


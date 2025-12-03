-- ════════════════════════════════════════════════════════════════════════════
-- CHIEF V3.0 MODULE - DATABASE MIGRATION
-- Tabellen für Onboarding, Ghost-Buster, Team-Leader
-- ════════════════════════════════════════════════════════════════════════════

-- ============================================================================
-- 1. USER ONBOARDING TABLE
-- Trackt den Onboarding-Fortschritt für neue User
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_onboarding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Stage & Progress
    started_at DATE NOT NULL DEFAULT CURRENT_DATE,
    current_stage TEXT NOT NULL DEFAULT 'day_1' CHECK (current_stage IN ('day_1', 'days_2_3', 'days_4_7', 'days_8_14', 'completed')),
    completed_tasks TEXT[] DEFAULT '{}',
    
    -- Milestones
    first_contact_sent BOOLEAN DEFAULT false,
    first_contact_at TIMESTAMPTZ,
    first_reply_received BOOLEAN DEFAULT false,
    first_reply_at TIMESTAMPTZ,
    first_sale BOOLEAN DEFAULT false,
    first_sale_at TIMESTAMPTZ,
    first_objection_handled BOOLEAN DEFAULT false,
    first_objection_at TIMESTAMPTZ,
    
    -- Overwhelm Prevention
    session_count INTEGER DEFAULT 0,
    days_inactive INTEGER DEFAULT 0,
    last_active_date DATE,
    is_overwhelmed BOOLEAN DEFAULT false,
    
    -- Completion
    completed_at TIMESTAMPTZ,
    completion_percent DECIMAL(5,2) DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_user_onboarding UNIQUE (user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_onboarding_user ON user_onboarding(user_id);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_stage ON user_onboarding(current_stage);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_started ON user_onboarding(started_at);

-- RLS
ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own onboarding"
    ON user_onboarding FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own onboarding"
    ON user_onboarding FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own onboarding"
    ON user_onboarding FOR INSERT
    WITH CHECK (auth.uid() = user_id);


-- ============================================================================
-- 2. TEAM NUDGES TABLE
-- Speichert Nudge/Push-Nachrichten von Team-Leadern an Members
-- ============================================================================

CREATE TABLE IF NOT EXISTS team_nudges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Sender & Recipient
    from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Nudge Content
    nudge_type TEXT NOT NULL DEFAULT 'gentle' CHECK (nudge_type IN ('gentle', 'direct', 'motivational', 'custom')),
    message TEXT NOT NULL,
    
    -- Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    
    -- Context
    trigger_reason TEXT, -- 'inactivity', 'overdue_followups', 'low_performance', etc.
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_team_nudges_from ON team_nudges(from_user_id);
CREATE INDEX IF NOT EXISTS idx_team_nudges_to ON team_nudges(to_user_id);
CREATE INDEX IF NOT EXISTS idx_team_nudges_created ON team_nudges(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_nudges_unread ON team_nudges(to_user_id, is_read) WHERE is_read = false;

-- RLS
ALTER TABLE team_nudges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view nudges to them"
    ON team_nudges FOR SELECT
    USING (auth.uid() = to_user_id OR auth.uid() = from_user_id);

CREATE POLICY "Team leaders can send nudges"
    ON team_nudges FOR INSERT
    WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can mark nudges as read"
    ON team_nudges FOR UPDATE
    USING (auth.uid() = to_user_id);


-- ============================================================================
-- 3. TEAM TEMPLATES TABLE
-- Geteilte Templates von erfolgreichen Team-Membern
-- ============================================================================

CREATE TABLE IF NOT EXISTS team_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Team & Creator
    team_id UUID NOT NULL,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    original_template_id UUID, -- Link zum Original-Template des Users
    
    -- Template Content
    title TEXT NOT NULL,
    template_type TEXT NOT NULL DEFAULT 'dm' CHECK (template_type IN ('dm', 'followup', 'objection', 'closing', 'reengagement', 'other')),
    content TEXT NOT NULL,
    
    -- Performance Metrics
    success_rate DECIMAL(5,2) DEFAULT 0,
    used_count INTEGER DEFAULT 0,
    reply_rate DECIMAL(5,2) DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Categorization
    tags TEXT[] DEFAULT '{}',
    platform TEXT, -- instagram, whatsapp, etc.
    target_audience TEXT, -- warm, cold, ghost, etc.
    
    -- Sharing
    share_message TEXT,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_team_templates_team ON team_templates(team_id);
CREATE INDEX IF NOT EXISTS idx_team_templates_creator ON team_templates(created_by);
CREATE INDEX IF NOT EXISTS idx_team_templates_type ON team_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_team_templates_success ON team_templates(success_rate DESC);
CREATE INDEX IF NOT EXISTS idx_team_templates_active ON team_templates(team_id, is_active) WHERE is_active = true;

-- RLS
ALTER TABLE team_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can view team templates"
    ON team_templates FOR SELECT
    USING (
        is_active = true AND 
        team_id IN (SELECT team_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Users can insert templates for their team"
    ON team_templates FOR INSERT
    WITH CHECK (
        auth.uid() = created_by AND
        team_id IN (SELECT team_id FROM users WHERE id = auth.uid())
    );

CREATE POLICY "Template creators can update their templates"
    ON team_templates FOR UPDATE
    USING (auth.uid() = created_by);


-- ============================================================================
-- 4. GHOST TRACKING COLUMNS (Add to outreach_messages if not exists)
-- ============================================================================

-- Add columns to existing outreach_messages table
DO $$
BEGIN
    -- Ghost Buster specific columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'outreach_messages' AND column_name = 'ghost_followup_count') THEN
        ALTER TABLE outreach_messages ADD COLUMN ghost_followup_count INTEGER DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'outreach_messages' AND column_name = 'last_reengagement_at') THEN
        ALTER TABLE outreach_messages ADD COLUMN last_reengagement_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'outreach_messages' AND column_name = 'last_reengagement_strategy') THEN
        ALTER TABLE outreach_messages ADD COLUMN last_reengagement_strategy TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'outreach_messages' AND column_name = 'last_reengagement_message') THEN
        ALTER TABLE outreach_messages ADD COLUMN last_reengagement_message TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'outreach_messages' AND column_name = 'was_online_since') THEN
        ALTER TABLE outreach_messages ADD COLUMN was_online_since BOOLEAN DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'outreach_messages' AND column_name = 'snooze_until') THEN
        ALTER TABLE outreach_messages ADD COLUMN snooze_until TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'outreach_messages' AND column_name = 'skip_reason') THEN
        ALTER TABLE outreach_messages ADD COLUMN skip_reason TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'outreach_messages' AND column_name = 'skipped_at') THEN
        ALTER TABLE outreach_messages ADD COLUMN skipped_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'outreach_messages' AND column_name = 'archived_at') THEN
        ALTER TABLE outreach_messages ADD COLUMN archived_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'outreach_messages' AND column_name = 'archive_reason') THEN
        ALTER TABLE outreach_messages ADD COLUMN archive_reason TEXT;
    END IF;
END $$;

-- Index for Ghost Buster queries
CREATE INDEX IF NOT EXISTS idx_outreach_ghost_priority 
    ON outreach_messages(user_id, is_ghost, seen_at) 
    WHERE is_ghost = true AND replied_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_outreach_snooze 
    ON outreach_messages(user_id, snooze_until) 
    WHERE snooze_until IS NOT NULL;


-- ============================================================================
-- 5. USER STREAKS TABLE (for team dashboard)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Streak Data
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    
    -- Streak Types
    outreach_streak INTEGER DEFAULT 0,
    followup_streak INTEGER DEFAULT 0,
    login_streak INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_user_streak UNIQUE (user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_streaks_user ON user_streaks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_streaks_current ON user_streaks(current_streak DESC);

-- RLS
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own streaks"
    ON user_streaks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own streaks"
    ON user_streaks FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own streaks"
    ON user_streaks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Team leaders can view team streaks
CREATE POLICY "Team leaders can view team streaks"
    ON user_streaks FOR SELECT
    USING (
        user_id IN (
            SELECT id FROM users 
            WHERE team_id IN (SELECT team_id FROM users WHERE id = auth.uid())
        )
    );


-- ============================================================================
-- 6. ACTIVITY LOG TABLE (for team dashboard)
-- ============================================================================

CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Activity
    action TEXT NOT NULL, -- 'outreach', 'followup', 'sale', 'objection', 'login', etc.
    details JSONB DEFAULT '{}',
    
    -- Context
    related_id UUID, -- ID des related records (lead, outreach, etc.)
    related_type TEXT, -- 'lead', 'outreach', 'followup', etc.
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_action ON activity_log(action);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_date ON activity_log(user_id, created_at DESC);

-- RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity"
    ON activity_log FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity"
    ON activity_log FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Team leaders can view team activity
CREATE POLICY "Team leaders can view team activity"
    ON activity_log FOR SELECT
    USING (
        user_id IN (
            SELECT id FROM users 
            WHERE team_id IN (SELECT team_id FROM users WHERE id = auth.uid())
        )
    );


-- ============================================================================
-- 7. ADD team_id TO USERS IF NOT EXISTS
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'team_id') THEN
        ALTER TABLE users ADD COLUMN team_id UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'level') THEN
        ALTER TABLE users ADD COLUMN level TEXT DEFAULT 'starter' CHECK (level IN ('starter', 'practitioner', 'professional', 'expert'));
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'users' AND column_name = 'last_active_at') THEN
        ALTER TABLE users ADD COLUMN last_active_at TIMESTAMPTZ;
    END IF;
END $$;

-- Index for team queries
CREATE INDEX IF NOT EXISTS idx_users_team ON users(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_level ON users(level);


-- ============================================================================
-- 8. HELPER FUNCTIONS
-- ============================================================================

-- Function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DROP TRIGGER IF EXISTS update_user_onboarding_updated_at ON user_onboarding;
CREATE TRIGGER update_user_onboarding_updated_at
    BEFORE UPDATE ON user_onboarding
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_team_templates_updated_at ON team_templates;
CREATE TRIGGER update_team_templates_updated_at
    BEFORE UPDATE ON team_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_streaks_updated_at ON user_streaks;
CREATE TRIGGER update_user_streaks_updated_at
    BEFORE UPDATE ON user_streaks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- ============================================================================
-- 9. GHOST BUSTER HELPER FUNCTION
-- ============================================================================

-- Function to classify ghost type based on hours since seen
CREATE OR REPLACE FUNCTION classify_ghost_type(hours_since_seen INTEGER, reengagement_attempts INTEGER)
RETURNS TEXT AS $$
BEGIN
    IF hours_since_seen <= 72 THEN
        RETURN 'soft';
    ELSIF hours_since_seen <= 168 AND reengagement_attempts < 3 THEN
        RETURN 'hard';
    ELSE
        RETURN 'deep';
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ============================================================================
-- DONE!
-- ============================================================================

SELECT 'CHIEF v3.0 Module Migration erfolgreich!' as status;


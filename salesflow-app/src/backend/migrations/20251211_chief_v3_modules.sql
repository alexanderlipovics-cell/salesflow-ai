-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  CHIEF V3.0 MODULES MIGRATION                                              ║
-- ║  Onboarding, Ghost-Buster, Team-Leader                                     ║
-- ╚════════════════════════════════════════════════════════════════════════════╝
--
-- ANLEITUNG:
-- 1. Öffne Supabase Dashboard → SQL Editor
-- 2. Kopiere den GESAMTEN Inhalt dieser Datei
-- 3. Führe das Script aus
-- ============================================================================

-- ============================================================================
-- PHASE 1: ONBOARDING SYSTEM
-- ============================================================================

-- User Onboarding Progress
CREATE TABLE IF NOT EXISTS user_onboarding (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Journey State
    started_at DATE NOT NULL DEFAULT CURRENT_DATE,
    current_stage TEXT DEFAULT 'day_1',  -- day_1, days_2_3, days_4_7, days_8_14
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Task Progress
    completed_tasks TEXT[] DEFAULT '{}',
    
    -- Milestones
    first_contact_sent BOOLEAN DEFAULT false,
    first_contact_sent_at TIMESTAMP WITH TIME ZONE,
    first_reply_received BOOLEAN DEFAULT false,
    first_reply_received_at TIMESTAMP WITH TIME ZONE,
    first_sale BOOLEAN DEFAULT false,
    first_sale_at TIMESTAMP WITH TIME ZONE,
    first_objection_handled BOOLEAN DEFAULT false,
    first_objection_handled_at TIMESTAMP WITH TIME ZONE,
    
    -- Engagement Tracking
    session_count INTEGER DEFAULT 0,
    last_session_at TIMESTAMP WITH TIME ZONE,
    days_inactive INTEGER DEFAULT 0,
    is_overwhelmed BOOLEAN DEFAULT false,
    overwhelm_detected_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id)
);

-- Onboarding Events Log
CREATE TABLE IF NOT EXISTS onboarding_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    event_type TEXT NOT NULL,  -- task_completed, milestone_reached, stage_changed, overwhelm_detected
    event_data JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PHASE 2: GHOST BUSTER EXTENSIONS (erweitert outreach_messages)
-- ============================================================================

-- Erweitere outreach_messages falls Spalten fehlen
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'outreach_messages') THEN
        -- Ghost-Buster spezifische Spalten
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'outreach_messages' AND column_name = 'ghost_since') THEN
            ALTER TABLE outreach_messages ADD COLUMN ghost_since TIMESTAMP WITH TIME ZONE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'outreach_messages' AND column_name = 'ghost_followup_count') THEN
            ALTER TABLE outreach_messages ADD COLUMN ghost_followup_count INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'outreach_messages' AND column_name = 'was_online_since') THEN
            ALTER TABLE outreach_messages ADD COLUMN was_online_since BOOLEAN DEFAULT false;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'outreach_messages' AND column_name = 'last_reengagement_strategy') THEN
            ALTER TABLE outreach_messages ADD COLUMN last_reengagement_strategy TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'outreach_messages' AND column_name = 'last_reengagement_at') THEN
            ALTER TABLE outreach_messages ADD COLUMN last_reengagement_at TIMESTAMP WITH TIME ZONE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'outreach_messages' AND column_name = 'last_reengagement_message') THEN
            ALTER TABLE outreach_messages ADD COLUMN last_reengagement_message TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'outreach_messages' AND column_name = 'skip_reason') THEN
            ALTER TABLE outreach_messages ADD COLUMN skip_reason TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'outreach_messages' AND column_name = 'skipped_at') THEN
            ALTER TABLE outreach_messages ADD COLUMN skipped_at TIMESTAMP WITH TIME ZONE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'outreach_messages' AND column_name = 'snooze_until') THEN
            ALTER TABLE outreach_messages ADD COLUMN snooze_until TIMESTAMP WITH TIME ZONE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'outreach_messages' AND column_name = 'archive_reason') THEN
            ALTER TABLE outreach_messages ADD COLUMN archive_reason TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'outreach_messages' AND column_name = 'archived_at') THEN
            ALTER TABLE outreach_messages ADD COLUMN archived_at TIMESTAMP WITH TIME ZONE;
        END IF;
        RAISE NOTICE '✅ outreach_messages Ghost-Buster Spalten hinzugefügt';
    END IF;
END $$;

-- Ghost Re-Engagement Log
CREATE TABLE IF NOT EXISTS ghost_reengagement_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    outreach_id UUID NOT NULL,
    
    ghost_type TEXT NOT NULL,  -- soft, hard, deep
    strategy_used TEXT NOT NULL,
    message_sent TEXT,
    
    -- Outcome
    got_response BOOLEAN,
    response_at TIMESTAMP WITH TIME ZONE,
    response_type TEXT,  -- positive, negative, neutral
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PHASE 3: TEAM SYSTEM
-- ============================================================================

-- Teams Tabelle
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    
    -- Owner/Leader
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Settings
    settings JSONB DEFAULT '{}',
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team Memberships
CREATE TABLE IF NOT EXISTS team_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    role TEXT DEFAULT 'member',  -- owner, leader, member
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(team_id, user_id)
);

-- Team Nudges (Leader → Member Messages)
CREATE TABLE IF NOT EXISTS team_nudges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID,
    from_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    nudge_type TEXT NOT NULL,  -- gentle, direct, motivational
    message TEXT NOT NULL,
    
    -- Tracking
    read_at TIMESTAMP WITH TIME ZONE,
    responded_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team Templates (Shared by Leaders)
CREATE TABLE IF NOT EXISTS team_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    
    original_template_id UUID,
    title TEXT NOT NULL,
    template_type TEXT DEFAULT 'other',  -- dm, followup, objection, closing
    content TEXT NOT NULL,
    
    -- Creator
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    share_message TEXT,
    
    -- Performance
    success_rate NUMERIC(5,4) DEFAULT 0,
    used_count INTEGER DEFAULT 0,
    tags TEXT[] DEFAULT '{}',
    
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Team Performance Snapshots (für Dashboard)
CREATE TABLE IF NOT EXISTS team_performance_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    
    snapshot_date DATE NOT NULL,
    
    -- Aggregierte Metriken
    total_members INTEGER DEFAULT 0,
    active_members INTEGER DEFAULT 0,
    total_outreach INTEGER DEFAULT 0,
    total_replies INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    avg_conversion_rate NUMERIC(5,4) DEFAULT 0,
    
    -- Top Performer
    top_performer_id UUID,
    top_performer_outreach INTEGER DEFAULT 0,
    
    -- Raw Data
    member_stats JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(team_id, snapshot_date)
);

-- ============================================================================
-- PHASE 4: USER PROFILES ERWEITERUNGEN
-- ============================================================================

-- Erweitere profiles für Team-Features
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'team_id') THEN
            ALTER TABLE profiles ADD COLUMN team_id UUID REFERENCES teams(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'team_role') THEN
            ALTER TABLE profiles ADD COLUMN team_role TEXT DEFAULT 'member';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'onboarding_completed') THEN
            ALTER TABLE profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;
        END IF;
        RAISE NOTICE '✅ profiles Team-Spalten hinzugefügt';
    END IF;
END $$;

-- ============================================================================
-- PHASE 5: INDEXES
-- ============================================================================

-- Onboarding Indexes
CREATE INDEX IF NOT EXISTS idx_user_onboarding_user ON user_onboarding(user_id);
CREATE INDEX IF NOT EXISTS idx_user_onboarding_stage ON user_onboarding(current_stage);
CREATE INDEX IF NOT EXISTS idx_onboarding_events_user ON onboarding_events(user_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_events_type ON onboarding_events(event_type);

-- Ghost Indexes (erweitert)
CREATE INDEX IF NOT EXISTS idx_outreach_ghost ON outreach_messages(user_id, is_ghost) WHERE is_ghost = true;
CREATE INDEX IF NOT EXISTS idx_outreach_ghost_since ON outreach_messages(ghost_since) WHERE is_ghost = true;
CREATE INDEX IF NOT EXISTS idx_outreach_snooze ON outreach_messages(snooze_until) WHERE snooze_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ghost_log_user ON ghost_reengagement_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ghost_log_outreach ON ghost_reengagement_log(outreach_id);

-- Team Indexes
CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_id);
CREATE INDEX IF NOT EXISTS idx_team_memberships_team ON team_memberships(team_id);
CREATE INDEX IF NOT EXISTS idx_team_memberships_user ON team_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_team_nudges_to ON team_nudges(to_user_id);
CREATE INDEX IF NOT EXISTS idx_team_nudges_from ON team_nudges(from_user_id);
CREATE INDEX IF NOT EXISTS idx_team_templates_team ON team_templates(team_id);
CREATE INDEX IF NOT EXISTS idx_team_performance_team ON team_performance_snapshots(team_id, snapshot_date);

-- Profiles Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_team ON profiles(team_id) WHERE team_id IS NOT NULL;

-- ============================================================================
-- PHASE 6: RLS POLICIES
-- ============================================================================

-- Onboarding RLS
ALTER TABLE user_onboarding ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own onboarding" ON user_onboarding;
CREATE POLICY "Users can view own onboarding" ON user_onboarding
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own onboarding" ON user_onboarding;
CREATE POLICY "Users can update own onboarding" ON user_onboarding
    FOR ALL USING (auth.uid() = user_id);

-- Onboarding Events RLS
ALTER TABLE onboarding_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own onboarding events" ON onboarding_events;
CREATE POLICY "Users can view own onboarding events" ON onboarding_events
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own onboarding events" ON onboarding_events;
CREATE POLICY "Users can insert own onboarding events" ON onboarding_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Ghost Log RLS
ALTER TABLE ghost_reengagement_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own ghost logs" ON ghost_reengagement_log;
CREATE POLICY "Users can view own ghost logs" ON ghost_reengagement_log
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own ghost logs" ON ghost_reengagement_log;
CREATE POLICY "Users can insert own ghost logs" ON ghost_reengagement_log
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Teams RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team members can view team" ON teams;
CREATE POLICY "Team members can view team" ON teams
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM team_memberships 
            WHERE team_memberships.team_id = teams.id 
            AND team_memberships.user_id = auth.uid()
        )
        OR owner_id = auth.uid()
    );

DROP POLICY IF EXISTS "Owners can manage team" ON teams;
CREATE POLICY "Owners can manage team" ON teams
    FOR ALL USING (owner_id = auth.uid());

-- Team Memberships RLS
ALTER TABLE team_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team members can view memberships" ON team_memberships;
CREATE POLICY "Team members can view memberships" ON team_memberships
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM team_memberships tm 
            WHERE tm.team_id = team_memberships.team_id 
            AND tm.user_id = auth.uid()
        )
    );

-- Team Nudges RLS
ALTER TABLE team_nudges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view nudges sent to them" ON team_nudges;
CREATE POLICY "Users can view nudges sent to them" ON team_nudges
    FOR SELECT USING (to_user_id = auth.uid() OR from_user_id = auth.uid());

DROP POLICY IF EXISTS "Leaders can send nudges" ON team_nudges;
CREATE POLICY "Leaders can send nudges" ON team_nudges
    FOR INSERT WITH CHECK (from_user_id = auth.uid());

-- Team Templates RLS
ALTER TABLE team_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team members can view templates" ON team_templates;
CREATE POLICY "Team members can view templates" ON team_templates
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM team_memberships 
            WHERE team_memberships.team_id = team_templates.team_id 
            AND team_memberships.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Leaders can manage templates" ON team_templates;
CREATE POLICY "Leaders can manage templates" ON team_templates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM team_memberships 
            WHERE team_memberships.team_id = team_templates.team_id 
            AND team_memberships.user_id = auth.uid()
            AND team_memberships.role IN ('owner', 'leader')
        )
    );

-- Team Performance RLS
ALTER TABLE team_performance_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team leaders can view snapshots" ON team_performance_snapshots;
CREATE POLICY "Team leaders can view snapshots" ON team_performance_snapshots
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM team_memberships 
            WHERE team_memberships.team_id = team_performance_snapshots.team_id 
            AND team_memberships.user_id = auth.uid()
            AND team_memberships.role IN ('owner', 'leader')
        )
    );

-- ============================================================================
-- PHASE 7: HELPER FUNCTIONS
-- ============================================================================

-- Function: Automatisch Ghost-Status erkennen
CREATE OR REPLACE FUNCTION update_ghost_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Wenn keine Antwort nach 48h, als Ghost markieren
    IF NEW.seen_at IS NOT NULL 
       AND NEW.replied_at IS NULL 
       AND NEW.seen_at < NOW() - INTERVAL '48 hours'
       AND (NEW.is_ghost IS NULL OR NEW.is_ghost = false) THEN
        NEW.is_ghost := true;
        NEW.ghost_since := NEW.seen_at;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger für Ghost-Status
DROP TRIGGER IF EXISTS trigger_update_ghost_status ON outreach_messages;
CREATE TRIGGER trigger_update_ghost_status
    BEFORE UPDATE ON outreach_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_ghost_status();

-- Function: Onboarding Stage automatisch updaten
CREATE OR REPLACE FUNCTION update_onboarding_stage()
RETURNS TRIGGER AS $$
DECLARE
    days_since INTEGER;
BEGIN
    days_since := DATE_PART('day', CURRENT_DATE - NEW.started_at)::INTEGER + 1;
    
    IF days_since = 1 THEN
        NEW.current_stage := 'day_1';
    ELSIF days_since <= 3 THEN
        NEW.current_stage := 'days_2_3';
    ELSIF days_since <= 7 THEN
        NEW.current_stage := 'days_4_7';
    ELSE
        NEW.current_stage := 'days_8_14';
    END IF;
    
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger für Onboarding Stage
DROP TRIGGER IF EXISTS trigger_update_onboarding_stage ON user_onboarding;
CREATE TRIGGER trigger_update_onboarding_stage
    BEFORE UPDATE ON user_onboarding
    FOR EACH ROW
    EXECUTE FUNCTION update_onboarding_stage();

-- ============================================================================
-- PHASE 8: ACTIVITY LOG ERWEITERUNG
-- ============================================================================

-- Erweitere activity_log für Team-Tracking
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_log') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_log' AND column_name = 'team_id') THEN
            ALTER TABLE activity_log ADD COLUMN team_id UUID REFERENCES teams(id);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_log' AND column_name = 'is_milestone') THEN
            ALTER TABLE activity_log ADD COLUMN is_milestone BOOLEAN DEFAULT false;
        END IF;
        RAISE NOTICE '✅ activity_log Team-Spalten hinzugefügt';
    END IF;
END $$;

-- ============================================================================
-- DONE!
-- ============================================================================

SELECT '✅ CHIEF V3.0 Migration erfolgreich!' AS status;


-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  MIGRATION: NetworkerOS Foundation Tables                                  ║
-- ║  scheduled_jobs, ai_interactions, team_members                             ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- =============================================================================
-- SCHEDULED_JOBS TABLE (für Background Jobs / Redis Queue)
-- =============================================================================

CREATE TABLE IF NOT EXISTS scheduled_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Job Identifikation
    job_type TEXT NOT NULL CHECK (job_type IN (
        'follow_up_reminder',
        'reactivation_check',
        'daily_summary',
        'team_sync',
        'dmo_reminder',
        'payment_check',
        'sequence_step',
        'ghost_check',
        'custom'
    )),
    job_name TEXT NOT NULL,
    
    -- Referenzen
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID,
    lead_id UUID,
    contact_id UUID,
    
    -- Job-Details
    payload JSONB DEFAULT '{}'::jsonb,
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),  -- 1=höchste, 10=niedrigste
    
    -- Scheduling
    scheduled_at TIMESTAMPTZ NOT NULL,
    repeat_interval TEXT CHECK (repeat_interval IN (
        'once', 'hourly', 'daily', 'weekly', 'monthly'
    )) DEFAULT 'once',
    cron_expression TEXT,  -- Optional: für komplexe Schedules
    next_run_at TIMESTAMPTZ,
    last_run_at TIMESTAMPTZ,
    
    -- Status
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending',
        'processing',
        'completed',
        'failed',
        'cancelled',
        'retrying'
    )),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    -- Ergebnis
    result JSONB,
    error_message TEXT,
    processing_time_ms INTEGER,
    
    -- Queue Info (für Redis)
    queue_name TEXT DEFAULT 'default',
    worker_id TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Indexes für scheduled_jobs
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_user ON scheduled_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_status ON scheduled_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_type ON scheduled_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_scheduled ON scheduled_jobs(scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_next_run ON scheduled_jobs(next_run_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_queue ON scheduled_jobs(queue_name, status);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_lead ON scheduled_jobs(lead_id) WHERE lead_id IS NOT NULL;


-- =============================================================================
-- AI_INTERACTIONS TABLE (für AI Logging / Analytics)
-- =============================================================================

CREATE TABLE IF NOT EXISTS ai_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User & Context
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID,
    session_id UUID,  -- Für Chat-Sessions
    
    -- Interaktionstyp
    interaction_type TEXT NOT NULL CHECK (interaction_type IN (
        'mentor_chat',
        'script_generation',
        'objection_handling',
        'lead_analysis',
        'message_compose',
        'knowledge_query',
        'disc_analysis',
        'voice_transcription',
        'reactivation',
        'ghost_buster',
        'live_assist'
    )),
    
    -- Request
    request_text TEXT NOT NULL,
    request_context JSONB,  -- Zusätzlicher Kontext (leads, daily_flow, etc.)
    
    -- Response
    response_text TEXT,
    response_metadata JSONB,  -- Action Tags, Suggestions, etc.
    
    -- AI Model Info
    model TEXT NOT NULL DEFAULT 'gpt-4',
    provider TEXT NOT NULL DEFAULT 'openai' CHECK (provider IN ('openai', 'anthropic', 'azure')),
    
    -- Token Usage & Kosten
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    estimated_cost_usd DECIMAL(10, 6),
    
    -- Performance
    latency_ms INTEGER,
    
    -- Actions (aus Response extrahiert)
    action_tags JSONB DEFAULT '[]'::jsonb,  -- [{"action": "FOLLOWUP_LEADS", "params": ["id1"]}]
    actions_executed JSONB DEFAULT '[]'::jsonb,
    
    -- Feedback
    user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
    user_feedback TEXT,
    was_helpful BOOLEAN,
    
    -- Compliance
    compliance_flags JSONB DEFAULT '[]'::jsonb,  -- Wenn Liability Shield getriggert wurde
    was_filtered BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes für ai_interactions
CREATE INDEX IF NOT EXISTS idx_ai_interactions_user ON ai_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_type ON ai_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_session ON ai_interactions(session_id) WHERE session_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_interactions_date ON ai_interactions(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_model ON ai_interactions(model, provider);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_rating ON ai_interactions(user_rating) WHERE user_rating IS NOT NULL;


-- =============================================================================
-- TEAM_MEMBERS TABLE (für Team Features / Network Marketing)
-- =============================================================================

CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Team-Struktur
    team_id UUID,  -- Optional: Für Sub-Teams
    leader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,  -- Der Teamleader
    member_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- Wenn registrierter User
    
    -- Member Info (auch für nicht-registrierte Team-Mitglieder)
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    
    -- Rolle im Team
    role TEXT NOT NULL DEFAULT 'partner' CHECK (role IN (
        'partner',
        'associate',
        'consultant',
        'manager',
        'director',
        'diamond',
        'executive',
        'ambassador',
        'custom'
    )),
    custom_role TEXT,  -- Für vertical-spezifische Rollen
    rank_level INTEGER DEFAULT 1,  -- Hierarchie-Level
    
    -- Aktivitätsstatus
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
        'pending_invite',
        'onboarding',
        'active',
        'inactive',
        'churned'
    )),
    
    -- Network Marketing Metriken
    personal_volume DECIMAL(15, 2) DEFAULT 0,
    group_volume DECIMAL(15, 2) DEFAULT 0,
    qualification_status TEXT,  -- z.B. "active", "qualified", "super_qualified"
    
    -- Onboarding Progress
    onboarding_step INTEGER DEFAULT 0,
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_completed_at TIMESTAMPTZ,
    
    -- Aktivität
    last_login_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    activities_this_week INTEGER DEFAULT 0,
    activities_this_month INTEGER DEFAULT 0,
    
    -- Goals & Performance
    monthly_goal DECIMAL(15, 2),
    monthly_achieved DECIMAL(15, 2) DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    total_recruits INTEGER DEFAULT 0,
    total_customers INTEGER DEFAULT 0,
    
    -- Kommunikation
    preferred_channel TEXT CHECK (preferred_channel IN ('email', 'whatsapp', 'sms', 'app')),
    notification_preferences JSONB DEFAULT '{"daily_summary": true, "team_updates": true}'::jsonb,
    
    -- DISC Profil (für Kommunikationsanpassung)
    disc_type TEXT CHECK (disc_type IN ('D', 'I', 'S', 'G')),
    
    -- Notizen
    notes TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    
    -- Timestamps
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    invited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes für team_members
CREATE INDEX IF NOT EXISTS idx_team_members_leader ON team_members(leader_id);
CREATE INDEX IF NOT EXISTS idx_team_members_member ON team_members(member_id) WHERE member_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id) WHERE team_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON team_members(role);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email) WHERE email IS NOT NULL;


-- =============================================================================
-- CONTACTS TABLE (NetworkerOS Kontakte - erweitert leads)
-- =============================================================================

CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Owner
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID,
    
    -- Basis-Info
    name TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    
    -- Social Media
    instagram_handle TEXT,
    facebook_url TEXT,
    linkedin_url TEXT,
    tiktok_handle TEXT,
    
    -- Kategorisierung
    contact_type TEXT NOT NULL DEFAULT 'prospect' CHECK (contact_type IN (
        'prospect',     -- Potentieller Kunde/Partner
        'customer',     -- Aktiver Kunde
        'partner',      -- Team-Partner
        'former_customer',  -- Ehemaliger Kunde
        'inactive',     -- Inaktiv
        'not_interested'  -- Kein Interesse
    )),
    relationship_level TEXT DEFAULT 'cold' CHECK (relationship_level IN (
        'cold', 'warm', 'hot', 'customer', 'partner'
    )),
    
    -- DISC Profil
    disc_type TEXT CHECK (disc_type IN ('D', 'I', 'S', 'G')),
    disc_confidence DECIMAL(3, 2),
    
    -- Pipeline-Status
    pipeline_stage TEXT DEFAULT 'lead' CHECK (pipeline_stage IN (
        'lead',
        'contacted',
        'interested',
        'presentation_scheduled',
        'presented',
        'follow_up',
        'closing',
        'won',
        'lost'
    )),
    
    -- DMO Tracking (Daily Method of Operation)
    first_contact_at TIMESTAMPTZ,
    last_contact_at TIMESTAMPTZ,
    next_follow_up_at TIMESTAMPTZ,
    total_interactions INTEGER DEFAULT 0,
    
    -- Source
    source TEXT CHECK (source IN (
        'warm_market',
        'cold_market',
        'social_media',
        'referral',
        'event',
        'online_lead',
        'import',
        'other'
    )),
    source_details TEXT,  -- z.B. "Referral von Max Müller"
    
    -- Notizen & Tags
    notes TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes für contacts
CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(contact_type);
CREATE INDEX IF NOT EXISTS idx_contacts_stage ON contacts(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_contacts_follow_up ON contacts(next_follow_up_at) WHERE next_follow_up_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_disc ON contacts(disc_type) WHERE disc_type IS NOT NULL;


-- =============================================================================
-- DMO_ENTRIES TABLE (Daily Method of Operation Tracking)
-- =============================================================================

CREATE TABLE IF NOT EXISTS dmo_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User & Datum
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- DMO Kategorien
    new_contacts INTEGER DEFAULT 0,
    follow_ups INTEGER DEFAULT 0,
    presentations INTEGER DEFAULT 0,
    closes INTEGER DEFAULT 0,
    trainings INTEGER DEFAULT 0,
    
    -- Details (welche Kontakte)
    new_contact_ids JSONB DEFAULT '[]'::jsonb,
    follow_up_ids JSONB DEFAULT '[]'::jsonb,
    presentation_ids JSONB DEFAULT '[]'::jsonb,
    close_ids JSONB DEFAULT '[]'::jsonb,
    
    -- Ziele für den Tag
    target_new_contacts INTEGER DEFAULT 5,
    target_follow_ups INTEGER DEFAULT 10,
    target_presentations INTEGER DEFAULT 2,
    target_closes INTEGER DEFAULT 1,
    target_trainings INTEGER DEFAULT 1,
    
    -- Notizen
    daily_notes TEXT,
    wins TEXT,  -- Erfolge des Tages
    challenges TEXT,  -- Herausforderungen
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ein Eintrag pro User pro Tag
    UNIQUE(user_id, entry_date)
);

-- Indexes für dmo_entries
CREATE INDEX IF NOT EXISTS idx_dmo_entries_user ON dmo_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_dmo_entries_date ON dmo_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_dmo_entries_user_date ON dmo_entries(user_id, entry_date);


-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE dmo_entries ENABLE ROW LEVEL SECURITY;

-- Scheduled Jobs: Nur eigene Jobs
DROP POLICY IF EXISTS "Eigene Jobs sehen" ON scheduled_jobs;
CREATE POLICY "Eigene Jobs sehen"
    ON scheduled_jobs FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Jobs erstellen" ON scheduled_jobs;
CREATE POLICY "Jobs erstellen"
    ON scheduled_jobs FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Jobs aktualisieren" ON scheduled_jobs;
CREATE POLICY "Jobs aktualisieren"
    ON scheduled_jobs FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Jobs löschen" ON scheduled_jobs;
CREATE POLICY "Jobs löschen"
    ON scheduled_jobs FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- AI Interactions: Nur eigene
DROP POLICY IF EXISTS "Eigene AI Interactions sehen" ON ai_interactions;
CREATE POLICY "Eigene AI Interactions sehen"
    ON ai_interactions FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "AI Interactions erstellen" ON ai_interactions;
CREATE POLICY "AI Interactions erstellen"
    ON ai_interactions FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Team Members: Leader sieht sein Team
DROP POLICY IF EXISTS "Team sehen als Leader" ON team_members;
CREATE POLICY "Team sehen als Leader"
    ON team_members FOR SELECT
    TO authenticated
    USING (auth.uid() = leader_id OR auth.uid() = member_id);

DROP POLICY IF EXISTS "Team erstellen als Leader" ON team_members;
CREATE POLICY "Team erstellen als Leader"
    ON team_members FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = leader_id);

DROP POLICY IF EXISTS "Team aktualisieren als Leader" ON team_members;
CREATE POLICY "Team aktualisieren als Leader"
    ON team_members FOR UPDATE
    TO authenticated
    USING (auth.uid() = leader_id);

DROP POLICY IF EXISTS "Team löschen als Leader" ON team_members;
CREATE POLICY "Team löschen als Leader"
    ON team_members FOR DELETE
    TO authenticated
    USING (auth.uid() = leader_id);

-- Contacts: Nur eigene
DROP POLICY IF EXISTS "Eigene Kontakte sehen" ON contacts;
CREATE POLICY "Eigene Kontakte sehen"
    ON contacts FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Kontakte erstellen" ON contacts;
CREATE POLICY "Kontakte erstellen"
    ON contacts FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Kontakte aktualisieren" ON contacts;
CREATE POLICY "Kontakte aktualisieren"
    ON contacts FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Kontakte löschen" ON contacts;
CREATE POLICY "Kontakte löschen"
    ON contacts FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- DMO Entries: Nur eigene
DROP POLICY IF EXISTS "Eigene DMO sehen" ON dmo_entries;
CREATE POLICY "Eigene DMO sehen"
    ON dmo_entries FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "DMO erstellen" ON dmo_entries;
CREATE POLICY "DMO erstellen"
    ON dmo_entries FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "DMO aktualisieren" ON dmo_entries;
CREATE POLICY "DMO aktualisieren"
    ON dmo_entries FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);


-- =============================================================================
-- TRIGGERS FÜR UPDATED_AT
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_scheduled_jobs_updated_at ON scheduled_jobs;
CREATE TRIGGER trigger_scheduled_jobs_updated_at
    BEFORE UPDATE ON scheduled_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_team_members_updated_at ON team_members;
CREATE TRIGGER trigger_team_members_updated_at
    BEFORE UPDATE ON team_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_contacts_updated_at ON contacts;
CREATE TRIGGER trigger_contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trigger_dmo_entries_updated_at ON dmo_entries;
CREATE TRIGGER trigger_dmo_entries_updated_at
    BEFORE UPDATE ON dmo_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();


-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE scheduled_jobs IS 'Background Jobs für Follow-Up Reminder, Notifications, etc.';
COMMENT ON TABLE ai_interactions IS 'Logging aller AI-Interaktionen für Analytics und Feedback';
COMMENT ON TABLE team_members IS 'Team-Mitglieder für Network Marketing Teams';
COMMENT ON TABLE contacts IS 'Kontaktdatenbank für NetworkerOS';
COMMENT ON TABLE dmo_entries IS 'Daily Method of Operation - tägliche Aktivitäts-Tracking';

COMMENT ON COLUMN scheduled_jobs.job_type IS 'Art des Jobs (follow_up_reminder, daily_summary, etc.)';
COMMENT ON COLUMN scheduled_jobs.priority IS 'Job-Priorität: 1=höchste, 10=niedrigste';
COMMENT ON COLUMN ai_interactions.action_tags IS 'Extrahierte Action Tags aus AI Response';
COMMENT ON COLUMN team_members.rank_level IS 'Hierarchie-Level im Team (1=niedrigste)';
COMMENT ON COLUMN contacts.disc_type IS 'DISC-Persönlichkeitstyp (D, I, S, G)';
COMMENT ON COLUMN dmo_entries.new_contacts IS 'Anzahl neuer Kontakte an diesem Tag';


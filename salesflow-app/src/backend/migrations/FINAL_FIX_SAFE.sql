-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  FINAL FIX SAFE - SALES FLOW AI                                           ║
-- ║  OHNE Foreign Key Abhängigkeiten - funktioniert immer!                    ║
-- ║  Erstellt: 2024-12-04                                                      ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- ============================================================================
-- TEIL 1: FEHLENDE TABELLEN (OHNE FK-CONSTRAINTS)
-- ============================================================================

-- 1.1 INTENT_EVENTS
CREATE TABLE IF NOT EXISTS intent_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    lead_id UUID,
    event_type TEXT NOT NULL,
    intent_type TEXT,
    signal_strength DECIMAL(3, 2) DEFAULT 0.5,
    channel TEXT,
    metadata JSONB DEFAULT '{}',
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intent_events_user ON intent_events(user_id);
CREATE INDEX IF NOT EXISTS idx_intent_events_lead ON intent_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_intent_events_type ON intent_events(event_type);

ALTER TABLE intent_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own intent_events" ON intent_events;
CREATE POLICY "Users own intent_events" ON intent_events FOR ALL USING (auth.uid() = user_id);
GRANT ALL ON intent_events TO authenticated;

-- 1.2 INTERACTIONS
CREATE TABLE IF NOT EXISTS interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    lead_id UUID,
    contact_id UUID,
    interaction_type TEXT NOT NULL,
    channel TEXT,
    direction TEXT DEFAULT 'outbound',
    content TEXT,
    summary TEXT,
    sentiment TEXT,
    outcome TEXT,
    duration_seconds INTEGER,
    metadata JSONB DEFAULT '{}',
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interactions_user ON interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_lead ON interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON interactions(interaction_type);

ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own interactions" ON interactions;
CREATE POLICY "Users own interactions" ON interactions FOR ALL USING (auth.uid() = user_id);
GRANT ALL ON interactions TO authenticated;

-- 1.3 CHAT_FEEDBACK
CREATE TABLE IF NOT EXISTS chat_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    session_id UUID,
    interaction_id UUID,
    feedback_type TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    correction_text TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_feedback_user ON chat_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_feedback_type ON chat_feedback(feedback_type);

ALTER TABLE chat_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own chat_feedback" ON chat_feedback;
CREATE POLICY "Users own chat_feedback" ON chat_feedback FOR ALL USING (auth.uid() = user_id);
GRANT ALL ON chat_feedback TO authenticated;

-- 1.4 LEAD_EVENTS
CREATE TABLE IF NOT EXISTS lead_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    lead_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    event_category TEXT,
    old_value TEXT,
    new_value TEXT,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_events_user ON lead_events(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_events_lead ON lead_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_events_type ON lead_events(event_type);

ALTER TABLE lead_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own lead_events" ON lead_events;
CREATE POLICY "Users own lead_events" ON lead_events FOR ALL USING (auth.uid() = user_id);
GRANT ALL ON lead_events TO authenticated;

-- 1.5 TASKS
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    lead_id UUID,
    contact_id UUID,
    title TEXT NOT NULL,
    description TEXT,
    task_type TEXT NOT NULL DEFAULT 'general',
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    due_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    reminder_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_lead ON tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own tasks" ON tasks;
CREATE POLICY "Users own tasks" ON tasks FOR ALL USING (auth.uid() = user_id);
GRANT ALL ON tasks TO authenticated;

-- 1.6 USER_BUSINESS_PROFILE
CREATE TABLE IF NOT EXISTS user_business_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    business_type TEXT DEFAULT 'network_marketing',
    vertical_id TEXT DEFAULT 'network_marketing',
    commission_per_deal DECIMAL(10, 2),
    avg_deal_value DECIMAL(10, 2),
    sales_cycle_days INTEGER DEFAULT 30,
    target_monthly_revenue DECIMAL(10, 2),
    target_monthly_deals INTEGER,
    working_days_per_week INTEGER DEFAULT 5,
    working_hours_per_day INTEGER DEFAULT 8,
    experience_years INTEGER DEFAULT 0,
    team_size INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_business_profile_user ON user_business_profile(user_id);

ALTER TABLE user_business_profile ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users own business_profile" ON user_business_profile;
CREATE POLICY "Users own business_profile" ON user_business_profile FOR ALL USING (auth.uid() = user_id);
GRANT ALL ON user_business_profile TO authenticated;

-- ============================================================================
-- TEIL 2: FEHLENDE SPALTEN (MIT EXISTENZ-PRÜFUNG)
-- ============================================================================

-- 2.1 PROFILES Spalten
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'company_slug') THEN
            ALTER TABLE profiles ADD COLUMN company_slug TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'first_name') THEN
            ALTER TABLE profiles ADD COLUMN first_name TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'last_name') THEN
            ALTER TABLE profiles ADD COLUMN last_name TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'subscription_tier') THEN
            ALTER TABLE profiles ADD COLUMN subscription_tier TEXT DEFAULT 'free';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'skill_level') THEN
            ALTER TABLE profiles ADD COLUMN skill_level TEXT DEFAULT 'beginner';
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'vertical') THEN
            ALTER TABLE profiles ADD COLUMN vertical TEXT DEFAULT 'network_marketing';
        END IF;
    END IF;
END $$;

-- 2.2 COMPANIES Spalten
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'brand_config') THEN
            ALTER TABLE companies ADD COLUMN brand_config JSONB DEFAULT '{}';
        END IF;
    END IF;
END $$;

-- 2.3 LEADS Spalten
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'first_name') THEN
            ALTER TABLE leads ADD COLUMN first_name TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'last_name') THEN
            ALTER TABLE leads ADD COLUMN last_name TEXT;
        END IF;
    END IF;
END $$;

-- 2.4 DMO_ENTRIES Spalten
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dmo_entries') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dmo_entries' AND column_name = 'presentations') THEN
            ALTER TABLE dmo_entries ADD COLUMN presentations INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dmo_entries' AND column_name = 'enrollments') THEN
            ALTER TABLE dmo_entries ADD COLUMN enrollments INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dmo_entries' AND column_name = 'team_trainings') THEN
            ALTER TABLE dmo_entries ADD COLUMN team_trainings INTEGER DEFAULT 0;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'dmo_entries' AND column_name = 'social_posts') THEN
            ALTER TABLE dmo_entries ADD COLUMN social_posts INTEGER DEFAULT 0;
        END IF;
    END IF;
END $$;

-- 2.5 CONTACTS Spalten
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'company_name') THEN
            ALTER TABLE contacts ADD COLUMN company_name TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'job_title') THEN
            ALTER TABLE contacts ADD COLUMN job_title TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'contacts' AND column_name = 'birthday') THEN
            ALTER TABLE contacts ADD COLUMN birthday DATE;
        END IF;
    END IF;
END $$;

-- 2.6 TEAM_MEMBERS Spalten
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'team_members') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_members' AND column_name = 'last_activity_at') THEN
            ALTER TABLE team_members ADD COLUMN last_activity_at TIMESTAMPTZ;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'team_members' AND column_name = 'performance_score') THEN
            ALTER TABLE team_members ADD COLUMN performance_score DECIMAL(5, 2) DEFAULT 0;
        END IF;
    END IF;
END $$;

-- 2.7 AI_INTERACTIONS Spalten
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_interactions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_interactions' AND column_name = 'lead_id') THEN
            ALTER TABLE ai_interactions ADD COLUMN lead_id UUID;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_interactions' AND column_name = 'channel') THEN
            ALTER TABLE ai_interactions ADD COLUMN channel TEXT;
        END IF;
    END IF;
END $$;

-- ============================================================================
-- FINAL REPORT
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
    RAISE NOTICE '  ✅ FINAL FIX SAFE ERFOLGREICH!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '  NEUE TABELLEN: intent_events, interactions, chat_feedback,';
    RAISE NOTICE '                 lead_events, tasks, user_business_profile';
    RAISE NOTICE '';
    RAISE NOTICE '  SPALTEN: Wurden zu existierenden Tabellen hinzugefügt';
    RAISE NOTICE '           (profiles, companies, leads, dmo_entries, etc.)';
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
END $$;


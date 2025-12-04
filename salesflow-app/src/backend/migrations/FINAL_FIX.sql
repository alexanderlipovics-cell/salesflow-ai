-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  FINAL FIX - SALES FLOW AI                                                ║
-- ║  Kombiniert: Fehlende Tabellen + Fehlende Spalten                         ║
-- ║  Erstellt: 2024-12-04                                                      ║
-- ║  IDEMPOTENT - Kann mehrfach ausgeführt werden                             ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- ============================================================================
-- TEIL 1: FEHLENDE TABELLEN
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1.1 INTENT_EVENTS (Referenziert in signal_detection.py)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS intent_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_intent_events_date ON intent_events(detected_at DESC);

ALTER TABLE intent_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own intent_events" ON intent_events;
CREATE POLICY "Users own intent_events" ON intent_events FOR ALL USING (auth.uid() = user_id);

GRANT ALL ON intent_events TO authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 1.2 INTERACTIONS (Referenziert in perception.py)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_interactions_contact ON interactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_interactions_date ON interactions(occurred_at DESC);

ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own interactions" ON interactions;
CREATE POLICY "Users own interactions" ON interactions FOR ALL USING (auth.uid() = user_id);

GRANT ALL ON interactions TO authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 1.3 CHAT_FEEDBACK (Referenziert in AI_CHAT.md)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chat_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_chat_feedback_session ON chat_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_feedback_type ON chat_feedback(feedback_type);

ALTER TABLE chat_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own chat_feedback" ON chat_feedback;
CREATE POLICY "Users own chat_feedback" ON chat_feedback FOR ALL USING (auth.uid() = user_id);

GRANT ALL ON chat_feedback TO authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 1.4 LEAD_EVENTS (Referenziert in LEADS.md)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lead_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_lead_events_date ON lead_events(created_at DESC);

ALTER TABLE lead_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own lead_events" ON lead_events;
CREATE POLICY "Users own lead_events" ON lead_events FOR ALL USING (auth.uid() = user_id);

GRANT ALL ON lead_events TO authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 1.5 TASKS (Referenziert in proposalReminderService.js)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
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
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(task_type);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own tasks" ON tasks;
CREATE POLICY "Users own tasks" ON tasks FOR ALL USING (auth.uid() = user_id);

GRANT ALL ON tasks TO authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 1.6 USER_BUSINESS_PROFILE (Referenziert in goal adapters)
-- ────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_business_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
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
CREATE INDEX IF NOT EXISTS idx_user_business_profile_vertical ON user_business_profile(vertical_id);

ALTER TABLE user_business_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own business_profile" ON user_business_profile;
CREATE POLICY "Users own business_profile" ON user_business_profile FOR ALL USING (auth.uid() = user_id);

GRANT ALL ON user_business_profile TO authenticated;

-- ============================================================================
-- TEIL 2: FEHLENDE SPALTEN
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 2.1 PROFILES Tabelle - Kritische Spalten
-- ────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
    -- company_slug
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'company_slug') THEN
        ALTER TABLE profiles ADD COLUMN company_slug TEXT;
        RAISE NOTICE 'Added company_slug to profiles';
    END IF;
    
    -- first_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'first_name') THEN
        ALTER TABLE profiles ADD COLUMN first_name TEXT;
        RAISE NOTICE 'Added first_name to profiles';
    END IF;
    
    -- last_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'last_name') THEN
        ALTER TABLE profiles ADD COLUMN last_name TEXT;
        RAISE NOTICE 'Added last_name to profiles';
    END IF;
    
    -- subscription_tier
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'subscription_tier') THEN
        ALTER TABLE profiles ADD COLUMN subscription_tier TEXT DEFAULT 'free';
        RAISE NOTICE 'Added subscription_tier to profiles';
    END IF;
    
    -- skill_level
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'skill_level') THEN
        ALTER TABLE profiles ADD COLUMN skill_level TEXT DEFAULT 'beginner';
        RAISE NOTICE 'Added skill_level to profiles';
    END IF;
    
    -- vertical
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'vertical') THEN
        ALTER TABLE profiles ADD COLUMN vertical TEXT DEFAULT 'network_marketing';
        RAISE NOTICE 'Added vertical to profiles';
    END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 2.2 COMPANIES Tabelle - Brand Config
-- ────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'companies' AND column_name = 'brand_config') THEN
        ALTER TABLE companies ADD COLUMN brand_config JSONB DEFAULT '{}';
        RAISE NOTICE 'Added brand_config to companies';
    END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 2.3 LEADS Tabelle - Name Felder
-- ────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leads' AND column_name = 'first_name') THEN
        ALTER TABLE leads ADD COLUMN first_name TEXT;
        RAISE NOTICE 'Added first_name to leads';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leads' AND column_name = 'last_name') THEN
        ALTER TABLE leads ADD COLUMN last_name TEXT;
        RAISE NOTICE 'Added last_name to leads';
    END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 2.4 DMO_ENTRIES Tabelle - Aktivitätsspalten
-- ────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'dmo_entries' AND column_name = 'presentations') THEN
        ALTER TABLE dmo_entries ADD COLUMN presentations INTEGER DEFAULT 0;
        RAISE NOTICE 'Added presentations to dmo_entries';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'dmo_entries' AND column_name = 'enrollments') THEN
        ALTER TABLE dmo_entries ADD COLUMN enrollments INTEGER DEFAULT 0;
        RAISE NOTICE 'Added enrollments to dmo_entries';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'dmo_entries' AND column_name = 'team_trainings') THEN
        ALTER TABLE dmo_entries ADD COLUMN team_trainings INTEGER DEFAULT 0;
        RAISE NOTICE 'Added team_trainings to dmo_entries';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'dmo_entries' AND column_name = 'social_posts') THEN
        ALTER TABLE dmo_entries ADD COLUMN social_posts INTEGER DEFAULT 0;
        RAISE NOTICE 'Added social_posts to dmo_entries';
    END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 2.5 CONTACTS Tabelle - Erweiterte Felder
-- ────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'contacts' AND column_name = 'company_name') THEN
        ALTER TABLE contacts ADD COLUMN company_name TEXT;
        RAISE NOTICE 'Added company_name to contacts';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'contacts' AND column_name = 'job_title') THEN
        ALTER TABLE contacts ADD COLUMN job_title TEXT;
        RAISE NOTICE 'Added job_title to contacts';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'contacts' AND column_name = 'birthday') THEN
        ALTER TABLE contacts ADD COLUMN birthday DATE;
        RAISE NOTICE 'Added birthday to contacts';
    END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 2.6 TEAM_MEMBERS Tabelle
-- ────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'team_members' AND column_name = 'last_activity_at') THEN
        ALTER TABLE team_members ADD COLUMN last_activity_at TIMESTAMPTZ;
        RAISE NOTICE 'Added last_activity_at to team_members';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'team_members' AND column_name = 'performance_score') THEN
        ALTER TABLE team_members ADD COLUMN performance_score DECIMAL(5, 2) DEFAULT 0;
        RAISE NOTICE 'Added performance_score to team_members';
    END IF;
END $$;

-- ────────────────────────────────────────────────────────────────────────────
-- 2.7 AI_INTERACTIONS Tabelle
-- ────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ai_interactions' AND column_name = 'lead_id') THEN
        ALTER TABLE ai_interactions ADD COLUMN lead_id UUID;
        RAISE NOTICE 'Added lead_id to ai_interactions';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ai_interactions' AND column_name = 'channel') THEN
        ALTER TABLE ai_interactions ADD COLUMN channel TEXT;
        RAISE NOTICE 'Added channel to ai_interactions';
    END IF;
END $$;

-- ============================================================================
-- TEIL 3: INDIZES FÜR NEUE SPALTEN
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_company_slug ON profiles(company_slug) WHERE company_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_subscription ON profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_leads_first_name ON leads(first_name) WHERE first_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_company_name ON contacts(company_name) WHERE company_name IS NOT NULL;

-- ============================================================================
-- FINAL REPORT
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
    RAISE NOTICE '  ✅ FINAL FIX ERFOLGREICH AUSGEFÜHRT!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '  NEUE TABELLEN (6):';
    RAISE NOTICE '    ✅ intent_events';
    RAISE NOTICE '    ✅ interactions';
    RAISE NOTICE '    ✅ chat_feedback';
    RAISE NOTICE '    ✅ lead_events';
    RAISE NOTICE '    ✅ tasks';
    RAISE NOTICE '    ✅ user_business_profile';
    RAISE NOTICE '';
    RAISE NOTICE '  NEUE SPALTEN:';
    RAISE NOTICE '    profiles: company_slug, first_name, last_name,';
    RAISE NOTICE '              subscription_tier, skill_level, vertical';
    RAISE NOTICE '    companies: brand_config';
    RAISE NOTICE '    leads: first_name, last_name';
    RAISE NOTICE '    dmo_entries: presentations, enrollments,';
    RAISE NOTICE '                 team_trainings, social_posts';
    RAISE NOTICE '    contacts: company_name, job_title, birthday';
    RAISE NOTICE '    team_members: last_activity_at, performance_score';
    RAISE NOTICE '    ai_interactions: lead_id, channel';
    RAISE NOTICE '';
    RAISE NOTICE '  Alle Tabellen haben RLS aktiviert.';
    RAISE NOTICE '  Alle Änderungen sind idempotent (wiederholbar).';
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
END $$;


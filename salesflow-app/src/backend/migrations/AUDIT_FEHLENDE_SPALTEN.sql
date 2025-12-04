-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  SYSTEM AUDIT - FEHLENDE SPALTEN                                          ║
-- ║  Erstellt: 2024-12-04                                                      ║
-- ║  Basierend auf AuthContext.js & Service-Analyse                           ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- ============================================================================
-- 1. PROFILES TABELLE - Kritische Spalten
-- ============================================================================

-- company_slug (AuthContext.js erwartet profile.company_slug)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'company_slug') THEN
        ALTER TABLE profiles ADD COLUMN company_slug TEXT;
        RAISE NOTICE 'Added company_slug to profiles';
    END IF;
END $$;

-- first_name (AuthContext.js erwartet profile.first_name)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'first_name') THEN
        ALTER TABLE profiles ADD COLUMN first_name TEXT;
        RAISE NOTICE 'Added first_name to profiles';
    END IF;
END $$;

-- last_name (AuthContext.js erwartet profile.last_name)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'last_name') THEN
        ALTER TABLE profiles ADD COLUMN last_name TEXT;
        RAISE NOTICE 'Added last_name to profiles';
    END IF;
END $$;

-- subscription_tier (AuthContext.js erwartet profile.subscription_tier)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'subscription_tier') THEN
        ALTER TABLE profiles ADD COLUMN subscription_tier TEXT DEFAULT 'free';
        RAISE NOTICE 'Added subscription_tier to profiles';
    END IF;
END $$;

-- skill_level (AuthContext.js erwartet profile.skill_level)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'skill_level') THEN
        ALTER TABLE profiles ADD COLUMN skill_level TEXT DEFAULT 'beginner';
        RAISE NOTICE 'Added skill_level to profiles';
    END IF;
END $$;

-- vertical (AuthContext.js verwendet profile.vertical)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'vertical') THEN
        ALTER TABLE profiles ADD COLUMN vertical TEXT DEFAULT 'network_marketing';
        RAISE NOTICE 'Added vertical to profiles';
    END IF;
END $$;

-- ============================================================================
-- 2. COMPANIES TABELLE - Brand Config für Company Branding
-- ============================================================================

-- brand_config (AuthContext.js erwartet company.brand_config)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'companies' AND column_name = 'brand_config') THEN
        ALTER TABLE companies ADD COLUMN brand_config JSONB DEFAULT '{}';
        RAISE NOTICE 'Added brand_config to companies';
    END IF;
END $$;

-- ============================================================================
-- 3. LEADS TABELLE - Fehlende Spalten
-- ============================================================================

-- first_name (Import Service erwartet diese)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leads' AND column_name = 'first_name') THEN
        ALTER TABLE leads ADD COLUMN first_name TEXT;
        RAISE NOTICE 'Added first_name to leads';
    END IF;
END $$;

-- last_name (Import Service erwartet diese)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leads' AND column_name = 'last_name') THEN
        ALTER TABLE leads ADD COLUMN last_name TEXT;
        RAISE NOTICE 'Added last_name to leads';
    END IF;
END $$;

-- ============================================================================
-- 4. DMO_ENTRIES - Zusätzliche Tracking-Spalten
-- ============================================================================

-- Stellen sicher, dass alle erwarteten Aktivitätsspalten existieren
DO $$
BEGIN
    -- presentations
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'dmo_entries' AND column_name = 'presentations') THEN
        ALTER TABLE dmo_entries ADD COLUMN presentations INTEGER DEFAULT 0;
        RAISE NOTICE 'Added presentations to dmo_entries';
    END IF;
    
    -- enrollments
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'dmo_entries' AND column_name = 'enrollments') THEN
        ALTER TABLE dmo_entries ADD COLUMN enrollments INTEGER DEFAULT 0;
        RAISE NOTICE 'Added enrollments to dmo_entries';
    END IF;
    
    -- team_trainings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'dmo_entries' AND column_name = 'team_trainings') THEN
        ALTER TABLE dmo_entries ADD COLUMN team_trainings INTEGER DEFAULT 0;
        RAISE NOTICE 'Added team_trainings to dmo_entries';
    END IF;
    
    -- social_posts
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'dmo_entries' AND column_name = 'social_posts') THEN
        ALTER TABLE dmo_entries ADD COLUMN social_posts INTEGER DEFAULT 0;
        RAISE NOTICE 'Added social_posts to dmo_entries';
    END IF;
END $$;

-- ============================================================================
-- 5. CONTACTS TABELLE - Pipeline Stage & Relationship
-- ============================================================================

DO $$
BEGIN
    -- company_name (für B2B Kontakte)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'contacts' AND column_name = 'company_name') THEN
        ALTER TABLE contacts ADD COLUMN company_name TEXT;
        RAISE NOTICE 'Added company_name to contacts';
    END IF;
    
    -- job_title
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'contacts' AND column_name = 'job_title') THEN
        ALTER TABLE contacts ADD COLUMN job_title TEXT;
        RAISE NOTICE 'Added job_title to contacts';
    END IF;
    
    -- birthday
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'contacts' AND column_name = 'birthday') THEN
        ALTER TABLE contacts ADD COLUMN birthday DATE;
        RAISE NOTICE 'Added birthday to contacts';
    END IF;
END $$;

-- ============================================================================
-- 6. TEAM_MEMBERS - Status & Onboarding
-- ============================================================================

DO $$
BEGIN
    -- last_activity_at
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'team_members' AND column_name = 'last_activity_at') THEN
        ALTER TABLE team_members ADD COLUMN last_activity_at TIMESTAMPTZ;
        RAISE NOTICE 'Added last_activity_at to team_members';
    END IF;
    
    -- performance_score
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'team_members' AND column_name = 'performance_score') THEN
        ALTER TABLE team_members ADD COLUMN performance_score DECIMAL(5, 2) DEFAULT 0;
        RAISE NOTICE 'Added performance_score to team_members';
    END IF;
END $$;

-- ============================================================================
-- 7. AI_INTERACTIONS - Erweiterte Tracking-Spalten
-- ============================================================================

DO $$
BEGIN
    -- lead_id (für Lead-Context in AI-Interaktionen)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ai_interactions' AND column_name = 'lead_id') THEN
        ALTER TABLE ai_interactions ADD COLUMN lead_id UUID REFERENCES leads(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added lead_id to ai_interactions';
    END IF;
    
    -- channel
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'ai_interactions' AND column_name = 'channel') THEN
        ALTER TABLE ai_interactions ADD COLUMN channel TEXT;
        RAISE NOTICE 'Added channel to ai_interactions';
    END IF;
END $$;

-- ============================================================================
-- 8. INDIZES für neue Spalten
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_profiles_company_slug ON profiles(company_slug) WHERE company_slug IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_subscription ON profiles(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_leads_first_name ON leads(first_name) WHERE first_name IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_company_name ON contacts(company_name) WHERE company_name IS NOT NULL;

-- ============================================================================
-- DONE - REPORT
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
    RAISE NOTICE '  AUDIT - FEHLENDE SPALTEN HINZUGEFÜGT';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '  PROFILES:';
    RAISE NOTICE '    • company_slug';
    RAISE NOTICE '    • first_name';
    RAISE NOTICE '    • last_name';
    RAISE NOTICE '    • subscription_tier';
    RAISE NOTICE '    • skill_level';
    RAISE NOTICE '    • vertical';
    RAISE NOTICE '';
    RAISE NOTICE '  COMPANIES:';
    RAISE NOTICE '    • brand_config';
    RAISE NOTICE '';
    RAISE NOTICE '  LEADS:';
    RAISE NOTICE '    • first_name';
    RAISE NOTICE '    • last_name';
    RAISE NOTICE '';
    RAISE NOTICE '  DMO_ENTRIES:';
    RAISE NOTICE '    • presentations';
    RAISE NOTICE '    • enrollments';
    RAISE NOTICE '    • team_trainings';
    RAISE NOTICE '    • social_posts';
    RAISE NOTICE '';
    RAISE NOTICE '  CONTACTS:';
    RAISE NOTICE '    • company_name';
    RAISE NOTICE '    • job_title';
    RAISE NOTICE '    • birthday';
    RAISE NOTICE '';
    RAISE NOTICE '  TEAM_MEMBERS:';
    RAISE NOTICE '    • last_activity_at';
    RAISE NOTICE '    • performance_score';
    RAISE NOTICE '';
    RAISE NOTICE '  AI_INTERACTIONS:';
    RAISE NOTICE '    • lead_id';
    RAISE NOTICE '    • channel';
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
END $$;


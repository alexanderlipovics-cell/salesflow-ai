-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  PROFILES ONBOARDING FIELDS                                                ║
-- ║  Erweitert die profiles Tabelle für das Onboarding                         ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- Füge fehlende Onboarding-Felder zur profiles Tabelle hinzu
DO $$
BEGIN
    -- company_name (ausgewähltes Network/Firma)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'company_name') THEN
        ALTER TABLE profiles ADD COLUMN company_name TEXT;
        RAISE NOTICE 'Added company_name column';
    END IF;
    
    -- company_slug (für API-Calls)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'company_slug') THEN
        ALTER TABLE profiles ADD COLUMN company_slug TEXT;
        RAISE NOTICE 'Added company_slug column';
    END IF;
    
    -- vertical (Branche: network_marketing, real_estate, etc.)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'vertical') THEN
        ALTER TABLE profiles ADD COLUMN vertical TEXT DEFAULT 'network_marketing';
        RAISE NOTICE 'Added vertical column';
    END IF;
    
    -- first_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'first_name') THEN
        ALTER TABLE profiles ADD COLUMN first_name TEXT;
        RAISE NOTICE 'Added first_name column';
    END IF;
    
    -- last_name
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'last_name') THEN
        ALTER TABLE profiles ADD COLUMN last_name TEXT;
        RAISE NOTICE 'Added last_name column';
    END IF;
    
    -- onboarding_completed (Flag ob Onboarding fertig)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'onboarding_completed') THEN
        ALTER TABLE profiles ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added onboarding_completed column';
    END IF;
    
    -- onboarding_step (aktueller Step im Onboarding)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'onboarding_step') THEN
        ALTER TABLE profiles ADD COLUMN onboarding_step INTEGER DEFAULT 0;
        RAISE NOTICE 'Added onboarding_step column';
    END IF;
    
    -- role (user, team_leader, admin)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user';
        RAISE NOTICE 'Added role column';
    END IF;
    
    -- team_id (für Team-Zugehörigkeit)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'team_id') THEN
        ALTER TABLE profiles ADD COLUMN team_id UUID;
        RAISE NOTICE 'Added team_id column';
    END IF;
    
    -- experience_level (beginner, intermediate, advanced, expert)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'experience_level') THEN
        ALTER TABLE profiles ADD COLUMN experience_level TEXT DEFAULT 'beginner';
        RAISE NOTICE 'Added experience_level column';
    END IF;
    
    -- goals_json (persönliche Ziele als JSON)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'goals_json') THEN
        ALTER TABLE profiles ADD COLUMN goals_json JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Added goals_json column';
    END IF;
    
    -- preferences_json (App-Einstellungen)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'preferences_json') THEN
        ALTER TABLE profiles ADD COLUMN preferences_json JSONB DEFAULT '{}'::jsonb;
        RAISE NOTICE 'Added preferences_json column';
    END IF;
    
    -- avatar_url
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE profiles ADD COLUMN avatar_url TEXT;
        RAISE NOTICE 'Added avatar_url column';
    END IF;

END $$;

-- Index für company_slug Lookups
CREATE INDEX IF NOT EXISTS idx_profiles_company_slug 
ON profiles(company_slug) WHERE company_slug IS NOT NULL;

-- Index für Team-Zugehörigkeit
CREATE INDEX IF NOT EXISTS idx_profiles_team_id 
ON profiles(team_id) WHERE team_id IS NOT NULL;

-- Index für Onboarding-Status
CREATE INDEX IF NOT EXISTS idx_profiles_onboarding 
ON profiles(onboarding_completed);

-- ═══════════════════════════════════════════════════════════════════════════
-- SUMMARY
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Neue Spalten in profiles:
-- ✅ company_name - Name des Networks/Firma
-- ✅ company_slug - Slug für API-Calls
-- ✅ vertical - Branche (network_marketing, real_estate, etc.)
-- ✅ first_name - Vorname
-- ✅ last_name - Nachname
-- ✅ onboarding_completed - Onboarding fertig?
-- ✅ onboarding_step - Aktueller Onboarding-Step
-- ✅ role - Benutzerrolle
-- ✅ team_id - Team-Zugehörigkeit
-- ✅ experience_level - Erfahrungslevel
-- ✅ goals_json - Persönliche Ziele
-- ✅ preferences_json - App-Einstellungen
-- ✅ avatar_url - Profilbild


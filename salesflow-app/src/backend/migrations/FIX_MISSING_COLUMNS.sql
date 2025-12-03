-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  FIX MISSING COLUMNS & TABLES                                              ║
-- ║  Fügt fehlende Spalten zu existierenden Tabellen hinzu                    ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- ============================================================================
-- 1. FEHLENDE SPALTEN: knowledge_items
-- ============================================================================

ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS subtopic TEXT;
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS content_short TEXT;
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS vertical_id TEXT;
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS region TEXT;
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS study_year INTEGER;
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS study_authors TEXT[];
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS study_population TEXT;
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS study_type TEXT;
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS study_intervention TEXT;
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS study_outcomes TEXT;
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS nutrients_or_factors TEXT[];
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS health_outcome_areas TEXT[];
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS evidence_level TEXT;
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS source_reference TEXT;
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS quality_score NUMERIC(3,2);
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS compliance_level TEXT DEFAULT 'normal';
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS requires_disclaimer BOOLEAN DEFAULT false;
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS disclaimer_text TEXT;
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS effectiveness_score NUMERIC(3,2);
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS usage_notes_for_ai TEXT;
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS is_current BOOLEAN DEFAULT true;
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS superseded_by UUID;
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS verified_by UUID;
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

DO $$ BEGIN RAISE NOTICE '✅ knowledge_items Spalten hinzugefügt'; END $$;

-- ============================================================================
-- 2. FEHLENDE SPALTEN: templates
-- ============================================================================

ALTER TABLE templates ADD COLUMN IF NOT EXISTS vertical_id TEXT;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS content_short TEXT;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS example_context TEXT;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS success_rate NUMERIC(3,2);
ALTER TABLE templates ADD COLUMN IF NOT EXISTS quality_score NUMERIC(3,2);
ALTER TABLE templates ADD COLUMN IF NOT EXISTS effectiveness_score NUMERIC(3,2);
ALTER TABLE templates ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS avg_response_time_seconds INTEGER;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

DO $$ BEGIN RAISE NOTICE '✅ templates Spalten hinzugefügt'; END $$;

-- ============================================================================
-- 3. FEHLENDE SPALTEN: leads
-- ============================================================================

ALTER TABLE leads ADD COLUMN IF NOT EXISTS temperature TEXT DEFAULT 'cold';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_contact_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_follow_up_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tags TEXT[];
ALTER TABLE leads ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

DO $$ BEGIN RAISE NOTICE '✅ leads Spalten hinzugefügt'; END $$;

-- ============================================================================
-- 4. FEHLENDE TABELLEN
-- ============================================================================

-- Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user',
    company_id UUID REFERENCES companies(id),
    vertical_id TEXT DEFAULT 'network_marketing',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Profiles (Fallback)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id),
    role TEXT DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

DO $$ BEGIN RAISE NOTICE '✅ Fehlende Tabellen erstellt'; END $$;

-- ============================================================================
-- 5. INDEXES (jetzt mit allen Spalten)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_knowledge_items_topic ON knowledge_items(topic, subtopic);
CREATE INDEX IF NOT EXISTS idx_knowledge_items_active ON knowledge_items(is_active, is_current);
CREATE INDEX IF NOT EXISTS idx_leads_temperature ON leads(temperature);

DO $$ BEGIN RAISE NOTICE '✅ Indexes erstellt'; END $$;

-- ============================================================================
-- 6. RLS POLICIES (nur für existierende Tabellen)
-- ============================================================================

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Simple policies
DROP POLICY IF EXISTS "profiles_own_access" ON profiles;
CREATE POLICY "profiles_own_access" ON profiles
    FOR ALL USING (auth.uid() = id);

DROP POLICY IF EXISTS "user_profiles_own_access" ON user_profiles;
CREATE POLICY "user_profiles_own_access" ON user_profiles
    FOR ALL USING (auth.uid() = user_id);

DO $$ BEGIN RAISE NOTICE '✅ RLS Policies erstellt'; END $$;

-- ============================================================================
-- FERTIG
-- ============================================================================

DO $$ BEGIN RAISE NOTICE '🎉 FIX_MISSING_COLUMNS erfolgreich abgeschlossen!'; END $$;


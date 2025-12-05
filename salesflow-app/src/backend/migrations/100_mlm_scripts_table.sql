-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  MIGRATION 100: MLM Scripts Table                                          ║
-- ║  Tabelle für 100+ Verkaufsskripte mit Tracking                             ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- =============================================================================
-- CREATE TABLE (if not exists)
-- =============================================================================

CREATE TABLE IF NOT EXISTS mlm_scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Eindeutige Script-ID (für Upsert)
    script_id TEXT UNIQUE NOT NULL,
    
    -- Inhalt
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    
    -- Kategorisierung
    category TEXT NOT NULL CHECK (category IN (
        'OPENER', 'PITCH', 'FOLLOW_UP', 'OBJECTION', 'CLOSING', 'GENERAL'
    )),
    company TEXT DEFAULT 'GENERAL',
    
    -- Metadaten
    tags TEXT[] DEFAULT '{}',
    tone TEXT DEFAULT 'CASUAL' CHECK (tone IN (
        'CASUAL', 'PROFESSIONAL', 'ENTHUSIASTIC', 'EMPATHETIC', 'DIRECT'
    )),
    variables TEXT[] DEFAULT '{}',
    
    -- Tracking
    copied_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0.0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- ADD COLUMNS (if table already exists)
-- =============================================================================

-- Diese Spalten hinzufügen falls sie fehlen
DO $$ 
BEGIN
    -- script_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'mlm_scripts' AND column_name = 'script_id') THEN
        ALTER TABLE mlm_scripts ADD COLUMN script_id TEXT UNIQUE;
    END IF;
    
    -- tone
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'mlm_scripts' AND column_name = 'tone') THEN
        ALTER TABLE mlm_scripts ADD COLUMN tone TEXT DEFAULT 'CASUAL';
    END IF;
    
    -- variables
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'mlm_scripts' AND column_name = 'variables') THEN
        ALTER TABLE mlm_scripts ADD COLUMN variables TEXT[] DEFAULT '{}';
    END IF;
    
    -- copied_count
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'mlm_scripts' AND column_name = 'copied_count') THEN
        ALTER TABLE mlm_scripts ADD COLUMN copied_count INTEGER DEFAULT 0;
    END IF;
    
    -- success_rate
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'mlm_scripts' AND column_name = 'success_rate') THEN
        ALTER TABLE mlm_scripts ADD COLUMN success_rate DECIMAL(5,2) DEFAULT 0.0;
    END IF;
    
    -- is_active
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'mlm_scripts' AND column_name = 'is_active') THEN
        ALTER TABLE mlm_scripts ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_mlm_scripts_script_id ON mlm_scripts(script_id);
CREATE INDEX IF NOT EXISTS idx_mlm_scripts_category ON mlm_scripts(category);
CREATE INDEX IF NOT EXISTS idx_mlm_scripts_company ON mlm_scripts(company);
CREATE INDEX IF NOT EXISTS idx_mlm_scripts_copied ON mlm_scripts(copied_count DESC);
CREATE INDEX IF NOT EXISTS idx_mlm_scripts_active ON mlm_scripts(is_active);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_mlm_scripts_search 
    ON mlm_scripts USING gin(to_tsvector('german', title || ' ' || content));

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE mlm_scripts ENABLE ROW LEVEL SECURITY;

-- Alle authentifizierten User können lesen
DROP POLICY IF EXISTS "mlm_scripts_select_policy" ON mlm_scripts;
CREATE POLICY "mlm_scripts_select_policy" ON mlm_scripts
    FOR SELECT
    TO authenticated
    USING (is_active = true);

-- Auch Anon-User können lesen (für Mobile App ohne Login)
DROP POLICY IF EXISTS "mlm_scripts_anon_select" ON mlm_scripts;
CREATE POLICY "mlm_scripts_anon_select" ON mlm_scripts
    FOR SELECT
    TO anon
    USING (is_active = true);

-- Service Role kann alles
DROP POLICY IF EXISTS "mlm_scripts_service_all" ON mlm_scripts;
CREATE POLICY "mlm_scripts_service_all" ON mlm_scripts
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- =============================================================================
-- TRIGGER: Update updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION update_mlm_scripts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_mlm_scripts_updated_at ON mlm_scripts;
CREATE TRIGGER trigger_mlm_scripts_updated_at
    BEFORE UPDATE ON mlm_scripts
    FOR EACH ROW
    EXECUTE FUNCTION update_mlm_scripts_updated_at();

-- =============================================================================
-- FUNCTION: Increment copied_count
-- =============================================================================

CREATE OR REPLACE FUNCTION increment_script_copied(p_script_id TEXT)
RETURNS void AS $$
BEGIN
    UPDATE mlm_scripts 
    SET copied_count = copied_count + 1
    WHERE script_id = p_script_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE mlm_scripts IS 'Verkaufsskripte für Network Marketing mit Tracking';
COMMENT ON COLUMN mlm_scripts.script_id IS 'Eindeutige Script-ID für Upsert-Operationen';
COMMENT ON COLUMN mlm_scripts.category IS 'Kategorie: OPENER, PITCH, FOLLOW_UP, OBJECTION, CLOSING, GENERAL';
COMMENT ON COLUMN mlm_scripts.company IS 'MLM-Unternehmen: ZINZINO, LR, HERBALIFE, DOTERRA, AMWAY, GENERAL';
COMMENT ON COLUMN mlm_scripts.tone IS 'Ton: CASUAL, PROFESSIONAL, ENTHUSIASTIC, EMPATHETIC, DIRECT';
COMMENT ON COLUMN mlm_scripts.variables IS 'Platzhalter-Variablen im Script z.B. [Name]';
COMMENT ON COLUMN mlm_scripts.copied_count IS 'Wie oft das Script kopiert wurde';
COMMENT ON COLUMN mlm_scripts.success_rate IS 'Erfolgsrate in Prozent (0-100)';

-- =============================================================================
-- VERIFY
-- =============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'mlm_scripts') THEN
        RAISE NOTICE '✅ mlm_scripts Tabelle existiert';
    ELSE
        RAISE EXCEPTION '❌ mlm_scripts Tabelle nicht gefunden';
    END IF;
END $$;


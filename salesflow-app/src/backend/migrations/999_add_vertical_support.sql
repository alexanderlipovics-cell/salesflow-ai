-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION: Vertical Support für CHIEF AI
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Diese Migration fügt Vertical-Support zur Datenbank hinzu:
-- - Vertical-Feld in profiles
-- - Modul-Aktivierung pro User
-- - Vertical-spezifische Settings
--
-- Datum: 2024-12-04
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. PROFILES ERWEITERN
-- ═══════════════════════════════════════════════════════════════════════════

-- Vertical Support
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS vertical TEXT DEFAULT 'network_marketing';

-- Kommentar hinzufügen
COMMENT ON COLUMN profiles.vertical IS 'Aktives Vertical: network_marketing, field_sales, real_estate, finance, coaching, general';

-- Modul-Aktivierung pro User
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS enabled_modules TEXT[] DEFAULT ARRAY['mentor', 'dmo_tracker', 'contacts'];

-- Kommentar hinzufügen
COMMENT ON COLUMN profiles.enabled_modules IS 'Array der aktivierten Module: phoenix, delay_master, dmo_tracker, ghostbuster, etc.';

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_profiles_vertical ON profiles(vertical);

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. VERTICAL SETTINGS TABELLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS vertical_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vertical TEXT NOT NULL,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ein User kann pro Vertical nur eine Settings-Zeile haben
    UNIQUE(user_id, vertical)
);

-- Kommentare
COMMENT ON TABLE vertical_settings IS 'Vertical-spezifische Einstellungen pro User';
COMMENT ON COLUMN vertical_settings.vertical IS 'Vertical: network_marketing, field_sales, etc.';
COMMENT ON COLUMN vertical_settings.settings IS 'JSONB mit vertical-spezifischen Settings';

-- Index
CREATE INDEX IF NOT EXISTS idx_vertical_settings_user_id ON vertical_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_vertical_settings_vertical ON vertical_settings(vertical);

-- RLS Policies
ALTER TABLE vertical_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users können nur ihre eigenen Settings sehen/bearbeiten
CREATE POLICY "Users can view own vertical settings"
    ON vertical_settings
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own vertical settings"
    ON vertical_settings
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vertical settings"
    ON vertical_settings
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own vertical settings"
    ON vertical_settings
    FOR DELETE
    USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. UPDATE TRIGGER FÜR updated_at
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_vertical_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vertical_settings_updated_at
    BEFORE UPDATE ON vertical_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_vertical_settings_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. DEFAULT VALUES FÜR BESTEHENDE USERS
-- ═══════════════════════════════════════════════════════════════════════════

-- Setze default vertical für bestehende Users (falls nicht gesetzt)
UPDATE profiles 
SET vertical = 'network_marketing'
WHERE vertical IS NULL;

-- Setze default enabled_modules für bestehende Users (falls nicht gesetzt)
UPDATE profiles 
SET enabled_modules = ARRAY['mentor', 'dmo_tracker', 'contacts']
WHERE enabled_modules IS NULL OR array_length(enabled_modules, 1) IS NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. VALIDATION CONSTRAINTS
-- ═══════════════════════════════════════════════════════════════════════════

-- Validiere vertical Werte
ALTER TABLE profiles 
ADD CONSTRAINT check_valid_vertical 
CHECK (vertical IN ('network_marketing', 'field_sales', 'real_estate', 'finance', 'coaching', 'general'));

ALTER TABLE vertical_settings 
ADD CONSTRAINT check_valid_vertical_settings 
CHECK (vertical IN ('network_marketing', 'field_sales', 'real_estate', 'finance', 'coaching', 'general'));

-- ═══════════════════════════════════════════════════════════════════════════
-- MIGRATION ABGESCHLOSSEN
-- ═══════════════════════════════════════════════════════════════════════════


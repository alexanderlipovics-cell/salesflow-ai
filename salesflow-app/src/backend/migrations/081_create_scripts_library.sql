-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  MIGRATION 081: Script Library für Network Marketing                       ║
-- ║  50+ bewährte Scripts mit DISG-Anpassung und Performance-Tracking          ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- =============================================================================
-- SCRIPTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identifikation
    number INTEGER NOT NULL UNIQUE,  -- Script-Nummer (1-52)
    name TEXT NOT NULL,
    
    -- Kategorisierung
    category TEXT NOT NULL CHECK (category IN (
        'erstkontakt', 'follow_up', 'einwand', 'closing', 
        'onboarding', 'reaktivierung', 'social_media'
    )),
    context TEXT NOT NULL CHECK (context IN (
        -- Erstkontakt
        'warm_familie', 'warm_freunde', 'kalt_event', 'kalt_social', 
        'kalt_gemeinsam', 'online_lead',
        -- Follow-Up
        'nach_praesentation', 'ghosted', 'langzeit',
        -- Einwand
        'keine_zeit', 'kein_geld', 'partner_fragen', 'mlm_pyramide',
        'kenne_niemanden', 'nicht_verkaufer', 'schon_versucht', 'nur_oben', 'nachdenken',
        -- Closing
        'soft_close', 'assumptive_close', 'urgency_close',
        -- Onboarding
        'willkommen', 'erste_schritte', 'team_motivation',
        -- Reaktivierung
        'inaktive_kunden', 'inaktive_partner',
        -- Social Media
        'story_engagement', 'post_follow_up', 'neuer_follower'
    )),
    relationship_level TEXT NOT NULL DEFAULT 'warm' CHECK (relationship_level IN (
        'kalt', 'lauwarm', 'warm', 'heiss'
    )),
    
    -- Content
    text TEXT NOT NULL,
    description TEXT,
    
    -- Variablen (JSON Array von Strings)
    variables JSONB DEFAULT '[]'::jsonb,
    
    -- DISG Varianten (JSON Array von Objekten)
    variants JSONB DEFAULT '[]'::jsonb,
    
    -- Metadata
    vertical TEXT NOT NULL DEFAULT 'network_marketing',
    language TEXT NOT NULL DEFAULT 'de',
    tags JSONB DEFAULT '[]'::jsonb,
    
    -- Performance Tracking
    usage_count INTEGER DEFAULT 0,
    reply_rate DECIMAL(5,2) DEFAULT 0.0,      -- % Antworten
    positive_rate DECIMAL(5,2) DEFAULT 0.0,   -- % positive Antworten
    conversion_rate DECIMAL(5,2) DEFAULT 0.0, -- % Konversionen
    avg_response_time DECIMAL(10,2) DEFAULT 0.0, -- Durchschnittliche Antwortzeit (Minuten)
    best_for_disg TEXT CHECK (best_for_disg IN ('D', 'I', 'S', 'G')),
    best_for_channel TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_scripts_category ON scripts(category);
CREATE INDEX IF NOT EXISTS idx_scripts_context ON scripts(context);
CREATE INDEX IF NOT EXISTS idx_scripts_relationship ON scripts(relationship_level);
CREATE INDEX IF NOT EXISTS idx_scripts_vertical ON scripts(vertical);
CREATE INDEX IF NOT EXISTS idx_scripts_number ON scripts(number);

-- Full-text search auf Script-Text
CREATE INDEX IF NOT EXISTS idx_scripts_text_search ON scripts USING gin(to_tsvector('german', text));


-- =============================================================================
-- SCRIPT USAGE LOGS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS script_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Referenzen
    script_id UUID NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    company_id UUID,
    
    -- Usage Details
    was_sent BOOLEAN DEFAULT true,
    got_reply BOOLEAN DEFAULT false,
    was_positive BOOLEAN DEFAULT false,
    converted BOOLEAN DEFAULT false,
    response_time_minutes INTEGER,
    
    -- Context
    channel TEXT,  -- instagram, whatsapp, linkedin, email, etc.
    disg_type TEXT CHECK (disg_type IN ('D', 'I', 'S', 'G')),
    lead_id UUID,
    
    -- Feedback
    user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
    user_feedback TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_script_logs_script ON script_usage_logs(script_id);
CREATE INDEX IF NOT EXISTS idx_script_logs_user ON script_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_script_logs_date ON script_usage_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_script_logs_disg ON script_usage_logs(disg_type);


-- =============================================================================
-- SCRIPT FAVORITES TABLE (User-Favoriten)
-- =============================================================================

CREATE TABLE IF NOT EXISTS script_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    script_id UUID NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, script_id)
);

CREATE INDEX IF NOT EXISTS idx_script_favorites_user ON script_favorites(user_id);


-- =============================================================================
-- CUSTOM SCRIPTS TABLE (User-eigene Scripts)
-- =============================================================================

CREATE TABLE IF NOT EXISTS custom_scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    company_id UUID,
    
    -- Content
    name TEXT NOT NULL,
    text TEXT NOT NULL,
    description TEXT,
    
    -- Kategorisierung
    category TEXT NOT NULL,
    context TEXT,
    
    -- Basiert auf (optional)
    based_on_script_id UUID REFERENCES scripts(id) ON DELETE SET NULL,
    
    -- Metadata
    is_shared BOOLEAN DEFAULT false,  -- Mit Team teilen
    variables JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_scripts_user ON custom_scripts(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_scripts_company ON custom_scripts(company_id);


-- =============================================================================
-- RLS POLICIES
-- =============================================================================

ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE script_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE script_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_scripts ENABLE ROW LEVEL SECURITY;

-- Scripts sind für alle authentifizierten User lesbar
CREATE POLICY "Scripts sind öffentlich lesbar"
    ON scripts FOR SELECT
    TO authenticated
    USING (true);

-- Usage Logs: Nur eigene Logs sehen/erstellen
CREATE POLICY "Eigene Script Logs sehen"
    ON script_usage_logs FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Script Logs erstellen"
    ON script_usage_logs FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Favorites: Nur eigene
CREATE POLICY "Eigene Favoriten sehen"
    ON script_favorites FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Favoriten erstellen"
    ON script_favorites FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Favoriten löschen"
    ON script_favorites FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Custom Scripts: Eigene oder geteilte
CREATE POLICY "Eigene Custom Scripts sehen"
    ON custom_scripts FOR SELECT
    TO authenticated
    USING (
        auth.uid() = user_id OR
        (is_shared = true AND company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        ))
    );

CREATE POLICY "Custom Scripts erstellen"
    ON custom_scripts FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Custom Scripts bearbeiten"
    ON custom_scripts FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Custom Scripts löschen"
    ON custom_scripts FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);


-- =============================================================================
-- TRIGGER FÜR UPDATED_AT
-- =============================================================================

CREATE OR REPLACE FUNCTION update_scripts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_scripts_updated_at
    BEFORE UPDATE ON scripts
    FOR EACH ROW
    EXECUTE FUNCTION update_scripts_updated_at();

CREATE TRIGGER trigger_custom_scripts_updated_at
    BEFORE UPDATE ON custom_scripts
    FOR EACH ROW
    EXECUTE FUNCTION update_scripts_updated_at();


-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE scripts IS 'Zentrale Script-Library mit 50+ bewährten Scripts für Network Marketing';
COMMENT ON TABLE script_usage_logs IS 'Tracking der Script-Verwendung für Performance-Analyse';
COMMENT ON TABLE script_favorites IS 'User-Favoriten für schnellen Zugriff';
COMMENT ON TABLE custom_scripts IS 'Benutzerdefinierte Scripts basierend auf Templates';

COMMENT ON COLUMN scripts.number IS 'Eindeutige Script-Nummer (1-52) für einfache Referenzierung';
COMMENT ON COLUMN scripts.context IS 'Spezifischer Verwendungskontext des Scripts';
COMMENT ON COLUMN scripts.variants IS 'DISG-spezifische Varianten des Scripts';
COMMENT ON COLUMN scripts.best_for_disg IS 'Welcher DISG-Typ am besten mit diesem Script funktioniert';


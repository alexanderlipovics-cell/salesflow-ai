-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  SALES FLOW AI - VERTICAL SYSTEM MIGRATION                                 ║
-- ║  Erweitert das System für Multi-Vertical Support                           ║
-- ╚════════════════════════════════════════════════════════════════════════════╝
--
-- Diese Migration fügt hinzu:
-- 1. Verticals Tabelle (Branchen)
-- 2. vertical_id Spalten zu bestehenden Tabellen
-- 3. Imported Chats Tabelle
-- 4. Voice Messages Tabelle
-- 5. RLS Policies
-- 6. Indexes


-- ═══════════════════════════════════════════════════════════════════════════
-- 1. VERTICALS TABELLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS verticals (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    icon TEXT,
    description TEXT,
    conversation_style TEXT DEFAULT 'professionell',
    terminology JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Verticals
INSERT INTO verticals (id, label, icon, description, conversation_style, terminology) VALUES
    ('network_marketing', 'Network Marketing', '🌐', 'MLM, Direktvertrieb, Network', 'locker, direkt, motivierend', 
     '{"primary_unit": "Kunde", "secondary_unit": "Partner", "volume": "Credits", "deal": "Abschluss"}'::jsonb),
    ('real_estate', 'Immobilien', '🏠', 'Makler, Immobilienvertrieb', 'professionell, vertrauenswürdig',
     '{"primary_unit": "Abschluss", "secondary_unit": "Besichtigung", "volume": "Umsatz", "deal": "Verkauf"}'::jsonb),
    ('insurance', 'Versicherung', '🛡️', 'Versicherungsvertrieb, Finanzberater', 'seriös, beratend',
     '{"primary_unit": "Police", "secondary_unit": "Termin", "volume": "Prämie", "deal": "Abschluss"}'::jsonb),
    ('coaching', 'Coaching', '🎯', 'Business Coaching, Life Coaching, Beratung', 'empathisch, professionell',
     '{"primary_unit": "Kunde", "secondary_unit": "Discovery Call", "volume": "Umsatz", "deal": "Coaching-Paket"}'::jsonb),
    ('b2b_saas', 'B2B SaaS', '💻', 'Software-Vertrieb, Enterprise Sales', 'professionell, lösungsorientiert',
     '{"primary_unit": "Kunde", "secondary_unit": "Demo", "volume": "ARR", "deal": "Deal"}'::jsonb),
    ('finance', 'Finanzvertrieb', '💰', 'Finanzprodukte, Investment', 'seriös, vertrauenswürdig',
     '{"primary_unit": "Kunde", "secondary_unit": "Beratung", "volume": "Volumen", "deal": "Abschluss"}'::jsonb),
    ('solar', 'Solar', '☀️', 'Photovoltaik, Erneuerbare Energien', 'nachhaltig, beratend',
     '{"primary_unit": "Anlage", "secondary_unit": "Beratung", "volume": "kWp", "deal": "Installation"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
    label = EXCLUDED.label,
    icon = EXCLUDED.icon,
    description = EXCLUDED.description,
    conversation_style = EXCLUDED.conversation_style,
    terminology = EXCLUDED.terminology,
    updated_at = NOW();


-- ═══════════════════════════════════════════════════════════════════════════
-- 2. VERTICAL_ID ZU BESTEHENDEN TABELLEN
-- ═══════════════════════════════════════════════════════════════════════════

-- Leads Tabelle erweitern
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS vertical_id TEXT DEFAULT 'network_marketing' REFERENCES verticals(id);

-- Goals Tabelle erweitern
ALTER TABLE goals 
ADD COLUMN IF NOT EXISTS vertical_id TEXT DEFAULT 'network_marketing' REFERENCES verticals(id);

-- Daily Flow Targets erweitern
ALTER TABLE daily_flow_targets 
ADD COLUMN IF NOT EXISTS vertical_id TEXT DEFAULT 'network_marketing' REFERENCES verticals(id);

-- Companies Tabelle erweitern (falls vorhanden)
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'companies') THEN
        ALTER TABLE companies 
        ADD COLUMN IF NOT EXISTS vertical_id TEXT DEFAULT 'network_marketing' REFERENCES verticals(id);
    END IF;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- 3. IMPORTED CHATS TABELLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS imported_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    
    -- Chat Daten
    channel TEXT NOT NULL CHECK (channel IN ('instagram', 'facebook', 'whatsapp', 'telegram', 'linkedin', 'other')),
    raw_chat TEXT NOT NULL,
    
    -- AI Analyse
    analysis_result JSONB,
    extracted_lead_data JSONB,
    conversation_insights JSONB,
    suggested_next_step JSONB,
    analysis_confidence TEXT CHECK (analysis_confidence IN ('high', 'medium', 'low')),
    
    -- Metadata
    word_count INTEGER,
    language TEXT DEFAULT 'de',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_imported_chats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_imported_chats_updated_at ON imported_chats;
CREATE TRIGGER trigger_imported_chats_updated_at
    BEFORE UPDATE ON imported_chats
    FOR EACH ROW
    EXECUTE FUNCTION update_imported_chats_updated_at();


-- ═══════════════════════════════════════════════════════════════════════════
-- 4. VOICE MESSAGES TABELLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS voice_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    
    -- Voice Daten
    direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
    audio_url TEXT,
    audio_format TEXT DEFAULT 'mp3',
    duration_seconds INTEGER,
    
    -- Transkription & Analyse
    transcript TEXT,
    transcript_confidence FLOAT,
    analysis_result JSONB,
    
    -- Für Voice-Out
    original_text TEXT,
    voice_id TEXT,
    
    -- Metadata
    language TEXT DEFAULT 'de',
    channel TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION update_voice_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_voice_messages_updated_at ON voice_messages;
CREATE TRIGGER trigger_voice_messages_updated_at
    BEFORE UPDATE ON voice_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_voice_messages_updated_at();


-- ═══════════════════════════════════════════════════════════════════════════
-- 5. ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════════════════════════

-- Verticals (public read)
ALTER TABLE verticals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "verticals_public_read" ON verticals;
CREATE POLICY "verticals_public_read" ON verticals
    FOR SELECT
    USING (is_active = true);

-- Imported Chats (user owned)
ALTER TABLE imported_chats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "imported_chats_own" ON imported_chats;
CREATE POLICY "imported_chats_own" ON imported_chats
    FOR ALL
    USING (auth.uid() = user_id);

-- Voice Messages (user owned)
ALTER TABLE voice_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "voice_messages_own" ON voice_messages;
CREATE POLICY "voice_messages_own" ON voice_messages
    FOR ALL
    USING (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- 6. INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

-- Verticals
CREATE INDEX IF NOT EXISTS idx_verticals_active ON verticals(is_active) WHERE is_active = true;

-- Leads by vertical
CREATE INDEX IF NOT EXISTS idx_leads_vertical ON leads(vertical_id);
CREATE INDEX IF NOT EXISTS idx_leads_user_vertical ON leads(user_id, vertical_id);

-- Goals by vertical
CREATE INDEX IF NOT EXISTS idx_goals_vertical ON goals(vertical_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_vertical ON goals(user_id, vertical_id);

-- Imported Chats
CREATE INDEX IF NOT EXISTS idx_imported_chats_user ON imported_chats(user_id);
CREATE INDEX IF NOT EXISTS idx_imported_chats_user_created ON imported_chats(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_imported_chats_lead ON imported_chats(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_imported_chats_channel ON imported_chats(channel);

-- Voice Messages
CREATE INDEX IF NOT EXISTS idx_voice_messages_user ON voice_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_messages_user_created ON voice_messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_messages_lead ON voice_messages(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_voice_messages_direction ON voice_messages(direction);


-- ═══════════════════════════════════════════════════════════════════════════
-- 7. COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE verticals IS 'Branchen/Verticals für Multi-Vertical Support';
COMMENT ON TABLE imported_chats IS 'Importierte Social Media Chats mit AI-Analyse';
COMMENT ON TABLE voice_messages IS 'Voice Messages (ein- und ausgehend) mit Transkription';

COMMENT ON COLUMN verticals.terminology IS 'JSON mit branchenspezifischen Begriffen';
COMMENT ON COLUMN imported_chats.analysis_result IS 'Vollständiges AI-Analyse-Ergebnis als JSON';
COMMENT ON COLUMN voice_messages.transcript_confidence IS 'Whisper Confidence Score (0-1)';


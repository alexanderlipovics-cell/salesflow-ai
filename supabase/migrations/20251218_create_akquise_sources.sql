-- ============================================================================
-- Migration: create_akquise_sources
-- Purpose  : Akquise-Gedächtnis für CHIEF - merkt sich wo User akquiriert hat
-- ============================================================================

-- Tabelle für Akquise-Quellen (Facebook Gruppen, Instagram Hashtags, etc.)
CREATE TABLE IF NOT EXISTS public.akquise_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    
    -- Quelle-Typ und Identifikation
    source_type TEXT NOT NULL,  -- 'facebook_group', 'instagram_hashtag', 'linkedin_group', 'twitter_hashtag', etc.
    source_url TEXT,
    source_name TEXT,
    
    -- Kategorisierung
    category TEXT,
    tags TEXT[],
    
    -- Nutzungsstatistiken
    first_used_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    times_used INTEGER DEFAULT 1,
    leads_found INTEGER DEFAULT 0,
    leads_converted INTEGER DEFAULT 0,
    
    -- Status
    is_exhausted BOOLEAN DEFAULT FALSE,
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Kommentare
COMMENT ON TABLE public.akquise_sources IS 
    'Akquise-Gedächtnis: CHIEF merkt sich wo User akquiriert hat (Facebook Gruppen, Instagram Hashtags, etc.)';
COMMENT ON COLUMN public.akquise_sources.source_type IS 
    'Typ der Quelle: facebook_group, instagram_hashtag, linkedin_group, twitter_hashtag, etc.';
COMMENT ON COLUMN public.akquise_sources.source_url IS 
    'Normalisierte URL der Quelle (für Vergleich)';
COMMENT ON COLUMN public.akquise_sources.source_name IS 
    'Anzeigename der Quelle (z.B. Gruppenname)';
COMMENT ON COLUMN public.akquise_sources.category IS 
    'Kategorie (fitness, health, business, network_marketing, etc.)';
COMMENT ON COLUMN public.akquise_sources.tags IS 
    'Tags für erweiterte Suche (z.B. ["fitness", "dach", "österreich"])';
COMMENT ON COLUMN public.akquise_sources.is_exhausted IS 
    'Markiert ob Quelle als "erschöpft" markiert wurde';

-- Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_akquise_user_url ON public.akquise_sources(user_id, source_url);
CREATE INDEX IF NOT EXISTS idx_akquise_user_category ON public.akquise_sources(user_id, category);
CREATE INDEX IF NOT EXISTS idx_akquise_user_type ON public.akquise_sources(user_id, source_type);
CREATE INDEX IF NOT EXISTS idx_akquise_last_used ON public.akquise_sources(user_id, last_used_at DESC);

-- Updated_at Trigger
CREATE OR REPLACE FUNCTION update_akquise_sources_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_akquise_sources_updated_at
    BEFORE UPDATE ON public.akquise_sources
    FOR EACH ROW
    EXECUTE FUNCTION update_akquise_sources_updated_at();


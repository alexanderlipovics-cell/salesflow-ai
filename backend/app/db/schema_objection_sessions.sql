-- ═══════════════════════════════════════════════════════════════════════════
-- OBJECTION SESSIONS TABLE
-- Speichert Nutzungsdaten für Objection Brain Analytics
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Erstellt: 2024
-- Beschreibung: Logging-Tabelle für verwendete Einwand-Antworten
-- 
-- Ausführen in Supabase SQL Editor:
-- 1. Kopiere den gesamten Inhalt dieser Datei
-- 2. Füge ihn im Supabase SQL Editor ein
-- 3. Klicke auf "Run"
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1. Tabelle erstellen
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.objection_sessions (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Optionale Verknüpfungen
    lead_id UUID NULL REFERENCES public.leads(id) ON DELETE SET NULL,
    user_id UUID NULL,  -- Für spätere Auth-Integration
    
    -- Kontext-Felder
    vertical TEXT NULL,             -- z.B. 'network', 'real_estate', 'finance'
    channel TEXT NULL,              -- z.B. 'whatsapp', 'instagram', 'phone', 'email'
    
    -- Einwand-Daten
    objection_text TEXT NOT NULL,   -- Original-Einwand des Kunden
    
    -- Gewählte Antwort
    chosen_variant_label TEXT NOT NULL,   -- z.B. 'Variante A (Empfohlen)'
    chosen_message TEXT NOT NULL,         -- Die vollständige Nachricht
    
    -- KI-Metadaten
    model_reasoning TEXT NULL,      -- Optional: KI-Strategie/Reasoning
    
    -- Outcome Tracking (für spätere Analyse)
    outcome TEXT NULL,              -- 'pending' | 'positive' | 'neutral' | 'negative'
    
    -- Quelle der Nutzung
    source TEXT NULL DEFAULT 'objection_brain_page',  -- z.B. 'follow_ups', 'hunter', etc.
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- 2. Indizes für Performance
-- ─────────────────────────────────────────────────────────────────

-- Index für Lead-basierte Abfragen
CREATE INDEX IF NOT EXISTS idx_objection_sessions_lead_id 
    ON public.objection_sessions(lead_id) 
    WHERE lead_id IS NOT NULL;

-- Index für Zeitraum-Abfragen (Analytics)
CREATE INDEX IF NOT EXISTS idx_objection_sessions_created_at 
    ON public.objection_sessions(created_at DESC);

-- Index für Vertical-Analysen
CREATE INDEX IF NOT EXISTS idx_objection_sessions_vertical 
    ON public.objection_sessions(vertical) 
    WHERE vertical IS NOT NULL;

-- Index für Outcome-Analysen
CREATE INDEX IF NOT EXISTS idx_objection_sessions_outcome 
    ON public.objection_sessions(outcome) 
    WHERE outcome IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────
-- 3. Updated_at Trigger
-- ─────────────────────────────────────────────────────────────────

-- Funktion für automatisches updated_at
CREATE OR REPLACE FUNCTION update_objection_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger erstellen
DROP TRIGGER IF EXISTS trigger_objection_sessions_updated_at ON public.objection_sessions;
CREATE TRIGGER trigger_objection_sessions_updated_at
    BEFORE UPDATE ON public.objection_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_objection_sessions_updated_at();

-- ─────────────────────────────────────────────────────────────────
-- 4. Row Level Security (RLS)
-- ─────────────────────────────────────────────────────────────────

-- RLS aktivieren
ALTER TABLE public.objection_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Alle können einfügen (für anonyme Nutzung)
CREATE POLICY "Allow insert for all" ON public.objection_sessions
    FOR INSERT
    WITH CHECK (true);

-- Policy: Alle können lesen (für Analytics)
CREATE POLICY "Allow read for all" ON public.objection_sessions
    FOR SELECT
    USING (true);

-- ─────────────────────────────────────────────────────────────────
-- 5. Kommentare für Dokumentation
-- ─────────────────────────────────────────────────────────────────

COMMENT ON TABLE public.objection_sessions IS 
    'Speichert Nutzungsdaten für Objection Brain - welche Antworten wurden verwendet';

COMMENT ON COLUMN public.objection_sessions.objection_text IS 
    'Der Original-Einwand, der vom Kunden genannt wurde';

COMMENT ON COLUMN public.objection_sessions.chosen_variant_label IS 
    'Label der gewählten Variante (z.B. "Variante A (Empfohlen)")';

COMMENT ON COLUMN public.objection_sessions.outcome IS 
    'Ergebnis der Nutzung: pending, positive, neutral, negative';

COMMENT ON COLUMN public.objection_sessions.source IS 
    'Wo wurde die Antwort genutzt: objection_brain_page, follow_ups, hunter, etc.';

-- ═══════════════════════════════════════════════════════════════════════════
-- ANALYTICS QUERIES (für spätere Nutzung)
-- ═══════════════════════════════════════════════════════════════════════════

/*
-- Top 10 häufigste Einwände:
SELECT 
    objection_text,
    COUNT(*) as count,
    COUNT(DISTINCT lead_id) as unique_leads
FROM public.objection_sessions
GROUP BY objection_text
ORDER BY count DESC
LIMIT 10;

-- Genutzte Varianten pro Vertical:
SELECT 
    vertical,
    chosen_variant_label,
    COUNT(*) as count
FROM public.objection_sessions
WHERE vertical IS NOT NULL
GROUP BY vertical, chosen_variant_label
ORDER BY vertical, count DESC;

-- Outcome-Verteilung (wenn gepflegt):
SELECT 
    outcome,
    COUNT(*) as count,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM public.objection_sessions
WHERE outcome IS NOT NULL
GROUP BY outcome
ORDER BY count DESC;

-- Nutzung nach Kanal:
SELECT 
    channel,
    COUNT(*) as total_uses,
    COUNT(CASE WHEN outcome = 'positive' THEN 1 END) as positive_outcomes
FROM public.objection_sessions
WHERE channel IS NOT NULL
GROUP BY channel
ORDER BY total_uses DESC;

-- Tägliche Nutzungsstatistik:
SELECT 
    DATE(created_at) as date,
    COUNT(*) as sessions,
    COUNT(DISTINCT lead_id) as unique_leads
FROM public.objection_sessions
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
*/


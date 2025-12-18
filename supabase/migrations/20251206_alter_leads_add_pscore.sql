-- ============================================================================
-- P-SCORE ENGINE: Erweiterung der Leads-Tabelle für Predictive Lead Scoring
-- ============================================================================
-- Migration: 20251206_alter_leads_add_pscore.sql
-- Beschreibung: Fügt P-Score Felder für prädiktive Lead-Bewertung hinzu
-- ============================================================================

-- P-Score Felder hinzufügen
ALTER TABLE public.leads
    ADD COLUMN IF NOT EXISTS p_score NUMERIC(5,2) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS p_score_trend TEXT DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS last_scored_at TIMESTAMPTZ DEFAULT NULL;

-- Kommentare für Dokumentation
COMMENT ON COLUMN public.leads.p_score IS 
    'Predictive Score (0-100): KI-basierte Einschätzung der Abschlusswahrscheinlichkeit';

COMMENT ON COLUMN public.leads.p_score_trend IS 
    'Trend des P-Scores: up, down, flat - zeigt Entwicklung seit letzter Berechnung';

COMMENT ON COLUMN public.leads.last_scored_at IS 
    'Zeitpunkt der letzten P-Score-Berechnung';

-- Index für Performance bei Queries nach Score
CREATE INDEX IF NOT EXISTS idx_leads_p_score ON public.leads(p_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_leads_last_scored_at ON public.leads(last_scored_at);

-- Constraint für valide Trend-Werte (optional, für Datenintegrität)
ALTER TABLE public.leads
    ADD CONSTRAINT IF NOT EXISTS chk_p_score_trend 
    CHECK (p_score_trend IS NULL OR p_score_trend IN ('up', 'down', 'flat'));

-- Constraint für Score-Bereich
ALTER TABLE public.leads
    ADD CONSTRAINT IF NOT EXISTS chk_p_score_range 
    CHECK (p_score IS NULL OR (p_score >= 0 AND p_score <= 100));


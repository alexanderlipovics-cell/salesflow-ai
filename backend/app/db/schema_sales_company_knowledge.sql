-- ═══════════════════════════════════════════════════════════════════════════
-- SALES COMPANY KNOWLEDGE TABLE
-- Speichert vertriebsrelevantes Wissen für eine Organisation / einen User
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Version: 1.0
-- Beschreibung: Zentrales Vertriebs-Wissen, das von KI-Endpunkten als Kontext
--               verwendet wird (Chat, Objection Brain, Follow-ups, etc.)
-- 
-- V1: User-basiert (user_id). Später erweiterbar auf workspace_id für Teams.
-- 
-- Ausführen in Supabase SQL Editor:
-- 1. Kopiere den gesamten Inhalt dieser Datei
-- 2. Füge ihn im Supabase SQL Editor ein
-- 3. Klicke auf "Run"
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1. Tabelle erstellen
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sales_company_knowledge (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User-Verknüpfung (V1: Single-Tenant pro User)
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Unternehmens-Informationen
    company_name TEXT,
    vision TEXT,
    target_audience TEXT,
    
    -- Produkte & Angebote
    products TEXT,
    pricing TEXT,
    usps TEXT,
    
    -- Rechtliche & Compliance-Informationen
    legal_disclaimers TEXT,
    
    -- Kommunikation
    communication_style TEXT,
    no_go_phrases TEXT,
    
    -- Sonstige Notizen
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────
-- 2. Indizes für Performance
-- ─────────────────────────────────────────────────────────────────

-- Index für User-basierte Abfragen
CREATE INDEX IF NOT EXISTS idx_sales_company_knowledge_user
    ON public.sales_company_knowledge(user_id);

-- ─────────────────────────────────────────────────────────────────
-- 3. Updated_at Trigger
-- ─────────────────────────────────────────────────────────────────

-- Funktion für automatisches updated_at
CREATE OR REPLACE FUNCTION update_sales_company_knowledge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger erstellen
DROP TRIGGER IF EXISTS trigger_sales_company_knowledge_updated_at ON public.sales_company_knowledge;
CREATE TRIGGER trigger_sales_company_knowledge_updated_at
    BEFORE UPDATE ON public.sales_company_knowledge
    FOR EACH ROW
    EXECUTE FUNCTION update_sales_company_knowledge_updated_at();

-- ─────────────────────────────────────────────────────────────────
-- 4. Row Level Security (RLS)
-- ─────────────────────────────────────────────────────────────────

-- RLS aktivieren
ALTER TABLE public.sales_company_knowledge ENABLE ROW LEVEL SECURITY;

-- Policy: User kann nur eigene Daten lesen
CREATE POLICY "Users can read their own company knowledge" 
    ON public.sales_company_knowledge
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: User kann nur eigene Daten einfügen
CREATE POLICY "Users can insert their own company knowledge" 
    ON public.sales_company_knowledge
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: User kann nur eigene Daten aktualisieren
CREATE POLICY "Users can update their own company knowledge" 
    ON public.sales_company_knowledge
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: User kann nur eigene Daten löschen
CREATE POLICY "Users can delete their own company knowledge" 
    ON public.sales_company_knowledge
    FOR DELETE
    USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────
-- 5. Kommentare für Dokumentation
-- ─────────────────────────────────────────────────────────────────

COMMENT ON TABLE public.sales_company_knowledge IS 
    'Speichert vertriebsrelevantes Wissen (Vision, Produkte, Preise, USPs, rechtliche Hinweise) für KI-gestützte Sales-Funktionen';

COMMENT ON COLUMN public.sales_company_knowledge.company_name IS 
    'Name des Unternehmens / der Marke';

COMMENT ON COLUMN public.sales_company_knowledge.vision IS 
    'Vision / Mission des Unternehmens';

COMMENT ON COLUMN public.sales_company_knowledge.target_audience IS 
    'Beschreibung der Zielgruppe';

COMMENT ON COLUMN public.sales_company_knowledge.products IS 
    'Produkte & Pakete (strukturiert oder Freitext)';

COMMENT ON COLUMN public.sales_company_knowledge.pricing IS 
    'Preismodell & Konditionen';

COMMENT ON COLUMN public.sales_company_knowledge.usps IS 
    'Unique Selling Propositions - Warum sollten Kunden bei uns kaufen?';

COMMENT ON COLUMN public.sales_company_knowledge.legal_disclaimers IS 
    'Rechtliche Hinweise, Disclaimer, Compliance-Vorgaben';

COMMENT ON COLUMN public.sales_company_knowledge.communication_style IS 
    'Ton der Kommunikation (Du/Sie, Emojis, formell/locker, etc.)';

COMMENT ON COLUMN public.sales_company_knowledge.no_go_phrases IS 
    'Tabu-Sätze, verbotene Formulierungen (z.B. Renditeversprechen)';

COMMENT ON COLUMN public.sales_company_knowledge.notes IS 
    'Interne Notizen für den User';

-- ═══════════════════════════════════════════════════════════════════════════
-- HINWEISE FÜR SPÄTER
-- ═══════════════════════════════════════════════════════════════════════════

/*
UNIQUE CONSTRAINT für user_id (optional, falls nur 1 Datensatz pro User):

Wenn du sicherstellen willst, dass jeder User nur EINEN Knowledge-Eintrag hat:

ALTER TABLE public.sales_company_knowledge 
    ADD CONSTRAINT unique_user_knowledge UNIQUE (user_id);

WICHTIG: Dann muss der Service UPSERT mit ON CONFLICT (user_id) nutzen!
*/


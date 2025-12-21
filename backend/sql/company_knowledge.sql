-- Company Knowledge Store
-- CHIEF nutzt dieses Wissen für bessere, personalisierte Antworten

CREATE TABLE IF NOT EXISTS public.company_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_company_knowledge_user ON public.company_knowledge(user_id);
CREATE INDEX IF NOT EXISTS idx_company_knowledge_category ON public.company_knowledge(category);
CREATE INDEX IF NOT EXISTS idx_company_knowledge_active ON public.company_knowledge(is_active) WHERE is_active = true;

-- RLS aktivieren
ALTER TABLE public.company_knowledge ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users manage own knowledge" ON public.company_knowledge;

-- RLS Policy
CREATE POLICY "Users manage own knowledge" ON public.company_knowledge
    FOR ALL USING (auth.uid() = user_id);

-- Kommentare
COMMENT ON TABLE public.company_knowledge IS 'Firmenwissen für CHIEF - Upload-Funktion für User-spezifisches Wissen';
COMMENT ON COLUMN public.company_knowledge.category IS 'Kategorie: general, products, objections, scripts, faq';
COMMENT ON COLUMN public.company_knowledge.content IS 'Das Wissen das CHIEF nutzen soll';


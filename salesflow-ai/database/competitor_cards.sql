-- Competitor Battle Cards
CREATE TABLE IF NOT EXISTS public.competitor_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    competitor_name TEXT NOT NULL,
    competitor_aliases TEXT[], -- ["Salesforce", "SF", "SFDC"]

    -- Arguments
    weaknesses JSONB DEFAULT '[]', -- [{title, description}]
    our_advantages JSONB DEFAULT '[]', -- [{title, description}]
    pricing_comparison TEXT,
    quick_response TEXT, -- One-liner response

    -- Context
    industry TEXT,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    times_used INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.competitor_cards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own cards" ON public.competitor_cards;
CREATE POLICY "Users manage own cards" ON public.competitor_cards
    FOR ALL USING (auth.uid() = user_id);

-- Hinweis: auth.uid() liefert nur im Auth-Kontext einen Wert. Ohne JWT ist es NULL.
-- Damit Migrationen nicht fehlschlagen, wird das Seed-Insert nur ausgeführt,
-- wenn auth.uid() verfügbar ist (z.B. direkt im Supabase SQL Editor mit JWT).
INSERT INTO public.competitor_cards (user_id, competitor_name, competitor_aliases, weaknesses, our_advantages, quick_response)
SELECT 
    auth.uid(),
    'Pipedrive',
    ARRAY['Pipedrive', 'PD'],
    '[{"title": "Keine AI", "description": "Pipedrive hat keine echte AI-Integration"}]'::jsonb,
    '[{"title": "AI-First", "description": "Wir haben AI in jedem Feature"}]'::jsonb,
    'Pipedrive ist gut für Basics, aber wir sparen dir 3 Stunden täglich durch AI.'
WHERE auth.uid() IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.competitor_cards WHERE competitor_name = 'Pipedrive');


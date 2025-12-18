-- Produkte / Services und Angebots-Tabelle für PDF-Angebote
-- Enthält Basis-RLS-Policies pro Benutzer

CREATE TABLE IF NOT EXISTS public.products_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(12,2) NOT NULL,
    price_type TEXT DEFAULT 'fixed', -- fixed, hourly, monthly, yearly
    category TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS public.proposals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    recipient_name TEXT,
    recipient_company TEXT,
    recipient_email TEXT,
    
    -- Content
    intro_text TEXT,
    items JSONB DEFAULT '[]', -- [{product_id, name, description, quantity, unit_price, total}]
    subtotal DECIMAL(12,2),
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    tax_percent DECIMAL(5,2) DEFAULT 20,
    tax_amount DECIMAL(12,2),
    total DECIMAL(12,2),
    
    -- Terms
    validity_days INTEGER DEFAULT 14,
    payment_terms TEXT,
    notes TEXT,
    
    -- Status
    status TEXT DEFAULT 'draft', -- draft, sent, viewed, accepted, rejected
    sent_at TIMESTAMPTZ,
    viewed_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    
    -- PDF
    pdf_url TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.products_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own products" ON public.products_services;
CREATE POLICY "Users manage own products" ON public.products_services
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own proposals" ON public.proposals;
CREATE POLICY "Users manage own proposals" ON public.proposals
    FOR ALL USING (auth.uid() = user_id);


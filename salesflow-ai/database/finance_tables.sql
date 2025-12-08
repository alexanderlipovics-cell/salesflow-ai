-- Finance Transactions
CREATE TABLE IF NOT EXISTS public.finance_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tx_type TEXT NOT NULL CHECK (tx_type IN ('income', 'expense')),
    amount DECIMAL(12,2) NOT NULL,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    receipt_url TEXT,
    is_tax_relevant BOOLEAN DEFAULT true,
    tax_deductible_percent INTEGER DEFAULT 100,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- Finance Mileage Log
CREATE TABLE IF NOT EXISTS public.finance_mileage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_location TEXT NOT NULL,
    end_location TEXT NOT NULL,
    distance_km DECIMAL(8,2) NOT NULL,
    purpose TEXT NOT NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    rate_per_km DECIMAL(4,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- Indexes
CREATE INDEX IF NOT EXISTS idx_finance_tx_user_date ON public.finance_transactions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_finance_tx_category ON public.finance_transactions(user_id, category);
CREATE INDEX IF NOT EXISTS idx_finance_mileage_user_date ON public.finance_mileage(user_id, date);


-- RLS
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_mileage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own transactions" ON public.finance_transactions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own mileage" ON public.finance_mileage
    FOR ALL USING (auth.uid() = user_id);


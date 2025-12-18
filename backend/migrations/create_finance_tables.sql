-- Finance Tables für SalesFlow AI
-- Diese Tabellen werden benötigt für die Finance-Seite

-- Transactions Tabelle (falls nicht vorhanden)
CREATE TABLE IF NOT EXISTS transactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    amount decimal(10,2) NOT NULL,
    type text NOT NULL CHECK (type IN ('income', 'expense')),
    category text,
    description text,
    date timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- RLS für transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own transactions" ON transactions;
CREATE POLICY "Users can manage own transactions" ON transactions 
    FOR ALL USING (auth.uid() = user_id);

-- Commissions Tabelle (falls nicht vorhanden)
CREATE TABLE IF NOT EXISTS commissions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    amount decimal(10,2) NOT NULL,
    source text,
    status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
    deal_id uuid,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own commissions" ON commissions;
CREATE POLICY "Users can view own commissions" ON commissions 
    FOR ALL USING (auth.uid() = user_id);

-- Indexes für bessere Performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_commissions_user_id ON commissions(user_id);
CREATE INDEX IF NOT EXISTS idx_commissions_status ON commissions(status);


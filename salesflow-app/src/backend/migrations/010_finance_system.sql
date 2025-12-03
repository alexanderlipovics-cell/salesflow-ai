-- =============================================
-- MIGRATION 010: Finance & Revenue Tracking System
-- =============================================
-- Sales Flow AI - Finanz-Tracking für MLM-Vertriebsmitarbeiter
-- Tracks: Transactions, Goals, Commissions, Team Bonuses
-- =============================================

-- =============================================
-- 1. TRANSACTION CATEGORIES ENUM
-- =============================================

DO $$ BEGIN
  CREATE TYPE transaction_category AS ENUM (
    'commission',       -- Provision aus eigenem Verkauf
    'team_bonus',       -- Bonus aus Team-Umsatz
    'rank_bonus',       -- Rangaufstiegs-Bonus
    'fast_start',       -- Fast-Start-Bonus
    'leadership',       -- Leadership-Bonus
    'other_income',     -- Sonstige Einnahmen
    'product_purchase', -- Produktkäufe (Ausgabe)
    'marketing',        -- Marketing/Ads (Ausgabe)
    'tools',            -- Tools & Software (Ausgabe)
    'travel',           -- Reisen & Events (Ausgabe)
    'other_expense'     -- Sonstige Ausgaben
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =============================================
-- 2. FINANCE TRANSACTIONS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.finance_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID,
  
  -- Transaction Details
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense')),
  category transaction_category NOT NULL,
  
  -- Description & Reference
  title TEXT NOT NULL,
  description TEXT,
  counterparty_name TEXT,
  
  -- Related Entities (optional)
  related_contact_id UUID,
  
  -- Period
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  period_month INTEGER NOT NULL DEFAULT EXTRACT(MONTH FROM CURRENT_DATE),
  period_year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  
  -- VAT (for expense tracking)
  vat_amount NUMERIC(10,2) DEFAULT 0,
  
  -- Document
  document_url TEXT,
  
  -- Status
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  
  -- Source
  source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'import', 'invoice_upload', 'api')),
  external_reference TEXT,
  
  -- Meta
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.finance_transactions IS 
  'Alle Einnahmen und Ausgaben eines Users - Provisionen, Boni, Kosten etc.';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_finance_transactions_user ON finance_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_date ON finance_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_type ON finance_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_category ON finance_transactions(category);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_period ON finance_transactions(period_year, period_month);

-- =============================================
-- 3. FINANCE GOALS TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS public.finance_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID,
  
  -- Goal Details
  goal_type TEXT NOT NULL CHECK (goal_type IN ('monthly_revenue', 'monthly_profit', 'quarterly_revenue', 'annual_revenue')),
  target_amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  
  -- Period
  period_month INTEGER, -- NULL für annual
  period_year INTEGER NOT NULL,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  achieved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(user_id, goal_type, period_year, period_month)
);

COMMENT ON TABLE public.finance_goals IS 
  'Umsatz- und Gewinnziele pro User und Periode';

-- =============================================
-- 4. RPC: Get Finance Summary
-- =============================================

CREATE OR REPLACE FUNCTION public.get_finance_summary(
  p_user_id UUID,
  p_workspace_id UUID DEFAULT NULL,
  p_from_date DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE,
  p_to_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSON
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_income_total NUMERIC;
  v_expense_total NUMERIC;
  v_profit NUMERIC;
  v_profit_margin NUMERIC;
  v_goal_amount NUMERIC;
  v_goal_progress NUMERIC;
  v_result JSON;
BEGIN
  -- Calculate totals
  SELECT 
    COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0)
  INTO v_income_total, v_expense_total
  FROM finance_transactions
  WHERE user_id = p_user_id
    AND transaction_date BETWEEN p_from_date AND p_to_date
    AND status = 'confirmed';
  
  v_profit := v_income_total - v_expense_total;
  v_profit_margin := CASE WHEN v_income_total > 0 THEN v_profit / v_income_total ELSE 0 END;
  
  -- Get active goal
  SELECT target_amount INTO v_goal_amount
  FROM finance_goals
  WHERE user_id = p_user_id
    AND goal_type = 'monthly_revenue'
    AND period_year = EXTRACT(YEAR FROM CURRENT_DATE)
    AND period_month = EXTRACT(MONTH FROM CURRENT_DATE)
    AND is_active = true
  LIMIT 1;
  
  v_goal_progress := CASE WHEN v_goal_amount > 0 THEN v_income_total / v_goal_amount ELSE 0 END;
  
  v_result := json_build_object(
    'period', json_build_object(
      'from', p_from_date,
      'to', p_to_date
    ),
    'summary', json_build_object(
      'income_total', ROUND(v_income_total, 2),
      'expense_total', ROUND(v_expense_total, 2),
      'profit', ROUND(v_profit, 2),
      'profit_margin', ROUND(v_profit_margin, 4),
      'goal_amount', v_goal_amount,
      'goal_progress', ROUND(v_goal_progress, 4)
    )
  );
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_finance_summary IS 
  'Berechnet Einnahmen, Ausgaben, Gewinn und Zielfortschritt für einen Zeitraum';

-- =============================================
-- 5. RPC: Get Monthly Revenue Data (for Charts)
-- =============================================

CREATE OR REPLACE FUNCTION public.get_monthly_revenue_data(
  p_user_id UUID,
  p_workspace_id UUID DEFAULT NULL,
  p_months INTEGER DEFAULT 6
)
RETURNS TABLE (
  month TEXT,
  month_label TEXT,
  income NUMERIC,
  expenses NUMERIC,
  profit NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH months AS (
    SELECT 
      TO_CHAR(d, 'YYYY-MM') AS month,
      TO_CHAR(d, 'Mon') AS month_label,
      DATE_TRUNC('month', d)::DATE AS month_start,
      (DATE_TRUNC('month', d) + INTERVAL '1 month' - INTERVAL '1 day')::DATE AS month_end
    FROM generate_series(
      DATE_TRUNC('month', CURRENT_DATE) - ((p_months - 1) || ' months')::INTERVAL,
      DATE_TRUNC('month', CURRENT_DATE),
      '1 month'::INTERVAL
    ) AS d
  )
  SELECT 
    m.month,
    m.month_label,
    COALESCE(SUM(CASE WHEN ft.transaction_type = 'income' THEN ft.amount ELSE 0 END), 0) AS income,
    COALESCE(SUM(CASE WHEN ft.transaction_type = 'expense' THEN ft.amount ELSE 0 END), 0) AS expenses,
    COALESCE(SUM(CASE WHEN ft.transaction_type = 'income' THEN ft.amount ELSE -ft.amount END), 0) AS profit
  FROM months m
  LEFT JOIN finance_transactions ft ON 
    ft.user_id = p_user_id
    AND ft.transaction_date BETWEEN m.month_start AND m.month_end
    AND ft.status = 'confirmed'
  GROUP BY m.month, m.month_label, m.month_start
  ORDER BY m.month_start;
END;
$$;

COMMENT ON FUNCTION public.get_monthly_revenue_data IS 
  'Monatliche Einnahmen/Ausgaben für Chart-Darstellung';

-- =============================================
-- 6. RPC: Get Category Breakdown
-- =============================================

CREATE OR REPLACE FUNCTION public.get_category_breakdown(
  p_user_id UUID,
  p_workspace_id UUID DEFAULT NULL,
  p_transaction_type TEXT DEFAULT 'income',
  p_from_date DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE,
  p_to_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  category TEXT,
  category_label TEXT,
  total NUMERIC,
  percentage NUMERIC,
  color TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grand_total NUMERIC;
BEGIN
  -- Get grand total first
  SELECT COALESCE(SUM(amount), 0) INTO v_grand_total
  FROM finance_transactions
  WHERE user_id = p_user_id
    AND transaction_type = p_transaction_type
    AND transaction_date BETWEEN p_from_date AND p_to_date
    AND status = 'confirmed';

  RETURN QUERY
  SELECT 
    ft.category::TEXT,
    CASE ft.category::TEXT
      WHEN 'commission' THEN 'Provisionen'
      WHEN 'team_bonus' THEN 'Team-Bonus'
      WHEN 'rank_bonus' THEN 'Rang-Bonus'
      WHEN 'fast_start' THEN 'Fast-Start'
      WHEN 'leadership' THEN 'Leadership'
      WHEN 'other_income' THEN 'Sonstiges'
      WHEN 'product_purchase' THEN 'Produkte'
      WHEN 'marketing' THEN 'Marketing'
      WHEN 'tools' THEN 'Tools'
      WHEN 'travel' THEN 'Reisen'
      WHEN 'other_expense' THEN 'Sonstiges'
      ELSE ft.category::TEXT
    END AS category_label,
    ROUND(SUM(ft.amount), 2) AS total,
    CASE WHEN v_grand_total > 0 
      THEN ROUND(SUM(ft.amount) / v_grand_total, 4) 
      ELSE 0 
    END AS percentage,
    CASE ft.category::TEXT
      WHEN 'commission' THEN '#10B981'
      WHEN 'team_bonus' THEN '#06B6D4'
      WHEN 'rank_bonus' THEN '#8B5CF6'
      WHEN 'fast_start' THEN '#F59E0B'
      WHEN 'leadership' THEN '#EC4899'
      WHEN 'other_income' THEN '#64748B'
      WHEN 'product_purchase' THEN '#EF4444'
      WHEN 'marketing' THEN '#F97316'
      WHEN 'tools' THEN '#6366F1'
      WHEN 'travel' THEN '#14B8A6'
      WHEN 'other_expense' THEN '#94A3B8'
      ELSE '#64748B'
    END AS color
  FROM finance_transactions ft
  WHERE ft.user_id = p_user_id
    AND ft.transaction_type = p_transaction_type
    AND ft.transaction_date BETWEEN p_from_date AND p_to_date
    AND ft.status = 'confirmed'
  GROUP BY ft.category
  ORDER BY SUM(ft.amount) DESC;
END;
$$;

COMMENT ON FUNCTION public.get_category_breakdown IS 
  'Aufschlüsselung nach Kategorien mit Prozenten und Farben für Charts';

-- =============================================
-- 7. RPC: Get Recent Transactions
-- =============================================

CREATE OR REPLACE FUNCTION public.get_recent_transactions(
  p_user_id UUID,
  p_workspace_id UUID DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_transaction_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  transaction_date DATE,
  transaction_type TEXT,
  category TEXT,
  category_label TEXT,
  title TEXT,
  description TEXT,
  amount NUMERIC,
  currency TEXT,
  counterparty_name TEXT,
  document_url TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ft.id,
    ft.transaction_date,
    ft.transaction_type,
    ft.category::TEXT,
    CASE ft.category::TEXT
      WHEN 'commission' THEN 'Provisionen'
      WHEN 'team_bonus' THEN 'Team-Bonus'
      WHEN 'rank_bonus' THEN 'Rang-Bonus'
      WHEN 'fast_start' THEN 'Fast-Start'
      WHEN 'leadership' THEN 'Leadership'
      WHEN 'other_income' THEN 'Sonstiges'
      WHEN 'product_purchase' THEN 'Produkte'
      WHEN 'marketing' THEN 'Marketing'
      WHEN 'tools' THEN 'Tools'
      WHEN 'travel' THEN 'Reisen'
      WHEN 'other_expense' THEN 'Sonstiges'
      ELSE ft.category::TEXT
    END AS category_label,
    ft.title,
    ft.description,
    ft.amount,
    ft.currency,
    ft.counterparty_name,
    ft.document_url,
    ft.created_at
  FROM finance_transactions ft
  WHERE ft.user_id = p_user_id
    AND ft.status = 'confirmed'
    AND (p_transaction_type IS NULL OR ft.transaction_type = p_transaction_type)
  ORDER BY ft.transaction_date DESC, ft.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

COMMENT ON FUNCTION public.get_recent_transactions IS 
  'Letzte Transaktionen mit Pagination und optionalem Typ-Filter';

-- =============================================
-- 8. RPC: Create Transaction
-- =============================================

CREATE OR REPLACE FUNCTION public.create_finance_transaction(
  p_user_id UUID,
  p_workspace_id UUID DEFAULT NULL,
  p_amount NUMERIC DEFAULT 0,
  p_transaction_type TEXT DEFAULT 'income',
  p_category TEXT DEFAULT 'commission',
  p_title TEXT DEFAULT 'Transaktion',
  p_transaction_date DATE DEFAULT CURRENT_DATE,
  p_description TEXT DEFAULT NULL,
  p_counterparty_name TEXT DEFAULT NULL,
  p_vat_amount NUMERIC DEFAULT 0,
  p_document_url TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'manual'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO finance_transactions (
    user_id, workspace_id, amount, transaction_type, category,
    title, description, counterparty_name, transaction_date,
    period_month, period_year, vat_amount, document_url, source
  )
  VALUES (
    p_user_id, p_workspace_id, p_amount, p_transaction_type, p_category::transaction_category,
    p_title, p_description, p_counterparty_name, p_transaction_date,
    EXTRACT(MONTH FROM p_transaction_date), EXTRACT(YEAR FROM p_transaction_date),
    p_vat_amount, p_document_url, p_source
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.create_finance_transaction IS 
  'Erstellt eine neue Transaktion (Einnahme oder Ausgabe)';

-- =============================================
-- 9. RPC: Set Monthly Goal
-- =============================================

CREATE OR REPLACE FUNCTION public.set_monthly_goal(
  p_user_id UUID,
  p_workspace_id UUID DEFAULT NULL,
  p_target_amount NUMERIC DEFAULT 5000,
  p_month INTEGER DEFAULT EXTRACT(MONTH FROM CURRENT_DATE)::INTEGER,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO finance_goals (
    user_id, workspace_id, goal_type, target_amount,
    period_month, period_year
  )
  VALUES (
    p_user_id, p_workspace_id, 'monthly_revenue', p_target_amount,
    p_month, p_year
  )
  ON CONFLICT (user_id, goal_type, period_year, period_month) DO UPDATE SET
    target_amount = EXCLUDED.target_amount,
    is_active = true,
    updated_at = NOW()
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.set_monthly_goal IS 
  'Setzt oder aktualisiert das Monatsumsatzziel';

-- =============================================
-- 10. RLS POLICIES
-- =============================================

ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own transactions" ON finance_transactions;
CREATE POLICY "Users manage own transactions" ON finance_transactions
  FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own goals" ON finance_goals;
CREATE POLICY "Users manage own goals" ON finance_goals
  FOR ALL USING (user_id = auth.uid());

-- =============================================
-- 11. GRANTS
-- =============================================

GRANT ALL ON finance_transactions TO authenticated;
GRANT ALL ON finance_goals TO authenticated;
GRANT EXECUTE ON FUNCTION get_finance_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_monthly_revenue_data TO authenticated;
GRANT EXECUTE ON FUNCTION get_category_breakdown TO authenticated;
GRANT EXECUTE ON FUNCTION get_recent_transactions TO authenticated;
GRANT EXECUTE ON FUNCTION create_finance_transaction TO authenticated;
GRANT EXECUTE ON FUNCTION set_monthly_goal TO authenticated;

-- =============================================
-- 12. UPDATED_AT TRIGGER
-- =============================================

CREATE OR REPLACE FUNCTION update_finance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_finance_transactions_updated ON finance_transactions;
CREATE TRIGGER trigger_finance_transactions_updated
  BEFORE UPDATE ON finance_transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_finance_updated_at();

DROP TRIGGER IF EXISTS trigger_finance_goals_updated ON finance_goals;
CREATE TRIGGER trigger_finance_goals_updated
  BEFORE UPDATE ON finance_goals
  FOR EACH ROW
  EXECUTE FUNCTION update_finance_updated_at();

-- =============================================
-- 13. SEED TEST DATA (für Development)
-- =============================================

-- Beispiel-Transaktionen zum Testen (auskommentiert)
-- Führe in SQL-Editor aus um Testdaten zu erstellen:

/*
DO $$
DECLARE
  v_user_id UUID := auth.uid();
  v_categories TEXT[] := ARRAY['commission', 'team_bonus', 'rank_bonus', 'fast_start'];
  v_expense_cats TEXT[] := ARRAY['product_purchase', 'marketing', 'tools'];
BEGIN
  -- Letzte 6 Monate Einnahmen
  FOR i IN 1..30 LOOP
    INSERT INTO finance_transactions (
      user_id, amount, transaction_type, category, title, transaction_date
    )
    VALUES (
      v_user_id,
      (random() * 500 + 50)::NUMERIC(10,2),
      'income',
      v_categories[1 + floor(random() * 4)::INT]::transaction_category,
      'Provision #' || i,
      CURRENT_DATE - (random() * 180)::INT
    );
  END LOOP;
  
  -- Einige Ausgaben
  FOR i IN 1..10 LOOP
    INSERT INTO finance_transactions (
      user_id, amount, transaction_type, category, title, transaction_date
    )
    VALUES (
      v_user_id,
      (random() * 200 + 20)::NUMERIC(10,2),
      'expense',
      v_expense_cats[1 + floor(random() * 3)::INT]::transaction_category,
      'Ausgabe #' || i,
      CURRENT_DATE - (random() * 180)::INT
    );
  END LOOP;
  
  -- Monatsziel setzen
  INSERT INTO finance_goals (user_id, goal_type, target_amount, period_month, period_year)
  VALUES (v_user_id, 'monthly_revenue', 5000, EXTRACT(MONTH FROM CURRENT_DATE), EXTRACT(YEAR FROM CURRENT_DATE))
  ON CONFLICT DO NOTHING;
END $$;
*/

-- =============================================
-- MIGRATION COMPLETE
-- =============================================

SELECT 'Migration 010_finance_system.sql erfolgreich ausgeführt' AS status;


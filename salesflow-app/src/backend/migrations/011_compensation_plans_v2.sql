-- =============================================
-- MIGRATION 011: Compensation Plans & Goal Engine (v2)
-- =============================================
-- FIXED: Removed workspaces reference (table doesn't exist)
-- =============================================

-- =============================================
-- 1. USER COMPANY SELECTION
-- =============================================

CREATE TABLE IF NOT EXISTS public.user_company_selections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Firma
  company_id TEXT NOT NULL,
  company_name TEXT NOT NULL,
  region TEXT DEFAULT 'DE',
  
  -- Aktiv?
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(user_id, company_id)
);

COMMENT ON TABLE public.user_company_selections IS 
  'Welche MLM-Firma nutzt der User? Kann mehrere haben, eine ist aktiv.';

CREATE INDEX IF NOT EXISTS idx_user_company_user ON user_company_selections(user_id);
CREATE INDEX IF NOT EXISTS idx_user_company_active ON user_company_selections(is_active) WHERE is_active = true;

-- =============================================
-- 2. USER GOALS
-- =============================================

CREATE TABLE IF NOT EXISTS public.user_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Firma-Bezug
  company_id TEXT NOT NULL,
  
  -- Ziel-Typ
  goal_type TEXT NOT NULL CHECK (goal_type IN ('income', 'rank')),
  
  -- Bei goal_type = 'income'
  target_monthly_income NUMERIC(12,2),
  
  -- Bei goal_type = 'rank'
  target_rank_id TEXT,
  target_rank_name TEXT,
  
  -- Zeitraum
  timeframe_months INTEGER NOT NULL CHECK (timeframe_months > 0),
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  
  -- Berechnete Werte (aus Goal Engine)
  calculated_group_volume NUMERIC(12,2),
  calculated_customers INTEGER,
  calculated_partners INTEGER,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'paused', 'cancelled')),
  achieved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.user_goals IS 
  'Einkommensziele oder Rang-Ziele des Users pro Firma';

CREATE INDEX IF NOT EXISTS idx_user_goals_user ON user_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_company ON user_goals(company_id);
CREATE INDEX IF NOT EXISTS idx_user_goals_active ON user_goals(status) WHERE status = 'active';

-- =============================================
-- 3. USER DAILY FLOW TARGETS
-- =============================================

CREATE TABLE IF NOT EXISTS public.user_daily_flow_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Bezug
  goal_id UUID REFERENCES user_goals(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL,
  
  -- Wochen-Ziele
  weekly_new_customers NUMERIC(10,2) NOT NULL DEFAULT 0,
  weekly_new_partners NUMERIC(10,2) NOT NULL DEFAULT 0,
  weekly_new_contacts NUMERIC(10,2) NOT NULL DEFAULT 0,
  weekly_followups NUMERIC(10,2) NOT NULL DEFAULT 0,
  weekly_reactivations NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  -- Tages-Ziele
  daily_new_contacts NUMERIC(10,2) NOT NULL DEFAULT 0,
  daily_followups NUMERIC(10,2) NOT NULL DEFAULT 0,
  daily_reactivations NUMERIC(10,2) NOT NULL DEFAULT 0,
  
  -- Konfiguration
  config JSONB DEFAULT '{
    "working_days_per_week": 5,
    "contact_to_customer_rate": 0.2,
    "contact_to_partner_rate": 0.05,
    "followups_per_customer": 3,
    "followups_per_partner": 5,
    "reactivation_share": 0.2
  }'::JSONB,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  UNIQUE(user_id, company_id)
);

COMMENT ON TABLE public.user_daily_flow_targets IS 
  'Aus dem Ziel berechnete tägliche/wöchentliche Aktivitäts-Targets';

-- =============================================
-- 4. COMPENSATION PLAN CACHE
-- =============================================

CREATE TABLE IF NOT EXISTS public.compensation_plan_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  region TEXT DEFAULT 'DE',
  
  plan_type TEXT CHECK (plan_type IN ('unilevel', 'binary', 'matrix', 'hybrid')),
  unit_label TEXT DEFAULT 'Punkte',
  unit_code TEXT DEFAULT 'pv',
  currency TEXT DEFAULT 'EUR',
  
  avg_volume_per_customer NUMERIC(10,2) DEFAULT 60,
  avg_volume_per_partner NUMERIC(10,2) DEFAULT 100,
  
  ranks JSONB NOT NULL DEFAULT '[]'::JSONB,
  
  version INTEGER DEFAULT 1,
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  source_url TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- =============================================
-- 5. RPC: Upsert User Goal
-- =============================================

CREATE OR REPLACE FUNCTION public.upsert_user_goal(
  p_user_id UUID,
  p_company_id TEXT,
  p_goal_type TEXT,
  p_target_monthly_income NUMERIC DEFAULT NULL,
  p_target_rank_id TEXT DEFAULT NULL,
  p_target_rank_name TEXT DEFAULT NULL,
  p_timeframe_months INTEGER DEFAULT 6,
  p_calculated_group_volume NUMERIC DEFAULT NULL,
  p_calculated_customers INTEGER DEFAULT NULL,
  p_calculated_partners INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_end_date DATE;
BEGIN
  -- Calculate end date
  v_end_date := CURRENT_DATE + (p_timeframe_months || ' months')::INTERVAL;
  
  -- Deactivate existing goals for this company
  UPDATE user_goals
  SET status = 'cancelled', updated_at = NOW()
  WHERE user_id = p_user_id 
    AND company_id = p_company_id 
    AND status = 'active';

  -- Insert new goal
  INSERT INTO user_goals (
    user_id, company_id, goal_type,
    target_monthly_income, target_rank_id, target_rank_name,
    timeframe_months, end_date,
    calculated_group_volume, calculated_customers, calculated_partners
  )
  VALUES (
    p_user_id, p_company_id, p_goal_type,
    p_target_monthly_income, p_target_rank_id, p_target_rank_name,
    p_timeframe_months, v_end_date,
    p_calculated_group_volume, p_calculated_customers, p_calculated_partners
  )
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- =============================================
-- 6. RPC: Upsert Daily Flow Targets
-- =============================================

CREATE OR REPLACE FUNCTION public.upsert_daily_flow_targets(
  p_user_id UUID,
  p_goal_id UUID,
  p_company_id TEXT,
  p_weekly_new_customers NUMERIC,
  p_weekly_new_partners NUMERIC,
  p_weekly_new_contacts NUMERIC,
  p_weekly_followups NUMERIC,
  p_weekly_reactivations NUMERIC,
  p_daily_new_contacts NUMERIC,
  p_daily_followups NUMERIC,
  p_daily_reactivations NUMERIC,
  p_config JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO user_daily_flow_targets (
    user_id, goal_id, company_id,
    weekly_new_customers, weekly_new_partners, weekly_new_contacts,
    weekly_followups, weekly_reactivations,
    daily_new_contacts, daily_followups, daily_reactivations,
    config
  )
  VALUES (
    p_user_id, p_goal_id, p_company_id,
    p_weekly_new_customers, p_weekly_new_partners, p_weekly_new_contacts,
    p_weekly_followups, p_weekly_reactivations,
    p_daily_new_contacts, p_daily_followups, p_daily_reactivations,
    COALESCE(p_config, '{}'::JSONB)
  )
  ON CONFLICT (user_id, company_id) DO UPDATE SET
    goal_id = EXCLUDED.goal_id,
    weekly_new_customers = EXCLUDED.weekly_new_customers,
    weekly_new_partners = EXCLUDED.weekly_new_partners,
    weekly_new_contacts = EXCLUDED.weekly_new_contacts,
    weekly_followups = EXCLUDED.weekly_followups,
    weekly_reactivations = EXCLUDED.weekly_reactivations,
    daily_new_contacts = EXCLUDED.daily_new_contacts,
    daily_followups = EXCLUDED.daily_followups,
    daily_reactivations = EXCLUDED.daily_reactivations,
    config = COALESCE(EXCLUDED.config, user_daily_flow_targets.config),
    is_active = true,
    updated_at = NOW()
  RETURNING id INTO v_id;
  
  RETURN v_id;
END;
$$;

-- =============================================
-- 7. RPC: Get User Daily Targets
-- =============================================

CREATE OR REPLACE FUNCTION public.get_user_daily_targets(
  p_user_id UUID
)
RETURNS TABLE (
  company_id TEXT,
  goal_type TEXT,
  target_monthly_income NUMERIC,
  target_rank_name TEXT,
  timeframe_months INTEGER,
  days_remaining INTEGER,
  weekly_new_contacts NUMERIC,
  weekly_followups NUMERIC,
  daily_new_contacts NUMERIC,
  daily_followups NUMERIC,
  daily_reactivations NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.company_id,
    g.goal_type,
    g.target_monthly_income,
    g.target_rank_name,
    g.timeframe_months,
    GREATEST(0, (g.end_date - CURRENT_DATE)::INTEGER) AS days_remaining,
    t.weekly_new_contacts,
    t.weekly_followups,
    t.daily_new_contacts,
    t.daily_followups,
    t.daily_reactivations
  FROM user_daily_flow_targets t
  LEFT JOIN user_goals g ON g.id = t.goal_id
  WHERE t.user_id = p_user_id
    AND t.is_active = true;
END;
$$;

-- =============================================
-- 8. RPC: Get Active Goal Summary
-- =============================================

CREATE OR REPLACE FUNCTION public.get_active_goal_summary(
  p_user_id UUID,
  p_company_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  goal_id UUID,
  company_id TEXT,
  goal_type TEXT,
  target_monthly_income NUMERIC,
  target_rank_id TEXT,
  target_rank_name TEXT,
  timeframe_months INTEGER,
  start_date DATE,
  end_date DATE,
  days_remaining INTEGER,
  progress_percent NUMERIC,
  calculated_group_volume NUMERIC,
  calculated_customers INTEGER,
  calculated_partners INTEGER,
  daily_new_contacts NUMERIC,
  daily_followups NUMERIC,
  daily_reactivations NUMERIC
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    g.id AS goal_id,
    g.company_id,
    g.goal_type,
    g.target_monthly_income,
    g.target_rank_id,
    g.target_rank_name,
    g.timeframe_months,
    g.start_date,
    g.end_date,
    GREATEST(0, (g.end_date - CURRENT_DATE)::INTEGER) AS days_remaining,
    CASE 
      WHEN g.end_date <= CURRENT_DATE THEN 100.0
      WHEN g.end_date IS NULL THEN 0.0
      ELSE ROUND(
        ((CURRENT_DATE - g.start_date)::NUMERIC / 
         NULLIF((g.end_date - g.start_date)::NUMERIC, 0)) * 100, 1
      )
    END AS progress_percent,
    g.calculated_group_volume,
    g.calculated_customers,
    g.calculated_partners,
    COALESCE(t.daily_new_contacts, 0) AS daily_new_contacts,
    COALESCE(t.daily_followups, 0) AS daily_followups,
    COALESCE(t.daily_reactivations, 0) AS daily_reactivations
  FROM user_goals g
  LEFT JOIN user_daily_flow_targets t ON t.goal_id = g.id AND t.is_active = true
  WHERE g.user_id = p_user_id
    AND g.status = 'active'
    AND (p_company_id IS NULL OR g.company_id = p_company_id);
END;
$$;

-- =============================================
-- 9. RLS POLICIES
-- =============================================

ALTER TABLE user_company_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_daily_flow_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE compensation_plan_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own company selections" ON user_company_selections;
CREATE POLICY "Users manage own company selections" ON user_company_selections
  FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own goals" ON user_goals;
CREATE POLICY "Users manage own goals" ON user_goals
  FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own targets" ON user_daily_flow_targets;
CREATE POLICY "Users manage own targets" ON user_daily_flow_targets
  FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Everyone can read plans" ON compensation_plan_cache;
CREATE POLICY "Everyone can read plans" ON compensation_plan_cache
  FOR SELECT USING (true);

-- =============================================
-- 10. GRANTS
-- =============================================

GRANT ALL ON user_company_selections TO authenticated;
GRANT ALL ON user_goals TO authenticated;
GRANT ALL ON user_daily_flow_targets TO authenticated;
GRANT SELECT ON compensation_plan_cache TO authenticated;

GRANT EXECUTE ON FUNCTION upsert_user_goal TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_daily_flow_targets TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_daily_targets TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_goal_summary TO authenticated;

-- =============================================
-- 11. SEED DATA
-- =============================================

INSERT INTO compensation_plan_cache (company_id, company_name, region, plan_type, unit_label, unit_code, avg_volume_per_customer, avg_volume_per_partner, ranks)
VALUES 
  ('zinzino', 'Zinzino', 'DE', 'unilevel', 'Credits', 'credits', 60, 100, '[
    {"id": "starter", "name": "Starter", "order": 0, "requirements": {"min_personal_volume": 0}, "earning_estimate": {"avg_monthly_income": 0}},
    {"id": "builder", "name": "Builder", "order": 1, "requirements": {"min_personal_volume": 100, "min_group_volume": 500}, "earning_estimate": {"avg_monthly_income": 100}},
    {"id": "team_leader", "name": "Team Leader", "order": 2, "requirements": {"min_personal_volume": 200, "min_group_volume": 2000}, "earning_estimate": {"avg_monthly_income": 400}},
    {"id": "senior_leader", "name": "Senior Leader", "order": 3, "requirements": {"min_personal_volume": 200, "min_group_volume": 4000}, "earning_estimate": {"avg_monthly_income": 800}},
    {"id": "executive", "name": "Executive", "order": 4, "requirements": {"min_personal_volume": 200, "min_group_volume": 8000}, "earning_estimate": {"avg_monthly_income": 1500}},
    {"id": "elite", "name": "Elite", "order": 5, "requirements": {"min_personal_volume": 200, "min_group_volume": 15000}, "earning_estimate": {"avg_monthly_income": 3000}},
    {"id": "ambassador", "name": "Ambassador", "order": 6, "requirements": {"min_personal_volume": 200, "min_group_volume": 30000}, "earning_estimate": {"avg_monthly_income": 6000}}
  ]'::JSONB),
  
  ('pm-international', 'PM-International', 'DE', 'unilevel', 'Punkte', 'pv', 80, 150, '[
    {"id": "berater", "name": "Berater", "order": 0, "requirements": {"min_personal_volume": 0}, "earning_estimate": {"avg_monthly_income": 0}},
    {"id": "supervisor", "name": "Supervisor", "order": 1, "requirements": {"min_personal_volume": 100, "min_group_volume": 1000}, "earning_estimate": {"avg_monthly_income": 200}},
    {"id": "team_manager", "name": "Team Manager", "order": 2, "requirements": {"min_personal_volume": 100, "min_group_volume": 4000}, "earning_estimate": {"avg_monthly_income": 600}},
    {"id": "executive_manager", "name": "Executive Manager", "order": 3, "requirements": {"min_personal_volume": 100, "min_group_volume": 10000}, "earning_estimate": {"avg_monthly_income": 1500}},
    {"id": "vp", "name": "Vice President", "order": 4, "requirements": {"min_personal_volume": 100, "min_group_volume": 25000}, "earning_estimate": {"avg_monthly_income": 4000}},
    {"id": "president", "name": "President", "order": 5, "requirements": {"min_personal_volume": 100, "min_group_volume": 50000}, "earning_estimate": {"avg_monthly_income": 10000}}
  ]'::JSONB),
  
  ('lr-health', 'LR Health & Beauty', 'DE', 'unilevel', 'PV', 'pv', 50, 120, '[
    {"id": "partner", "name": "Partner", "order": 0, "requirements": {"min_personal_volume": 0}, "earning_estimate": {"avg_monthly_income": 0}},
    {"id": "junior_manager", "name": "Junior Manager", "order": 1, "requirements": {"min_personal_volume": 100, "min_group_volume": 4000}, "earning_estimate": {"avg_monthly_income": 250}},
    {"id": "manager", "name": "Manager", "order": 2, "requirements": {"min_personal_volume": 100, "min_group_volume": 8000}, "earning_estimate": {"avg_monthly_income": 500}},
    {"id": "team_leader", "name": "Team Leader", "order": 3, "requirements": {"min_personal_volume": 100, "min_group_volume": 16000}, "earning_estimate": {"avg_monthly_income": 1250}},
    {"id": "executive", "name": "Executive", "order": 4, "requirements": {"min_personal_volume": 100, "min_group_volume": 25000}, "earning_estimate": {"avg_monthly_income": 2500}},
    {"id": "top_executive", "name": "Top Executive", "order": 5, "requirements": {"min_personal_volume": 100, "min_group_volume": 40000}, "earning_estimate": {"avg_monthly_income": 5000}}
  ]'::JSONB)
ON CONFLICT (company_id) DO UPDATE SET
  ranks = EXCLUDED.ranks,
  updated_at = NOW();

-- =============================================
-- MIGRATION COMPLETE
-- =============================================


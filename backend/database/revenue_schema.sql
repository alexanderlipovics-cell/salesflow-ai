-- ============================================================================
-- Sales Flow AI - Revenue Intelligence System Schema
-- ============================================================================
-- Deal Value Prediction, Close Probability, Revenue Forecasting,
-- Churn Risk Detection, Expansion Opportunities
-- ============================================================================

-- ============================================================================
-- STEP 1: Extend leads table with financial data
-- ============================================================================

-- Add financial columns to leads table
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deal_value DECIMAL(12,2) DEFAULT 0.00;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'EUR';
ALTER TABLE leads ADD COLUMN IF NOT EXISTS expected_close_date DATE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS win_probability INTEGER DEFAULT 0 CHECK (win_probability >= 0 AND win_probability <= 100);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deal_stage TEXT CHECK (deal_stage IN ('discovery', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_activity_date DATE;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS days_in_stage INTEGER DEFAULT 0;

-- ============================================================================
-- STEP 2: Create indexes for performance
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_leads_deal_value ON leads(deal_value) WHERE deal_value > 0;
CREATE INDEX IF NOT EXISTS idx_leads_expected_close_date ON leads(expected_close_date) WHERE expected_close_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_win_probability ON leads(win_probability);
CREATE INDEX IF NOT EXISTS idx_leads_status_value ON leads(status, deal_value) WHERE status NOT IN ('closed_lost', 'archived');
CREATE INDEX IF NOT EXISTS idx_leads_deal_stage ON leads(deal_stage);

-- ============================================================================
-- VIEW: revenue_pipeline_summary
-- Aggregierte Pipeline-Übersicht nach Stage
-- ============================================================================

CREATE OR REPLACE VIEW revenue_pipeline_summary AS
SELECT 
  COALESCE(status, 'unknown') as stage,
  COUNT(id) as count,
  SUM(COALESCE(deal_value, 0)) as total_value,
  AVG(COALESCE(deal_value, 0)) as avg_value,
  MIN(expected_close_date) as next_closing_date,
  AVG(COALESCE(win_probability, 0)) as avg_win_probability
FROM leads
WHERE status NOT IN ('closed_lost', 'archived')
  AND deal_value > 0
GROUP BY status
ORDER BY 
  CASE status
    WHEN 'negotiation' THEN 1
    WHEN 'proposal' THEN 2
    WHEN 'qualified' THEN 3
    WHEN 'new' THEN 4
    ELSE 5
  END;

-- ============================================================================
-- VIEW: revenue_forecast_monthly
-- Monatlicher Revenue Forecast mit Weighted Pipeline
-- ============================================================================

CREATE OR REPLACE VIEW revenue_forecast_monthly AS
SELECT 
  TO_CHAR(expected_close_date, 'YYYY-MM') as month,
  COUNT(id) as deal_count,
  SUM(deal_value) as total_pipeline,
  SUM(
    deal_value * (
      CASE 
        WHEN win_probability > 0 THEN win_probability
        WHEN status = 'negotiation' THEN 80
        WHEN status = 'proposal' THEN 50
        WHEN status = 'qualified' THEN 20
        WHEN status = 'new' THEN 5
        ELSE 5 
      END
    ) / 100.0
  ) as weighted_forecast,
  AVG(deal_value) as avg_deal_size,
  AVG(
    CASE 
      WHEN win_probability > 0 THEN win_probability
      WHEN status = 'negotiation' THEN 80
      WHEN status = 'proposal' THEN 50
      WHEN status = 'qualified' THEN 20
      WHEN status = 'new' THEN 5
      ELSE 5 
    END
  ) as avg_win_probability
FROM leads
WHERE status NOT IN ('closed_won', 'closed_lost', 'archived')
  AND expected_close_date IS NOT NULL
  AND deal_value > 0
GROUP BY TO_CHAR(expected_close_date, 'YYYY-MM')
ORDER BY month;

-- ============================================================================
-- VIEW: at_risk_deals
-- High-Value Deals die Attention brauchen
-- ============================================================================

CREATE OR REPLACE VIEW at_risk_deals AS
SELECT 
  id,
  name,
  company,
  deal_value,
  status,
  expected_close_date,
  last_activity_date,
  days_in_stage,
  score,
  -- Risk Factors
  CASE 
    WHEN days_in_stage > 60 THEN 'stagnant'
    WHEN expected_close_date < CURRENT_DATE THEN 'overdue'
    WHEN (score IS NOT NULL AND score < 30 AND deal_value > 5000) THEN 'low_engagement'
    WHEN last_activity_date < CURRENT_DATE - INTERVAL '14 days' THEN 'inactive'
    ELSE 'other'
  END as primary_risk_factor,
  -- Health Score (0-100)
  GREATEST(0, LEAST(100, 
    100 
    - (CASE WHEN days_in_stage > 30 THEN (days_in_stage - 30) * 2 ELSE 0 END)
    - (CASE WHEN expected_close_date < CURRENT_DATE THEN 20 ELSE 0 END)
    - (CASE WHEN score < 30 THEN 30 ELSE 0 END)
    - (CASE WHEN last_activity_date < CURRENT_DATE - INTERVAL '7 days' THEN 15 ELSE 0 END)
  )) as health_score
FROM leads
WHERE status NOT IN ('closed_won', 'closed_lost', 'archived')
  AND deal_value >= 1000
  AND (
    days_in_stage > 60
    OR expected_close_date < CURRENT_DATE
    OR (score IS NOT NULL AND score < 30 AND deal_value > 5000)
    OR last_activity_date < CURRENT_DATE - INTERVAL '14 days'
  )
ORDER BY deal_value DESC, health_score ASC
LIMIT 50;

-- ============================================================================
-- VIEW: won_deals_summary
-- Closed Won Deals für historische Analyse
-- ============================================================================

CREATE OR REPLACE VIEW won_deals_summary AS
SELECT 
  DATE_TRUNC('month', updated_at) as month,
  COUNT(id) as deals_won,
  SUM(deal_value) as revenue,
  AVG(deal_value) as avg_deal_value,
  AVG(days_in_stage) as avg_sales_cycle
FROM leads
WHERE status = 'closed_won'
  AND deal_value > 0
GROUP BY DATE_TRUNC('month', updated_at)
ORDER BY month DESC;

-- ============================================================================
-- FUNCTION: Calculate Deal Health Score
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_deal_health(
  p_lead_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_health_score INTEGER := 100;
  v_days_in_stage INTEGER;
  v_expected_close_date DATE;
  v_score INTEGER;
  v_last_activity_date DATE;
BEGIN
  -- Get lead data
  SELECT 
    days_in_stage,
    expected_close_date,
    score,
    last_activity_date
  INTO 
    v_days_in_stage,
    v_expected_close_date,
    v_score,
    v_last_activity_date
  FROM leads
  WHERE id = p_lead_id;

  -- Stagnation penalty
  IF v_days_in_stage > 30 THEN
    v_health_score := v_health_score - ((v_days_in_stage - 30) * 2);
  END IF;

  -- Overdue penalty
  IF v_expected_close_date < CURRENT_DATE THEN
    v_health_score := v_health_score - 20;
  END IF;

  -- Low engagement penalty
  IF v_score IS NOT NULL AND v_score < 30 THEN
    v_health_score := v_health_score - 30;
  END IF;

  -- Inactivity penalty
  IF v_last_activity_date < CURRENT_DATE - INTERVAL '7 days' THEN
    v_health_score := v_health_score - 15;
  END IF;

  -- Clamp to 0-100
  v_health_score := GREATEST(0, LEAST(100, v_health_score));

  RETURN v_health_score;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- FUNCTION: Auto-update last_activity_date on interaction
-- ============================================================================

CREATE OR REPLACE FUNCTION update_lead_last_activity()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE leads
  SET last_activity_date = CURRENT_DATE
  WHERE id = NEW.lead_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on lead_interactions table (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_interactions') THEN
    DROP TRIGGER IF EXISTS trigger_update_lead_activity ON lead_interactions;
    CREATE TRIGGER trigger_update_lead_activity
      AFTER INSERT ON lead_interactions
      FOR EACH ROW
      EXECUTE FUNCTION update_lead_last_activity();
  END IF;
END $$;

-- ============================================================================
-- COMMENTS für Dokumentation
-- ============================================================================

COMMENT ON COLUMN leads.deal_value IS 'Expected or actual deal value in currency units';
COMMENT ON COLUMN leads.win_probability IS 'Estimated probability of winning this deal (0-100)';
COMMENT ON COLUMN leads.expected_close_date IS 'Expected date when this deal will close';
COMMENT ON COLUMN leads.deal_stage IS 'Current stage in the sales process';
COMMENT ON COLUMN leads.days_in_stage IS 'Number of days in current stage (for stagnation detection)';
COMMENT ON COLUMN leads.last_activity_date IS 'Date of last interaction with this lead';

COMMENT ON VIEW revenue_pipeline_summary IS 'Aggregated pipeline by stage with total and average values';
COMMENT ON VIEW revenue_forecast_monthly IS 'Monthly revenue forecast with weighted probability';
COMMENT ON VIEW at_risk_deals IS 'High-value deals that need immediate attention';
COMMENT ON VIEW won_deals_summary IS 'Historical won deals summary by month';

COMMENT ON FUNCTION calculate_deal_health(UUID) IS 'Calculate health score (0-100) for a deal based on multiple risk factors';

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Revenue Intelligence schema created successfully!';
  RAISE NOTICE '💰 Views: revenue_pipeline_summary, revenue_forecast_monthly, at_risk_deals, won_deals_summary';
  RAISE NOTICE '🔍 Indexes: 5 indexes created for performance';
  RAISE NOTICE '📊 Function: calculate_deal_health(lead_id)';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Next steps:';
  RAISE NOTICE '1. Test Views: SELECT * FROM revenue_pipeline_summary;';
  RAISE NOTICE '2. Create test data: python scripts/create_revenue_test_data.py';
  RAISE NOTICE '3. Test API: http://localhost:8000/docs → Revenue endpoints';
  RAISE NOTICE '4. Check at-risk deals: SELECT * FROM at_risk_deals;';
END $$;


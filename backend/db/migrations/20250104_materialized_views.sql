-- =====================================================================
-- Migration 20250104 - Analytics Materialized Views & Refresh Function
-- =====================================================================

-- 1) DAILY EVENTS SUMMARY ----------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_events_daily_summary AS
SELECT
  workspace_id,
  user_id,
  DATE(occurred_at) AS event_date,
  event_type,
  COUNT(*) AS event_count,
  COUNT(DISTINCT contact_id) AS unique_contacts,
  SUM(value_amount) AS total_value
FROM public.events
WHERE occurred_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY workspace_id, user_id, DATE(occurred_at), event_type;

CREATE UNIQUE INDEX IF NOT EXISTS mv_events_daily_summary_idx
  ON mv_events_daily_summary (workspace_id, user_id, event_date, event_type);

-- 2) TEMPLATE PERFORMANCE (30 DAYS) ------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_template_performance_30d AS
WITH first_msg AS (
  SELECT
    workspace_id,
    template_id,
    COUNT(DISTINCT contact_id) AS contacts_contacted
  FROM public.events
  WHERE event_type = 'first_message_sent'
    AND occurred_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
    AND template_id IS NOT NULL
  GROUP BY workspace_id, template_id
),
signups AS (
  SELECT
    workspace_id,
    template_id,
    COUNT(DISTINCT contact_id) AS contacts_signed,
    SUM(value_amount) AS total_revenue
  FROM public.events
  WHERE event_type = 'signup_completed'
    AND occurred_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
    AND template_id IS NOT NULL
  GROUP BY workspace_id, template_id
)
SELECT
  COALESCE(f.workspace_id, s.workspace_id) AS workspace_id,
  COALESCE(f.template_id, s.template_id) AS template_id,
  COALESCE(f.contacts_contacted, 0) AS contacts_contacted,
  COALESCE(s.contacts_signed, 0) AS contacts_signed,
  COALESCE(s.total_revenue, 0) AS total_revenue,
  CASE
    WHEN COALESCE(f.contacts_contacted, 0) = 0 THEN 0
    ELSE ROUND(
      COALESCE(s.contacts_signed, 0)::NUMERIC * 100.0 / f.contacts_contacted,
      2
    )
  END AS conversion_rate_percent
FROM first_msg f
FULL OUTER JOIN signups s USING (workspace_id, template_id);

CREATE UNIQUE INDEX IF NOT EXISTS mv_template_performance_30d_idx
  ON mv_template_performance_30d (workspace_id, template_id);

-- 3) USER PERFORMANCE (30 DAYS) ----------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_performance_30d AS
WITH sent AS (
  SELECT
    workspace_id,
    user_id,
    COUNT(DISTINCT contact_id) AS contacts_contacted
  FROM public.events
  WHERE event_type = 'first_message_sent'
    AND occurred_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
  GROUP BY workspace_id, user_id
),
signed AS (
  SELECT
    workspace_id,
    user_id,
    COUNT(DISTINCT contact_id) AS contacts_signed,
    SUM(value_amount) AS total_revenue
  FROM public.events
  WHERE event_type = 'signup_completed'
    AND occurred_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
  GROUP BY workspace_id, user_id
),
activity AS (
  SELECT
    workspace_id,
    user_id,
    COUNT(DISTINCT DATE(occurred_at)) AS active_days
  FROM public.events
  WHERE occurred_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
  GROUP BY workspace_id, user_id
)
SELECT
  COALESCE(s.workspace_id, si.workspace_id, a.workspace_id) AS workspace_id,
  COALESCE(s.user_id, si.user_id, a.user_id) AS user_id,
  COALESCE(s.contacts_contacted, 0) AS contacts_contacted,
  COALESCE(si.contacts_signed, 0) AS contacts_signed,
  COALESCE(si.total_revenue, 0) AS total_revenue,
  COALESCE(a.active_days, 0) AS active_days,
  CASE
    WHEN COALESCE(s.contacts_contacted, 0) = 0 THEN 0
    ELSE ROUND(
      COALESCE(si.contacts_signed, 0)::NUMERIC * 100.0 / s.contacts_contacted,
      2
    )
  END AS conversion_rate_percent
FROM sent s
FULL OUTER JOIN signed si USING (workspace_id, user_id)
FULL OUTER JOIN activity a USING (workspace_id, user_id);

CREATE UNIQUE INDEX IF NOT EXISTS mv_user_performance_30d_idx
  ON mv_user_performance_30d (workspace_id, user_id);

-- 4) REFRESH FUNCTION ---------------------------------------------------
CREATE OR REPLACE FUNCTION refresh_analytics_materialized_views()
RETURNS VOID AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_events_daily_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_template_performance_30d;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_performance_30d;
END;
$$ LANGUAGE plpgsql;

-- 5) OPTIONAL: PG_CRON SCHEDULING (manual run)
-- SELECT cron.schedule('refresh-analytics-mvs', '0 * * * *', 'SELECT refresh_analytics_materialized_views()');



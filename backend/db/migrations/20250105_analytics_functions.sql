-- =====================================================================
-- Migration 20250105 - Analytics SQL Functions
-- =====================================================================

-- Helper: start of day / week uses DATE_TRUNC (ISO week: Monday)

-- 1) TODAY OVERVIEW ----------------------------------------------------
CREATE OR REPLACE FUNCTION get_today_overview(p_workspace_id UUID)
RETURNS TABLE (
  tasks_due_today BIGINT,
  tasks_done_today BIGINT,
  leads_created_today BIGINT,
  first_messages_today BIGINT,
  signups_today BIGINT,
  revenue_today NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH bounds AS (
    SELECT
      DATE_TRUNC('day', CURRENT_TIMESTAMP) AS start_of_day,
      DATE_TRUNC('day', CURRENT_TIMESTAMP) + INTERVAL '1 day' AS end_of_day
  ),
  events_today AS (
    SELECT e.*
    FROM public.events e, bounds b
    WHERE e.workspace_id = p_workspace_id
      AND e.occurred_at >= b.start_of_day
      AND e.occurred_at < b.end_of_day
  ),
  tasks_today AS (
    SELECT t.*
    FROM public.tasks t, bounds b
    WHERE t.workspace_id = p_workspace_id
      AND t.due_at >= b.start_of_day
      AND t.due_at < b.end_of_day
  )
  SELECT
    (SELECT COUNT(*) FROM tasks_today WHERE status IN ('open','overdue'))::BIGINT,
    (SELECT COUNT(*) FROM tasks_today WHERE status = 'done' AND completed_at IS NOT NULL)::BIGINT,
    (SELECT COUNT(*) FROM events_today WHERE event_type = 'lead_created')::BIGINT,
    (SELECT COUNT(*) FROM events_today WHERE event_type = 'first_message_sent')::BIGINT,
    (SELECT COUNT(*) FROM events_today WHERE event_type = 'signup_completed')::BIGINT,
    COALESCE((
      SELECT SUM(value_amount)
      FROM events_today
      WHERE event_type = 'signup_completed'
    ), 0)::NUMERIC;
END;
$$ LANGUAGE plpgsql STABLE;

-- 2) WEEK OVERVIEW -----------------------------------------------------
CREATE OR REPLACE FUNCTION get_week_overview(p_workspace_id UUID)
RETURNS TABLE (
  leads_this_week BIGINT,
  first_messages_this_week BIGINT,
  signups_this_week BIGINT,
  revenue_this_week NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH bounds AS (
    SELECT
      DATE_TRUNC('week', CURRENT_TIMESTAMP) AS start_of_week,
      DATE_TRUNC('week', CURRENT_TIMESTAMP) + INTERVAL '7 days' AS end_of_week
  ),
  events_week AS (
    SELECT e.*
    FROM public.events e, bounds b
    WHERE e.workspace_id = p_workspace_id
      AND e.occurred_at >= b.start_of_week
      AND e.occurred_at < b.end_of_week
  )
  SELECT
    (SELECT COUNT(*) FROM events_week WHERE event_type = 'lead_created')::BIGINT,
    (SELECT COUNT(*) FROM events_week WHERE event_type = 'first_message_sent')::BIGINT,
    (SELECT COUNT(*) FROM events_week WHERE event_type = 'signup_completed')::BIGINT,
    COALESCE((
      SELECT SUM(value_amount)
      FROM events_week
      WHERE event_type = 'signup_completed'
    ), 0)::NUMERIC;
END;
$$ LANGUAGE plpgsql STABLE;

-- 3) WEEK TIMELINE -----------------------------------------------------
CREATE OR REPLACE FUNCTION get_week_timeline(p_workspace_id UUID)
RETURNS TABLE (
  day DATE,
  leads BIGINT,
  signups BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH week AS (
    SELECT DATE_TRUNC('week', CURRENT_TIMESTAMP)::DATE AS start_of_week
  ),
  dates AS (
    SELECT generate_series(
      (SELECT start_of_week FROM week),
      (SELECT start_of_week FROM week) + INTERVAL '6 days',
      INTERVAL '1 day'
    )::DATE AS day
  ),
  events_week AS (
    SELECT DATE_TRUNC('day', occurred_at)::DATE AS day, event_type
    FROM public.events, week w
    WHERE workspace_id = p_workspace_id
      AND occurred_at >= w.start_of_week
      AND occurred_at < w.start_of_week + INTERVAL '7 days'
  )
  SELECT
    d.day,
    COALESCE(SUM(CASE WHEN e.event_type = 'lead_created' THEN 1 ELSE 0 END), 0)::BIGINT,
    COALESCE(SUM(CASE WHEN e.event_type = 'signup_completed' THEN 1 ELSE 0 END), 0)::BIGINT
  FROM dates d
  LEFT JOIN events_week e ON e.day = d.day
  GROUP BY d.day
  ORDER BY d.day;
END;
$$ LANGUAGE plpgsql STABLE;

-- 4) TOP TEMPLATES -----------------------------------------------------
CREATE OR REPLACE FUNCTION get_top_templates(
  p_workspace_id UUID,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  template_id UUID,
  contacts_contacted BIGINT,
  contacts_signed BIGINT,
  total_revenue NUMERIC,
  conversion_rate_percent NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mv.template_id,
    mv.contacts_contacted,
    mv.contacts_signed,
    mv.total_revenue,
    mv.conversion_rate_percent
  FROM mv_template_performance_30d mv
  WHERE mv.workspace_id = p_workspace_id
  ORDER BY mv.conversion_rate_percent DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- 5) AVG DAYS TO SIGNUP ------------------------------------------------
CREATE OR REPLACE FUNCTION get_avg_days_to_signup(p_workspace_id UUID)
RETURNS TABLE (
  avg_days_to_signup NUMERIC,
  median_days_to_signup NUMERIC,
  contacts_with_signup BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH first_contact AS (
    SELECT contact_id, MIN(occurred_at) AS first_at
    FROM public.events
    WHERE workspace_id = p_workspace_id
      AND event_type = 'first_message_sent'
    GROUP BY contact_id
  ),
  signup AS (
    SELECT contact_id, MIN(occurred_at) AS signup_at, SUM(value_amount) AS revenue
    FROM public.events
    WHERE workspace_id = p_workspace_id
      AND event_type = 'signup_completed'
    GROUP BY contact_id
  ),
  durations AS (
    SELECT
      s.contact_id,
      EXTRACT(EPOCH FROM (s.signup_at - f.first_at)) / 86400.0 AS days_to_signup
    FROM signup s
    JOIN first_contact f USING (contact_id)
    WHERE s.signup_at > f.first_at
  )
  SELECT
    ROUND(AVG(days_to_signup)::NUMERIC, 2),
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY days_to_signup)::NUMERIC, 2),
    COUNT(*)::BIGINT
  FROM durations;
END;
$$ LANGUAGE plpgsql STABLE;

-- 6) TOP NETWORKERS ----------------------------------------------------
CREATE OR REPLACE FUNCTION get_top_networkers(
  p_workspace_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  user_id UUID,
  contacts_contacted BIGINT,
  contacts_signed BIGINT,
  total_revenue NUMERIC,
  active_days BIGINT,
  conversion_rate_percent NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mv.user_id,
    mv.contacts_contacted,
    mv.contacts_signed,
    mv.total_revenue,
    mv.active_days,
    mv.conversion_rate_percent
  FROM mv_user_performance_30d mv
  WHERE mv.workspace_id = p_workspace_id
  ORDER BY mv.conversion_rate_percent DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- 7) USERS NEEDING HELP ------------------------------------------------
CREATE OR REPLACE FUNCTION get_users_needing_help(
  p_workspace_id UUID,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  user_id UUID,
  contacts_contacted BIGINT,
  contacts_signed BIGINT,
  active_days BIGINT,
  conversion_rate_percent NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    mv.user_id,
    mv.contacts_contacted,
    mv.contacts_signed,
    mv.active_days,
    mv.conversion_rate_percent
  FROM mv_user_performance_30d mv
  WHERE mv.workspace_id = p_workspace_id
    AND mv.contacts_contacted >= 10
  ORDER BY mv.conversion_rate_percent ASC, mv.contacts_contacted DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;

-- 8) TASKS DUE TODAY ---------------------------------------------------
CREATE OR REPLACE FUNCTION get_tasks_due_today(
  p_workspace_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  contact_id UUID,
  contact_name TEXT,
  contact_status contact_status_enum,
  task_type task_type_enum,
  task_priority task_priority_enum,
  due_at TIMESTAMPTZ,
  task_status task_status_enum,
  assigned_user_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.contact_id,
    c.full_name,
    c.status,
    t.type,
    t.priority,
    t.due_at,
    t.status,
    t.assigned_user_id
  FROM public.tasks t
  JOIN public.contacts c ON c.id = t.contact_id
  WHERE t.workspace_id = p_workspace_id
    AND t.status IN ('open', 'in_progress', 'overdue')
    AND t.is_archived = FALSE
    AND t.due_at <= DATE_TRUNC('day', CURRENT_TIMESTAMP) + INTERVAL '1 day'
    AND (p_user_id IS NULL OR t.assigned_user_id = p_user_id)
  ORDER BY t.priority DESC, t.due_at ASC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql STABLE;



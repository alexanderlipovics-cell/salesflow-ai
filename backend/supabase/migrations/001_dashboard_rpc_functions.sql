-- ============================================================================
-- SALES FLOW AI - DASHBOARD ANALYTICS RPC FUNCTIONS
-- ============================================================================
-- Version: 1.0.0
-- Date: 2025-11-30
-- Description: Production-ready RPC functions for dashboard analytics
-- ============================================================================

-- ============================================================================
-- FUNCTION 1: dashboard_today_overview
-- Purpose: Kacheln für HEUTE (Tasks, Leads, Signups, Revenue)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.dashboard_today_overview(
  p_workspace_id uuid
)
RETURNS TABLE (
  tasks_due_today          integer,
  tasks_done_today         integer,
  leads_created_today      integer,
  first_messages_today     integer,
  signups_today            integer,
  revenue_today            numeric(12,2)
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
WITH today AS (
  SELECT
    date_trunc('day', now() AT TIME ZONE 'UTC') AS start_of_day,
    date_trunc('day', now() AT TIME ZONE 'UTC') + interval '1 day' AS end_of_day
),
events_today AS (
  SELECT e.*
  FROM public.events e, today t
  WHERE e.workspace_id = p_workspace_id
    AND e.occurred_at >= t.start_of_day
    AND e.occurred_at < t.end_of_day
),
tasks_today AS (
  SELECT t2.*
  FROM public.tasks t2, today t
  WHERE t2.workspace_id = p_workspace_id
    AND t2.due_at >= t.start_of_day
    AND t2.due_at < t.end_of_day
)
SELECT
  (SELECT count(*)::integer FROM tasks_today WHERE status = 'open') AS tasks_due_today,
  (SELECT count(*)::integer FROM tasks_today WHERE status = 'done') AS tasks_done_today,
  (SELECT count(*)::integer FROM events_today WHERE event_type = 'lead_created') AS leads_created_today,
  (SELECT count(*)::integer FROM events_today WHERE event_type = 'first_message_sent') AS first_messages_today,
  (SELECT count(*)::integer FROM events_today WHERE event_type = 'signup_completed') AS signups_today,
  COALESCE((
    SELECT sum(value_amount)
    FROM events_today
    WHERE event_type = 'signup_completed'
  ), 0)::numeric(12,2) AS revenue_today;
$$;

COMMENT ON FUNCTION dashboard_today_overview IS 'Today Dashboard: Tasks, Leads, Signups, Revenue for current day';

-- ============================================================================
-- FUNCTION 2: dashboard_today_tasks
-- Purpose: Liste "Heute fällige Follow-ups"
-- ============================================================================

CREATE OR REPLACE FUNCTION public.dashboard_today_tasks(
  p_workspace_id uuid,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  task_id            uuid,
  contact_id         uuid,
  contact_name       text,
  contact_status     text,
  contact_lead_score integer,
  task_type          text,
  task_due_at        timestamptz,
  task_status        text,
  assigned_user_id   uuid,
  priority           text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT
  t.id AS task_id,
  t.contact_id,
  c.full_name AS contact_name,
  c.status AS contact_status,
  c.lead_score AS contact_lead_score,
  t.type AS task_type,
  t.due_at AS task_due_at,
  t.status AS task_status,
  t.assigned_user_id,
  COALESCE(t.priority, 'normal') AS priority
FROM public.tasks t
JOIN public.contacts c ON c.id = t.contact_id
WHERE
  t.workspace_id = p_workspace_id
  AND t.status = 'open'
  AND t.due_at <= date_trunc('day', now() AT TIME ZONE 'UTC') + interval '1 day'
ORDER BY 
  CASE WHEN t.priority = 'urgent' THEN 1
       WHEN t.priority = 'high' THEN 2
       WHEN t.priority = 'normal' THEN 3
       ELSE 4 END,
  t.due_at ASC,
  c.lead_score DESC
LIMIT p_limit;
$$;

COMMENT ON FUNCTION dashboard_today_tasks IS 'Today Tasks: Open tasks due today, sorted by priority & lead score';

-- ============================================================================
-- FUNCTION 3: dashboard_week_overview
-- Purpose: Wochen-Dashboard (Leads, Signups, Revenue)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.dashboard_week_overview(
  p_workspace_id uuid
)
RETURNS TABLE (
  leads_this_week          integer,
  first_messages_this_week integer,
  signups_this_week        integer,
  revenue_this_week        numeric(12,2)
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
WITH week AS (
  SELECT
    date_trunc('week', now() AT TIME ZONE 'UTC') AS start_of_week,
    date_trunc('week', now() AT TIME ZONE 'UTC') + interval '7 days' AS end_of_week
),
events_week AS (
  SELECT e.*
  FROM public.events e, week w
  WHERE e.workspace_id = p_workspace_id
    AND e.occurred_at >= w.start_of_week
    AND e.occurred_at < w.end_of_week
)
SELECT
  (SELECT count(*)::integer FROM events_week WHERE event_type = 'lead_created') AS leads_this_week,
  (SELECT count(*)::integer FROM events_week WHERE event_type = 'first_message_sent') AS first_messages_this_week,
  (SELECT count(*)::integer FROM events_week WHERE event_type = 'signup_completed') AS signups_this_week,
  COALESCE((
    SELECT sum(value_amount)
    FROM events_week
    WHERE event_type = 'signup_completed'
  ), 0)::numeric(12,2) AS revenue_this_week;
$$;

COMMENT ON FUNCTION dashboard_week_overview IS 'Week Dashboard: Leads, Messages, Signups, Revenue for current week';

-- ============================================================================
-- FUNCTION 4: dashboard_week_timeseries
-- Purpose: Zeitreihe "Leads & Signups pro Tag diese Woche"
-- ============================================================================

CREATE OR REPLACE FUNCTION public.dashboard_week_timeseries(
  p_workspace_id uuid
)
RETURNS TABLE (
  day             date,
  leads           integer,
  signups         integer,
  first_messages  integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
WITH week AS (
  SELECT date_trunc('week', now() AT TIME ZONE 'UTC') AS start_of_week
),
dates AS (
  SELECT
    generate_series(
      (SELECT start_of_week FROM week),
      (SELECT start_of_week FROM week) + interval '6 days',
      interval '1 day'
    )::date AS day
),
events_week AS (
  SELECT
    date_trunc('day', occurred_at AT TIME ZONE 'UTC')::date AS day,
    event_type
  FROM public.events, week w
  WHERE workspace_id = p_workspace_id
    AND occurred_at >= w.start_of_week
    AND occurred_at < w.start_of_week + interval '7 days'
)
SELECT
  d.day,
  COALESCE(sum(CASE WHEN e.event_type = 'lead_created' THEN 1 ELSE 0 END), 0)::integer AS leads,
  COALESCE(sum(CASE WHEN e.event_type = 'signup_completed' THEN 1 ELSE 0 END), 0)::integer AS signups,
  COALESCE(sum(CASE WHEN e.event_type = 'first_message_sent' THEN 1 ELSE 0 END), 0)::integer AS first_messages
FROM dates d
LEFT JOIN events_week e ON e.day = d.day
GROUP BY d.day
ORDER BY d.day;
$$;

COMMENT ON FUNCTION dashboard_week_timeseries IS 'Week Timeseries: Daily breakdown of leads, signups, messages';

-- ============================================================================
-- FUNCTION 5: dashboard_top_templates
-- Purpose: Top Templates nach Conversion-Rate (last X days)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.dashboard_top_templates(
  p_workspace_id uuid,
  p_days_back integer DEFAULT 30,
  p_limit integer DEFAULT 20
)
RETURNS TABLE (
  template_id              uuid,
  title                    text,
  purpose                  text,
  channel                  text,
  contacts_contacted       integer,
  contacts_signed          integer,
  conversion_rate_percent  numeric(5,2)
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
WITH first_msg AS (
  SELECT
    template_id,
    count(DISTINCT contact_id) AS contacts_contacted
  FROM public.events
  WHERE workspace_id = p_workspace_id
    AND event_type = 'first_message_sent'
    AND template_id IS NOT NULL
    AND occurred_at >= now() - (p_days_back || ' days')::interval
  GROUP BY template_id
),
signups AS (
  SELECT
    template_id,
    count(DISTINCT contact_id) AS contacts_signed
  FROM public.events
  WHERE workspace_id = p_workspace_id
    AND event_type = 'signup_completed'
    AND template_id IS NOT NULL
    AND occurred_at >= now() - (p_days_back || ' days')::interval
  GROUP BY template_id
)
SELECT
  mt.id AS template_id,
  mt.title,
  mt.purpose,
  mt.channel,
  COALESCE(f.contacts_contacted, 0)::integer AS contacts_contacted,
  COALESCE(s.contacts_signed, 0)::integer AS contacts_signed,
  CASE 
    WHEN COALESCE(f.contacts_contacted, 0) = 0 THEN 0
    ELSE ROUND(
      COALESCE(s.contacts_signed, 0)::numeric * 100.0 / f.contacts_contacted,
      2
    )
  END AS conversion_rate_percent
FROM public.message_templates mt
LEFT JOIN first_msg f ON f.template_id = mt.id
LEFT JOIN signups s ON s.template_id = mt.id
WHERE
  (mt.workspace_id = p_workspace_id OR mt.workspace_id IS NULL)
  AND mt.status = 'active'
ORDER BY conversion_rate_percent DESC, contacts_signed DESC
LIMIT p_limit;
$$;

COMMENT ON FUNCTION dashboard_top_templates IS 'Top Templates: Conversion rate (first message → signup) for last X days';

-- ============================================================================
-- FUNCTION 6: dashboard_funnel_stats
-- Purpose: Durchschnittliche & mediane Tage Erstkontakt → Signup
-- ============================================================================

CREATE OR REPLACE FUNCTION public.dashboard_funnel_stats(
  p_workspace_id uuid
)
RETURNS TABLE (
  avg_days_to_signup      numeric(10,2),
  median_days_to_signup   numeric(10,2),
  min_days_to_signup      numeric(10,2),
  max_days_to_signup      numeric(10,2),
  contacts_with_signup    integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
WITH first_contact AS (
  SELECT
    contact_id,
    min(occurred_at) AS first_at
  FROM public.events
  WHERE workspace_id = p_workspace_id
    AND event_type = 'first_message_sent'
  GROUP BY contact_id
),
signup AS (
  SELECT
    contact_id,
    min(occurred_at) AS signup_at
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
  WHERE s.signup_at > f.first_at  -- Sanity check
)
SELECT
  ROUND(avg(days_to_signup)::numeric, 2) AS avg_days_to_signup,
  ROUND(percentile_cont(0.5) WITHIN GROUP (ORDER BY days_to_signup), 2) AS median_days_to_signup,
  ROUND(min(days_to_signup)::numeric, 2) AS min_days_to_signup,
  ROUND(max(days_to_signup)::numeric, 2) AS max_days_to_signup,
  count(*)::integer AS contacts_with_signup
FROM durations;
$$;

COMMENT ON FUNCTION dashboard_funnel_stats IS 'Funnel Stats: Time from first contact to signup (avg, median, min, max)';

-- ============================================================================
-- FUNCTION 7: dashboard_top_networkers
-- Purpose: Top Reps nach Conversion-Rate (Squad Coach)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.dashboard_top_networkers(
  p_workspace_id uuid,
  p_days_back integer DEFAULT 30,
  p_limit integer DEFAULT 5
)
RETURNS TABLE (
  user_id                  uuid,
  email                    text,
  name                     text,
  contacts_contacted       integer,
  contacts_signed          integer,
  conversion_rate_percent  numeric(5,2),
  active_days              integer,
  current_streak           integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
WITH sent AS (
  SELECT
    user_id,
    count(DISTINCT contact_id) AS contacts_contacted
  FROM public.events
  WHERE workspace_id = p_workspace_id
    AND event_type = 'first_message_sent'
    AND occurred_at >= now() - (p_days_back || ' days')::interval
  GROUP BY user_id
),
signed AS (
  SELECT
    user_id,
    count(DISTINCT contact_id) AS contacts_signed
  FROM public.events
  WHERE workspace_id = p_workspace_id
    AND event_type = 'signup_completed'
    AND occurred_at >= now() - (p_days_back || ' days')::interval
  GROUP BY user_id
),
activity AS (
  SELECT
    user_id,
    count(DISTINCT date_trunc('day', occurred_at)) AS active_days
  FROM public.events
  WHERE workspace_id = p_workspace_id
    AND occurred_at >= now() - (p_days_back || ' days')::interval
  GROUP BY user_id
)
SELECT
  wu.user_id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email) AS name,
  COALESCE(s.contacts_contacted, 0)::integer AS contacts_contacted,
  COALESCE(si.contacts_signed, 0)::integer AS contacts_signed,
  CASE 
    WHEN COALESCE(s.contacts_contacted, 0) = 0 THEN 0
    ELSE ROUND(
      COALESCE(si.contacts_signed, 0)::numeric * 100.0 / s.contacts_contacted,
      2
    )
  END AS conversion_rate_percent,
  COALESCE(a.active_days, 0)::integer AS active_days,
  COALESCE(wu.current_streak, 0)::integer AS current_streak
FROM public.workspace_users wu
LEFT JOIN sent s ON s.user_id = wu.user_id
LEFT JOIN signed si ON si.user_id = wu.user_id
LEFT JOIN activity a ON a.user_id = wu.user_id
JOIN auth.users au ON au.id = wu.user_id
WHERE wu.workspace_id = p_workspace_id
  AND wu.status = 'active'
ORDER BY conversion_rate_percent DESC, contacts_signed DESC
LIMIT p_limit;
$$;

COMMENT ON FUNCTION dashboard_top_networkers IS 'Squad Coach: Top reps by conversion rate with activity stats';

-- ============================================================================
-- FUNCTION 8: dashboard_needs_help
-- Purpose: Reps mit hoher Aktivität aber niedriger Conversion (brauchen Hilfe)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.dashboard_needs_help(
  p_workspace_id uuid,
  p_days_back integer DEFAULT 30,
  p_min_contacts integer DEFAULT 10,
  p_limit integer DEFAULT 5
)
RETURNS TABLE (
  user_id                  uuid,
  email                    text,
  name                     text,
  contacts_contacted       integer,
  contacts_signed          integer,
  conversion_rate_percent  numeric(5,2),
  active_days              integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
WITH sent AS (
  SELECT
    user_id,
    count(DISTINCT contact_id) AS contacts_contacted
  FROM public.events
  WHERE workspace_id = p_workspace_id
    AND event_type = 'first_message_sent'
    AND occurred_at >= now() - (p_days_back || ' days')::interval
  GROUP BY user_id
),
signed AS (
  SELECT
    user_id,
    count(DISTINCT contact_id) AS contacts_signed
  FROM public.events
  WHERE workspace_id = p_workspace_id
    AND event_type = 'signup_completed'
    AND occurred_at >= now() - (p_days_back || ' days')::interval
  GROUP BY user_id
),
activity AS (
  SELECT
    user_id,
    count(DISTINCT date_trunc('day', occurred_at)) AS active_days
  FROM public.events
  WHERE workspace_id = p_workspace_id
    AND occurred_at >= now() - (p_days_back || ' days')::interval
  GROUP BY user_id
)
SELECT
  wu.user_id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email) AS name,
  COALESCE(s.contacts_contacted, 0)::integer AS contacts_contacted,
  COALESCE(si.contacts_signed, 0)::integer AS contacts_signed,
  CASE 
    WHEN COALESCE(s.contacts_contacted, 0) = 0 THEN 0
    ELSE ROUND(
      COALESCE(si.contacts_signed, 0)::numeric * 100.0 / s.contacts_contacted,
      2
    )
  END AS conversion_rate_percent,
  COALESCE(a.active_days, 0)::integer AS active_days
FROM public.workspace_users wu
LEFT JOIN sent s ON s.user_id = wu.user_id
LEFT JOIN signed si ON si.user_id = wu.user_id
LEFT JOIN activity a ON a.user_id = wu.user_id
JOIN auth.users au ON au.id = wu.user_id
WHERE wu.workspace_id = p_workspace_id
  AND wu.status = 'active'
  AND COALESCE(s.contacts_contacted, 0) >= p_min_contacts  -- Minimum activity
ORDER BY conversion_rate_percent ASC, contacts_contacted DESC
LIMIT p_limit;
$$;

COMMENT ON FUNCTION dashboard_needs_help IS 'Squad Coach: Reps with high activity but low conversion (need coaching)';


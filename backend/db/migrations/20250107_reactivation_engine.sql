-- ============================================================================
-- MIGRATION 20250107: REACTIVATION ENGINE + SMART SCORING VIEW
-- ============================================================================
-- DESCRIPTION:
--   - Add contact engagement columns (last_contact_at, last_action_type, etc.)
--   - Create auto-update trigger for engagement fields
--   - Create reactivation candidates function (50-115 score range)
--   - Create centralized scoring view (DRY principle)
--   - Create materialized view option for performance
--   - Create Squad Coach priority analysis function
--   - Add comprehensive indexes for performance
-- ============================================================================

-- ============================================================================
-- PART 1: Add Contact Engagement Columns
-- ============================================================================

DO $$
BEGIN
    -- Add last_contact_at if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'contacts'
        AND column_name = 'last_contact_at'
    ) THEN
        ALTER TABLE public.contacts
        ADD COLUMN last_contact_at timestamptz;
        
        COMMENT ON COLUMN public.contacts.last_contact_at IS 
        'Timestamp of last interaction with contact (auto-updated via trigger)';
    END IF;

    -- Add last_action_type if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'contacts'
        AND column_name = 'last_action_type'
    ) THEN
        ALTER TABLE public.contacts
        ADD COLUMN last_action_type text;
        
        COMMENT ON COLUMN public.contacts.last_action_type IS 
        'Type of last event (e.g., first_message_sent, reply_received)';
    END IF;

    -- Add contact_type if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'contacts'
        AND column_name = 'contact_type'
    ) THEN
        ALTER TABLE public.contacts
        ADD COLUMN contact_type text DEFAULT 'prospect';
        
        COMMENT ON COLUMN public.contacts.contact_type IS 
        'Contact classification: prospect, customer, former_customer, partner';
    END IF;

    -- Add total_events_count (denormalized for performance)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'contacts'
        AND column_name = 'total_events_count'
    ) THEN
        ALTER TABLE public.contacts
        ADD COLUMN total_events_count integer DEFAULT 0;
        
        COMMENT ON COLUMN public.contacts.total_events_count IS 
        'Cached count of total events (updated via trigger)';
    END IF;

    -- Add reply_count (denormalized for performance)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'contacts'
        AND column_name = 'reply_count'
    ) THEN
        ALTER TABLE public.contacts
        ADD COLUMN reply_count integer DEFAULT 0;
        
        COMMENT ON COLUMN public.contacts.reply_count IS 
        'Cached count of reply_received events (updated via trigger)';
    END IF;
END $$;

-- ============================================================================
-- PART 2: Constraints
-- ============================================================================

ALTER TABLE public.contacts
DROP CONSTRAINT IF EXISTS contacts_contact_type_check;

ALTER TABLE public.contacts
ADD CONSTRAINT contacts_contact_type_check
CHECK (contact_type IS NULL OR contact_type IN (
    'prospect', 'customer', 'former_customer', 'partner', 'lead'
));

-- ============================================================================
-- PART 3: Auto-update Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_contact_last_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Update last_contact_at and last_action_type
    UPDATE public.contacts
    SET
        last_contact_at = NEW.occurred_at,
        last_action_type = NEW.event_type,
        total_events_count = COALESCE(total_events_count, 0) + 1,
        reply_count = CASE 
            WHEN NEW.event_type = 'reply_received' 
            THEN COALESCE(reply_count, 0) + 1 
            ELSE COALESCE(reply_count, 0)
        END
    WHERE id = NEW.contact_id
    AND (
        last_contact_at IS NULL 
        OR NEW.occurred_at > last_contact_at
    );
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_contact_last_action ON public.events;

CREATE TRIGGER trigger_update_contact_last_action
AFTER INSERT ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.update_contact_last_action();

COMMENT ON TRIGGER trigger_update_contact_last_action ON public.events IS 
'Automatically updates contact engagement fields when new events are created';

-- ============================================================================
-- PART 4: Performance Indexes
-- ============================================================================

-- Contact type + last contact index
CREATE INDEX IF NOT EXISTS contacts_type_last_contact_idx
ON public.contacts(workspace_id, contact_type, last_contact_at DESC)
WHERE contact_type IN ('prospect', 'former_customer');

-- Owner + last contact index
CREATE INDEX IF NOT EXISTS contacts_owner_last_contact_idx
ON public.contacts(workspace_id, owner_user_id, last_contact_at DESC)
WHERE last_contact_at IS NOT NULL;

-- Status + engagement index
CREATE INDEX IF NOT EXISTS contacts_status_engagement_idx
ON public.contacts(workspace_id, status, total_events_count DESC, reply_count DESC)
WHERE status IN ('interested', 'presentation', 'follow_up', 'inactive');

-- ============================================================================
-- PART 5: Reactivation Candidates Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fieldops_reactivation_candidates(
  p_workspace_id uuid,
  p_user_id uuid,
  p_min_days_since_last_contact integer DEFAULT 14,
  p_max_days_since_last_contact integer DEFAULT 180,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  contact_id uuid,
  full_name text,
  status text,
  contact_type text,
  last_contact_at timestamptz,
  last_action_type text,
  days_since_last_contact integer,
  total_events integer,
  reply_count integer,
  reactivation_score numeric(6,2),
  reactivation_priority text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH candidates AS (
  SELECT
    c.id AS contact_id,
    c.full_name,
    c.status,
    c.contact_type,
    c.last_contact_at,
    c.last_action_type,
    EXTRACT(DAY FROM (now() - c.last_contact_at))::integer AS days_since_last_contact,
    COALESCE(c.total_events_count, 0) AS total_events,
    COALESCE(c.reply_count, 0) AS reply_count
  FROM public.contacts c
  WHERE
    c.workspace_id = p_workspace_id
    AND (c.owner_user_id = p_user_id OR c.owner_user_id IS NULL)
    AND c.contact_type IN ('prospect', 'former_customer')
    AND c.status IN ('interested', 'presentation', 'follow_up', 'inactive')
    AND c.last_contact_at IS NOT NULL
    AND c.last_contact_at <= now() - (p_min_days_since_last_contact || ' days')::interval
    AND c.last_contact_at >= now() - (p_max_days_since_last_contact || ' days')::interval
),
scored AS (
  SELECT
    contact_id,
    full_name,
    status,
    contact_type,
    last_contact_at,
    last_action_type,
    days_since_last_contact,
    total_events,
    reply_count,
    -- REACTIVATION SCORE ALGORITHM (50-115 range)
    ROUND(
      -- Base score
      50.0
      -- Recency component: Recent is better (max +30)
      + GREATEST(
          0.0,
          30.0 * (1.0 - (days_since_last_contact - p_min_days_since_last_contact)::numeric 
                      / (p_max_days_since_last_contact - p_min_days_since_last_contact))
        )
      -- Engagement component: More events = better (max +20)
      + LEAST(
          20.0,
          (total_events * 1.5) + (reply_count * 2.5)
        )
      -- Status component: Pipeline stage importance (max +15)
      + CASE status
          WHEN 'presentation' THEN 15.0
          WHEN 'follow_up' THEN 12.0
          WHEN 'interested' THEN 10.0
          WHEN 'inactive' THEN 5.0
          ELSE 0.0
        END,
      2
    )::numeric(6,2) AS reactivation_score
  FROM candidates
),
prioritized AS (
  SELECT
    *,
    CASE
      WHEN reactivation_score >= 95 THEN 'critical'
      WHEN reactivation_score >= 80 THEN 'high'
      WHEN reactivation_score >= 65 THEN 'medium'
      ELSE 'low'
    END AS reactivation_priority
  FROM scored
)
SELECT
  contact_id,
  full_name,
  status,
  contact_type,
  last_contact_at,
  last_action_type,
  days_since_last_contact,
  total_events,
  reply_count,
  reactivation_score,
  reactivation_priority
FROM prioritized
ORDER BY reactivation_score DESC, last_contact_at ASC
LIMIT p_limit;
$$;

COMMENT ON FUNCTION fieldops_reactivation_candidates IS 
'Returns warm leads that went cold with reactivation score (50-115). Higher score = better candidate.';

-- ============================================================================
-- PART 6: Centralized Scoring View
-- ============================================================================

CREATE OR REPLACE VIEW public.view_followups_scored AS
WITH bounds AS (
  SELECT
    date_trunc('day', now() AT TIME ZONE 'UTC') AS today_start,
    date_trunc('day', now() AT TIME ZONE 'UTC') + interval '1 day' AS today_end,
    date_trunc('day', now() AT TIME ZONE 'UTC') + interval '7 days' AS week_end
),
base AS (
  SELECT
    t.id AS task_id,
    t.workspace_id,
    t.assigned_user_id,
    t.contact_id,
    t.due_at,
    t.status AS task_status,
    COALESCE(t.priority, 'normal') AS task_priority,
    c.full_name AS contact_name,
    c.status AS contact_status,
    COALESCE(c.lead_score, 0) AS contact_lead_score,
    c.last_action_type,
    c.last_contact_at,
    b.today_start,
    b.today_end,
    b.week_end,
    -- Infer segment
    CASE
      WHEN t.due_at < b.today_start THEN 'overdue'
      WHEN t.due_at >= b.today_start AND t.due_at < b.today_end THEN 'today'
      WHEN t.due_at >= b.today_start AND t.due_at < b.week_end THEN 'week'
      ELSE 'later'
    END AS segment_inferred
  FROM public.tasks t
  JOIN public.contacts c ON c.id = t.contact_id
  CROSS JOIN bounds b
  WHERE t.status = 'open'
),
scored AS (
  SELECT
    task_id,
    workspace_id,
    assigned_user_id,
    contact_id,
    contact_name,
    contact_status,
    contact_lead_score,
    task_status,
    task_priority,
    due_at,
    last_action_type,
    last_contact_at,
    segment_inferred,
    -- PRIORITY SCORE ALGORITHM (0-120 range)
    ROUND(
      -- Urgency component (base: 30-90)
      CASE
        -- OVERDUE: Base 90 + hours overdue (max +30)
        WHEN segment_inferred = 'overdue' THEN
          90.0 + LEAST(
            30.0,
            EXTRACT(EPOCH FROM (now() - due_at)) / 3600.0 * 0.5
          )
        -- TODAY: Base 70 + urgency within day (max +15)
        WHEN segment_inferred = 'today' THEN
          70.0 + GREATEST(
            0.0,
            LEAST(15.0, 12.0 - EXTRACT(EPOCH FROM (due_at - now())) / 3600.0 * 0.5)
          )
        -- WEEK: Base 50 + days until due (max +15)
        WHEN segment_inferred = 'week' THEN
          50.0 + GREATEST(
            0.0,
            LEAST(15.0, (7.0 - EXTRACT(EPOCH FROM (due_at - now())) / 86400.0) * 2.0)
          )
        -- LATER: Base 30
        ELSE 30.0
      END
      -- Task priority boost (+0-10)
      + CASE task_priority
          WHEN 'urgent' THEN 10.0
          WHEN 'high' THEN 5.0
          ELSE 0.0
        END
      -- Contact status component (+0-5)
      + CASE
          WHEN contact_status IN ('interested', 'presentation', 'follow_up') THEN 5.0
          ELSE 0.0
        END
      -- Lead score component (+0-10)
      + LEAST(10.0, contact_lead_score / 10.0)
      -- Recency component (+0-10)
      + CASE
          WHEN last_contact_at IS NULL THEN 0.0
          WHEN last_contact_at >= now() - interval '2 days' THEN 10.0
          WHEN last_contact_at >= now() - interval '7 days' THEN 5.0
          ELSE 2.0
        END,
      2
    )::numeric(6,2) AS priority_score
  FROM base
)
SELECT
  task_id,
  workspace_id,
  assigned_user_id,
  contact_id,
  contact_name,
  contact_status,
  contact_lead_score,
  task_status,
  task_priority,
  due_at,
  last_action_type,
  last_contact_at,
  segment_inferred,
  priority_score,
  -- Priority level classification
  CASE
    WHEN priority_score >= 100 THEN 'critical'
    WHEN priority_score >= 85 THEN 'very_high'
    WHEN priority_score >= 70 THEN 'high'
    WHEN priority_score >= 50 THEN 'medium'
    ELSE 'low'
  END AS priority_level
FROM scored;

COMMENT ON VIEW view_followups_scored IS 
'Centralized follow-up scoring with segment inference. Use this for all priority-based queries.';

-- ============================================================================
-- PART 7: Materialized View (Optional for High-Traffic)
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_followups_scored AS
SELECT * FROM public.view_followups_scored;

CREATE UNIQUE INDEX IF NOT EXISTS mv_followups_scored_task_id_idx
ON public.mv_followups_scored(task_id);

CREATE INDEX IF NOT EXISTS mv_followups_scored_workspace_user_idx
ON public.mv_followups_scored(workspace_id, assigned_user_id, priority_score DESC);

CREATE INDEX IF NOT EXISTS mv_followups_scored_segment_idx
ON public.mv_followups_scored(workspace_id, segment_inferred, priority_score DESC);

COMMENT ON MATERIALIZED VIEW mv_followups_scored IS 
'Materialized version for high-traffic dashboards. Refresh with: REFRESH MATERIALIZED VIEW CONCURRENTLY mv_followups_scored';

-- ============================================================================
-- PART 8: Refresh Function (for pg_cron scheduling)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.refresh_followups_scored()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_followups_scored;
END;
$$;

COMMENT ON FUNCTION refresh_followups_scored IS 
'Refreshes materialized view. Schedule via pg_cron: SELECT cron.schedule(''refresh-followups'', ''*/5 * * * *'', ''SELECT refresh_followups_scored()'');';

-- ============================================================================
-- PART 9: Simplified followups_by_segment (Uses View)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.followups_by_segment(
  p_workspace_id uuid,
  p_user_id uuid,
  p_segment text DEFAULT 'today',
  p_use_materialized boolean DEFAULT false
)
RETURNS TABLE (
  task_id uuid,
  contact_id uuid,
  contact_name text,
  contact_status text,
  contact_lead_score integer,
  due_at timestamptz,
  priority text,
  last_action_type text,
  last_contact_at timestamptz,
  days_since_contact integer,
  priority_score numeric(6,2),
  priority_level text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH source AS (
  SELECT *
  FROM (
    SELECT * FROM public.mv_followups_scored WHERE p_use_materialized
    UNION ALL
    SELECT * FROM public.view_followups_scored WHERE NOT p_use_materialized
  ) combined
  LIMIT (CASE WHEN p_use_materialized THEN NULL ELSE NULL END)
)
SELECT
  v.task_id,
  v.contact_id,
  v.contact_name,
  v.contact_status,
  v.contact_lead_score,
  v.due_at,
  v.task_priority AS priority,
  v.last_action_type,
  v.last_contact_at,
  EXTRACT(DAY FROM (now() - v.last_contact_at))::integer AS days_since_contact,
  v.priority_score,
  v.priority_level
FROM source v
WHERE
  v.workspace_id = p_workspace_id
  AND v.assigned_user_id = p_user_id
  AND (
    (p_segment = 'overdue' AND v.segment_inferred = 'overdue')
    OR (p_segment = 'today' AND v.segment_inferred = 'today')
    OR (p_segment = 'week' AND v.segment_inferred = 'week')
    OR (p_segment = 'hot' AND v.priority_score >= 80)
    OR (p_segment = 'all')
  )
ORDER BY v.priority_score DESC, v.due_at ASC
LIMIT 200;
$$;

COMMENT ON FUNCTION followups_by_segment IS 
'Returns follow-ups by segment using centralized scoring view. Set p_use_materialized=true for high-traffic scenarios.';

-- ============================================================================
-- PART 10: Squad Coach Priority Analysis
-- ============================================================================

CREATE OR REPLACE FUNCTION public.squad_coach_priority_analysis(
  p_workspace_id uuid,
  p_days_back integer DEFAULT 7
)
RETURNS TABLE (
  user_id uuid,
  user_email text,
  user_name text,
  total_open_followups integer,
  critical_followups integer,
  very_high_followups integer,
  high_followups integer,
  avg_priority_score numeric(6,2),
  max_priority_score numeric(6,2),
  overdue_count integer,
  today_count integer,
  needs_coaching boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH user_stats AS (
  SELECT
    v.assigned_user_id,
    count(*)::integer AS total_open_followups,
    count(*) FILTER (WHERE v.priority_level = 'critical')::integer AS critical_followups,
    count(*) FILTER (WHERE v.priority_level = 'very_high')::integer AS very_high_followups,
    count(*) FILTER (WHERE v.priority_level = 'high')::integer AS high_followups,
    ROUND(avg(v.priority_score), 2) AS avg_priority_score,
    ROUND(max(v.priority_score), 2) AS max_priority_score,
    count(*) FILTER (WHERE v.segment_inferred = 'overdue')::integer AS overdue_count,
    count(*) FILTER (WHERE v.segment_inferred = 'today')::integer AS today_count
  FROM public.view_followups_scored v
  WHERE v.workspace_id = p_workspace_id
  GROUP BY v.assigned_user_id
)
SELECT
  wu.user_id,
  u.email AS user_email,
  COALESCE(wu.full_name, u.email) AS user_name,
  COALESCE(us.total_open_followups, 0) AS total_open_followups,
  COALESCE(us.critical_followups, 0) AS critical_followups,
  COALESCE(us.very_high_followups, 0) AS very_high_followups,
  COALESCE(us.high_followups, 0) AS high_followups,
  COALESCE(us.avg_priority_score, 0) AS avg_priority_score,
  COALESCE(us.max_priority_score, 0) AS max_priority_score,
  COALESCE(us.overdue_count, 0) AS overdue_count,
  COALESCE(us.today_count, 0) AS today_count,
  -- Coaching needed if: >10 critical OR >5 overdue OR avg score >75
  (
    COALESCE(us.critical_followups, 0) > 10
    OR COALESCE(us.overdue_count, 0) > 5
    OR COALESCE(us.avg_priority_score, 0) > 75
  ) AS needs_coaching
FROM public.workspace_users wu
JOIN auth.users u ON u.id = wu.user_id
LEFT JOIN user_stats us ON us.assigned_user_id = wu.user_id
WHERE
  wu.workspace_id = p_workspace_id
  AND wu.status = 'active'
ORDER BY
  needs_coaching DESC,
  critical_followups DESC,
  avg_priority_score DESC;
$$;

COMMENT ON FUNCTION squad_coach_priority_analysis IS 
'Analyzes team priority distribution for Squad Coach feature. Identifies reps needing support.';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================


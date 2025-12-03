-- ============================================================================
-- SALES FLOW AI - PRIORITY SCORING + GEOLOCATION SYSTEM
-- ============================================================================
-- Version: 2.0.0
-- Date: 2025-11-30
-- Description: Smart follow-up prioritization + field operations geolocation
-- ============================================================================

-- ============================================================================
-- PART 1: ADD GEOLOCATION COLUMNS TO CONTACTS
-- ============================================================================

DO $$
BEGIN
    -- Add latitude column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'contacts'
        AND column_name = 'latitude'
    ) THEN
        ALTER TABLE public.contacts
        ADD COLUMN latitude numeric(9,6);
        
        COMMENT ON COLUMN public.contacts.latitude IS 
        'Latitude coordinate (WGS84). Range: -90 to 90';
    END IF;

    -- Add longitude column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'contacts'
        AND column_name = 'longitude'
    ) THEN
        ALTER TABLE public.contacts
        ADD COLUMN longitude numeric(9,6);
        
        COMMENT ON COLUMN public.contacts.longitude IS 
        'Longitude coordinate (WGS84). Range: -180 to 180';
    END IF;

    -- Add location_source column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'contacts'
        AND column_name = 'location_source'
    ) THEN
        ALTER TABLE public.contacts
        ADD COLUMN location_source text;
        
        COMMENT ON COLUMN public.contacts.location_source IS 
        'Source of location data: manual, import, geocoded, gps, ip';
    END IF;

    -- Add location_accuracy column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'contacts'
        AND column_name = 'location_accuracy'
    ) THEN
        ALTER TABLE public.contacts
        ADD COLUMN location_accuracy integer;
        
        COMMENT ON COLUMN public.contacts.location_accuracy IS 
        'Location accuracy in meters (for GPS/mobile data)';
    END IF;

    -- Add location_updated_at column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'contacts'
        AND column_name = 'location_updated_at'
    ) THEN
        ALTER TABLE public.contacts
        ADD COLUMN location_updated_at timestamptz;
        
        COMMENT ON COLUMN public.contacts.location_updated_at IS 
        'When location was last updated';
    END IF;
END $$;

-- ============================================================================
-- PART 2: CONSTRAINTS & VALIDATION
-- ============================================================================

-- Latitude constraint (-90 to 90)
ALTER TABLE public.contacts
DROP CONSTRAINT IF EXISTS contacts_latitude_check;

ALTER TABLE public.contacts
ADD CONSTRAINT contacts_latitude_check
CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90));

-- Longitude constraint (-180 to 180)
ALTER TABLE public.contacts
DROP CONSTRAINT IF EXISTS contacts_longitude_check;

ALTER TABLE public.contacts
ADD CONSTRAINT contacts_longitude_check
CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180));

-- Location source constraint
ALTER TABLE public.contacts
DROP CONSTRAINT IF EXISTS contacts_location_source_check;

ALTER TABLE public.contacts
ADD CONSTRAINT contacts_location_source_check
CHECK (location_source IS NULL OR location_source IN ('manual', 'import', 'geocoded', 'gps', 'ip'));

-- ============================================================================
-- PART 3: GEOLOCATION INDEXES
-- ============================================================================

-- Primary geolocation index
CREATE INDEX IF NOT EXISTS contacts_geolocation_idx
ON public.contacts(workspace_id, latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Status + location index (for FieldOps)
CREATE INDEX IF NOT EXISTS contacts_status_location_idx
ON public.contacts(workspace_id, status, latitude, longitude)
WHERE latitude IS NOT NULL 
  AND longitude IS NOT NULL 
  AND status IN ('new', 'contacted', 'interested', 'presentation', 'follow_up');

-- Owner + location index
CREATE INDEX IF NOT EXISTS contacts_owner_location_idx
ON public.contacts(workspace_id, owner_user_id, latitude, longitude)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

COMMENT ON INDEX contacts_geolocation_idx IS 
'Primary index for geolocation queries. Supports nearby lead searches.';

-- ============================================================================
-- PART 4: FUNCTION - followups_by_segment WITH PRIORITY SCORE
-- ============================================================================

CREATE OR REPLACE FUNCTION public.followups_by_segment(
  p_workspace_id uuid,
  p_user_id uuid,
  p_segment text DEFAULT 'today'
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
  priority_score numeric(6,2)
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH bounds AS (
  SELECT
    date_trunc('day', now() AT TIME ZONE 'UTC') AS today_start,
    date_trunc('day', now() AT TIME ZONE 'UTC') + interval '1 day' AS today_end,
    date_trunc('day', now() AT TIME ZONE 'UTC') + interval '7 days' AS week_end
),
-- Calculate last action from events
contact_last_actions AS (
  SELECT DISTINCT ON (contact_id)
    contact_id,
    event_type AS last_action_type,
    occurred_at AS last_contact_at,
    EXTRACT(DAY FROM (now() - occurred_at))::integer AS days_since_contact
  FROM public.events
  WHERE workspace_id = p_workspace_id
  ORDER BY contact_id, occurred_at DESC
),
base AS (
  SELECT
    t.id AS task_id,
    t.contact_id,
    c.full_name AS contact_name,
    c.status AS contact_status,
    COALESCE(c.lead_score, 0) AS contact_lead_score,
    t.due_at,
    COALESCE(t.priority, 'normal') AS priority,
    cla.last_action_type,
    cla.last_contact_at,
    cla.days_since_contact
  FROM public.tasks t
  JOIN public.contacts c ON c.id = t.contact_id
  CROSS JOIN bounds b
  LEFT JOIN contact_last_actions cla ON cla.contact_id = t.contact_id
  WHERE
    t.workspace_id = p_workspace_id
    AND t.assigned_user_id = p_user_id
    AND t.status = 'open'
    AND (
      -- Overdue: tasks due before today
      (p_segment = 'overdue' AND t.due_at < b.today_start)
      -- Today: tasks due today
      OR (p_segment = 'today' AND t.due_at >= b.today_start AND t.due_at < b.today_end)
      -- Week: tasks due this week
      OR (p_segment = 'week' AND t.due_at >= b.today_start AND t.due_at < b.week_end)
      -- Hot: high lead score or recent contact
      OR (p_segment = 'hot' AND (
        c.lead_score >= 70
        OR (cla.last_contact_at IS NOT NULL AND cla.last_contact_at >= now() - interval '7 days')
      ))
    )
)
SELECT
  task_id,
  contact_id,
  contact_name,
  contact_status,
  contact_lead_score,
  due_at,
  priority,
  last_action_type,
  last_contact_at,
  days_since_contact,
  -- PRIORITY SCORE ALGORITHM (0-120 range)
  ROUND(
    CASE
      -- OVERDUE: Base 90 + hours overdue (max +30) + status bonus (+5)
      WHEN p_segment = 'overdue' THEN
        90.0
        + LEAST(
            30.0,
            EXTRACT(EPOCH FROM (now() - due_at)) / 3600.0 * 0.5
          )
        + CASE WHEN contact_status IN ('interested', 'presentation', 'follow_up')
               THEN 5.0 ELSE 0.0 END

      -- TODAY: Base 70 + urgency + status bonus
      WHEN p_segment = 'today' THEN
        70.0
        + GREATEST(
            0.0,
            LEAST(15.0, 12.0 - EXTRACT(EPOCH FROM (due_at - now())) / 3600.0 * 0.5)
          )
        + CASE WHEN contact_status IN ('interested', 'presentation', 'follow_up')
               THEN 5.0 ELSE 0.0 END

      -- WEEK: Base 50 + days until due + status bonus
      WHEN p_segment = 'week' THEN
        50.0
        + GREATEST(
            0.0,
            LEAST(15.0, (7.0 - EXTRACT(EPOCH FROM (due_at - now())) / 86400.0) * 2.0)
          )
        + CASE WHEN contact_status IN ('interested', 'presentation', 'follow_up')
               THEN 5.0 ELSE 0.0 END

      -- HOT: Base 80 + status + recency + lead score
      WHEN p_segment = 'hot' THEN
        80.0
        + CASE WHEN contact_status IN ('interested', 'presentation', 'follow_up')
               THEN 10.0 ELSE 0.0 END
        + CASE
            WHEN last_contact_at IS NULL THEN 0.0
            WHEN last_contact_at >= now() - interval '2 days' THEN 15.0
            WHEN last_contact_at >= now() - interval '7 days' THEN 8.0
            ELSE 3.0
          END
        + LEAST(10.0, contact_lead_score / 10.0)

      ELSE 0.0
    END,
    2
  )::numeric(6,2) AS priority_score
FROM base
ORDER BY priority_score DESC, due_at ASC
LIMIT 200;
$$;

COMMENT ON FUNCTION followups_by_segment IS 
'Returns follow-ups with intelligent priority scoring (0-120). Higher score = more urgent/important.';

-- ============================================================================
-- PART 5: FUNCTION - fieldops_opportunity_radar
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fieldops_opportunity_radar(
  p_workspace_id uuid,
  p_user_id uuid,
  p_lat numeric,
  p_lng numeric,
  p_radius_km numeric DEFAULT 5.0,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  contact_id uuid,
  full_name text,
  status text,
  lead_score integer,
  distance_km numeric(10,2),
  last_contact_at timestamptz,
  last_action_type text,
  latitude numeric(9,6),
  longitude numeric(9,6)
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
WITH contact_last_actions AS (
  SELECT DISTINCT ON (contact_id)
    contact_id,
    event_type AS last_action_type,
    occurred_at AS last_contact_at
  FROM public.events
  WHERE workspace_id = p_workspace_id
  ORDER BY contact_id, occurred_at DESC
),
candidates AS (
  SELECT
    c.id AS contact_id,
    c.full_name,
    c.status,
    COALESCE(c.lead_score, 0) AS lead_score,
    c.latitude,
    c.longitude,
    cla.last_contact_at,
    cla.last_action_type,
    -- Haversine formula for great-circle distance
    ROUND(
      (6371 * acos(
        greatest(-1.0, least(1.0,
          cos(radians(p_lat::double precision))
          * cos(radians(c.latitude::double precision))
          * cos(
              radians(c.longitude::double precision)
              - radians(p_lng::double precision)
            )
          + sin(radians(p_lat::double precision))
          * sin(radians(c.latitude::double precision))
        ))
      ))::numeric,
      2
    ) AS distance_km
  FROM public.contacts c
  LEFT JOIN contact_last_actions cla ON cla.contact_id = c.id
  WHERE
    c.workspace_id = p_workspace_id
    AND c.contact_type = 'prospect'
    AND c.status IN ('new', 'contacted', 'interested', 'presentation', 'follow_up')
    AND (c.owner_user_id = p_user_id OR c.owner_user_id IS NULL)
    AND c.latitude IS NOT NULL
    AND c.longitude IS NOT NULL
    -- Bounding box optimization
    AND c.latitude BETWEEN p_lat - (p_radius_km / 111.0) 
                        AND p_lat + (p_radius_km / 111.0)
    AND c.longitude BETWEEN p_lng - (p_radius_km / (111.0 * cos(radians(p_lat::double precision))))
                         AND p_lng + (p_radius_km / (111.0 * cos(radians(p_lat::double precision))))
)
SELECT
  contact_id,
  full_name,
  status,
  lead_score,
  distance_km,
  last_contact_at,
  last_action_type,
  latitude,
  longitude
FROM candidates
WHERE distance_km <= p_radius_km
ORDER BY distance_km ASC, lead_score DESC NULLS LAST
LIMIT p_limit;
$$;

COMMENT ON FUNCTION fieldops_opportunity_radar IS 
'Returns nearby prospects within radius using Haversine distance. Optimized with bounding box.';

-- ============================================================================
-- PART 6: VERIFICATION QUERIES
-- ============================================================================

-- Test geolocation columns exist
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'contacts'
    AND column_name IN ('latitude', 'longitude', 'location_source', 'location_accuracy', 'location_updated_at');
  
  IF v_count = 5 THEN
    RAISE NOTICE '✅ All geolocation columns created successfully';
  ELSE
    RAISE WARNING '⚠️ Expected 5 geolocation columns, found %', v_count;
  END IF;
END $$;

-- Test indexes exist
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'contacts'
    AND indexname LIKE '%location%';
  
  IF v_count >= 3 THEN
    RAISE NOTICE '✅ Geolocation indexes created successfully';
  ELSE
    RAISE WARNING '⚠️ Expected 3+ location indexes, found %', v_count;
  END IF;
END $$;

-- Test functions exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'followups_by_segment'
  ) THEN
    RAISE NOTICE '✅ followups_by_segment function created';
  ELSE
    RAISE WARNING '⚠️ followups_by_segment function not found';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'fieldops_opportunity_radar'
  ) THEN
    RAISE NOTICE '✅ fieldops_opportunity_radar function created';
  ELSE
    RAISE WARNING '⚠️ fieldops_opportunity_radar function not found';
  END IF;
END $$;


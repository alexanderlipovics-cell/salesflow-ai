-- =====================================================================
-- Migration 20250106 - Feature Pack (Calendar, Documents, Voice Notes,
--                       Geolocation + Advanced Analytics helpers)
-- =====================================================================

-- Ensure geo extensions are available (required for ll_to_earth)
CREATE EXTENSION IF NOT EXISTS cube;
CREATE EXTENSION IF NOT EXISTS earthdistance;

-- ---------------------------------------------------------------------
-- 1) CALENDAR EVENTS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  contact_id UUID,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN DEFAULT FALSE,
  reminder_minutes INTEGER DEFAULT 15,
  reminder_sent BOOLEAN DEFAULT FALSE,
  device_calendar_id TEXT,
  status TEXT DEFAULT 'scheduled',
  meeting_type TEXT,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.calendar_events
  ADD CONSTRAINT calendar_events_workspace_fk
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ADD CONSTRAINT calendar_events_contact_fk
  FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL,
  ADD CONSTRAINT calendar_events_user_fk
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS calendar_events_device_idx
  ON public.calendar_events (user_id, device_calendar_id)
  WHERE device_calendar_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS calendar_events_user_time_idx
  ON public.calendar_events (user_id, start_time);

CREATE INDEX IF NOT EXISTS calendar_events_contact_idx
  ON public.calendar_events (contact_id);

ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'calendar_events'
      AND policyname = 'calendar_events_workspace_policy'
  ) THEN
    CREATE POLICY calendar_events_workspace_policy
      ON public.calendar_events
      USING (
        workspace_id IN (
          SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
        )
      )
      WITH CHECK (
        workspace_id IN (
          SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 2) DOCUMENT MANAGEMENT
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  contact_id UUID,
  uploaded_by UUID NOT NULL,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  description TEXT,
  tags TEXT[],
  is_template BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.documents
  ADD CONSTRAINT documents_workspace_fk
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ADD CONSTRAINT documents_contact_fk
  FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL,
  ADD CONSTRAINT documents_user_fk
  FOREIGN KEY (uploaded_by) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS documents_contact_idx
  ON public.documents (contact_id);

CREATE INDEX IF NOT EXISTS documents_workspace_idx
  ON public.documents (workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS documents_tags_idx
  ON public.documents USING GIN (tags);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'documents'
      AND policyname = 'documents_workspace_policy'
  ) THEN
    CREATE POLICY documents_workspace_policy
      ON public.documents
      USING (
        workspace_id IN (
          SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
        )
      )
      WITH CHECK (
        workspace_id IN (
          SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 3) VOICE NOTES
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.voice_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  contact_id UUID,
  user_id UUID NOT NULL,
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  transcription TEXT,
  transcription_status TEXT DEFAULT 'pending',
  language TEXT DEFAULT 'en-US',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.voice_notes
  ADD CONSTRAINT voice_notes_workspace_fk
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ADD CONSTRAINT voice_notes_contact_fk
  FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL,
  ADD CONSTRAINT voice_notes_user_fk
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS voice_notes_contact_idx
  ON public.voice_notes (contact_id, created_at DESC);

CREATE INDEX IF NOT EXISTS voice_notes_user_idx
  ON public.voice_notes (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS voice_notes_transcription_idx
  ON public.voice_notes
  USING GIN (to_tsvector('english', coalesce(transcription, '')));

ALTER TABLE public.voice_notes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'voice_notes'
      AND policyname = 'voice_notes_workspace_policy'
  ) THEN
    CREATE POLICY voice_notes_workspace_policy
      ON public.voice_notes
      USING (
        workspace_id IN (
          SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
        )
      )
      WITH CHECK (
        workspace_id IN (
          SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- 4) CONTACT GEO DATA + CHECK-INS
-- ---------------------------------------------------------------------
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS country TEXT;

CREATE INDEX IF NOT EXISTS contacts_location_idx
  ON public.contacts
  USING GIST (ll_to_earth(latitude, longitude))
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL,
  user_id UUID NOT NULL,
  contact_id UUID,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address TEXT,
  notes TEXT,
  checked_in_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.check_ins
  ADD CONSTRAINT check_ins_workspace_fk
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE,
  ADD CONSTRAINT check_ins_user_fk
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT check_ins_contact_fk
  FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS check_ins_user_idx
  ON public.check_ins (user_id, checked_in_at DESC);

CREATE INDEX IF NOT EXISTS check_ins_contact_idx
  ON public.check_ins (contact_id);

ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'check_ins'
      AND policyname = 'check_ins_workspace_policy'
  ) THEN
    CREATE POLICY check_ins_workspace_policy
      ON public.check_ins
      USING (
        workspace_id IN (
          SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
        )
      )
      WITH CHECK (
        workspace_id IN (
          SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Nearby contacts helper
CREATE OR REPLACE FUNCTION get_contacts_within_radius(
  p_workspace_id UUID,
  p_lat DOUBLE PRECISION,
  p_lon DOUBLE PRECISION,
  p_radius_km DOUBLE PRECISION DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  status contact_status_enum,
  distance_km NUMERIC,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address TEXT,
  city TEXT,
  country TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.full_name,
    c.status,
    ROUND(
      earth_distance(
        ll_to_earth(p_lat, p_lon),
        ll_to_earth(c.latitude, c.longitude)
      ) / 1000,
      2
    ) AS distance_km,
    c.latitude,
    c.longitude,
    c.address,
    c.city,
    c.country
  FROM public.contacts c
  WHERE c.workspace_id = p_workspace_id
    AND c.latitude IS NOT NULL
    AND c.longitude IS NOT NULL
    AND earth_distance(
          ll_to_earth(p_lat, p_lon),
          ll_to_earth(c.latitude, c.longitude)
        ) <= p_radius_km * 1000
  ORDER BY distance_km ASC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql STABLE;

-- ---------------------------------------------------------------------
-- 5) ADVANCED ANALYTICS HELPERS
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_revenue_summary(
  p_workspace_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  total_leads BIGINT,
  total_signups BIGINT,
  total_revenue NUMERIC,
  conversion_rate NUMERIC,
  avg_deal_size NUMERIC
) AS $$
DECLARE
  v_start TIMESTAMPTZ;
BEGIN
  IF p_days IS NULL OR p_days < 1 THEN
    p_days := 30;
  END IF;
  v_start := CURRENT_TIMESTAMP - (p_days || ' days')::INTERVAL;

  RETURN QUERY
  WITH leads AS (
    SELECT COUNT(*) AS cnt
    FROM public.events
    WHERE workspace_id = p_workspace_id
      AND event_type = 'lead_created'
      AND occurred_at >= v_start
  ),
  signups AS (
    SELECT
      COUNT(*) AS cnt,
      COALESCE(SUM(value_amount), 0)::NUMERIC AS revenue
    FROM public.events
    WHERE workspace_id = p_workspace_id
      AND event_type = 'signup_completed'
      AND occurred_at >= v_start
  )
  SELECT
    (SELECT cnt FROM leads),
    (SELECT cnt FROM signups),
    (SELECT revenue FROM signups),
    CASE
      WHEN (SELECT cnt FROM leads) = 0 THEN 0
      ELSE ROUND(
        (SELECT cnt FROM signups)::NUMERIC * 100.0 / NULLIF((SELECT cnt FROM leads), 0),
        2
      )
    END,
    CASE
      WHEN (SELECT cnt FROM signups) = 0 THEN 0
      ELSE ROUND(
        (SELECT revenue FROM signups) / NULLIF((SELECT cnt FROM signups), 0),
        2
      )
    END;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_revenue_timeline(
  p_workspace_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  day DATE,
  revenue NUMERIC,
  signups BIGINT
) AS $$
DECLARE
  v_start DATE;
BEGIN
  IF p_days IS NULL OR p_days < 1 THEN
    p_days := 30;
  END IF;
  v_start := (CURRENT_DATE - (p_days - 1) * INTERVAL '1 day')::DATE;

  RETURN QUERY
  WITH dates AS (
    SELECT generate_series(
      v_start,
      CURRENT_DATE,
      INTERVAL '1 day'
    )::DATE AS day
  ),
  raw AS (
    SELECT
      DATE_TRUNC('day', occurred_at)::DATE AS day,
      COUNT(*) AS signups,
      COALESCE(SUM(value_amount), 0)::NUMERIC AS revenue
    FROM public.events
    WHERE workspace_id = p_workspace_id
      AND event_type = 'signup_completed'
      AND occurred_at >= v_start::TIMESTAMPTZ
    GROUP BY DATE_TRUNC('day', occurred_at)
  )
  SELECT
    d.day,
    COALESCE(r.revenue, 0) AS revenue,
    COALESCE(r.signups, 0) AS signups
  FROM dates d
  LEFT JOIN raw r ON r.day = d.day
  ORDER BY d.day;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_pipeline_funnel(
  p_workspace_id UUID
)
RETURNS TABLE (
  stage TEXT,
  count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM (
    SELECT 'New'::TEXT AS stage, COUNT(*)::BIGINT AS count
    FROM public.contacts
    WHERE workspace_id = p_workspace_id AND status = 'new'
    UNION ALL
    SELECT 'Contacted', COUNT(*)
    FROM public.contacts
    WHERE workspace_id = p_workspace_id AND status IN ('contacted', 'nurturing')
    UNION ALL
    SELECT 'Qualified', COUNT(*)
    FROM public.contacts
    WHERE workspace_id = p_workspace_id AND status = 'qualified'
    UNION ALL
    SELECT 'Meetings', COUNT(*)
    FROM public.contacts
    WHERE workspace_id = p_workspace_id AND status = 'meeting_scheduled'
    UNION ALL
    SELECT 'Proposals', COUNT(*)
    FROM public.contacts
    WHERE workspace_id = p_workspace_id AND status = 'proposal_sent'
    UNION ALL
    SELECT 'Negotiation', COUNT(*)
    FROM public.contacts
    WHERE workspace_id = p_workspace_id AND status = 'negotiation'
    UNION ALL
    SELECT 'Won', COUNT(*)
    FROM public.contacts
    WHERE workspace_id = p_workspace_id AND status = 'won'
  ) AS funnel;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_lead_sources_breakdown(
  p_workspace_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  source TEXT,
  leads BIGINT
) AS $$
DECLARE
  v_start TIMESTAMPTZ;
BEGIN
  IF p_days IS NULL OR p_days < 1 THEN
    p_days := 30;
  END IF;
  v_start := CURRENT_TIMESTAMP - (p_days || ' days')::INTERVAL;

  RETURN QUERY
  SELECT
    COALESCE(source::TEXT, 'unknown') AS source,
    COUNT(*)::BIGINT AS leads
  FROM public.events
  WHERE workspace_id = p_workspace_id
    AND event_type = 'lead_created'
    AND occurred_at >= v_start
  GROUP BY source
  ORDER BY leads DESC;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION get_top_performers_by_revenue(
  p_workspace_id UUID,
  p_days INTEGER DEFAULT 30,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  total_revenue NUMERIC
) AS $$
DECLARE
  v_start TIMESTAMPTZ;
BEGIN
  IF p_days IS NULL OR p_days < 1 THEN
    p_days := 30;
  END IF;
  v_start := CURRENT_TIMESTAMP - (p_days || ' days')::INTERVAL;

  RETURN QUERY
  WITH revenue AS (
    SELECT
      user_id,
      COALESCE(SUM(value_amount), 0)::NUMERIC AS total_revenue
    FROM public.events
    WHERE workspace_id = p_workspace_id
      AND event_type = 'signup_completed'
      AND occurred_at >= v_start
      AND user_id IS NOT NULL
    GROUP BY user_id
  )
  SELECT
    r.user_id,
    COALESCE(u.full_name, 'Unbekannt') AS full_name,
    r.total_revenue
  FROM revenue r
  LEFT JOIN public.user_profiles u ON u.id = r.user_id
  ORDER BY r.total_revenue DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE;



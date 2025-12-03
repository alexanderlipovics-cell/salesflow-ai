-- =====================================================================
-- Migration 20250101 - Events System with RLS, Enums, Partitioning
-- =====================================================================

-- 1) ENUM TYPES --------------------------------------------------------
CREATE TYPE IF NOT EXISTS event_type_enum AS ENUM (
  'lead_created',
  'first_message_sent',
  'reply_received',
  'meeting_booked',
  'signup_completed',
  'payment_received',
  'referral_made',
  'sequence_started',
  'sequence_completed',
  'task_created',
  'task_completed'
);

CREATE TYPE IF NOT EXISTS event_source_enum AS ENUM (
  'manual',
  'sequence',
  'automation',
  'import',
  'api',
  'webhook'
);

CREATE TYPE IF NOT EXISTS event_status_enum AS ENUM (
  'pending',
  'processed',
  'failed',
  'skipped'
);

-- 2) EVENTS TABLE (PARTITIONED BY MONTH) -------------------------------
CREATE TABLE IF NOT EXISTS public.events (
  id            UUID DEFAULT gen_random_uuid(),
  workspace_id  UUID NOT NULL,
  user_id       UUID,
  contact_id    UUID,
  template_id   UUID,
  event_type    event_type_enum NOT NULL,
  source        event_source_enum NOT NULL DEFAULT 'manual',
  status        event_status_enum NOT NULL DEFAULT 'processed',
  value_amount  NUMERIC(12,2) CHECK (value_amount >= 0),
  occurred_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  properties    JSONB NOT NULL DEFAULT '{}'::jsonb,
  error_message TEXT,
  retry_count   INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id, occurred_at)
) PARTITION BY RANGE (occurred_at);

-- Pre-create partitions for current + next 3 months (adjust as needed)
CREATE TABLE IF NOT EXISTS events_2025_01 PARTITION OF events
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE IF NOT EXISTS events_2025_02 PARTITION OF events
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

CREATE TABLE IF NOT EXISTS events_2025_03 PARTITION OF events
  FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

CREATE TABLE IF NOT EXISTS events_2025_04 PARTITION OF events
  FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');

-- 3) FOREIGN KEYS ------------------------------------------------------
ALTER TABLE public.events
  ADD CONSTRAINT events_workspace_fk
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.events
  ADD CONSTRAINT events_user_fk
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.events
  ADD CONSTRAINT events_contact_fk
  FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;

-- 4) INDEXES -----------------------------------------------------------
CREATE INDEX IF NOT EXISTS events_workspace_type_time_idx
  ON public.events (workspace_id, event_type, occurred_at DESC);

CREATE INDEX IF NOT EXISTS events_contact_time_idx
  ON public.events (contact_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS events_user_time_idx
  ON public.events (user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS events_template_idx
  ON public.events (template_id) WHERE template_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS events_properties_idx
  ON public.events USING GIN (properties);

-- 5) ROW LEVEL SECURITY ------------------------------------------------
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS events_select_policy
  ON public.events FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS events_insert_policy
  ON public.events FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
    )
  );

-- 6) PARTITION AUTO-CREATION TRIGGER -----------------------------------
CREATE OR REPLACE FUNCTION create_events_partition()
RETURNS TRIGGER AS $$
DECLARE
  partition_suffix TEXT;
  partition_name   TEXT;
  start_date       DATE;
  end_date         DATE;
BEGIN
  start_date := DATE_TRUNC('month', NEW.occurred_at)::DATE;
  end_date := (DATE_TRUNC('month', NEW.occurred_at) + INTERVAL '1 month')::DATE;
  partition_suffix := TO_CHAR(start_date, 'YYYY_MM');
  partition_name := 'events_' || partition_suffix;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relname = partition_name
  ) THEN
    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS %I PARTITION OF events FOR VALUES FROM (%L) TO (%L)',
      partition_name, start_date::text, end_date::text
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS events_partition_trigger ON public.events;

CREATE TRIGGER events_partition_trigger
  BEFORE INSERT ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION create_events_partition();



-- =====================================================================
-- Migration 20250103 - Contacts Extensions (status, lifecycle, scoring)
-- =====================================================================

-- 1) STATUS ENUM -------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contact_status_enum') THEN
    CREATE TYPE contact_status_enum AS ENUM (
      'new',
      'contacted',
      'qualified',
      'nurturing',
      'meeting_scheduled',
      'proposal_sent',
      'negotiation',
      'won',
      'lost',
      'inactive'
    );
  END IF;
END $$;

-- 2) ALTER CONTACTS TABLE ----------------------------------------------
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS status contact_status_enum NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS next_action_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_action_type TEXT,
  ADD COLUMN IF NOT EXISTS last_action_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lifecycle_stage TEXT DEFAULT 'lead',
  ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0 CHECK (lead_score BETWEEN 0 AND 100);

-- 3) INDEXES -----------------------------------------------------------
CREATE INDEX IF NOT EXISTS contacts_workspace_status_idx
  ON public.contacts (workspace_id, status);

CREATE INDEX IF NOT EXISTS contacts_workspace_next_action_idx
  ON public.contacts (workspace_id, next_action_at)
  WHERE next_action_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS contacts_lead_score_idx
  ON public.contacts (workspace_id, lead_score DESC);



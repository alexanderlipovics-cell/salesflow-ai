-- =====================================================================
-- Migration 20250102 - Tasks System Complete (priority, recurring, RLS)
-- =====================================================================

-- 1) ENUMS -------------------------------------------------------------
CREATE TYPE IF NOT EXISTS task_type_enum AS ENUM (
  'follow_up',
  'call',
  'send_info',
  'book_meeting',
  'send_contract',
  'custom'
);

CREATE TYPE IF NOT EXISTS task_status_enum AS ENUM (
  'open',
  'in_progress',
  'done',
  'skipped',
  'overdue'
);

CREATE TYPE IF NOT EXISTS task_priority_enum AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

-- 2) TASKS TABLE -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tasks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id      UUID NOT NULL,
  contact_id        UUID,
  assigned_user_id  UUID,
  created_by        UUID,
  type              task_type_enum NOT NULL,
  status            task_status_enum NOT NULL DEFAULT 'open',
  priority          task_priority_enum NOT NULL DEFAULT 'medium',
  title             TEXT NOT NULL,
  description       TEXT,
  due_at            TIMESTAMPTZ NOT NULL,
  completed_at      TIMESTAMPTZ,
  reminder_at       TIMESTAMPTZ,
  reminder_sent_at  TIMESTAMPTZ,
  automation_run_id UUID,
  recurring_rule    JSONB,
  notes             TEXT,
  is_archived       BOOLEAN DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3) FOREIGN KEYS ------------------------------------------------------
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_workspace_fk
  FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_contact_fk
  FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_assigned_user_fk
  FOREIGN KEY (assigned_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_created_by_fk
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4) INDEXES -----------------------------------------------------------
CREATE INDEX IF NOT EXISTS tasks_workspace_status_due_idx
  ON public.tasks (workspace_id, status, due_at)
  WHERE NOT is_archived;

CREATE INDEX IF NOT EXISTS tasks_assigned_user_due_idx
  ON public.tasks (assigned_user_id, due_at)
  WHERE status IN ('open', 'in_progress') AND NOT is_archived;

CREATE INDEX IF NOT EXISTS tasks_contact_idx
  ON public.tasks (contact_id)
  WHERE NOT is_archived;

CREATE INDEX IF NOT EXISTS tasks_reminder_idx
  ON public.tasks (reminder_at)
  WHERE reminder_sent_at IS NULL AND NOT is_archived;

-- 5) RLS POLICIES ------------------------------------------------------
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS tasks_select_policy
  ON public.tasks FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS tasks_all_policy
  ON public.tasks FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid()
    )
  );

-- 6) TRIGGERS ----------------------------------------------------------
-- Ensure helper exists
CREATE OR REPLACE FUNCTION update_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tasks_updated_at_trigger ON public.tasks;

CREATE TRIGGER tasks_updated_at_trigger
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_timestamp();

CREATE OR REPLACE FUNCTION update_task_overdue_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('open', 'in_progress') AND NEW.due_at < CURRENT_TIMESTAMP THEN
    NEW.status := 'overdue';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tasks_overdue_trigger ON public.tasks;

CREATE TRIGGER tasks_overdue_trigger
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  WHEN (OLD.status IN ('open', 'in_progress') AND NEW.due_at < CURRENT_TIMESTAMP)
  EXECUTE FUNCTION update_task_overdue_status();



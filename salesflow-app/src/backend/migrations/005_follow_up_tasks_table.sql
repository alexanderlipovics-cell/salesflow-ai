-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  SALES FLOW AI - FOLLOW-UP TASKS TABLE                                     ║
-- ║  Einfache Task-Tabelle für die Mobile App                                  ║
-- ╚════════════════════════════════════════════════════════════════════════════╝
--
-- Diese Tabelle speichert einfache Follow-up Tasks für die Mobile App.
-- Sie ist unabhängig von der komplexeren follow_ups Tabelle.
--
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════════════════
-- FOLLOW-UP TASKS TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.follow_up_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Lead Reference (optional - kann auch ohne Lead existieren)
  lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  lead_name TEXT,  -- Cached für schnellen Zugriff
  
  -- Task Details
  action TEXT NOT NULL DEFAULT 'follow_up' CHECK (action IN (
    'call', 'email', 'meeting', 'message', 'follow_up', 'task'
  )),
  description TEXT NOT NULL,
  
  -- Scheduling
  due_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_time TIME,
  
  -- Priority
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN (
    'low', 'medium', 'high', 'urgent'
  )),
  
  -- Status
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  
  -- Reminder
  reminder_at TIMESTAMPTZ,
  reminder_sent BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_user_id 
  ON public.follow_up_tasks(user_id);

CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_lead_id 
  ON public.follow_up_tasks(lead_id);

CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_due_date 
  ON public.follow_up_tasks(due_date);

CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_completed 
  ON public.follow_up_tasks(completed);

CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_priority 
  ON public.follow_up_tasks(priority);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_user_due_completed 
  ON public.follow_up_tasks(user_id, due_date, completed);

-- ═══════════════════════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE public.follow_up_tasks ENABLE ROW LEVEL SECURITY;

-- Users können nur ihre eigenen Tasks sehen
DROP POLICY IF EXISTS "follow_up_tasks_select_own" ON public.follow_up_tasks;
CREATE POLICY "follow_up_tasks_select_own"
ON public.follow_up_tasks FOR SELECT
USING (user_id = auth.uid());

-- Users können nur ihre eigenen Tasks erstellen
DROP POLICY IF EXISTS "follow_up_tasks_insert_own" ON public.follow_up_tasks;
CREATE POLICY "follow_up_tasks_insert_own"
ON public.follow_up_tasks FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users können nur ihre eigenen Tasks aktualisieren
DROP POLICY IF EXISTS "follow_up_tasks_update_own" ON public.follow_up_tasks;
CREATE POLICY "follow_up_tasks_update_own"
ON public.follow_up_tasks FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Users können nur ihre eigenen Tasks löschen
DROP POLICY IF EXISTS "follow_up_tasks_delete_own" ON public.follow_up_tasks;
CREATE POLICY "follow_up_tasks_delete_own"
ON public.follow_up_tasks FOR DELETE
USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════
-- AUTO-UPDATE TRIGGER
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_follow_up_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  
  -- Wenn completed auf true gesetzt wird, completed_at setzen
  IF NEW.completed = TRUE AND OLD.completed = FALSE THEN
    NEW.completed_at = NOW();
  END IF;
  
  -- Wenn completed auf false zurückgesetzt wird, completed_at löschen
  IF NEW.completed = FALSE AND OLD.completed = TRUE THEN
    NEW.completed_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_follow_up_tasks_updated_at ON public.follow_up_tasks;
CREATE TRIGGER trigger_follow_up_tasks_updated_at
  BEFORE UPDATE ON public.follow_up_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_follow_up_tasks_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- VIEWS
-- ═══════════════════════════════════════════════════════════════════════════

-- View für überfällige Tasks
CREATE OR REPLACE VIEW public.v_overdue_tasks AS
SELECT 
  t.*,
  l.name as lead_full_name,
  l.email as lead_email,
  l.phone as lead_phone,
  l.status as lead_status,
  CURRENT_DATE - t.due_date as days_overdue
FROM public.follow_up_tasks t
LEFT JOIN public.leads l ON t.lead_id = l.id
WHERE t.completed = FALSE
  AND t.due_date < CURRENT_DATE
ORDER BY t.due_date ASC;

-- View für heutige Tasks
CREATE OR REPLACE VIEW public.v_today_tasks AS
SELECT 
  t.*,
  l.name as lead_full_name,
  l.email as lead_email,
  l.phone as lead_phone
FROM public.follow_up_tasks t
LEFT JOIN public.leads l ON t.lead_id = l.id
WHERE t.completed = FALSE
  AND t.due_date = CURRENT_DATE
ORDER BY t.priority DESC, t.due_time ASC NULLS LAST;

-- ═══════════════════════════════════════════════════════════════════════════
-- SAMPLE DATA (Optional - für Demo)
-- ═══════════════════════════════════════════════════════════════════════════

-- Uncomment to add demo data
/*
INSERT INTO public.follow_up_tasks (user_id, lead_name, action, description, due_date, priority)
VALUES 
  (auth.uid(), 'Max Mustermann', 'call', 'Angebot besprechen', CURRENT_DATE, 'high'),
  (auth.uid(), 'Anna Schmidt', 'email', 'Demo-Unterlagen senden', CURRENT_DATE, 'medium'),
  (auth.uid(), 'Thomas Weber', 'meeting', 'Abschlussgespräch', CURRENT_DATE + 2, 'high'),
  (auth.uid(), 'Lisa Müller', 'message', 'Interesse nachfragen', CURRENT_DATE + 5, 'low');
*/

-- ═══════════════════════════════════════════════════════════════════════════
-- SUCCESS MESSAGE
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔══════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ FOLLOW-UP TASKS TABLE CREATED SUCCESSFULLY!             ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Created:';
  RAISE NOTICE '   • Table: follow_up_tasks';
  RAISE NOTICE '   • Indexes: 6 (for performance)';
  RAISE NOTICE '   • RLS Policies: 4 (CRUD)';
  RAISE NOTICE '   • Trigger: auto-update updated_at & completed_at';
  RAISE NOTICE '   • Views: v_overdue_tasks, v_today_tasks';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 RLS enabled - users can only access their own tasks';
  RAISE NOTICE '';
END $$;


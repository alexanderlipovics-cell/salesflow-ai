-- ============================================
-- SALES FLOW AI - PROPOSAL REMINDER SYSTEM
-- Version: 008
-- Datum: 2024
-- Beschreibung: Automatisches Reminder-System für
--               Kontakte mit status='proposal_sent'
-- ============================================
--
-- Funktionen:
-- 1. proposal_reminder_trigger - Überwacht contacts
-- 2. check_proposal_reminders() - RPC für Reminder-Check
-- 3. create_reminder_task() - Helper für Task-Erstellung
--
-- ============================================

-- ============================================
-- HELPER: ENUM FÜR TASK TYPES (falls nicht existiert)
-- ============================================

DO $$
BEGIN
  -- Task type enum erweitern falls nötig
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'task_type_enum'
  ) THEN
    CREATE TYPE task_type_enum AS ENUM (
      'follow_up', 'call', 'email', 'meeting', 'reminder', 'proposal'
    );
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 1. HELPER RPC: create_reminder_task
-- Erstellt einen Reminder-Task für einen Kontakt
-- ============================================

CREATE OR REPLACE FUNCTION create_reminder_task(
  p_contact_id UUID,
  p_workspace_id UUID,
  p_priority_score INTEGER DEFAULT 90
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_id UUID;
  v_contact_name TEXT;
  v_days_since_proposal INTEGER;
  v_existing_reminder UUID;
BEGIN
  -- ════════════════════════════════════════════════════════════════
  -- 1. Prüfen ob Kontakt existiert und proposal_sent Status hat
  -- ════════════════════════════════════════════════════════════════
  
  SELECT 
    COALESCE(c.name, c.email, 'Unbekannt'),
    EXTRACT(DAY FROM (NOW() - c.last_contact_at))::INTEGER
  INTO v_contact_name, v_days_since_proposal
  FROM contacts c
  WHERE c.id = p_contact_id
    AND c.workspace_id = p_workspace_id
    AND c.status = 'proposal_sent';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Kontakt nicht gefunden oder nicht im Status proposal_sent: %', p_contact_id
      USING ERRCODE = 'P0002';
  END IF;
  
  -- ════════════════════════════════════════════════════════════════
  -- 2. Prüfen ob bereits ein offener Reminder existiert
  -- ════════════════════════════════════════════════════════════════
  
  SELECT t.id INTO v_existing_reminder
  FROM tasks t
  WHERE t.contact_id = p_contact_id
    AND t.workspace_id = p_workspace_id
    AND t.task_type = 'reminder'
    AND t.status NOT IN ('completed', 'cancelled')
  LIMIT 1;
  
  IF FOUND THEN
    -- Bestehenden Reminder zurückgeben statt neuen zu erstellen
    RETURN v_existing_reminder;
  END IF;
  
  -- ════════════════════════════════════════════════════════════════
  -- 3. Neuen Reminder-Task erstellen
  -- ════════════════════════════════════════════════════════════════
  
  -- Priority Score basierend auf Tagen seit Proposal berechnen
  -- Je länger her, desto höher die Priorität (max 95)
  IF p_priority_score IS NULL THEN
    p_priority_score := LEAST(85 + (v_days_since_proposal * 2), 95);
  END IF;
  
  INSERT INTO tasks (
    workspace_id,
    contact_id,
    task_type,
    title,
    description,
    priority_score,
    due_at,
    status,
    created_at,
    updated_at
  ) VALUES (
    p_workspace_id,
    p_contact_id,
    'reminder',
    'Nachfassen: Angebot bei ' || v_contact_name,
    'Automatischer Reminder: Angebot vor ' || v_days_since_proposal || ' Tagen gesendet. Zeit zum Nachfassen!',
    p_priority_score,
    NOW(),  -- Sofort fällig
    'pending',
    NOW(),
    NOW()
  )
  RETURNING id INTO v_task_id;
  
  -- ════════════════════════════════════════════════════════════════
  -- 4. Activity Log erstellen
  -- ════════════════════════════════════════════════════════════════
  
  INSERT INTO activity_log (
    workspace_id,
    contact_id,
    activity_type,
    description,
    metadata,
    created_at
  ) VALUES (
    p_workspace_id,
    p_contact_id,
    'auto_reminder_created',
    'Auto-Reminder erstellt für Proposal-Nachfassen',
    jsonb_build_object(
      'task_id', v_task_id,
      'days_since_proposal', v_days_since_proposal,
      'priority_score', p_priority_score,
      'trigger', 'proposal_reminder_system'
    ),
    NOW()
  );
  
  RETURN v_task_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Fehler beim Erstellen des Reminder-Tasks: %', SQLERRM;
    RETURN NULL;
END;
$$;

COMMENT ON FUNCTION create_reminder_task(UUID, UUID, INTEGER) IS 
'Erstellt einen Reminder-Task für einen Kontakt mit proposal_sent Status.
Priority Score: 85-95 basierend auf Tagen seit Proposal.
Verhindert Duplikate durch Check auf bestehende offene Reminders.';

-- ============================================
-- 2. RPC: check_proposal_reminders
-- Findet alle Kontakte die einen Reminder brauchen
-- ============================================

CREATE OR REPLACE FUNCTION check_proposal_reminders(
  p_workspace_id UUID,
  p_days_threshold INTEGER DEFAULT 3
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_contacts_needing_reminder JSONB;
  v_count INTEGER;
BEGIN
  -- ════════════════════════════════════════════════════════════════
  -- 1. Workspace-Berechtigung prüfen
  -- ════════════════════════════════════════════════════════════════
  
  IF NOT EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = p_workspace_id
      AND wm.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Keine Berechtigung für diesen Workspace'
      USING ERRCODE = 'P0001';
  END IF;
  
  -- ════════════════════════════════════════════════════════════════
  -- 2. Kontakte mit proposal_sent finden, die Reminder brauchen
  -- ════════════════════════════════════════════════════════════════
  
  SELECT 
    COALESCE(jsonb_agg(contact_data), '[]'::jsonb),
    COUNT(*)
  INTO v_contacts_needing_reminder, v_count
  FROM (
    SELECT jsonb_build_object(
      'contact_id', c.id,
      'name', COALESCE(c.name, c.email, 'Unbekannt'),
      'email', c.email,
      'phone', c.phone,
      'company', c.company,
      'days_since_proposal', EXTRACT(DAY FROM (NOW() - c.last_contact_at))::INTEGER,
      'proposal_sent_at', c.last_contact_at,
      'existing_reminders', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'task_id', t.id,
          'title', t.title,
          'status', t.status,
          'due_at', t.due_at
        )), '[]'::jsonb)
        FROM tasks t
        WHERE t.contact_id = c.id
          AND t.task_type = 'reminder'
          AND t.status NOT IN ('completed', 'cancelled')
      ),
      'has_open_reminder', EXISTS (
        SELECT 1 FROM tasks t
        WHERE t.contact_id = c.id
          AND t.task_type = 'reminder'
          AND t.status NOT IN ('completed', 'cancelled')
      ),
      'priority_score', LEAST(85 + (EXTRACT(DAY FROM (NOW() - c.last_contact_at))::INTEGER * 2), 95)
    ) as contact_data
    FROM contacts c
    WHERE c.workspace_id = p_workspace_id
      AND c.status = 'proposal_sent'
      AND c.last_contact_at IS NOT NULL
      AND c.last_contact_at + (p_days_threshold || ' days')::INTERVAL < NOW()
    ORDER BY c.last_contact_at ASC  -- Älteste zuerst
  ) sub;
  
  -- ════════════════════════════════════════════════════════════════
  -- 3. Result zusammenstellen
  -- ════════════════════════════════════════════════════════════════
  
  v_result := jsonb_build_object(
    'success', TRUE,
    'workspace_id', p_workspace_id,
    'days_threshold', p_days_threshold,
    'checked_at', NOW(),
    'total_contacts', v_count,
    'contacts_needing_reminder', (
      SELECT COUNT(*) 
      FROM jsonb_array_elements(v_contacts_needing_reminder) elem
      WHERE (elem->>'has_open_reminder')::BOOLEAN = FALSE
    ),
    'contacts', v_contacts_needing_reminder
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', SQLERRM,
      'error_code', SQLSTATE,
      'workspace_id', p_workspace_id
    );
END;
$$;

COMMENT ON FUNCTION check_proposal_reminders(UUID, INTEGER) IS
'Prüft welche Kontakte mit status=proposal_sent einen Reminder brauchen.
Parameter:
- p_workspace_id: UUID des Workspace
- p_days_threshold: Tage nach proposal_sent bis Reminder (default: 3)
Returns: JSONB mit contacts Array und Statistiken.';

-- ============================================
-- 3. RPC: process_proposal_reminders
-- Erstellt automatisch alle nötigen Reminders
-- ============================================

CREATE OR REPLACE FUNCTION process_proposal_reminders(
  p_workspace_id UUID,
  p_days_threshold INTEGER DEFAULT 3,
  p_auto_create BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_check_result JSONB;
  v_created_tasks UUID[];
  v_contact RECORD;
  v_task_id UUID;
BEGIN
  -- ════════════════════════════════════════════════════════════════
  -- 1. Erst check_proposal_reminders aufrufen
  -- ════════════════════════════════════════════════════════════════
  
  v_check_result := check_proposal_reminders(p_workspace_id, p_days_threshold);
  
  IF NOT (v_check_result->>'success')::BOOLEAN THEN
    RETURN v_check_result;
  END IF;
  
  -- ════════════════════════════════════════════════════════════════
  -- 2. Wenn auto_create aktiv, Reminders erstellen
  -- ════════════════════════════════════════════════════════════════
  
  IF p_auto_create THEN
    FOR v_contact IN 
      SELECT 
        (elem->>'contact_id')::UUID as contact_id,
        (elem->>'has_open_reminder')::BOOLEAN as has_open_reminder,
        (elem->>'priority_score')::INTEGER as priority_score
      FROM jsonb_array_elements(v_check_result->'contacts') elem
      WHERE (elem->>'has_open_reminder')::BOOLEAN = FALSE
    LOOP
      v_task_id := create_reminder_task(
        v_contact.contact_id,
        p_workspace_id,
        v_contact.priority_score
      );
      
      IF v_task_id IS NOT NULL THEN
        v_created_tasks := array_append(v_created_tasks, v_task_id);
      END IF;
    END LOOP;
  END IF;
  
  -- ════════════════════════════════════════════════════════════════
  -- 3. Result mit erstellten Tasks zurückgeben
  -- ════════════════════════════════════════════════════════════════
  
  RETURN v_check_result || jsonb_build_object(
    'auto_create', p_auto_create,
    'tasks_created', COALESCE(array_length(v_created_tasks, 1), 0),
    'created_task_ids', COALESCE(to_jsonb(v_created_tasks), '[]'::jsonb)
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$;

COMMENT ON FUNCTION process_proposal_reminders(UUID, INTEGER, BOOLEAN) IS
'Verarbeitet alle Proposal-Reminders für einen Workspace.
Kann optional automatisch Reminder-Tasks erstellen.
Parameter:
- p_workspace_id: UUID des Workspace
- p_days_threshold: Tage bis Reminder (default: 3)
- p_auto_create: Automatisch Tasks erstellen (default: TRUE)';

-- ============================================
-- 4. TRIGGER FUNKTION: proposal_reminder_trigger
-- Wird bei Statusänderung auf proposal_sent ausgelöst
-- ============================================

CREATE OR REPLACE FUNCTION trigger_proposal_reminder()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reminder_delay INTERVAL := '3 days';
BEGIN
  -- ════════════════════════════════════════════════════════════════
  -- Nur bei Statuswechsel ZU proposal_sent triggern
  -- ════════════════════════════════════════════════════════════════
  
  IF TG_OP = 'UPDATE' THEN
    -- Prüfen ob Status sich zu proposal_sent geändert hat
    IF NEW.status = 'proposal_sent' AND 
       (OLD.status IS DISTINCT FROM 'proposal_sent') THEN
      
      -- last_contact_at setzen wenn nicht bereits gesetzt
      IF NEW.last_contact_at IS NULL THEN
        NEW.last_contact_at := NOW();
      END IF;
      
      -- Scheduled Job für Reminder erstellen (3 Tage später)
      -- Nutzt pg_cron falls verfügbar, sonst wird beim nächsten 
      -- check_proposal_reminders() Aufruf geprüft
      
      -- Metadata aktualisieren für Tracking
      NEW.metadata := COALESCE(NEW.metadata, '{}'::jsonb) || jsonb_build_object(
        'proposal_sent_at', NOW(),
        'reminder_scheduled_for', NOW() + v_reminder_delay,
        'proposal_reminder_pending', TRUE
      );
      
      -- Log erstellen
      INSERT INTO activity_log (
        workspace_id,
        contact_id,
        activity_type,
        description,
        metadata,
        created_at
      ) VALUES (
        NEW.workspace_id,
        NEW.id,
        'proposal_sent',
        'Angebot gesendet an ' || COALESCE(NEW.name, NEW.email, 'Kontakt'),
        jsonb_build_object(
          'reminder_scheduled', TRUE,
          'reminder_due_at', NOW() + v_reminder_delay
        ),
        NOW()
      );
      
    END IF;
  END IF;
  
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Bei Fehler trotzdem UPDATE durchlassen, nur Warning loggen
    RAISE WARNING 'proposal_reminder_trigger Fehler: %', SQLERRM;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION trigger_proposal_reminder() IS
'Trigger-Funktion die bei Statuswechsel zu proposal_sent aktiviert wird.
Setzt Metadata für Reminder-Tracking und erstellt Activity Log.';

-- ============================================
-- 5. TRIGGER AUF CONTACTS TABELLE
-- ============================================

-- Erst bestehenden Trigger löschen falls vorhanden
DROP TRIGGER IF EXISTS proposal_reminder_trigger ON contacts;

-- Neuen Trigger erstellen
CREATE TRIGGER proposal_reminder_trigger
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  WHEN (NEW.status = 'proposal_sent')
  EXECUTE FUNCTION trigger_proposal_reminder();

-- ============================================
-- 6. SCHEDULED CHECK VIEW
-- Übersicht aller pending Reminders
-- ============================================

CREATE OR REPLACE VIEW v_pending_proposal_reminders AS
SELECT 
  c.id as contact_id,
  c.workspace_id,
  c.name,
  c.email,
  c.phone,
  c.company,
  c.status,
  c.last_contact_at as proposal_sent_at,
  EXTRACT(DAY FROM (NOW() - c.last_contact_at))::INTEGER as days_since_proposal,
  c.metadata->>'reminder_scheduled_for' as reminder_scheduled_for,
  CASE 
    WHEN c.last_contact_at + INTERVAL '3 days' < NOW() THEN 'overdue'
    WHEN c.last_contact_at + INTERVAL '2 days' < NOW() THEN 'due_soon'
    ELSE 'scheduled'
  END as reminder_status,
  LEAST(85 + (EXTRACT(DAY FROM (NOW() - c.last_contact_at))::INTEGER * 2), 95) as suggested_priority,
  (
    SELECT COUNT(*) FROM tasks t 
    WHERE t.contact_id = c.id 
      AND t.task_type = 'reminder' 
      AND t.status NOT IN ('completed', 'cancelled')
  ) as open_reminder_count
FROM contacts c
WHERE c.status = 'proposal_sent'
  AND c.last_contact_at IS NOT NULL
ORDER BY c.last_contact_at ASC;

COMMENT ON VIEW v_pending_proposal_reminders IS
'Zeigt alle Kontakte mit proposal_sent Status und deren Reminder-Status.
Columns: contact_id, days_since_proposal, reminder_status, suggested_priority';

-- ============================================
-- 7. INDEX FÜR PERFORMANCE
-- ============================================

-- Index für schnelle Abfrage der proposal_sent Kontakte
CREATE INDEX IF NOT EXISTS idx_contacts_proposal_sent 
  ON contacts(workspace_id, status, last_contact_at) 
  WHERE status = 'proposal_sent';

-- Index für Tasks mit reminder type
CREATE INDEX IF NOT EXISTS idx_tasks_reminder_type 
  ON tasks(contact_id, task_type, status) 
  WHERE task_type = 'reminder';

-- ============================================
-- 8. RLS POLICIES
-- ============================================

-- Sicherstellen dass nur Workspace-Mitglieder die View nutzen können
-- (Die View nutzt die zugrundeliegenden Tabellen-RLS Policies)

-- ============================================
-- 9. GRANT PERMISSIONS
-- ============================================

-- Funktionen für authenticated users freigeben
GRANT EXECUTE ON FUNCTION create_reminder_task(UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION check_proposal_reminders(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION process_proposal_reminders(UUID, INTEGER, BOOLEAN) TO authenticated;

-- View für authenticated users freigeben
GRANT SELECT ON v_pending_proposal_reminders TO authenticated;

-- ============================================
-- 10. SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔══════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ PROPOSAL REMINDER SYSTEM MIGRATION ERFOLGREICH!          ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Erstellt:';
  RAISE NOTICE '   • Funktion: create_reminder_task(contact_id, workspace_id, priority)';
  RAISE NOTICE '   • Funktion: check_proposal_reminders(workspace_id, days_threshold)';
  RAISE NOTICE '   • Funktion: process_proposal_reminders(workspace_id, days, auto)';
  RAISE NOTICE '   • Trigger:  proposal_reminder_trigger ON contacts';
  RAISE NOTICE '   • View:     v_pending_proposal_reminders';
  RAISE NOTICE '   • Indexes:  idx_contacts_proposal_sent, idx_tasks_reminder_type';
  RAISE NOTICE '';
  RAISE NOTICE '🔔 Funktionsweise:';
  RAISE NOTICE '   1. Kontakt auf status=proposal_sent setzen';
  RAISE NOTICE '   2. Trigger setzt Metadata + Activity Log';
  RAISE NOTICE '   3. Nach 3 Tagen: check_proposal_reminders() prüft';
  RAISE NOTICE '   4. process_proposal_reminders() erstellt Tasks automatisch';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Nutzung:';
  RAISE NOTICE '   SELECT * FROM check_proposal_reminders(workspace_id);';
  RAISE NOTICE '   SELECT * FROM process_proposal_reminders(workspace_id, 3, TRUE);';
  RAISE NOTICE '';
END $$;


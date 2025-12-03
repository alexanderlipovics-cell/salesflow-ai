-- ============================================================================
-- AUTO-REMINDER TRIGGER SYSTEM
-- ============================================================================
-- 
-- 🎯 PURPOSE: Automatically create reminder tasks when:
--    - Proposal sent + no reply after 3 days
--    - Important lead goes cold (no contact for 7+ days)
--    - VIP lead needs follow-up
--
-- 📋 FEATURES:
--    - Automatic task creation
--    - Configurable reminder delays
--    - Priority-based scheduling
--    - Smart duplicate prevention
--
-- 🚀 HOW IT WORKS:
--    1. Trigger runs on INSERT/UPDATE to leads table
--    2. Checks reminder conditions
--    3. Creates task if conditions met
--    4. Prevents duplicate reminders
--
-- ============================================================================

-- ============================================================================
-- TABLE: reminder_rules
-- Defines when reminders should be created
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.reminder_rules (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    description text,
    trigger_condition text NOT NULL, -- e.g., 'proposal_no_reply'
    days_after integer NOT NULL DEFAULT 3,
    priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    task_title_template text NOT NULL,
    task_description_template text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.reminder_rules IS 'Defines automatic reminder rules';
COMMENT ON COLUMN public.reminder_rules.trigger_condition IS 'Condition that triggers reminder: proposal_no_reply, vip_cold, important_cold, etc.';
COMMENT ON COLUMN public.reminder_rules.days_after IS 'Days after condition before reminder is created';
COMMENT ON COLUMN public.reminder_rules.task_title_template IS 'Template for task title (can use {lead_name}, {days}, etc.)';

-- ============================================================================
-- TABLE: auto_reminders
-- Tracks automatically created reminders
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.auto_reminders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    rule_id uuid REFERENCES public.reminder_rules(id) ON DELETE SET NULL,
    task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE,
    trigger_condition text NOT NULL,
    triggered_at timestamptz DEFAULT now(),
    due_date timestamptz,
    completed_at timestamptz,
    is_active boolean DEFAULT true,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.auto_reminders IS 'Tracks automatically created reminder tasks';
COMMENT ON COLUMN public.auto_reminders.trigger_condition IS 'Which condition triggered this reminder';
COMMENT ON COLUMN public.auto_reminders.metadata IS 'Additional context (e.g., proposal_date, last_contact_date)';

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_reminder_rules_active ON public.reminder_rules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_auto_reminders_lead ON public.auto_reminders(lead_id);
CREATE INDEX IF NOT EXISTS idx_auto_reminders_active ON public.auto_reminders(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_auto_reminders_trigger ON public.auto_reminders(trigger_condition);
CREATE INDEX IF NOT EXISTS idx_auto_reminders_due ON public.auto_reminders(due_date) WHERE is_active = true;

-- ============================================================================
-- FUNCTION: check_and_create_auto_reminder
-- Checks if a reminder should be created for a lead
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_and_create_auto_reminder(
    p_lead_id uuid,
    p_workspace_id uuid
)
RETURNS TABLE (
    reminder_created boolean,
    reminder_id uuid,
    trigger_condition text,
    task_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_lead record;
    v_rule record;
    v_task_id uuid;
    v_reminder_id uuid;
    v_days_since_last_contact integer;
    v_days_since_proposal integer;
    v_should_create boolean;
    v_task_title text;
    v_task_description text;
    v_due_date timestamptz;
    v_existing_reminder_count integer;
BEGIN
    -- Get lead info
    SELECT 
        l.*,
        EXTRACT(DAY FROM now() - l.last_contact_date)::integer AS days_since_contact,
        EXTRACT(DAY FROM now() - l.proposal_sent_date)::integer AS days_since_proposal
    INTO v_lead
    FROM leads l
    WHERE l.id = p_lead_id
    AND l.workspace_id = p_workspace_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::uuid;
        RETURN;
    END IF;

    -- Check each active reminder rule
    FOR v_rule IN 
        SELECT * FROM reminder_rules 
        WHERE is_active = true 
        ORDER BY priority DESC, days_after ASC
    LOOP
        v_should_create := false;

        -- CONDITION 1: Proposal sent, no reply after X days
        IF v_rule.trigger_condition = 'proposal_no_reply' THEN
            IF v_lead.proposal_sent_date IS NOT NULL 
               AND v_lead.last_reply_date IS NULL
               AND EXTRACT(DAY FROM now() - v_lead.proposal_sent_date)::integer >= v_rule.days_after
            THEN
                v_should_create := true;
                v_days_since_proposal := EXTRACT(DAY FROM now() - v_lead.proposal_sent_date)::integer;
            END IF;

        -- CONDITION 2: VIP lead going cold
        ELSIF v_rule.trigger_condition = 'vip_cold' THEN
            IF v_lead.priority = 'vip'
               AND v_lead.status NOT IN ('closed_won', 'closed_lost', 'inactive')
               AND v_lead.last_contact_date IS NOT NULL
               AND EXTRACT(DAY FROM now() - v_lead.last_contact_date)::integer >= v_rule.days_after
            THEN
                v_should_create := true;
                v_days_since_last_contact := EXTRACT(DAY FROM now() - v_lead.last_contact_date)::integer;
            END IF;

        -- CONDITION 3: Important lead (hot/warm) going cold
        ELSIF v_rule.trigger_condition = 'important_cold' THEN
            IF v_lead.status IN ('hot', 'warm')
               AND v_lead.last_contact_date IS NOT NULL
               AND EXTRACT(DAY FROM now() - v_lead.last_contact_date)::integer >= v_rule.days_after
            THEN
                v_should_create := true;
                v_days_since_last_contact := EXTRACT(DAY FROM now() - v_lead.last_contact_date)::integer;
            END IF;

        -- CONDITION 4: Scheduled follow-up overdue
        ELSIF v_rule.trigger_condition = 'followup_overdue' THEN
            IF v_lead.next_followup_date IS NOT NULL
               AND v_lead.next_followup_date < now()
               AND v_lead.status NOT IN ('closed_won', 'closed_lost')
            THEN
                v_should_create := true;
            END IF;
        END IF;

        -- Check if reminder already exists for this condition
        IF v_should_create THEN
            SELECT COUNT(*) INTO v_existing_reminder_count
            FROM auto_reminders
            WHERE lead_id = p_lead_id
            AND trigger_condition = v_rule.trigger_condition
            AND is_active = true
            AND completed_at IS NULL;

            -- Only create if no active reminder exists
            IF v_existing_reminder_count = 0 THEN
                -- Generate task title from template
                v_task_title := v_rule.task_title_template;
                v_task_title := replace(v_task_title, '{lead_name}', COALESCE(v_lead.name, 'Lead'));
                v_task_title := replace(v_task_title, '{days}', COALESCE(v_days_since_last_contact::text, v_days_since_proposal::text, '?'));
                
                -- Generate task description
                v_task_description := COALESCE(v_rule.task_description_template, '');
                v_task_description := replace(v_task_description, '{lead_name}', COALESCE(v_lead.name, 'Lead'));
                v_task_description := replace(v_task_description, '{company}', COALESCE(v_lead.company, ''));

                -- Calculate due date
                v_due_date := now() + interval '1 day';
                IF v_rule.priority = 'urgent' THEN
                    v_due_date := now() + interval '4 hours';
                ELSIF v_rule.priority = 'high' THEN
                    v_due_date := now() + interval '12 hours';
                END IF;

                -- Create task
                INSERT INTO tasks (
                    workspace_id,
                    lead_id,
                    title,
                    description,
                    priority,
                    due_date,
                    status,
                    created_by_system
                ) VALUES (
                    p_workspace_id,
                    p_lead_id,
                    v_task_title,
                    v_task_description,
                    v_rule.priority,
                    v_due_date,
                    'pending',
                    true
                )
                RETURNING id INTO v_task_id;

                -- Create reminder record
                INSERT INTO auto_reminders (
                    lead_id,
                    rule_id,
                    task_id,
                    trigger_condition,
                    due_date,
                    metadata
                ) VALUES (
                    p_lead_id,
                    v_rule.id,
                    v_task_id,
                    v_rule.trigger_condition,
                    v_due_date,
                    jsonb_build_object(
                        'days_since_contact', v_days_since_last_contact,
                        'days_since_proposal', v_days_since_proposal,
                        'lead_status', v_lead.status,
                        'lead_priority', v_lead.priority
                    )
                )
                RETURNING id INTO v_reminder_id;

                -- Return success
                RETURN QUERY SELECT true, v_reminder_id, v_rule.trigger_condition, v_task_id;
                RETURN;
            END IF;
        END IF;
    END LOOP;

    -- No reminder created
    RETURN QUERY SELECT false, NULL::uuid, NULL::text, NULL::uuid;
END;
$$;

COMMENT ON FUNCTION public.check_and_create_auto_reminder IS 'Checks reminder rules and creates tasks if conditions are met';

-- ============================================================================
-- TRIGGER: trigger_auto_reminder_on_lead_update
-- Automatically checks for reminders when lead is updated
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trigger_auto_reminder_check()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_result record;
BEGIN
    -- Only check on INSERT or when relevant fields change
    IF TG_OP = 'INSERT' OR 
       (TG_OP = 'UPDATE' AND (
           OLD.status IS DISTINCT FROM NEW.status OR
           OLD.last_contact_date IS DISTINCT FROM NEW.last_contact_date OR
           OLD.proposal_sent_date IS DISTINCT FROM NEW.proposal_sent_date OR
           OLD.last_reply_date IS DISTINCT FROM NEW.last_reply_date OR
           OLD.priority IS DISTINCT FROM NEW.priority
       ))
    THEN
        -- Check and create reminder
        SELECT * INTO v_result
        FROM check_and_create_auto_reminder(NEW.id, NEW.workspace_id);
        
        -- Log if reminder was created
        IF v_result.reminder_created THEN
            RAISE NOTICE 'Auto-reminder created: % for lead %', v_result.trigger_condition, NEW.id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_auto_reminder_on_lead_change ON public.leads;

CREATE TRIGGER trigger_auto_reminder_on_lead_change
    AFTER INSERT OR UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION trigger_auto_reminder_check();

COMMENT ON TRIGGER trigger_auto_reminder_on_lead_change ON public.leads IS 'Automatically checks and creates reminders when lead data changes';

-- ============================================================================
-- FUNCTION: mark_reminder_completed
-- Marks a reminder as completed
-- ============================================================================

CREATE OR REPLACE FUNCTION public.mark_reminder_completed(
    p_reminder_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE auto_reminders
    SET 
        completed_at = now(),
        is_active = false
    WHERE id = p_reminder_id;

    RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION public.mark_reminder_completed IS 'Marks an auto-reminder as completed';

-- ============================================================================
-- FUNCTION: get_pending_reminders
-- Gets all pending reminders for a workspace
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_pending_reminders(
    p_workspace_id uuid,
    p_limit integer DEFAULT 50
)
RETURNS TABLE (
    reminder_id uuid,
    lead_id uuid,
    lead_name text,
    lead_status text,
    task_id uuid,
    task_title text,
    task_priority text,
    trigger_condition text,
    triggered_at timestamptz,
    due_date timestamptz,
    days_overdue integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 
        ar.id AS reminder_id,
        ar.lead_id,
        l.name AS lead_name,
        l.status AS lead_status,
        ar.task_id,
        t.title AS task_title,
        t.priority AS task_priority,
        ar.trigger_condition,
        ar.triggered_at,
        ar.due_date,
        CASE 
            WHEN ar.due_date < now() THEN EXTRACT(DAY FROM now() - ar.due_date)::integer
            ELSE 0
        END AS days_overdue
    FROM auto_reminders ar
    JOIN leads l ON l.id = ar.lead_id
    LEFT JOIN tasks t ON t.id = ar.task_id
    WHERE l.workspace_id = p_workspace_id
    AND ar.is_active = true
    AND ar.completed_at IS NULL
    ORDER BY 
        ar.due_date ASC,
        CASE t.priority
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            ELSE 4
        END
    LIMIT p_limit;
$$;

COMMENT ON FUNCTION public.get_pending_reminders IS 'Returns all pending reminders for a workspace';

-- ============================================================================
-- INSERT DEFAULT REMINDER RULES
-- ============================================================================

INSERT INTO public.reminder_rules (name, trigger_condition, days_after, priority, task_title_template, task_description_template)
VALUES 
    (
        'Proposal No Reply (3 days)',
        'proposal_no_reply',
        3,
        'high',
        '📋 Follow up: {lead_name} - No reply after {days} days',
        'Follow up with {lead_name} from {company}. Proposal was sent {days} days ago with no response. Consider a friendly reminder call or message.'
    ),
    (
        'VIP Lead Going Cold (7 days)',
        'vip_cold',
        7,
        'urgent',
        '⭐ URGENT: VIP lead {lead_name} needs attention',
        'VIP lead {lead_name} has not been contacted in {days} days. This is a high-priority contact that requires immediate attention.'
    ),
    (
        'Hot/Warm Lead Going Cold (10 days)',
        'important_cold',
        10,
        'medium',
        '🔥 Re-engage: {lead_name} going cold',
        'Hot/Warm lead {lead_name} has not been contacted in {days} days. Consider reaching out to keep the relationship warm.'
    ),
    (
        'Follow-up Overdue',
        'followup_overdue',
        0,
        'high',
        '⏰ Overdue follow-up: {lead_name}',
        'Scheduled follow-up with {lead_name} is overdue. Please reach out as soon as possible.'
    )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE public.reminder_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auto_reminders ENABLE ROW LEVEL SECURITY;

-- Reminder rules: All authenticated users can read
CREATE POLICY "reminder_rules_read_all" ON public.reminder_rules
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Reminder rules: Only admins can modify
CREATE POLICY "reminder_rules_admin_modify" ON public.reminder_rules
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM workspace_users
            WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

-- Auto reminders: Users can see their workspace reminders
CREATE POLICY "auto_reminders_workspace_access" ON public.auto_reminders
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM leads l
            JOIN workspace_users wu ON wu.workspace_id = l.workspace_id
            WHERE l.id = auto_reminders.lead_id
            AND wu.user_id = auth.uid()
        )
    );

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ ============================================================================';
    RAISE NOTICE '✅  AUTO-REMINDER TRIGGER SYSTEM DEPLOYED SUCCESSFULLY';
    RAISE NOTICE '✅ ============================================================================';
    RAISE NOTICE '';
    RAISE NOTICE '📊 CREATED:';
    RAISE NOTICE '   - 2 Tables: reminder_rules, auto_reminders';
    RAISE NOTICE '   - 5 Indexes for performance';
    RAISE NOTICE '   - 4 Functions: check_and_create, mark_completed, get_pending';
    RAISE NOTICE '   - 1 Trigger: Auto-check on lead changes';
    RAISE NOTICE '   - 4 Default reminder rules';
    RAISE NOTICE '   - RLS Policies enabled';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 NEXT STEPS:';
    RAISE NOTICE '   1. Test: SELECT * FROM reminder_rules;';
    RAISE NOTICE '   2. Manual trigger: SELECT check_and_create_auto_reminder(lead_id, workspace_id);';
    RAISE NOTICE '   3. View pending: SELECT * FROM get_pending_reminders(workspace_id);';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 AUTO-REMINDERS ARE NOW ACTIVE!';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';
END $$;


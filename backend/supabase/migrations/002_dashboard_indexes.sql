-- ============================================================================
-- SALES FLOW AI - DASHBOARD PERFORMANCE INDEXES
-- ============================================================================
-- Version: 1.0.0
-- Date: 2025-11-30
-- Description: Critical indexes for dashboard query performance
-- ============================================================================

-- ============================================================================
-- EVENTS TABLE INDEXES
-- ============================================================================

-- Composite index for workspace + event_type + time-based queries
CREATE INDEX IF NOT EXISTS events_workspace_type_time_idx 
  ON public.events(workspace_id, event_type, occurred_at DESC);

-- Index for template-based analytics
CREATE INDEX IF NOT EXISTS events_template_time_idx 
  ON public.events(workspace_id, template_id, occurred_at DESC) 
  WHERE template_id IS NOT NULL;

-- Index for user activity tracking
CREATE INDEX IF NOT EXISTS events_user_time_idx 
  ON public.events(workspace_id, user_id, occurred_at DESC) 
  WHERE user_id IS NOT NULL;

-- Index for contact timeline queries
CREATE INDEX IF NOT EXISTS events_contact_time_idx 
  ON public.events(workspace_id, contact_id, occurred_at DESC);

-- Index for revenue calculations
CREATE INDEX IF NOT EXISTS events_value_amount_idx
  ON public.events(workspace_id, event_type, value_amount)
  WHERE value_amount IS NOT NULL;

-- ============================================================================
-- TASKS TABLE INDEXES
-- ============================================================================

-- Composite index for today's open tasks
CREATE INDEX IF NOT EXISTS tasks_workspace_due_status_idx 
  ON public.tasks(workspace_id, status, due_at) 
  WHERE status = 'open';

-- Index for priority-based task queries
CREATE INDEX IF NOT EXISTS tasks_priority_idx 
  ON public.tasks(workspace_id, priority, due_at) 
  WHERE status = 'open';

-- Index for user task assignments
CREATE INDEX IF NOT EXISTS tasks_assigned_user_idx
  ON public.tasks(workspace_id, assigned_user_id, status, due_at)
  WHERE assigned_user_id IS NOT NULL;

-- ============================================================================
-- CONTACTS TABLE INDEXES
-- ============================================================================

-- Index for contact lookups in task queries
CREATE INDEX IF NOT EXISTS contacts_workspace_status_idx
  ON public.contacts(workspace_id, status);

-- Index for lead score sorting
CREATE INDEX IF NOT EXISTS contacts_lead_score_idx
  ON public.contacts(workspace_id, lead_score DESC);

-- ============================================================================
-- WORKSPACE_USERS TABLE INDEXES
-- ============================================================================

-- Index for active users in workspace
CREATE INDEX IF NOT EXISTS workspace_users_workspace_status_idx 
  ON public.workspace_users(workspace_id, status) 
  WHERE status = 'active';

-- Index for user lookups
CREATE INDEX IF NOT EXISTS workspace_users_user_workspace_idx
  ON public.workspace_users(user_id, workspace_id);

-- ============================================================================
-- MESSAGE_TEMPLATES TABLE INDEXES
-- ============================================================================

-- Index for template analytics queries
CREATE INDEX IF NOT EXISTS message_templates_workspace_status_idx
  ON public.message_templates(workspace_id, status)
  WHERE status = 'active';

-- Index for template performance tracking
CREATE INDEX IF NOT EXISTS message_templates_channel_idx
  ON public.message_templates(workspace_id, channel, status);

-- ============================================================================
-- VERIFY INDEX CREATION
-- ============================================================================

-- Run this query to verify all indexes were created successfully:
/*
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('events', 'tasks', 'contacts', 'message_templates', 'workspace_users')
  AND indexname LIKE '%workspace%' OR indexname LIKE '%time%' OR indexname LIKE '%status%'
ORDER BY tablename, indexname;
*/


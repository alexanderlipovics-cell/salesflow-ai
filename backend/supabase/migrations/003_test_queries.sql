-- ============================================================================
-- SALES FLOW AI - TEST QUERIES & VERIFICATION
-- ============================================================================
-- Version: 1.0.0
-- Date: 2025-11-30
-- Description: Test queries für alle Dashboard RPC Functions
-- ============================================================================

-- ============================================================================
-- SETUP: Replace YOUR_WORKSPACE_ID with actual UUID
-- ============================================================================

-- SET workspace_id = 'YOUR_WORKSPACE_ID_HERE';

-- ============================================================================
-- TEST 1: Today Overview
-- ============================================================================

-- Test Query
SELECT * FROM dashboard_today_overview('YOUR_WORKSPACE_ID');

-- Expected Columns:
-- - tasks_due_today (integer)
-- - tasks_done_today (integer)
-- - leads_created_today (integer)
-- - first_messages_today (integer)
-- - signups_today (integer)
-- - revenue_today (numeric)

-- ============================================================================
-- TEST 2: Today Tasks
-- ============================================================================

-- Test Query (Limit 10)
SELECT * FROM dashboard_today_tasks('YOUR_WORKSPACE_ID', 10);

-- Expected Columns:
-- - task_id (uuid)
-- - contact_id (uuid)
-- - contact_name (text)
-- - contact_status (text)
-- - contact_lead_score (integer)
-- - task_type (text)
-- - task_due_at (timestamptz)
-- - task_status (text)
-- - assigned_user_id (uuid)
-- - priority (text)

-- ============================================================================
-- TEST 3: Week Overview
-- ============================================================================

-- Test Query
SELECT * FROM dashboard_week_overview('YOUR_WORKSPACE_ID');

-- Expected Columns:
-- - leads_this_week (integer)
-- - first_messages_this_week (integer)
-- - signups_this_week (integer)
-- - revenue_this_week (numeric)

-- ============================================================================
-- TEST 4: Week Timeseries
-- ============================================================================

-- Test Query
SELECT * FROM dashboard_week_timeseries('YOUR_WORKSPACE_ID');

-- Expected Columns:
-- - day (date)
-- - leads (integer)
-- - signups (integer)
-- - first_messages (integer)

-- Verify: Should return 7 rows (one per day of week)
SELECT count(*) as row_count 
FROM dashboard_week_timeseries('YOUR_WORKSPACE_ID');

-- ============================================================================
-- TEST 5: Top Templates
-- ============================================================================

-- Test Query (Last 30 days, Limit 10)
SELECT * FROM dashboard_top_templates('YOUR_WORKSPACE_ID', 30, 10);

-- Expected Columns:
-- - template_id (uuid)
-- - title (text)
-- - purpose (text)
-- - channel (text)
-- - contacts_contacted (integer)
-- - contacts_signed (integer)
-- - conversion_rate_percent (numeric)

-- Test: Verify ordering by conversion rate
SELECT 
  title,
  conversion_rate_percent,
  contacts_contacted,
  contacts_signed
FROM dashboard_top_templates('YOUR_WORKSPACE_ID', 30, 10)
ORDER BY conversion_rate_percent DESC;

-- ============================================================================
-- TEST 6: Funnel Stats
-- ============================================================================

-- Test Query
SELECT * FROM dashboard_funnel_stats('YOUR_WORKSPACE_ID');

-- Expected Columns:
-- - avg_days_to_signup (numeric)
-- - median_days_to_signup (numeric)
-- - min_days_to_signup (numeric)
-- - max_days_to_signup (numeric)
-- - contacts_with_signup (integer)

-- ============================================================================
-- TEST 7: Top Networkers
-- ============================================================================

-- Test Query (Last 30 days, Top 5)
SELECT * FROM dashboard_top_networkers('YOUR_WORKSPACE_ID', 30, 5);

-- Expected Columns:
-- - user_id (uuid)
-- - email (text)
-- - name (text)
-- - contacts_contacted (integer)
-- - contacts_signed (integer)
-- - conversion_rate_percent (numeric)
-- - active_days (integer)
-- - current_streak (integer)

-- ============================================================================
-- TEST 8: Needs Help
-- ============================================================================

-- Test Query (Last 30 days, Min 10 contacts, Top 5)
SELECT * FROM dashboard_needs_help('YOUR_WORKSPACE_ID', 30, 10, 5);

-- Expected Columns:
-- - user_id (uuid)
-- - email (text)
-- - name (text)
-- - contacts_contacted (integer)
-- - contacts_signed (integer)
-- - conversion_rate_percent (numeric)
-- - active_days (integer)

-- ============================================================================
-- PERFORMANCE TESTING
-- ============================================================================

-- Test 1: Explain Analyze - Today Overview
EXPLAIN ANALYZE
SELECT * FROM dashboard_today_overview('YOUR_WORKSPACE_ID');

-- Test 2: Explain Analyze - Today Tasks
EXPLAIN ANALYZE
SELECT * FROM dashboard_today_tasks('YOUR_WORKSPACE_ID', 100);

-- Test 3: Explain Analyze - Week Overview
EXPLAIN ANALYZE
SELECT * FROM dashboard_week_overview('YOUR_WORKSPACE_ID');

-- Test 4: Explain Analyze - Top Templates
EXPLAIN ANALYZE
SELECT * FROM dashboard_top_templates('YOUR_WORKSPACE_ID', 30, 20);

-- Test 5: Explain Analyze - Top Networkers
EXPLAIN ANALYZE
SELECT * FROM dashboard_top_networkers('YOUR_WORKSPACE_ID', 30, 5);

-- ============================================================================
-- INDEX VERIFICATION
-- ============================================================================

-- Check Index Usage Statistics
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN ('events', 'tasks', 'contacts', 'message_templates', 'workspace_users')
ORDER BY idx_scan DESC;

-- Check for Missing Indexes (Sequential Scans)
SELECT 
  schemaname,
  tablename,
  seq_scan as sequential_scans,
  seq_tup_read as rows_read_sequentially,
  idx_scan as index_scans,
  CASE 
    WHEN seq_scan = 0 THEN 0
    ELSE ROUND((100.0 * idx_scan / (seq_scan + idx_scan))::numeric, 2)
  END as index_usage_percent
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND tablename IN ('events', 'tasks', 'contacts', 'message_templates', 'workspace_users')
ORDER BY seq_scan DESC;

-- ============================================================================
-- DATA INTEGRITY CHECKS
-- ============================================================================

-- Check 1: Verify Events Table has data
SELECT 
  count(*) as total_events,
  count(DISTINCT workspace_id) as workspaces,
  count(DISTINCT event_type) as event_types,
  min(occurred_at) as first_event,
  max(occurred_at) as last_event
FROM public.events;

-- Check 2: Verify Tasks Table has data
SELECT 
  count(*) as total_tasks,
  count(DISTINCT workspace_id) as workspaces,
  count(*) FILTER (WHERE status = 'open') as open_tasks,
  count(*) FILTER (WHERE status = 'done') as done_tasks
FROM public.tasks;

-- Check 3: Verify Contacts Table has data
SELECT 
  count(*) as total_contacts,
  count(DISTINCT workspace_id) as workspaces,
  count(*) FILTER (WHERE status = 'active') as active_contacts
FROM public.contacts;

-- Check 4: Verify Message Templates Table has data
SELECT 
  count(*) as total_templates,
  count(DISTINCT workspace_id) as workspaces,
  count(*) FILTER (WHERE status = 'active') as active_templates
FROM public.message_templates;

-- Check 5: Verify Workspace Users Table has data
SELECT 
  count(*) as total_workspace_users,
  count(DISTINCT workspace_id) as workspaces,
  count(DISTINCT user_id) as unique_users,
  count(*) FILTER (WHERE status = 'active') as active_users
FROM public.workspace_users;

-- ============================================================================
-- BENCHMARK: Complete Dashboard Load Time
-- ============================================================================

-- Run all functions and measure total time
\timing on

SELECT 'today_overview' as metric, * FROM dashboard_today_overview('YOUR_WORKSPACE_ID');
SELECT 'today_tasks' as metric, count(*) FROM dashboard_today_tasks('YOUR_WORKSPACE_ID', 100);
SELECT 'week_overview' as metric, * FROM dashboard_week_overview('YOUR_WORKSPACE_ID');
SELECT 'week_timeseries' as metric, count(*) FROM dashboard_week_timeseries('YOUR_WORKSPACE_ID');
SELECT 'top_templates' as metric, count(*) FROM dashboard_top_templates('YOUR_WORKSPACE_ID', 30, 20);
SELECT 'funnel_stats' as metric, * FROM dashboard_funnel_stats('YOUR_WORKSPACE_ID');
SELECT 'top_networkers' as metric, count(*) FROM dashboard_top_networkers('YOUR_WORKSPACE_ID', 30, 5);
SELECT 'needs_help' as metric, count(*) FROM dashboard_needs_help('YOUR_WORKSPACE_ID', 30, 10, 5);

\timing off

-- ============================================================================
-- UTILITY: Get Sample Workspace ID
-- ============================================================================

-- Get a workspace_id to use for testing
SELECT DISTINCT workspace_id 
FROM public.events 
LIMIT 1;

-- ============================================================================
-- CLEANUP (if needed)
-- ============================================================================

-- Drop all functions (use only if you need to recreate)
/*
DROP FUNCTION IF EXISTS dashboard_today_overview(uuid);
DROP FUNCTION IF EXISTS dashboard_today_tasks(uuid, integer);
DROP FUNCTION IF EXISTS dashboard_week_overview(uuid);
DROP FUNCTION IF EXISTS dashboard_week_timeseries(uuid);
DROP FUNCTION IF EXISTS dashboard_top_templates(uuid, integer, integer);
DROP FUNCTION IF EXISTS dashboard_funnel_stats(uuid);
DROP FUNCTION IF EXISTS dashboard_top_networkers(uuid, integer, integer);
DROP FUNCTION IF EXISTS dashboard_needs_help(uuid, integer, integer, integer);
*/


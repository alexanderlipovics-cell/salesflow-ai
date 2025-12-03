-- ============================================================================
-- SALES FLOW AI - PERFORMANCE MONITORING SCRIPT
-- ============================================================================
-- Version: 1.0.0
-- Description: Monitoring & Performance Tracking für Dashboard Analytics
-- ============================================================================

-- ============================================================================
-- 1. DASHBOARD FUNCTIONS PERFORMANCE OVERVIEW
-- ============================================================================

-- Zeigt durchschnittliche Execution Time pro Function
-- (Erfordert pg_stat_statements Extension)

-- Enable Extension (falls noch nicht aktiv):
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

SELECT 
  substring(query from 'dashboard_[a-z_]+') as function_name,
  calls,
  round(mean_exec_time::numeric, 2) as avg_time_ms,
  round(max_exec_time::numeric, 2) as max_time_ms,
  round(min_exec_time::numeric, 2) as min_time_ms,
  round(total_exec_time::numeric, 2) as total_time_ms
FROM pg_stat_statements
WHERE query LIKE '%dashboard_%'
ORDER BY mean_exec_time DESC;

-- ============================================================================
-- 2. INDEX USAGE STATISTICS
-- ============================================================================

-- Zeigt wie oft jeder Index verwendet wird
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
  CASE 
    WHEN idx_scan = 0 THEN '⚠️ UNUSED'
    WHEN idx_scan < 100 THEN '⚡ LOW USAGE'
    WHEN idx_scan < 1000 THEN '✅ MODERATE'
    ELSE '🔥 HIGH USAGE'
  END as usage_status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND tablename IN ('events', 'tasks', 'contacts', 'message_templates', 'workspace_users')
ORDER BY idx_scan DESC;

-- ============================================================================
-- 3. TABLE SCAN ANALYSIS
-- ============================================================================

-- Identifiziert Tabellen mit vielen Sequential Scans (langsam!)
SELECT 
  schemaname,
  tablename,
  seq_scan as sequential_scans,
  seq_tup_read as rows_read_sequentially,
  idx_scan as index_scans,
  CASE 
    WHEN seq_scan + idx_scan = 0 THEN 0
    ELSE ROUND((100.0 * idx_scan / (seq_scan + idx_scan))::numeric, 2)
  END as index_usage_percent,
  CASE 
    WHEN seq_scan > idx_scan THEN '⚠️ TOO MANY SEQ SCANS'
    ELSE '✅ GOOD'
  END as status
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND tablename IN ('events', 'tasks', 'contacts', 'message_templates', 'workspace_users')
ORDER BY seq_scan DESC;

-- ============================================================================
-- 4. SLOW QUERIES DETECTION
-- ============================================================================

-- Findet Queries die länger als 500ms brauchen
SELECT 
  substring(query, 1, 100) as query_preview,
  calls,
  round(mean_exec_time::numeric, 2) as avg_time_ms,
  round(max_exec_time::numeric, 2) as max_time_ms,
  round((mean_exec_time * calls)::numeric, 2) as total_time_ms,
  CASE 
    WHEN mean_exec_time > 1000 THEN '🔴 CRITICAL'
    WHEN mean_exec_time > 500 THEN '⚠️ SLOW'
    WHEN mean_exec_time > 200 THEN '⚡ MODERATE'
    ELSE '✅ FAST'
  END as performance_status
FROM pg_stat_statements
WHERE query LIKE '%dashboard_%'
ORDER BY mean_exec_time DESC
LIMIT 20;

-- ============================================================================
-- 5. DATABASE SIZE & GROWTH
-- ============================================================================

-- Übersicht über Table Sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - 
                 pg_relation_size(schemaname||'.'||tablename)) as indexes_size,
  pg_size_pretty(pg_table_size(schemaname||'.'||tablename) - 
                 pg_relation_size(schemaname||'.'||tablename)) as toast_size
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('events', 'tasks', 'contacts', 'message_templates', 'workspace_users')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================================================
-- 6. CACHE HIT RATIO
-- ============================================================================

-- Zeigt wie gut der Cache funktioniert (Ziel: > 99%)
SELECT 
  schemaname,
  tablename,
  heap_blks_read as disk_reads,
  heap_blks_hit as cache_hits,
  CASE 
    WHEN heap_blks_hit + heap_blks_read = 0 THEN 0
    ELSE ROUND((100.0 * heap_blks_hit / (heap_blks_hit + heap_blks_read))::numeric, 2)
  END as cache_hit_ratio,
  CASE 
    WHEN (heap_blks_hit + heap_blks_read) = 0 THEN '⚪ NO DATA'
    WHEN (100.0 * heap_blks_hit / (heap_blks_hit + heap_blks_read)) > 99 THEN '✅ EXCELLENT'
    WHEN (100.0 * heap_blks_hit / (heap_blks_hit + heap_blks_read)) > 95 THEN '⚡ GOOD'
    WHEN (100.0 * heap_blks_hit / (heap_blks_hit + heap_blks_read)) > 90 THEN '⚠️ MODERATE'
    ELSE '🔴 POOR'
  END as status
FROM pg_statio_user_tables
WHERE schemaname = 'public'
  AND tablename IN ('events', 'tasks', 'contacts', 'message_templates', 'workspace_users')
ORDER BY cache_hit_ratio DESC;

-- ============================================================================
-- 7. BLOAT DETECTION
-- ============================================================================

-- Findet Tabellen die VACUUM benötigen
SELECT 
  schemaname,
  tablename,
  n_live_tup as live_rows,
  n_dead_tup as dead_rows,
  round((100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0))::numeric, 2) as dead_row_percent,
  last_vacuum,
  last_autovacuum,
  CASE 
    WHEN n_dead_tup = 0 THEN '✅ CLEAN'
    WHEN (100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0)) > 20 THEN '🔴 NEEDS VACUUM'
    WHEN (100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0)) > 10 THEN '⚠️ MODERATE BLOAT'
    ELSE '✅ GOOD'
  END as status
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND tablename IN ('events', 'tasks', 'contacts', 'message_templates', 'workspace_users')
ORDER BY n_dead_tup DESC;

-- ============================================================================
-- 8. ACTIVE CONNECTIONS & LOCKS
-- ============================================================================

-- Zeigt aktive Queries und Locks
SELECT 
  pid,
  usename as username,
  application_name,
  client_addr,
  state,
  substring(query, 1, 100) as query_preview,
  now() - query_start as query_duration,
  CASE 
    WHEN wait_event_type IS NOT NULL THEN wait_event_type || ': ' || wait_event
    ELSE 'NOT WAITING'
  END as wait_status
FROM pg_stat_activity
WHERE datname = current_database()
  AND state != 'idle'
  AND query NOT LIKE '%pg_stat_activity%'
ORDER BY query_start DESC;

-- ============================================================================
-- 9. DASHBOARD HEALTH CHECK
-- ============================================================================

-- Kompakte Übersicht aller wichtigen Metriken
WITH function_stats AS (
  SELECT 
    count(*) as total_functions,
    avg(mean_exec_time) as avg_exec_time
  FROM pg_stat_statements
  WHERE query LIKE '%dashboard_%'
),
index_stats AS (
  SELECT 
    count(*) as total_indexes,
    sum(idx_scan) as total_index_scans,
    count(*) FILTER (WHERE idx_scan = 0) as unused_indexes
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public'
    AND tablename IN ('events', 'tasks', 'contacts', 'message_templates', 'workspace_users')
),
table_stats AS (
  SELECT 
    sum(seq_scan) as total_seq_scans,
    sum(idx_scan) as total_idx_scans,
    pg_size_pretty(sum(pg_total_relation_size(schemaname||'.'||tablename))) as total_size
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN ('events', 'tasks', 'contacts', 'message_templates', 'workspace_users')
)
SELECT 
  '🎯 Dashboard Health Check' as metric,
  current_timestamp as checked_at,
  '✅ Functions: ' || f.total_functions as functions,
  '⚡ Avg Exec Time: ' || round(f.avg_exec_time::numeric, 2) || 'ms' as performance,
  '📊 Indexes: ' || i.total_indexes || ' (' || i.unused_indexes || ' unused)' as indexes,
  '🔍 Index Usage: ' || round((100.0 * t.total_idx_scans / NULLIF(t.total_seq_scans + t.total_idx_scans, 0))::numeric, 2) || '%' as index_efficiency,
  '💾 Total Size: ' || t.total_size as storage
FROM function_stats f, index_stats i, table_stats t;

-- ============================================================================
-- 10. MAINTENANCE COMMANDS
-- ============================================================================

-- Run these periodically to maintain performance:

-- Analyze tables (updates statistics)
-- ANALYZE public.events;
-- ANALYZE public.tasks;
-- ANALYZE public.contacts;
-- ANALYZE public.message_templates;
-- ANALYZE public.workspace_users;

-- Vacuum tables (removes dead rows)
-- VACUUM ANALYZE public.events;
-- VACUUM ANALYZE public.tasks;
-- VACUUM ANALYZE public.contacts;

-- Reset statistics (if needed)
-- SELECT pg_stat_statements_reset();

-- ============================================================================
-- 11. ALERTING QUERIES
-- ============================================================================

-- Query 1: Slow Functions Alert (> 500ms)
SELECT 
  'ALERT: Slow Function' as alert_type,
  substring(query from 'dashboard_[a-z_]+') as function_name,
  round(mean_exec_time::numeric, 2) as avg_time_ms,
  calls
FROM pg_stat_statements
WHERE query LIKE '%dashboard_%'
  AND mean_exec_time > 500
ORDER BY mean_exec_time DESC;

-- Query 2: Unused Indexes Alert
SELECT 
  'ALERT: Unused Index' as alert_type,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as wasted_space
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND idx_scan = 0
  AND indexname LIKE '%dashboard%'
ORDER BY pg_relation_size(indexrelid) DESC;

-- Query 3: High Dead Rows Alert (> 10%)
SELECT 
  'ALERT: Needs VACUUM' as alert_type,
  tablename,
  n_dead_tup as dead_rows,
  round((100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0))::numeric, 2) as dead_row_percent
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND (100.0 * n_dead_tup / NULLIF(n_live_tup + n_dead_tup, 0)) > 10
ORDER BY dead_row_percent DESC;


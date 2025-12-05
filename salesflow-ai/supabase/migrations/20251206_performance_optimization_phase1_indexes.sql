-- ============================================================================
-- MIGRATION: Performance Optimization Phase 1 - Indexes
-- Datum: 6. Dezember 2025
-- Beschreibung: Composite-Indizes für kritische Query-Patterns
-- Execution: CREATE INDEX CONCURRENTLY (kein Downtime)
-- ============================================================================
-- 
-- WICHTIG: Diese Migration kann 5-20 Minuten dauern bei großen Tabellen!
-- CONCURRENTLY bedeutet: Keine Table-Locks, Production-sicher
-- ============================================================================

-- ============================================================================
-- TABELLE: message_events (PRIORITÄT 1)
-- ============================================================================

-- INDEX 1: Häufigstes Query-Pattern (List + Filter + Sort)
-- Verwendet von: list_message_events_for_user(), get_pending_events_for_user()
-- Query-Pattern: WHERE user_id = X AND autopilot_status = Y ORDER BY created_at DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_events_user_status_created
  ON public.message_events (user_id, autopilot_status, created_at DESC);

COMMENT ON INDEX idx_message_events_user_status_created IS 
  'Performance: Message Events List mit Status-Filter + Created-Sort (list_message_events_for_user)';

-- INDEX 2: Pending Events mit Kanal-Filter (Partial Index)
-- Verwendet von: get_pending_events_for_user() mit channel='internal'
-- Query-Pattern: WHERE user_id = X AND autopilot_status = 'pending' AND channel = Y
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_events_user_channel_status
  ON public.message_events (user_id, channel, autopilot_status, created_at ASC)
  WHERE autopilot_status = 'pending';

COMMENT ON INDEX idx_message_events_user_channel_status IS 
  'Performance: Pending Events mit Kanal-Filter (Partial Index, 80% kleiner)';

-- INDEX 3: Contact-spezifische Queries (Zero-Input CRM)
-- Verwendet von: _fetch_message_events() in zero_input_crm.py
-- Query-Pattern: WHERE user_id = X AND contact_id = Y ORDER BY created_at DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_events_user_contact_created
  ON public.message_events (user_id, contact_id, created_at DESC)
  WHERE contact_id IS NOT NULL;

COMMENT ON INDEX idx_message_events_user_contact_created IS 
  'Performance: Message Events per Contact (Zero-Input CRM)';

-- INDEX 4: Zeitbereich-Queries für P-Score (Covering Index)
-- Verwendet von: calculate_p_score_for_lead() - Events der letzten 14 Tage
-- Query-Pattern: WHERE user_id = X AND created_at >= Y ORDER BY created_at DESC
-- INCLUDE: Häufig gelesene Spalten, vermeidet Heap-Lookup
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_events_user_created_direction
  ON public.message_events (user_id, created_at DESC, direction)
  INCLUDE (channel, normalized_text);

COMMENT ON INDEX idx_message_events_user_created_direction IS 
  'Performance: P-Score Calculation (Covering Index mit INCLUDE für direction/channel)';


-- ============================================================================
-- TABELLE: leads (PRIORITÄT 1)
-- ============================================================================

-- INDEX 5: Hot Leads Sortierung
-- Verwendet von: get_hot_leads(), Hot-Leads-Dashboard
-- Query-Pattern: WHERE p_score >= 75 ORDER BY p_score DESC, last_scored_at DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_p_score_scored_at
  ON public.leads (p_score DESC NULLS LAST, last_scored_at DESC)
  WHERE p_score IS NOT NULL;

COMMENT ON INDEX idx_leads_p_score_scored_at IS 
  'Performance: Hot Leads Sortierung (get_hot_leads)';

-- INDEX 6: Pending Follow-ups
-- Verwendet von: /api/leads/pending Endpoint
-- Query-Pattern: WHERE next_follow_up <= today ORDER BY next_follow_up
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_next_followup
  ON public.leads (next_follow_up)
  WHERE next_follow_up IS NOT NULL;

COMMENT ON INDEX idx_leads_next_followup IS 
  'Performance: Pending Follow-ups (GET /api/leads/pending)';

-- INDEX 7: Lead Status + Created (für Dashboards)
-- Verwendet von: Dashboard-Queries ("Neue Leads diese Woche nach Status")
-- Query-Pattern: WHERE status = X ORDER BY created_at DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_leads_status_created
  ON public.leads (status, created_at DESC);

COMMENT ON INDEX idx_leads_status_created IS 
  'Performance: Lead-Status-Gruppierung für Dashboards';


-- ============================================================================
-- TABELLE: crm_notes (PRIORITÄT 2)
-- ============================================================================

-- INDEX 8a: User + Contact + Zeitfilter
-- Verwendet von: Zero-Input CRM (Note-Fetching per Contact)
-- Query-Pattern: WHERE user_id = X AND contact_id = Y ORDER BY created_at DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crm_notes_user_contact_created
  ON public.crm_notes (user_id, contact_id, created_at DESC)
  WHERE contact_id IS NOT NULL;

COMMENT ON INDEX idx_crm_notes_user_contact_created IS 
  'Performance: CRM Notes per Contact (Zero-Input CRM)';

-- INDEX 8b: User + Lead + Zeitfilter
-- Verwendet von: Zero-Input CRM (Note-Fetching per Lead)
-- Query-Pattern: WHERE user_id = X AND lead_id = Y ORDER BY created_at DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crm_notes_user_lead_created
  ON public.crm_notes (user_id, lead_id, created_at DESC)
  WHERE lead_id IS NOT NULL;

COMMENT ON INDEX idx_crm_notes_user_lead_created IS 
  'Performance: CRM Notes per Lead (Zero-Input CRM)';


-- ============================================================================
-- TABELLE: rlhf_feedback_sessions (PRIORITÄT 2 - Analytics)
-- ============================================================================

-- INDEX 9: Zeitfilter + Outcome (für Aggregation)
-- Verwendet von: get_learning_dashboard() - Analytics
-- Query-Pattern: WHERE created_at >= X (+ GROUP BY date, outcome)
-- INCLUDE: Covering Index für alle SELECT-Spalten
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rlhf_sessions_created_outcome
  ON public.rlhf_feedback_sessions (created_at DESC, outcome)
  INCLUDE (composite_reward, user_id);

COMMENT ON INDEX idx_rlhf_sessions_created_outcome IS 
  'Performance: Analytics Dashboard (Covering Index für Aggregation)';


-- ============================================================================
-- TABELLE: dm_conversations (IDPS - PRIORITÄT 2)
-- ============================================================================

-- INDEX 10: Unified Inbox Pattern (Status + Platform Filter)
-- Verwendet von: get_unified_inbox() in idps_engine.py
-- Query-Pattern: WHERE user_id = X AND status IN (...) AND platform IN (...)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dm_conversations_user_status_platform
  ON public.dm_conversations (user_id, status, platform, last_message_at DESC);

COMMENT ON INDEX idx_dm_conversations_user_status_platform IS 
  'Performance: Unified Inbox mit Status + Platform Filter';

-- INDEX 11: Priority Score Sorting
-- Verwendet von: get_unified_inbox() - Sortierung nach Priority
-- Query-Pattern: WHERE user_id = X ORDER BY priority_score DESC, last_message_at DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_dm_conversations_user_priority
  ON public.dm_conversations (user_id, priority_score DESC, last_message_at DESC);

COMMENT ON INDEX idx_dm_conversations_user_priority IS 
  'Performance: Unified Inbox Priority-Sort';


-- ============================================================================
-- TABELLE: lead_verifications (Non Plus Ultra - PRIORITÄT 3)
-- ============================================================================

-- INDEX 12: V-Score + Duplicate Check
-- Verwendet von: Lead-Quality-Dashboards
-- Query-Pattern: WHERE v_score IS NOT NULL ORDER BY v_score DESC
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_verifications_v_score_duplicate
  ON public.lead_verifications (v_score DESC, is_duplicate)
  WHERE v_score IS NOT NULL;

COMMENT ON INDEX idx_lead_verifications_v_score_duplicate IS 
  'Performance: Lead-Verification-Quality-Dashboards';


-- ============================================================================
-- VALIDATION: Index-Erstellung überprüfen
-- ============================================================================

-- Führe diesen Query nach Migration aus, um Indizes zu verifizieren:
-- 
-- SELECT 
--     schemaname,
--     tablename,
--     indexname,
--     pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
-- FROM pg_stat_user_indexes
-- WHERE schemaname = 'public'
--   AND indexname LIKE 'idx_%'
-- ORDER BY pg_relation_size(indexrelid) DESC;


-- ============================================================================
-- ROLLBACK (Falls nötig)
-- ============================================================================
-- 
-- DROP INDEX CONCURRENTLY IF EXISTS idx_message_events_user_status_created;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_message_events_user_channel_status;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_message_events_user_contact_created;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_message_events_user_created_direction;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_leads_p_score_scored_at;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_leads_next_followup;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_leads_status_created;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_crm_notes_user_contact_created;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_crm_notes_user_lead_created;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_rlhf_sessions_created_outcome;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_dm_conversations_user_status_platform;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_dm_conversations_user_priority;
-- DROP INDEX CONCURRENTLY IF EXISTS idx_lead_verifications_v_score_duplicate;


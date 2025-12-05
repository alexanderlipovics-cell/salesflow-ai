-- ============================================================================
-- MIGRATION: Performance Optimization Phase 1 - Indexes (NO CONCURRENTLY)
-- Datum: 6. Dezember 2025
-- Beschreibung: Composite-Indizes für kritische Query-Patterns
-- WICHTIG: Ohne CONCURRENTLY (funktioniert in Supabase Migration)
-- ============================================================================
-- 
-- ACHTUNG: Diese Indizes werden MIT Table-Locks erstellt!
-- Für Production: Indizes einzeln im SQL-Editor ausführen (siehe Anleitung unten)
-- Für Dev/Staging: Diese Migration ist OK
-- ============================================================================

-- ============================================================================
-- TABELLE: message_events (PRIORITÄT 1)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_message_events_user_status_created
  ON public.message_events (user_id, autopilot_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_message_events_user_channel_status
  ON public.message_events (user_id, channel, autopilot_status, created_at ASC)
  WHERE autopilot_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_message_events_user_contact_created
  ON public.message_events (user_id, contact_id, created_at DESC)
  WHERE contact_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_message_events_user_created_direction
  ON public.message_events (user_id, created_at DESC, direction)
  INCLUDE (channel, normalized_text);

-- ============================================================================
-- TABELLE: leads (PRIORITÄT 1)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_leads_p_score_scored_at
  ON public.leads (p_score DESC NULLS LAST, last_scored_at DESC)
  WHERE p_score IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_next_followup
  ON public.leads (next_follow_up)
  WHERE next_follow_up IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_status_created
  ON public.leads (status, created_at DESC);

-- ============================================================================
-- TABELLE: crm_notes (PRIORITÄT 2)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_crm_notes_user_contact_created
  ON public.crm_notes (user_id, contact_id, created_at DESC)
  WHERE contact_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_crm_notes_user_lead_created
  ON public.crm_notes (user_id, lead_id, created_at DESC)
  WHERE lead_id IS NOT NULL;

-- ============================================================================
-- TABELLE: rlhf_feedback_sessions (PRIORITÄT 2 - Analytics)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_rlhf_sessions_created_outcome
  ON public.rlhf_feedback_sessions (created_at DESC, outcome)
  INCLUDE (composite_reward, user_id);

-- ============================================================================
-- TABELLE: dm_conversations (IDPS - PRIORITÄT 2)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_dm_conversations_user_status_platform
  ON public.dm_conversations (user_id, status, platform, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_dm_conversations_user_priority
  ON public.dm_conversations (user_id, priority_score DESC, last_message_at DESC);

-- ============================================================================
-- TABELLE: lead_verifications (Non Plus Ultra - PRIORITÄT 3)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_lead_verifications_v_score_duplicate
  ON public.lead_verifications (v_score DESC, is_duplicate)
  WHERE v_score IS NOT NULL;

-- ============================================================================
-- VALIDATION: Index-Erstellung überprüfen
-- ============================================================================

-- Prüfe ob alle Indizes erstellt wurden:
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
  AND (
    indexname LIKE 'idx_message_events%'
    OR indexname LIKE 'idx_leads%'
    OR indexname LIKE 'idx_crm_notes%'
    OR indexname LIKE 'idx_rlhf%'
    OR indexname LIKE 'idx_dm_conversations%'
    OR indexname LIKE 'idx_lead_verifications%'
  )
ORDER BY pg_relation_size(indexrelid) DESC;


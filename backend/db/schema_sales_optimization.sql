-- ═══════════════════════════════════════════════════════════════════════════
-- SALES FLOW AI - PRODUCTION-READY SALES OPTIMIZATION SCHEMA
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Version: 1.0
-- Description: Complete tracking system for interactions, stage changes,
--              conversions, and daily stats with auto-aggregation
-- 
-- Features:
-- - Row Level Security (RLS) enabled
-- - Auto-calculation triggers
-- - Materialized views for analytics
-- - Soft deletes
-- - Archive strategy
-- - Partitioning ready (for millions of rows)
-- 
-- Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ============================================
-- PART 1: EXTENSIONS & SETUP
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Enable pg_cron for scheduled tasks (if available)
-- CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ============================================
-- PART 2: ENUMS (Type Safety)
-- ============================================

-- Channel types for interactions
DO $$ BEGIN
    CREATE TYPE channel_type AS ENUM (
      'whatsapp',
      'instagram_dm',
      'facebook_messenger',
      'email',
      'phone_call',
      'telegram',
      'sms',
      'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Interaction types
DO $$ BEGIN
    CREATE TYPE interaction_type AS ENUM (
      'outbound_message',
      'inbound_message',
      'call',
      'meeting',
      'note',
      'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Direction of interaction
DO $$ BEGIN
    CREATE TYPE interaction_direction AS ENUM ('outbound', 'inbound');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Status of interaction
DO $$ BEGIN
    CREATE TYPE interaction_status AS ENUM (
      'draft',
      'sent',
      'delivered',
      'read',
      'replied',
      'failed',
      'bounced'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Lead stages in sales funnel
DO $$ BEGIN
    CREATE TYPE lead_stage AS ENUM (
      'new',
      'contacted',
      'interested',
      'qualified',
      'candidate',
      'customer',
      'partner',
      'lost',
      'inactive'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Conversion event types
DO $$ BEGIN
    CREATE TYPE conversion_type AS ENUM (
      'customer_first_order',
      'customer_reorder',
      'partner_signup',
      'rank_up',
      'event_attendance',
      'referral',
      'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- PART 3: MAIN TABLES
-- ============================================

-- ────────────────────────────────────────────
-- 1) LEAD_INTERACTIONS
-- ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.lead_interactions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  lead_id            UUID NOT NULL
                        REFERENCES public.leads(id)
                        ON DELETE CASCADE,
  
  user_id            UUID NOT NULL
                        REFERENCES auth.users(id)
                        ON DELETE CASCADE,
  
  company_id         UUID NOT NULL
                        REFERENCES public.mlm_companies(id)
                        ON DELETE CASCADE,
  
  channel            channel_type NOT NULL,
  interaction_type   interaction_type NOT NULL,
  
  template_id        UUID,  -- FK to templates table if exists
  translation_id     UUID,  -- FK to translations table if exists
  
  direction          interaction_direction NOT NULL DEFAULT 'outbound',
  status             interaction_status NOT NULL DEFAULT 'sent',
  
  -- Outcome on interaction level
  outcome            TEXT,  -- 'positive', 'neutral', 'negative', 'no_show', 'left_on_read'
  
  -- Timestamps
  sent_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at       TIMESTAMPTZ,
  read_at            TIMESTAMPTZ,
  replied_at         TIMESTAMPTZ,
  
  -- Auto-calculated field (via trigger)
  response_time_sec  INTEGER,
  
  -- Metadata
  meta               JSONB NOT NULL DEFAULT '{}'::JSONB,
  
  -- Audit
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ,  -- Soft delete
  
  -- Constraints
  CONSTRAINT valid_timestamps CHECK (
    (delivered_at IS NULL OR delivered_at >= sent_at) AND
    (read_at IS NULL OR read_at >= COALESCE(delivered_at, sent_at)) AND
    (replied_at IS NULL OR replied_at >= sent_at)
  ),
  CONSTRAINT valid_response_time CHECK (
    response_time_sec IS NULL OR response_time_sec >= 0
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lead_interactions_lead 
  ON public.lead_interactions (lead_id) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lead_interactions_user 
  ON public.lead_interactions (user_id) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lead_interactions_company 
  ON public.lead_interactions (company_id) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lead_interactions_channel_status 
  ON public.lead_interactions (channel, status) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lead_interactions_sent_at 
  ON public.lead_interactions (sent_at DESC) 
  WHERE deleted_at IS NULL;

-- Composite index for analytics queries
CREATE INDEX IF NOT EXISTS idx_lead_interactions_analytics 
  ON public.lead_interactions (company_id, user_id, sent_at DESC) 
  WHERE deleted_at IS NULL;

-- GIN index for JSONB meta
CREATE INDEX IF NOT EXISTS idx_lead_interactions_meta 
  ON public.lead_interactions USING GIN (meta);

-- ────────────────────────────────────────────
-- 2) LEAD_STAGE_HISTORY
-- ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.lead_stage_history (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  lead_id            UUID NOT NULL
                        REFERENCES public.leads(id)
                        ON DELETE CASCADE,
  
  user_id            UUID
                        REFERENCES auth.users(id)
                        ON DELETE SET NULL,
  
  company_id         UUID NOT NULL
                        REFERENCES public.mlm_companies(id)
                        ON DELETE CASCADE,
  
  stage_from         lead_stage,
  stage_to           lead_stage NOT NULL,
  
  -- Why change/loss?
  reason_code        TEXT,  -- 'no_interest', 'price', 'timing', 'wrong_fit', etc.
  note               TEXT,
  
  changed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Audit
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ,  -- Soft delete
  
  CONSTRAINT different_stages CHECK (
    stage_from IS NULL OR stage_from != stage_to
  )
);

CREATE INDEX IF NOT EXISTS idx_lead_stage_history_lead 
  ON public.lead_stage_history (lead_id) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lead_stage_history_company 
  ON public.lead_stage_history (company_id) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lead_stage_history_stage_to 
  ON public.lead_stage_history (stage_to) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_lead_stage_history_changed_at 
  ON public.lead_stage_history (changed_at DESC) 
  WHERE deleted_at IS NULL;

-- Analytics index
CREATE INDEX IF NOT EXISTS idx_lead_stage_history_analytics 
  ON public.lead_stage_history (company_id, stage_from, stage_to, changed_at DESC) 
  WHERE deleted_at IS NULL;

-- ────────────────────────────────────────────
-- 3) CONVERSION_EVENTS
-- ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.conversion_events (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  lead_id            UUID NOT NULL
                        REFERENCES public.leads(id)
                        ON DELETE CASCADE,
  
  user_id            UUID NOT NULL
                        REFERENCES auth.users(id)
                        ON DELETE CASCADE,
  
  company_id         UUID NOT NULL
                        REFERENCES public.mlm_companies(id)
                        ON DELETE CASCADE,
  
  conversion_type    conversion_type NOT NULL,
  
  -- Monetary value (can be 0 or NULL if unknown)
  value_eur          NUMERIC(10,2),
  value_usd          NUMERIC(10,2),
  
  occurred_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Details: Pack, Volume, Rank, Campaign, etc.
  meta               JSONB NOT NULL DEFAULT '{}'::JSONB,
  
  -- Audit
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at         TIMESTAMPTZ,  -- Soft delete
  
  CONSTRAINT valid_value CHECK (
    value_eur IS NULL OR value_eur >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_conversion_events_lead 
  ON public.conversion_events (lead_id) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conversion_events_user 
  ON public.conversion_events (user_id) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conversion_events_company 
  ON public.conversion_events (company_id) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conversion_events_type 
  ON public.conversion_events (conversion_type) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_conversion_events_occurred_at 
  ON public.conversion_events (occurred_at DESC) 
  WHERE deleted_at IS NULL;

-- Analytics index
CREATE INDEX IF NOT EXISTS idx_conversion_events_analytics 
  ON public.conversion_events (company_id, user_id, conversion_type, occurred_at DESC) 
  WHERE deleted_at IS NULL;

-- GIN index for meta
CREATE INDEX IF NOT EXISTS idx_conversion_events_meta 
  ON public.conversion_events USING GIN (meta);

-- ────────────────────────────────────────────
-- 4) USER_DAILY_STATS
-- ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.user_daily_stats (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id            UUID NOT NULL
                        REFERENCES auth.users(id)
                        ON DELETE CASCADE,
  
  company_id         UUID
                        REFERENCES public.mlm_companies(id)
                        ON DELETE CASCADE,
  
  date               DATE NOT NULL,
  
  -- Daily metrics
  total_contacts     INTEGER NOT NULL DEFAULT 0,
  total_points       INTEGER NOT NULL DEFAULT 0,
  new_leads          INTEGER NOT NULL DEFAULT 0,
  followups_done     INTEGER NOT NULL DEFAULT 0,
  reactivations      INTEGER NOT NULL DEFAULT 0,
  conversions        INTEGER NOT NULL DEFAULT 0,
  
  -- Revenue
  revenue_eur        NUMERIC(10,2) DEFAULT 0,
  
  -- Streak tracking
  streak_day         INTEGER DEFAULT 0,
  
  -- Audit
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (user_id, date),
  
  CONSTRAINT valid_metrics CHECK (
    total_contacts >= 0 AND
    total_points >= 0 AND
    new_leads >= 0 AND
    followups_done >= 0 AND
    reactivations >= 0 AND
    conversions >= 0 AND
    streak_day >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_user_daily_stats_user_date 
  ON public.user_daily_stats (user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_user_daily_stats_company_date 
  ON public.user_daily_stats (company_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_user_daily_stats_date 
  ON public.user_daily_stats (date DESC);

-- ============================================
-- PART 4: TRIGGERS FOR AUTO-CALCULATION
-- ============================================

-- 1) Auto-update response_time_sec
CREATE OR REPLACE FUNCTION update_response_time()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.replied_at IS NOT NULL AND NEW.sent_at IS NOT NULL THEN
    NEW.response_time_sec := EXTRACT(EPOCH FROM (NEW.replied_at - NEW.sent_at))::INTEGER;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_response_time ON public.lead_interactions;
CREATE TRIGGER trigger_update_response_time
  BEFORE INSERT OR UPDATE ON public.lead_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_response_time();

-- 2) Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_lead_interactions_updated_at ON public.lead_interactions;
CREATE TRIGGER trigger_lead_interactions_updated_at
  BEFORE UPDATE ON public.lead_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_conversion_events_updated_at ON public.conversion_events;
CREATE TRIGGER trigger_conversion_events_updated_at
  BEFORE UPDATE ON public.conversion_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_user_daily_stats_updated_at ON public.user_daily_stats;
CREATE TRIGGER trigger_user_daily_stats_updated_at
  BEFORE UPDATE ON public.user_daily_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- 3) Auto-aggregate daily stats on interaction
CREATE OR REPLACE FUNCTION aggregate_daily_stats_on_interaction()
RETURNS TRIGGER AS $$
DECLARE
  interaction_date DATE;
BEGIN
  -- Determine date
  interaction_date := (NEW.sent_at AT TIME ZONE 'UTC')::DATE;
  
  -- Upsert daily stats
  INSERT INTO public.user_daily_stats (
    user_id,
    company_id,
    date,
    total_contacts
  ) VALUES (
    NEW.user_id,
    NEW.company_id,
    interaction_date,
    1
  )
  ON CONFLICT (user_id, date) DO UPDATE SET
    total_contacts = user_daily_stats.total_contacts + 1,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_aggregate_interaction_stats ON public.lead_interactions;
CREATE TRIGGER trigger_aggregate_interaction_stats
  AFTER INSERT ON public.lead_interactions
  FOR EACH ROW
  EXECUTE FUNCTION aggregate_daily_stats_on_interaction();

-- 4) Auto-aggregate conversions
CREATE OR REPLACE FUNCTION aggregate_daily_stats_on_conversion()
RETURNS TRIGGER AS $$
DECLARE
  conversion_date DATE;
BEGIN
  conversion_date := (NEW.occurred_at AT TIME ZONE 'UTC')::DATE;
  
  INSERT INTO public.user_daily_stats (
    user_id,
    company_id,
    date,
    conversions,
    revenue_eur
  ) VALUES (
    NEW.user_id,
    NEW.company_id,
    conversion_date,
    1,
    COALESCE(NEW.value_eur, 0)
  )
  ON CONFLICT (user_id, date) DO UPDATE SET
    conversions = user_daily_stats.conversions + 1,
    revenue_eur = user_daily_stats.revenue_eur + COALESCE(NEW.value_eur, 0),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_aggregate_conversion_stats ON public.conversion_events;
CREATE TRIGGER trigger_aggregate_conversion_stats
  AFTER INSERT ON public.conversion_events
  FOR EACH ROW
  EXECUTE FUNCTION aggregate_daily_stats_on_conversion();

-- ============================================
-- PART 5: ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.lead_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversion_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_daily_stats ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own interactions" ON public.lead_interactions;
DROP POLICY IF EXISTS "Users can insert own interactions" ON public.lead_interactions;
DROP POLICY IF EXISTS "Users can update own interactions" ON public.lead_interactions;
DROP POLICY IF EXISTS "Users can soft delete own interactions" ON public.lead_interactions;
DROP POLICY IF EXISTS "Admins can view all interactions" ON public.lead_interactions;

-- RLS Policies for lead_interactions
CREATE POLICY "Users can view own interactions"
  ON public.lead_interactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interactions"
  ON public.lead_interactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own interactions"
  ON public.lead_interactions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can soft delete own interactions"
  ON public.lead_interactions FOR UPDATE
  USING (auth.uid() = user_id AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = user_id);

-- Admin policy (adjust role as needed)
CREATE POLICY "Admins can view all interactions"
  ON public.lead_interactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- RLS Policies for lead_stage_history
DROP POLICY IF EXISTS "Users can view own stage history" ON public.lead_stage_history;
DROP POLICY IF EXISTS "Users can insert stage history for own leads" ON public.lead_stage_history;

CREATE POLICY "Users can view own stage history"
  ON public.lead_stage_history FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.leads
      WHERE id = lead_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert stage history for own leads"
  ON public.lead_stage_history FOR INSERT
  WITH CHECK (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.leads
      WHERE id = lead_id AND user_id = auth.uid()
    )
  );

-- RLS Policies for conversion_events
DROP POLICY IF EXISTS "Users can view own conversions" ON public.conversion_events;
DROP POLICY IF EXISTS "Users can insert own conversions" ON public.conversion_events;

CREATE POLICY "Users can view own conversions"
  ON public.conversion_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversions"
  ON public.conversion_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for user_daily_stats
DROP POLICY IF EXISTS "Users can view own stats" ON public.user_daily_stats;
DROP POLICY IF EXISTS "System can insert/update stats" ON public.user_daily_stats;

CREATE POLICY "Users can view own stats"
  ON public.user_daily_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert/update stats"
  ON public.user_daily_stats FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- PART 6: MATERIALIZED VIEWS FOR ANALYTICS
-- ============================================

-- 1) Response time analytics per user
DROP MATERIALIZED VIEW IF EXISTS mv_user_response_stats;
CREATE MATERIALIZED VIEW mv_user_response_stats AS
SELECT 
  user_id,
  company_id,
  channel,
  COUNT(*) as total_interactions,
  AVG(response_time_sec) as avg_response_time_sec,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY response_time_sec) as median_response_time_sec,
  MIN(response_time_sec) as min_response_time_sec,
  MAX(response_time_sec) as max_response_time_sec,
  COUNT(*) FILTER (WHERE status = 'replied') as total_replies,
  COUNT(*) FILTER (WHERE status = 'replied')::FLOAT / NULLIF(COUNT(*), 0) as reply_rate
FROM public.lead_interactions
WHERE 
  deleted_at IS NULL AND
  response_time_sec IS NOT NULL
GROUP BY user_id, company_id, channel;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_user_response_stats 
  ON mv_user_response_stats (user_id, company_id, channel);

-- 2) Conversion funnel per company
DROP MATERIALIZED VIEW IF EXISTS mv_conversion_funnel;
CREATE MATERIALIZED VIEW mv_conversion_funnel AS
SELECT 
  company_id,
  stage_to,
  COUNT(DISTINCT lead_id) as leads_at_stage,
  AVG(EXTRACT(EPOCH FROM (changed_at - LAG(changed_at) OVER (PARTITION BY lead_id ORDER BY changed_at)))) as avg_time_in_previous_stage_sec
FROM public.lead_stage_history
WHERE deleted_at IS NULL
GROUP BY company_id, stage_to;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_conversion_funnel 
  ON mv_conversion_funnel (company_id, stage_to);

-- 3) User performance leaderboard (last 30 days)
DROP MATERIALIZED VIEW IF EXISTS mv_user_leaderboard_30d;
CREATE MATERIALIZED VIEW mv_user_leaderboard_30d AS
SELECT 
  user_id,
  company_id,
  SUM(total_contacts) as total_contacts,
  SUM(total_points) as total_points,
  SUM(conversions) as total_conversions,
  SUM(revenue_eur) as total_revenue,
  MAX(streak_day) as max_streak,
  RANK() OVER (PARTITION BY company_id ORDER BY SUM(total_points) DESC) as rank_by_points,
  RANK() OVER (PARTITION BY company_id ORDER BY SUM(conversions) DESC) as rank_by_conversions
FROM public.user_daily_stats
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY user_id, company_id;

CREATE UNIQUE INDEX IF EXISTS idx_mv_user_leaderboard_30d 
  ON mv_user_leaderboard_30d (user_id, company_id);

-- Refresh function (call via cron job)
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_response_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_conversion_funnel;
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_leaderboard_30d;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 7: ARCHIVE & CLEANUP FUNCTIONS
-- ============================================

-- Archive old interactions (>1 year) to separate table
CREATE TABLE IF NOT EXISTS public.lead_interactions_archive (
  LIKE public.lead_interactions INCLUDING ALL
);

CREATE OR REPLACE FUNCTION archive_old_interactions()
RETURNS INTEGER AS $$
DECLARE
  rows_archived INTEGER;
BEGIN
  -- Move interactions older than 1 year to archive
  WITH archived AS (
    DELETE FROM public.lead_interactions
    WHERE 
      sent_at < CURRENT_DATE - INTERVAL '1 year' AND
      deleted_at IS NULL
    RETURNING *
  )
  INSERT INTO public.lead_interactions_archive
  SELECT * FROM archived;
  
  GET DIAGNOSTICS rows_archived = ROW_COUNT;
  
  RETURN rows_archived;
END;
$$ LANGUAGE plpgsql;

-- Soft delete cleanup (permanently delete after 90 days)
CREATE OR REPLACE FUNCTION cleanup_soft_deleted()
RETURNS INTEGER AS $$
DECLARE
  rows_deleted INTEGER;
BEGIN
  DELETE FROM public.lead_interactions
  WHERE 
    deleted_at IS NOT NULL AND
    deleted_at < CURRENT_DATE - INTERVAL '90 days';
  
  GET DIAGNOSTICS rows_deleted = ROW_COUNT;
  
  RETURN rows_deleted;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- PART 8: HELPER FUNCTIONS FOR QUERIES
-- ============================================

-- Get user's stats for date range
CREATE OR REPLACE FUNCTION get_user_stats(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  total_contacts BIGINT,
  total_points BIGINT,
  total_conversions BIGINT,
  total_revenue NUMERIC,
  avg_contacts_per_day NUMERIC,
  best_day DATE,
  best_day_contacts INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    SUM(uds.total_contacts)::BIGINT,
    SUM(uds.total_points)::BIGINT,
    SUM(uds.conversions)::BIGINT,
    SUM(uds.revenue_eur)::NUMERIC,
    AVG(uds.total_contacts)::NUMERIC,
    (SELECT date FROM user_daily_stats WHERE user_id = p_user_id AND date BETWEEN p_start_date AND p_end_date ORDER BY total_contacts DESC LIMIT 1),
    (SELECT total_contacts FROM user_daily_stats WHERE user_id = p_user_id AND date BETWEEN p_start_date AND p_end_date ORDER BY total_contacts DESC LIMIT 1)
  FROM public.user_daily_stats uds
  WHERE 
    uds.user_id = p_user_id AND
    uds.date BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql;

-- Get conversion rate by stage
CREATE OR REPLACE FUNCTION get_conversion_rate(
  p_company_id UUID,
  p_from_stage lead_stage,
  p_to_stage lead_stage
)
RETURNS NUMERIC AS $$
DECLARE
  from_count INTEGER;
  to_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT lead_id) INTO from_count
  FROM public.lead_stage_history
  WHERE 
    company_id = p_company_id AND
    stage_to = p_from_stage AND
    deleted_at IS NULL;
  
  SELECT COUNT(DISTINCT lead_id) INTO to_count
  FROM public.lead_stage_history
  WHERE 
    company_id = p_company_id AND
    stage_from = p_from_stage AND
    stage_to = p_to_stage AND
    deleted_at IS NULL;
  
  IF from_count = 0 THEN
    RETURN 0;
  END IF;
  
  RETURN (to_count::NUMERIC / from_count::NUMERIC * 100);
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════════════
-- SCHEMA CREATION COMPLETE ✅
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- NEXT STEPS:
-- 1. Verify all tables created: SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'lead_%' OR table_name LIKE 'conversion_%' OR table_name LIKE 'user_daily_%';
-- 2. Test triggers: INSERT INTO lead_interactions (...) and check response_time_sec
-- 3. Test RLS: Try querying as different users
-- 4. Refresh materialized views: SELECT refresh_analytics_views();
-- 5. Schedule cron jobs (if pg_cron enabled):
--    SELECT cron.schedule('refresh-analytics', '0 * * * *', 'SELECT refresh_analytics_views()');
--    SELECT cron.schedule('archive-interactions', '0 0 1 * *', 'SELECT archive_old_interactions()');
--    SELECT cron.schedule('cleanup-soft-deleted', '0 0 1 * *', 'SELECT cleanup_soft_deleted()');
-- ═══════════════════════════════════════════════════════════════════════════


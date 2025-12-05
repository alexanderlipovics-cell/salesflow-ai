-- ============================================================================
-- MIGRATION: Performance Optimization Phase 2 - Materialized Views
-- Datum: 6. Dezember 2025
-- Beschreibung: Pre-aggregierte Views für Analytics & Dashboards
-- Refresh-Strategie: Cron-basiert (alle 10-15 Minuten)
-- ============================================================================

-- ============================================================================
-- MV 1: RLHF Sessions Daily - Analytics Dashboard
-- ============================================================================
-- 
-- Zweck: Tägliche Aggregation von RLHF-Sessions für Dashboard
-- Verwendet von: /api/collective-intelligence/analytics/dashboard
-- Ersetzt: Python-Aggregation von 1000+ Rows
-- Gewinn: 2-5s → 200-500ms (85-90% schneller)
-- 
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_rlhf_sessions_daily AS
SELECT 
    DATE(created_at) AS session_date,
    COUNT(*) AS total_sessions,
    COUNT(DISTINCT user_id) AS active_users,
    COUNT(*) FILTER (WHERE outcome = 'converted') AS conversions,
    COUNT(*) FILTER (WHERE outcome = 'positive_reply') AS positive_replies,
    AVG(composite_reward) AS avg_reward,
    SUM(composite_reward) AS reward_sum,
    -- Zusätzliche Metriken
    MIN(created_at) AS first_session_at,
    MAX(created_at) AS last_session_at
FROM public.rlhf_feedback_sessions
GROUP BY DATE(created_at)
ORDER BY session_date DESC;

-- Index für schnelle Date-Range-Queries
CREATE INDEX idx_mv_rlhf_sessions_date 
  ON public.mv_rlhf_sessions_daily (session_date DESC);

COMMENT ON MATERIALIZED VIEW mv_rlhf_sessions_daily IS 
  'Pre-aggregated daily RLHF sessions for analytics dashboard. Refresh: every 10 minutes.';


-- ============================================================================
-- MV 2: Template Performance - A/B Testing Dashboard
-- ============================================================================
-- 
-- Zweck: Performance-Tracking von Message-Templates & Personas
-- Verwendet von: A/B-Testing-Dashboard, Template-Optimization
-- Ersetzt: Aggregation über message_events (10k+ Rows)
-- 
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_template_performance AS
SELECT 
    template_version,
    persona_variant,
    channel,
    COUNT(*) AS total_messages,
    COUNT(*) FILTER (WHERE autopilot_status = 'sent') AS sent_count,
    COUNT(*) FILTER (WHERE autopilot_status = 'approved') AS approved_count,
    COUNT(*) FILTER (WHERE autopilot_status = 'skipped') AS skipped_count,
    -- Send Rate
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE autopilot_status = 'sent') / 
        NULLIF(COUNT(*), 0), 
        2
    ) AS send_rate,
    -- Approval Rate
    ROUND(
        100.0 * COUNT(*) FILTER (WHERE autopilot_status = 'approved') / 
        NULLIF(COUNT(*), 0), 
        2
    ) AS approval_rate,
    -- Zeitstempel
    MIN(created_at) AS first_used,
    MAX(created_at) AS last_used
FROM public.message_events
WHERE template_version IS NOT NULL
GROUP BY template_version, persona_variant, channel
ORDER BY send_rate DESC NULLS LAST;

-- Index für Performance-Ranking
CREATE INDEX idx_mv_template_perf_rate 
  ON public.mv_template_performance (send_rate DESC);

CREATE INDEX idx_mv_template_perf_version 
  ON public.mv_template_performance (template_version);

COMMENT ON MATERIALIZED VIEW mv_template_performance IS 
  'A/B Testing: Template & Persona Performance Metrics. Refresh: daily.';


-- ============================================================================
-- MV 3: Hot Leads - Sales Dashboard
-- ============================================================================
-- 
-- Zweck: Pre-filtered Hot Leads mit Scores
-- Verwendet von: Sales-Dashboard, get_hot_leads()
-- Ersetzt: Multi-Table-JOIN + Filter (1-2s)
-- Gewinn: → 200-300ms (80% schneller)
-- 
-- ============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS public.mv_hot_leads AS
SELECT 
    l.id,
    l.name,
    l.email,
    l.phone,
    l.company,
    l.status,
    l.p_score,
    l.p_score_trend,
    l.last_scored_at,
    l.created_at,
    l.next_follow_up,
    -- Verification Score
    lv.v_score,
    lv.email_valid,
    lv.phone_valid,
    lv.is_duplicate,
    -- Intent Score
    li.i_score,
    li.last_activity_at,
    li.intent_stage,
    li.pricing_page_visits,
    li.demo_page_visits,
    -- Enrichment
    le.e_score,
    le.company_name,
    le.company_industry,
    le.icp_match_score,
    -- Klassifizierung
    CASE 
        WHEN l.p_score >= 90 THEN 'ultra_hot'
        WHEN l.p_score >= 80 THEN 'hot'
        WHEN l.p_score >= 75 THEN 'warm_hot'
        ELSE 'warm'
    END AS temperature,
    -- Priorität
    CASE 
        WHEN l.p_score >= 90 AND li.requested_demo THEN 5
        WHEN l.p_score >= 85 THEN 4
        WHEN l.p_score >= 80 THEN 3
        ELSE 2
    END AS priority
FROM public.leads l
LEFT JOIN public.lead_verifications lv ON l.id = lv.lead_id
LEFT JOIN public.lead_intents li ON l.id = li.lead_id
LEFT JOIN public.lead_enrichments le ON l.id = le.lead_id
WHERE l.p_score >= 75 
  AND (lv.v_score IS NULL OR lv.v_score >= 60)
  AND (lv.is_duplicate IS NULL OR lv.is_duplicate = FALSE)
ORDER BY l.p_score DESC, li.i_score DESC NULLS LAST;

-- Indizes für verschiedene Sort-Patterns
CREATE INDEX idx_mv_hot_leads_p_score 
  ON public.mv_hot_leads (p_score DESC);

CREATE INDEX idx_mv_hot_leads_temperature 
  ON public.mv_hot_leads (temperature, priority DESC);

CREATE INDEX idx_mv_hot_leads_activity 
  ON public.mv_hot_leads (last_activity_at DESC NULLS LAST);

COMMENT ON MATERIALIZED VIEW mv_hot_leads IS 
  'Pre-filtered hot leads with all scores (p_score >= 75). Refresh: every 15 minutes.';


-- ============================================================================
-- REFRESH-FUNKTIONEN
-- ============================================================================

-- Funktion 1: Refresh RLHF Dashboard MV
CREATE OR REPLACE FUNCTION refresh_rlhf_daily_mv()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_rlhf_sessions_daily;
    RAISE NOTICE 'Refreshed mv_rlhf_sessions_daily at %', NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_rlhf_daily_mv IS 
  'Refresh function for RLHF daily analytics MV (call via pg_cron or trigger)';


-- Funktion 2: Refresh Template Performance MV
CREATE OR REPLACE FUNCTION refresh_template_performance_mv()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_template_performance;
    RAISE NOTICE 'Refreshed mv_template_performance at %', NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_template_performance_mv IS 
  'Refresh function for template performance MV (call daily)';


-- Funktion 3: Refresh Hot Leads MV
CREATE OR REPLACE FUNCTION refresh_hot_leads_mv()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_hot_leads;
    RAISE NOTICE 'Refreshed mv_hot_leads at %', NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_hot_leads_mv IS 
  'Refresh function for hot leads MV (call every 15 min or after P-Score recalc)';


-- ============================================================================
-- CRON-SCHEDULING (Optional via pg_cron Extension)
-- ============================================================================
-- 
-- WICHTIG: pg_cron muss in Supabase aktiviert sein!
-- Dashboard: Database → Extensions → pg_cron → Enable
-- 
-- Dann folgende Cron-Jobs anlegen:
-- 
-- SELECT cron.schedule(
--     'refresh-rlhf-dashboard',
--     '*/10 * * * *',  -- Alle 10 Minuten
--     'SELECT refresh_rlhf_daily_mv();'
-- );
-- 
-- SELECT cron.schedule(
--     'refresh-template-performance',
--     '0 1 * * *',  -- Täglich um 01:00
--     'SELECT refresh_template_performance_mv();'
-- );
-- 
-- SELECT cron.schedule(
--     'refresh-hot-leads',
--     '*/15 * * * *',  -- Alle 15 Minuten
--     'SELECT refresh_hot_leads_mv();'
-- );
-- 


-- ============================================================================
-- ALTERNATIVE: TRIGGER-BASIERTES REFRESH (Near-Realtime)
-- ============================================================================
-- 
-- Nur für RLHF Dashboard, wenn Realtime-Anforderung besteht
-- ACHTUNG: Kann bei vielen INSERTs zu Performance-Issues führen!
-- 
-- CREATE OR REPLACE FUNCTION trigger_refresh_rlhf_mv()
-- RETURNS TRIGGER AS $$
-- BEGIN
--     -- Debouncing: Nur wenn letzte Refresh > 5 Minuten her
--     IF NOT EXISTS (
--         SELECT 1 FROM pg_stat_activity 
--         WHERE query LIKE '%REFRESH MATERIALIZED VIEW%mv_rlhf_sessions_daily%'
--     ) THEN
--         PERFORM refresh_rlhf_daily_mv();
--     END IF;
--     RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;
-- 
-- CREATE TRIGGER trg_refresh_rlhf_mv
--     AFTER INSERT ON public.rlhf_feedback_sessions
--     FOR EACH STATEMENT
--     EXECUTE FUNCTION trigger_refresh_rlhf_mv();
-- 


-- ============================================================================
-- INITIAL REFRESH (nach Migration)
-- ============================================================================

-- Initiale Daten generieren
SELECT refresh_rlhf_daily_mv();
SELECT refresh_template_performance_mv();
SELECT refresh_hot_leads_mv();


-- ============================================================================
-- VALIDATION: MV-Größen & Daten prüfen
-- ============================================================================

-- Prüfe MV-Größen
SELECT 
    schemaname,
    matviewname AS view_name,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) AS size
FROM pg_matviews
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||matviewname) DESC;

-- Prüfe Daten-Vollständigkeit
SELECT 
    'mv_rlhf_sessions_daily' AS view_name,
    COUNT(*) AS row_count,
    MIN(session_date) AS earliest_date,
    MAX(session_date) AS latest_date
FROM mv_rlhf_sessions_daily
UNION ALL
SELECT 
    'mv_template_performance',
    COUNT(*),
    NULL,
    NULL
FROM mv_template_performance
UNION ALL
SELECT 
    'mv_hot_leads',
    COUNT(*),
    NULL,
    NULL
FROM mv_hot_leads;


-- ============================================================================
-- ROLLBACK (Falls nötig)
-- ============================================================================
-- 
-- DROP MATERIALIZED VIEW IF EXISTS public.mv_rlhf_sessions_daily CASCADE;
-- DROP MATERIALIZED VIEW IF EXISTS public.mv_template_performance CASCADE;
-- DROP MATERIALIZED VIEW IF EXISTS public.mv_hot_leads CASCADE;
-- DROP FUNCTION IF EXISTS refresh_rlhf_daily_mv CASCADE;
-- DROP FUNCTION IF EXISTS refresh_template_performance_mv CASCADE;
-- DROP FUNCTION IF EXISTS refresh_hot_leads_mv CASCADE;
-- 
-- -- Cron-Jobs löschen (falls angelegt)
-- SELECT cron.unschedule('refresh-rlhf-dashboard');
-- SELECT cron.unschedule('refresh-template-performance');
-- SELECT cron.unschedule('refresh-hot-leads');


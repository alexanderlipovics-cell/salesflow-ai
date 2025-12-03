-- ╔════════════════════════════════════════════════════════════════╗
-- ║  MATERIALIZED VIEWS - ANALYTICS                                ║
-- ╚════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════
-- 1. RESPONSE HEATMAP (Stunde x Wochentag)
-- ═══════════════════════════════════════════════════════════════

DROP MATERIALIZED VIEW IF EXISTS response_heatmap CASCADE;

CREATE MATERIALIZED VIEW response_heatmap AS
SELECT
  channel,
  EXTRACT(DOW FROM responded_at)::INTEGER AS weekday,
  EXTRACT(HOUR FROM responded_at)::INTEGER AS hour,
  COUNT(*) AS response_count,
  ROUND(AVG(response_time_hours), 2) AS avg_response_hours
FROM message_tracking
WHERE responded_at IS NOT NULL
GROUP BY channel, weekday, hour
ORDER BY channel, weekday, hour;

CREATE INDEX idx_response_heatmap_channel ON response_heatmap(channel);
CREATE INDEX idx_response_heatmap_time ON response_heatmap(weekday, hour);

-- ═══════════════════════════════════════════════════════════════
-- 2. WEEKLY ACTIVITY TREND
-- ═══════════════════════════════════════════════════════════════

DROP MATERIALIZED VIEW IF EXISTS weekly_activity_trend CASCADE;

CREATE MATERIALIZED VIEW weekly_activity_trend AS
SELECT
  DATE_TRUNC('week', sent_at)::DATE AS week_start,
  channel,
  COUNT(*) AS message_count,
  COUNT(CASE WHEN delivered_at IS NOT NULL THEN 1 END) AS delivered_count,
  COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) AS opened_count,
  COUNT(CASE WHEN responded_at IS NOT NULL THEN 1 END) AS responded_count,
  ROUND(
    100.0 * COUNT(CASE WHEN responded_at IS NOT NULL THEN 1 END) / NULLIF(COUNT(*), 0),
    2
  ) AS response_rate_percent
FROM message_tracking
WHERE sent_at >= NOW() - INTERVAL '90 days'
GROUP BY week_start, channel
ORDER BY week_start DESC, channel;

CREATE INDEX idx_weekly_trend_week ON weekly_activity_trend(week_start DESC);
CREATE INDEX idx_weekly_trend_channel ON weekly_activity_trend(channel);

-- ═══════════════════════════════════════════════════════════════
-- 3. GPT VS HUMAN MESSAGE DISTRIBUTION
-- ═══════════════════════════════════════════════════════════════

DROP MATERIALIZED VIEW IF EXISTS gpt_vs_human_messages CASCADE;

CREATE MATERIALIZED VIEW gpt_vs_human_messages AS
SELECT
  gpt_generated AS is_gpt,
  channel,
  COUNT(*) AS message_count,
  COUNT(CASE WHEN responded_at IS NOT NULL THEN 1 END) AS responded_count,
  ROUND(
    100.0 * COUNT(CASE WHEN responded_at IS NOT NULL THEN 1 END) / NULLIF(COUNT(*), 0),
    2
  ) AS response_rate_percent,
  AVG(response_time_hours) AS avg_response_hours
FROM message_tracking
GROUP BY gpt_generated, channel;

CREATE INDEX idx_gpt_human_channel ON gpt_vs_human_messages(channel);

-- ═══════════════════════════════════════════════════════════════
-- 4. CHANNEL PERFORMANCE
-- ═══════════════════════════════════════════════════════════════

DROP MATERIALIZED VIEW IF EXISTS channel_performance CASCADE;

CREATE MATERIALIZED VIEW channel_performance AS
SELECT
  channel,
  COUNT(*) AS total_sent,
  COUNT(CASE WHEN delivered_at IS NOT NULL THEN 1 END) AS delivered_count,
  COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) AS opened_count,
  COUNT(CASE WHEN responded_at IS NOT NULL THEN 1 END) AS responded_count,
  ROUND(
    100.0 * COUNT(CASE WHEN delivered_at IS NOT NULL THEN 1 END) / NULLIF(COUNT(*), 0),
    2
  ) AS delivery_rate_percent,
  ROUND(
    100.0 * COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) / NULLIF(COUNT(*), 0),
    2
  ) AS open_rate_percent,
  ROUND(
    100.0 * COUNT(CASE WHEN responded_at IS NOT NULL THEN 1 END) / NULLIF(COUNT(*), 0),
    2
  ) AS response_rate_percent,
  ROUND(AVG(response_time_hours), 2) AS avg_response_time_hours
FROM message_tracking
GROUP BY channel
ORDER BY response_rate_percent DESC NULLS LAST;

-- ═══════════════════════════════════════════════════════════════
-- 5. PLAYBOOK PERFORMANCE
-- ═══════════════════════════════════════════════════════════════

DROP MATERIALIZED VIEW IF EXISTS playbook_performance CASCADE;

CREATE MATERIALIZED VIEW playbook_performance AS
SELECT
  fp.id AS playbook_id,
  fp.name AS playbook_name,
  fp.category,
  fp.trigger_type,
  COUNT(fu.id) AS usage_count,
  COUNT(CASE WHEN fu.responded_at IS NOT NULL THEN 1 END) AS responded_count,
  ROUND(
    100.0 * COUNT(CASE WHEN fu.responded_at IS NOT NULL THEN 1 END) / NULLIF(COUNT(fu.id), 0),
    2
  ) AS success_rate_percent,
  AVG(EXTRACT(EPOCH FROM (fu.responded_at - fu.sent_at)) / 3600) AS avg_response_hours
FROM followup_playbooks fp
LEFT JOIN follow_ups fu ON fu.playbook_id = fp.id
WHERE fp.is_active = TRUE
GROUP BY fp.id, fp.name, fp.category, fp.trigger_type
ORDER BY success_rate_percent DESC NULLS LAST;

CREATE INDEX idx_playbook_perf_id ON playbook_performance(playbook_id);

-- ═══════════════════════════════════════════════════════════════
-- 6. TEMPLATE PERFORMANCE
-- ═══════════════════════════════════════════════════════════════

DROP MATERIALIZED VIEW IF EXISTS template_performance CASCADE;

CREATE MATERIALIZED VIEW template_performance AS
SELECT
  ft.id AS template_id,
  ft.name AS template_name,
  ft.trigger_key,
  ft.channel,
  ft.category,
  ft.usage_count,
  ft.success_rate,
  ft.is_active,
  ft.created_at,
  ft.updated_at
FROM followup_templates ft
ORDER BY ft.usage_count DESC;

CREATE INDEX idx_template_perf_id ON template_performance(template_id);
CREATE INDEX idx_template_perf_channel ON template_performance(channel);

-- ═══════════════════════════════════════════════════════════════
-- 7. USER ACTIVITY SUMMARY
-- ═══════════════════════════════════════════════════════════════

DROP MATERIALIZED VIEW IF EXISTS user_activity_summary CASCADE;

CREATE MATERIALIZED VIEW user_activity_summary AS
SELECT
  u.id AS user_id,
  u.email,
  u.first_name,
  u.last_name,
  u.tier,
  u.points,
  u.level,
  u.streak_days,
  COUNT(DISTINCT l.id) AS total_leads,
  COUNT(DISTINCT CASE WHEN l.status = 'won' THEN l.id END) AS won_leads,
  COUNT(DISTINCT fu.id) AS followups_sent,
  COUNT(DISTINCT a.id) AS activities_count,
  MAX(u.last_login_at) AS last_login,
  ROUND(
    100.0 * COUNT(DISTINCT CASE WHEN l.status = 'won' THEN l.id END) / NULLIF(COUNT(DISTINCT l.id), 0),
    2
  ) AS win_rate_percent
FROM users u
LEFT JOIN leads l ON l.user_id = u.id
LEFT JOIN follow_ups fu ON fu.user_id = u.id
LEFT JOIN activities a ON a.user_id = u.id
GROUP BY u.id, u.email, u.first_name, u.last_name, u.tier, u.points, u.level, u.streak_days
ORDER BY u.points DESC;

CREATE INDEX idx_user_summary_id ON user_activity_summary(user_id);
CREATE INDEX idx_user_summary_points ON user_activity_summary(points DESC);

-- ═══════════════════════════════════════════════════════════════
-- 8. LEAD PIPELINE SUMMARY
-- ═══════════════════════════════════════════════════════════════

DROP MATERIALIZED VIEW IF EXISTS lead_pipeline_summary CASCADE;

CREATE MATERIALIZED VIEW lead_pipeline_summary AS
SELECT
  status,
  COUNT(*) AS lead_count,
  SUM(estimated_value) AS total_estimated_value,
  SUM(actual_value) AS total_actual_value,
  ROUND(AVG(bant_score), 1) AS avg_bant_score,
  ROUND(AVG(win_probability), 1) AS avg_win_probability,
  COUNT(CASE WHEN next_followup_at < NOW() THEN 1 END) AS overdue_followups
FROM leads
GROUP BY status
ORDER BY 
  CASE status
    WHEN 'new' THEN 1
    WHEN 'contacted' THEN 2
    WHEN 'qualified' THEN 3
    WHEN 'meeting_scheduled' THEN 4
    WHEN 'proposal_sent' THEN 5
    WHEN 'negotiation' THEN 6
    WHEN 'won' THEN 7
    WHEN 'lost' THEN 8
    WHEN 'nurture' THEN 9
    ELSE 10
  END;

-- ═══════════════════════════════════════════════════════════════
-- 9. AI PROMPT PERFORMANCE
-- ═══════════════════════════════════════════════════════════════

DROP MATERIALIZED VIEW IF EXISTS ai_prompt_performance CASCADE;

CREATE MATERIALIZED VIEW ai_prompt_performance AS
SELECT
  ap.id AS prompt_id,
  ap.name AS prompt_name,
  ap.category,
  ap.is_autonomous,
  COUNT(ape.id) AS execution_count,
  COUNT(CASE WHEN ape.status = 'success' THEN 1 END) AS success_count,
  ROUND(
    100.0 * COUNT(CASE WHEN ape.status = 'success' THEN 1 END) / NULLIF(COUNT(ape.id), 0),
    2
  ) AS success_rate_percent,
  ROUND(AVG(ape.execution_time_ms), 0) AS avg_execution_ms,
  ROUND(AVG(ape.user_rating), 2) AS avg_user_rating
FROM ai_prompts ap
LEFT JOIN ai_prompt_executions ape ON ape.prompt_id = ap.id
WHERE ap.is_active = TRUE
GROUP BY ap.id, ap.name, ap.category, ap.is_autonomous
ORDER BY execution_count DESC;

CREATE INDEX idx_ai_prompt_perf_id ON ai_prompt_performance(prompt_id);
CREATE INDEX idx_ai_prompt_perf_category ON ai_prompt_performance(category);

-- ═══════════════════════════════════════════════════════════════
-- 10. DAILY STATS SNAPSHOT
-- ═══════════════════════════════════════════════════════════════

DROP MATERIALIZED VIEW IF EXISTS daily_stats_snapshot CASCADE;

CREATE MATERIALIZED VIEW daily_stats_snapshot AS
SELECT
  DATE(created_at) AS stat_date,
  COUNT(DISTINCT CASE WHEN l.id IS NOT NULL THEN l.user_id END) AS active_users,
  COUNT(DISTINCT l.id) AS leads_created,
  COUNT(DISTINCT CASE WHEN l.status = 'won' THEN l.id END) AS deals_won,
  COUNT(DISTINCT fu.id) AS followups_sent,
  COUNT(DISTINCT a.id) AS activities_logged,
  SUM(CASE WHEN l.status = 'won' THEN l.actual_value ELSE 0 END) AS revenue_won
FROM leads l
FULL OUTER JOIN follow_ups fu ON DATE(fu.created_at) = DATE(l.created_at)
FULL OUTER JOIN activities a ON DATE(a.created_at) = DATE(l.created_at)
WHERE DATE(COALESCE(l.created_at, fu.created_at, a.created_at)) >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY stat_date
ORDER BY stat_date DESC;

CREATE INDEX idx_daily_stats_date ON daily_stats_snapshot(stat_date DESC);

-- ═══════════════════════════════════════════════════════════════
-- REFRESH FUNCTION (Call this daily via cron)
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION refresh_all_analytics_views()
RETURNS TEXT AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY response_heatmap;
  REFRESH MATERIALIZED VIEW CONCURRENTLY weekly_activity_trend;
  REFRESH MATERIALIZED VIEW CONCURRENTLY gpt_vs_human_messages;
  REFRESH MATERIALIZED VIEW CONCURRENTLY channel_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY playbook_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY template_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY user_activity_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY lead_pipeline_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY ai_prompt_performance;
  REFRESH MATERIALIZED VIEW CONCURRENTLY daily_stats_snapshot;
  
  RETURN 'All analytics views refreshed successfully at ' || NOW()::TEXT;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_all_analytics_views() IS 'Refreshes all materialized views - call daily via cron';


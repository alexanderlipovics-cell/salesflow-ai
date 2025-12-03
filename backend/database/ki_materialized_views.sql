-- ============================================================================
-- SALES FLOW AI - MATERIALIZED VIEWS
-- Performance-optimierte Views für Dashboards & Analytics
-- Version: 1.0.0 | Created: 2024-12-01
-- ============================================================================

-- ============================================================================
-- VIEW 1: Scored Leads (Complete Lead Intelligence)
-- ============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS view_leads_scored AS
SELECT 
    l.id,
    l.user_id,
    l.name,
    l.email,
    l.phone,
    l.status,
    l.priority,
    l.source,
    l.created_at,
    l.updated_at,
    
    -- BANT Score
    b.total_score as bant_score,
    b.traffic_light as bant_traffic_light,
    b.assessed_at as bant_last_assessed,
    b.budget_score,
    b.authority_score,
    b.need_score,
    b.timeline_score,
    
    -- Personality
    p.primary_type as personality_type,
    p.secondary_type as personality_secondary,
    p.confidence_score as personality_confidence,
    p.assessment_method,
    
    -- Context Summary
    c.short_summary as context_summary,
    c.total_interactions,
    c.last_interaction_date,
    c.interaction_frequency,
    c.first_contact_date,
    
    -- Recommendations Count
    (SELECT COUNT(*) FROM ai_recommendations r 
     WHERE r.lead_id = l.id AND r.status = 'pending') as pending_recommendations,
    
    (SELECT COUNT(*) FROM ai_recommendations r 
     WHERE r.lead_id = l.id AND r.status = 'pending' AND r.priority = 'urgent') as urgent_recommendations,
    
    -- Engagement Score (0-100 based on recency)
    CASE 
        WHEN c.last_interaction_date IS NULL THEN 25
        WHEN c.last_interaction_date > NOW() - INTERVAL '3 days' THEN 100
        WHEN c.last_interaction_date > NOW() - INTERVAL '7 days' THEN 85
        WHEN c.last_interaction_date > NOW() - INTERVAL '14 days' THEN 65
        WHEN c.last_interaction_date > NOW() - INTERVAL '30 days' THEN 40
        ELSE 15
    END as engagement_score,
    
    -- Days since last contact
    CASE 
        WHEN c.last_interaction_date IS NOT NULL THEN 
            EXTRACT(EPOCH FROM (NOW() - c.last_interaction_date)) / 86400
        ELSE 
            EXTRACT(EPOCH FROM (NOW() - l.created_at)) / 86400
    END as days_since_contact,
    
    -- Overall Health Score (weighted average: BANT 40%, Engagement 30%, Personality Confidence 30%)
    (
        COALESCE(b.total_score, 50) * 0.4 +
        CASE 
            WHEN c.last_interaction_date IS NULL THEN 25
            WHEN c.last_interaction_date > NOW() - INTERVAL '3 days' THEN 100
            WHEN c.last_interaction_date > NOW() - INTERVAL '7 days' THEN 85
            WHEN c.last_interaction_date > NOW() - INTERVAL '14 days' THEN 65
            WHEN c.last_interaction_date > NOW() - INTERVAL '30 days' THEN 40
            ELSE 15
        END * 0.3 +
        COALESCE(p.confidence_score * 100, 50) * 0.3
    )::INTEGER as overall_health_score,
    
    -- Health Status (text)
    CASE 
        WHEN (
            COALESCE(b.total_score, 50) * 0.4 +
            CASE 
                WHEN c.last_interaction_date IS NULL THEN 25
                WHEN c.last_interaction_date > NOW() - INTERVAL '3 days' THEN 100
                WHEN c.last_interaction_date > NOW() - INTERVAL '7 days' THEN 85
                WHEN c.last_interaction_date > NOW() - INTERVAL '14 days' THEN 65
                WHEN c.last_interaction_date > NOW() - INTERVAL '30 days' THEN 40
                ELSE 15
            END * 0.3 +
            COALESCE(p.confidence_score * 100, 50) * 0.3
        ) >= 75 THEN 'excellent'
        WHEN (
            COALESCE(b.total_score, 50) * 0.4 +
            CASE 
                WHEN c.last_interaction_date IS NULL THEN 25
                WHEN c.last_interaction_date > NOW() - INTERVAL '3 days' THEN 100
                WHEN c.last_interaction_date > NOW() - INTERVAL '7 days' THEN 85
                WHEN c.last_interaction_date > NOW() - INTERVAL '14 days' THEN 65
                WHEN c.last_interaction_date > NOW() - INTERVAL '30 days' THEN 40
                ELSE 15
            END * 0.3 +
            COALESCE(p.confidence_score * 100, 50) * 0.3
        ) >= 50 THEN 'good'
        WHEN (
            COALESCE(b.total_score, 50) * 0.4 +
            CASE 
                WHEN c.last_interaction_date IS NULL THEN 25
                WHEN c.last_interaction_date > NOW() - INTERVAL '3 days' THEN 100
                WHEN c.last_interaction_date > NOW() - INTERVAL '7 days' THEN 85
                WHEN c.last_interaction_date > NOW() - INTERVAL '14 days' THEN 65
                WHEN c.last_interaction_date > NOW() - INTERVAL '30 days' THEN 40
                ELSE 15
            END * 0.3 +
            COALESCE(p.confidence_score * 100, 50) * 0.3
        ) >= 30 THEN 'needs_attention'
        ELSE 'critical'
    END as health_status,
    
    -- Has complete profile
    (b.id IS NOT NULL AND p.id IS NOT NULL) as has_complete_profile

FROM leads l
LEFT JOIN bant_assessments b ON b.lead_id = l.id
LEFT JOIN personality_profiles p ON p.lead_id = l.id
LEFT JOIN lead_context_summaries c ON c.lead_id = l.id;

-- Indexes for view_leads_scored
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_leads_scored_id ON view_leads_scored(id);
CREATE INDEX IF NOT EXISTS idx_mv_leads_scored_user ON view_leads_scored(user_id);
CREATE INDEX IF NOT EXISTS idx_mv_leads_scored_health ON view_leads_scored(overall_health_score DESC);
CREATE INDEX IF NOT EXISTS idx_mv_leads_scored_bant ON view_leads_scored(bant_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_mv_leads_scored_status ON view_leads_scored(status);
CREATE INDEX IF NOT EXISTS idx_mv_leads_scored_traffic ON view_leads_scored(bant_traffic_light);

-- ============================================================================
-- VIEW 2: Follow-up Priority (Next Best Actions)
-- ============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS view_followups_scored AS
SELECT 
    a.id as activity_id,
    a.lead_id,
    a.user_id,
    a.title,
    a.description,
    a.due_date,
    a.status,
    a.priority as activity_priority,
    a.created_at,
    
    l.name as lead_name,
    l.status as lead_status,
    
    -- Time-based urgency
    CASE 
        WHEN a.due_date < NOW() THEN 'overdue'
        WHEN a.due_date < NOW() + INTERVAL '1 day' THEN 'urgent'
        WHEN a.due_date < NOW() + INTERVAL '3 days' THEN 'soon'
        ELSE 'scheduled'
    END as urgency,
    
    -- Hours until due
    EXTRACT(EPOCH FROM (a.due_date - NOW())) / 3600 as hours_until_due,
    
    -- Deal health from leads view
    vls.overall_health_score,
    vls.bant_score,
    vls.bant_traffic_light,
    vls.personality_type,
    
    -- Recommendation context
    (SELECT COUNT(*) FROM ai_recommendations r 
     WHERE r.lead_id = a.lead_id 
     AND r.status = 'pending' 
     AND r.type = 'followup') as ai_suggestions_count,
    
    -- Last interaction
    vls.days_since_contact,
    
    -- Combined Priority Score (0-100)
    (
        -- Priority weight (40%)
        CASE a.priority
            WHEN 'high' THEN 100
            WHEN 'medium' THEN 75
            WHEN 'low' THEN 50
            ELSE 50
        END * 0.4 +
        -- Time urgency weight (30%)
        CASE 
            WHEN a.due_date < NOW() THEN 100
            WHEN a.due_date < NOW() + INTERVAL '1 day' THEN 90
            WHEN a.due_date < NOW() + INTERVAL '3 days' THEN 70
            WHEN a.due_date < NOW() + INTERVAL '7 days' THEN 50
            ELSE 30
        END * 0.3 +
        -- Deal health weight (30%)
        COALESCE(vls.overall_health_score, 50) * 0.3
    )::INTEGER as action_priority_score

FROM activities a
JOIN leads l ON l.id = a.lead_id
LEFT JOIN view_leads_scored vls ON vls.id = a.lead_id
WHERE a.status != 'completed'
ORDER BY action_priority_score DESC;

-- Indexes for view_followups_scored
CREATE INDEX IF NOT EXISTS idx_mv_followups_user ON view_followups_scored(user_id);
CREATE INDEX IF NOT EXISTS idx_mv_followups_priority ON view_followups_scored(action_priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_mv_followups_urgency ON view_followups_scored(urgency);
CREATE INDEX IF NOT EXISTS idx_mv_followups_due ON view_followups_scored(due_date);

-- ============================================================================
-- VIEW 3: Conversion Micro-Steps (Funnel Analytics)
-- ============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS view_conversion_microsteps AS
WITH lead_journey AS (
    SELECT 
        l.id as lead_id,
        l.user_id,
        l.created_at as step_0_created,
        
        -- First Contact
        (SELECT MIN(a.created_at) FROM activities a 
         WHERE a.lead_id = l.id) as step_1_first_activity,
        
        -- First BANT Assessment
        (SELECT MIN(b.assessed_at) FROM bant_assessments b 
         WHERE b.lead_id = l.id) as step_2_bant_assessed,
        
        -- Personality Profiled
        (SELECT MIN(p.created_at) FROM personality_profiles p 
         WHERE p.lead_id = l.id) as step_3_personality_profiled,
        
        -- Meeting Scheduled
        (SELECT MIN(e.start_time) FROM events e 
         WHERE e.lead_id = l.id AND e.type = 'meeting') as step_4_meeting_scheduled,
        
        -- Deal Closed
        CASE WHEN l.status = 'won' THEN l.updated_at ELSE NULL END as step_5_deal_won,
        
        -- Lead source
        l.source

    FROM leads l
)
SELECT 
    user_id,
    COUNT(*) as total_leads,
    
    -- Step Completion Counts
    COUNT(step_1_first_activity) as reached_first_contact,
    COUNT(step_2_bant_assessed) as reached_bant,
    COUNT(step_3_personality_profiled) as reached_personality,
    COUNT(step_4_meeting_scheduled) as reached_meeting,
    COUNT(step_5_deal_won) as reached_won,
    
    -- Conversion Rates (%)
    ROUND(COUNT(step_1_first_activity)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) as cr_to_first_contact,
    ROUND(COUNT(step_2_bant_assessed)::NUMERIC / NULLIF(COUNT(step_1_first_activity), 0) * 100, 2) as cr_to_bant,
    ROUND(COUNT(step_3_personality_profiled)::NUMERIC / NULLIF(COUNT(step_2_bant_assessed), 0) * 100, 2) as cr_to_personality,
    ROUND(COUNT(step_4_meeting_scheduled)::NUMERIC / NULLIF(COUNT(step_3_personality_profiled), 0) * 100, 2) as cr_to_meeting,
    ROUND(COUNT(step_5_deal_won)::NUMERIC / NULLIF(COUNT(step_4_meeting_scheduled), 0) * 100, 2) as cr_to_won,
    
    -- Overall conversion rate (lead to won)
    ROUND(COUNT(step_5_deal_won)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2) as overall_conversion_rate,
    
    -- Average Time Between Steps (in days)
    ROUND(AVG(EXTRACT(EPOCH FROM (step_1_first_activity - step_0_created)) / 86400)::NUMERIC, 1) as avg_days_to_first_contact,
    ROUND(AVG(EXTRACT(EPOCH FROM (step_2_bant_assessed - step_1_first_activity)) / 86400)::NUMERIC, 1) as avg_days_to_bant,
    ROUND(AVG(EXTRACT(EPOCH FROM (step_4_meeting_scheduled - step_2_bant_assessed)) / 86400)::NUMERIC, 1) as avg_days_to_meeting,
    ROUND(AVG(EXTRACT(EPOCH FROM (step_5_deal_won - step_4_meeting_scheduled)) / 86400)::NUMERIC, 1) as avg_days_to_close,
    
    -- Total average sales cycle
    ROUND(AVG(EXTRACT(EPOCH FROM (step_5_deal_won - step_0_created)) / 86400)::NUMERIC, 1) as avg_total_sales_cycle_days

FROM lead_journey
GROUP BY user_id;

-- Indexes for view_conversion_microsteps
CREATE INDEX IF NOT EXISTS idx_mv_conversion_user ON view_conversion_microsteps(user_id);
CREATE INDEX IF NOT EXISTS idx_mv_conversion_rate ON view_conversion_microsteps(overall_conversion_rate DESC);

-- ============================================================================
-- VIEW 4: Personality Insights (DISG Analytics)
-- ============================================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS view_personality_insights AS
WITH personality_performance AS (
    SELECT 
        pp.user_id,
        pp.primary_type,
        COUNT(*) as profile_count,
        AVG(pp.confidence_score) as avg_confidence,
        
        -- Win rate per personality type
        COUNT(CASE WHEN l.status = 'won' THEN 1 END)::NUMERIC / NULLIF(COUNT(*), 0) as win_rate,
        
        -- Avg time to close
        AVG(
            CASE WHEN l.status = 'won' THEN 
                EXTRACT(EPOCH FROM (l.updated_at - l.created_at)) / 86400
            END
        ) as avg_days_to_close,
        
        -- Avg BANT score
        AVG(b.total_score) as avg_bant_score
        
    FROM personality_profiles pp
    JOIN leads l ON l.id = pp.lead_id
    LEFT JOIN bant_assessments b ON b.lead_id = l.id
    GROUP BY pp.user_id, pp.primary_type
)
SELECT 
    user_id,
    
    -- Distribution
    SUM(CASE WHEN primary_type = 'D' THEN profile_count ELSE 0 END)::INTEGER as count_dominant,
    SUM(CASE WHEN primary_type = 'I' THEN profile_count ELSE 0 END)::INTEGER as count_influence,
    SUM(CASE WHEN primary_type = 'S' THEN profile_count ELSE 0 END)::INTEGER as count_steadiness,
    SUM(CASE WHEN primary_type = 'C' THEN profile_count ELSE 0 END)::INTEGER as count_conscientiousness,
    
    -- Performance by Type
    ROUND(MAX(CASE WHEN primary_type = 'D' THEN win_rate END)::NUMERIC * 100, 2) as win_rate_dominant,
    ROUND(MAX(CASE WHEN primary_type = 'I' THEN win_rate END)::NUMERIC * 100, 2) as win_rate_influence,
    ROUND(MAX(CASE WHEN primary_type = 'S' THEN win_rate END)::NUMERIC * 100, 2) as win_rate_steadiness,
    ROUND(MAX(CASE WHEN primary_type = 'C' THEN win_rate END)::NUMERIC * 100, 2) as win_rate_conscientiousness,
    
    -- Avg Time to Close by Type
    ROUND(MAX(CASE WHEN primary_type = 'D' THEN avg_days_to_close END)::NUMERIC, 1) as avg_close_days_dominant,
    ROUND(MAX(CASE WHEN primary_type = 'I' THEN avg_days_to_close END)::NUMERIC, 1) as avg_close_days_influence,
    ROUND(MAX(CASE WHEN primary_type = 'S' THEN avg_days_to_close END)::NUMERIC, 1) as avg_close_days_steadiness,
    ROUND(MAX(CASE WHEN primary_type = 'C' THEN avg_days_to_close END)::NUMERIC, 1) as avg_close_days_conscientiousness,
    
    -- Best Performing Type (highest win rate)
    (
        SELECT primary_type 
        FROM personality_performance pp2 
        WHERE pp2.user_id = pp.user_id 
        ORDER BY win_rate DESC 
        LIMIT 1
    ) as best_performing_type,
    
    -- Average Confidence Score
    ROUND(AVG(avg_confidence)::NUMERIC, 2) as avg_confidence_score,
    
    -- Total profiles
    SUM(profile_count)::INTEGER as total_profiles

FROM personality_performance pp
GROUP BY user_id;

-- Indexes for view_personality_insights
CREATE INDEX IF NOT EXISTS idx_mv_personality_user ON view_personality_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_mv_personality_best ON view_personality_insights(best_performing_type);

-- ============================================================================
-- REFRESH FUNCTIONS (Auto-refresh helpers)
-- ============================================================================

-- Refresh leads scored
CREATE OR REPLACE FUNCTION refresh_leads_scored()
RETURNS void 
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY view_leads_scored;
END;
$$;

-- Refresh followups scored
CREATE OR REPLACE FUNCTION refresh_followups_scored()
RETURNS void 
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY view_followups_scored;
END;
$$;

-- Refresh conversion microsteps
CREATE OR REPLACE FUNCTION refresh_conversion_microsteps()
RETURNS void 
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY view_conversion_microsteps;
END;
$$;

-- Refresh personality insights
CREATE OR REPLACE FUNCTION refresh_personality_insights()
RETURNS void 
LANGUAGE plpgsql
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY view_personality_insights;
END;
$$;

-- Refresh ALL views
CREATE OR REPLACE FUNCTION refresh_all_ki_views()
RETURNS void 
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM refresh_leads_scored();
    PERFORM refresh_followups_scored();
    PERFORM refresh_conversion_microsteps();
    PERFORM refresh_personality_insights();
    
    RAISE NOTICE 'All KI materialized views refreshed successfully';
END;
$$;

-- ============================================================================
-- AUTO-REFRESH TRIGGER (Optional Background Refresh)
-- ============================================================================

-- Create notification function
CREATE OR REPLACE FUNCTION notify_view_refresh()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
    -- Notify application to refresh views (handled by backend worker)
    PERFORM pg_notify('refresh_ki_views', json_build_object(
        'table', TG_TABLE_NAME,
        'timestamp', NOW()
    )::TEXT);
    
    RETURN NEW;
END;
$$;

-- Attach to key tables (optional - can be heavy on high-traffic systems)
-- Comment out if performance is impacted

-- CREATE TRIGGER trigger_refresh_on_lead_change
--     AFTER INSERT OR UPDATE OR DELETE ON leads
--     FOR EACH STATEMENT
--     EXECUTE FUNCTION notify_view_refresh();

-- CREATE TRIGGER trigger_refresh_on_bant_change
--     AFTER INSERT OR UPDATE ON bant_assessments
--     FOR EACH STATEMENT
--     EXECUTE FUNCTION notify_view_refresh();

-- ============================================================================
-- COMPLETE! 🚀
-- ============================================================================
-- Total Materialized Views: 4
-- - view_leads_scored (Complete Lead Intelligence)
-- - view_followups_scored (Next Best Actions)
-- - view_conversion_microsteps (Funnel Analytics)
-- - view_personality_insights (DISG Performance)
--
-- Refresh Functions: 5
-- - refresh_leads_scored()
-- - refresh_followups_scored()
-- - refresh_conversion_microsteps()
-- - refresh_personality_insights()
-- - refresh_all_ki_views()
-- ============================================================================


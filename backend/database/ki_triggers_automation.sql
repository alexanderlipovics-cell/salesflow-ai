-- ============================================================================
-- SALES FLOW AI - AUTOMATION TRIGGERS
-- Intelligente Auto-Recommendations & Workflow Automation
-- Version: 1.0.0 | Created: 2024-12-01
-- ============================================================================

-- ============================================================================
-- TRIGGER 1: Auto-generate BANT recommendations
-- ============================================================================
CREATE OR REPLACE FUNCTION auto_generate_bant_recommendations()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
    -- LOW BANT SCORE: Suggest re-assessment
    IF NEW.total_score < 50 AND (OLD.total_score IS NULL OR OLD.total_score >= 50) THEN
        INSERT INTO ai_recommendations (
            lead_id,
            user_id,
            type,
            priority,
            title,
            description,
            reasoning,
            playbook_name,
            triggered_by,
            confidence_score,
            expected_impact
        )
        VALUES (
            NEW.lead_id,
            NEW.user_id,
            'playbook',
            'high',
            '🔴 Niedrige BANT-Qualifizierung - Aktion erforderlich',
            'Deal-Health ist kritisch. Zeit für einen Deep-Dive mit DEAL-MEDIC.',
            format('BANT Score ist von %s auf %s gefallen. Besonders schwach: %s',
                COALESCE(OLD.total_score::TEXT, 'nicht bewertet'),
                NEW.total_score,
                CASE 
                    WHEN NEW.budget_score < 50 THEN 'Budget'
                    WHEN NEW.authority_score < 50 THEN 'Entscheidungskraft'
                    WHEN NEW.need_score < 50 THEN 'Bedarf'
                    WHEN NEW.timeline_score < 50 THEN 'Timeline'
                    ELSE 'mehrere Bereiche'
                END
            ),
            'DEAL-MEDIC',
            'low_bant_score',
            0.85,
            'high'
        );
    END IF;
    
    -- HIGH BANT SCORE (Green Light): Suggest closing
    IF NEW.total_score >= 75 AND NEW.traffic_light = 'green' 
       AND (OLD IS NULL OR OLD.traffic_light != 'green') THEN
        INSERT INTO ai_recommendations (
            lead_id,
            user_id,
            type,
            priority,
            title,
            description,
            reasoning,
            triggered_by,
            confidence_score,
            expected_impact
        )
        VALUES (
            NEW.lead_id,
            NEW.user_id,
            'followup',
            'urgent',
            '🟢 HOT LEAD - Closing-Gespräch planen',
            'Dieser Lead ist perfekt qualifiziert. Zeit für den Abschluss!',
            format('BANT Score: %s/100 (Green Light). Budget ✓ Authority ✓ Need ✓ Timeline ✓',
                NEW.total_score
            ),
            'high_bant_score',
            0.9,
            'high'
        );
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_bant_recommendations
    AFTER INSERT OR UPDATE ON bant_assessments
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_bant_recommendations();

-- ============================================================================
-- TRIGGER 2: Auto-suggest personality profiling
-- ============================================================================
CREATE OR REPLACE FUNCTION auto_suggest_personality_profiling()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
DECLARE
    v_has_personality BOOLEAN;
    v_interaction_count INTEGER;
BEGIN
    -- Check if lead already has personality profile
    SELECT EXISTS(
        SELECT 1 FROM personality_profiles WHERE lead_id = NEW.lead_id
    ) INTO v_has_personality;
    
    -- Count interactions (messages + activities)
    SELECT 
        (SELECT COUNT(*) FROM messages WHERE lead_id = NEW.lead_id) +
        (SELECT COUNT(*) FROM activities WHERE lead_id = NEW.lead_id)
    INTO v_interaction_count;
    
    -- Suggest profiling after 5+ interactions without profile
    IF NOT v_has_personality AND v_interaction_count >= 5 THEN
        INSERT INTO ai_recommendations (
            lead_id,
            user_id,
            type,
            priority,
            title,
            description,
            reasoning,
            playbook_name,
            triggered_by,
            confidence_score,
            expected_impact
        )
        VALUES (
            NEW.lead_id,
            NEW.user_id,
            'playbook',
            'medium',
            '🧠 NEURO-PROFILER starten',
            'Genug Daten gesammelt - erstelle ein Persönlichkeitsprofil für personalisierte Ansprache.',
            format('Du hast bereits %s Interaktionen mit diesem Lead. NEURO-PROFILER kann jetzt ein präzises DISG-Profil erstellen.',
                v_interaction_count
            ),
            'NEURO-PROFILER',
            'interaction_threshold',
            0.75,
            'medium'
        )
        ON CONFLICT DO NOTHING; -- Avoid duplicates
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_suggest_personality_profiling
    AFTER INSERT OR UPDATE ON lead_context_summaries
    FOR EACH ROW
    EXECUTE FUNCTION auto_suggest_personality_profiling();

-- ============================================================================
-- TRIGGER 3: Auto-update lead context on new messages
-- ============================================================================
CREATE OR REPLACE FUNCTION auto_update_lead_context()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update context summary interaction count
    UPDATE lead_context_summaries
    SET 
        last_interaction_date = NOW(),
        total_interactions = total_interactions + 1,
        last_updated_at = NOW()
    WHERE lead_id = NEW.lead_id;
    
    -- If context doesn't exist, create it
    IF NOT FOUND THEN
        INSERT INTO lead_context_summaries (
            lead_id,
            user_id,
            first_contact_date,
            last_interaction_date,
            total_interactions
        )
        SELECT 
            NEW.lead_id,
            l.user_id,
            NOW(),
            NOW(),
            1
        FROM leads l
        WHERE l.id = NEW.lead_id;
    END IF;
    
    -- Queue async context update (handled by backend)
    PERFORM pg_notify('update_lead_context', NEW.lead_id::TEXT);
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_context_on_message
    AFTER INSERT ON messages
    FOR EACH ROW
    EXECUTE FUNCTION auto_update_lead_context();

CREATE TRIGGER trigger_update_context_on_activity
    AFTER INSERT ON activities
    FOR EACH ROW
    EXECUTE FUNCTION auto_update_lead_context();

-- ============================================================================
-- TRIGGER 4: Time-decay recommendations (No contact warning)
-- ============================================================================
CREATE OR REPLACE FUNCTION check_lead_time_decay()
RETURNS void 
LANGUAGE plpgsql
AS $$
BEGIN
    -- Find leads with no contact in 14+ days (not won/lost)
    INSERT INTO ai_recommendations (
        lead_id,
        user_id,
        type,
        priority,
        title,
        description,
        reasoning,
        triggered_by,
        confidence_score,
        expected_impact
    )
    SELECT 
        l.id,
        l.user_id,
        'followup',
        CASE 
            WHEN days_since_contact > 30 THEN 'urgent'
            WHEN days_since_contact > 21 THEN 'high'
            ELSE 'medium'
        END,
        format('⏰ %s Tage kein Kontakt - Re-Engagement nötig', days_since_contact::INTEGER),
        format('Lead droht kalt zu werden. Schnelle Reaktion empfohlen.'),
        format('Letzter Kontakt vor %s Tagen. Statistisch sinkt Conversion-Rate nach 14 Tagen um 50%%.', 
            days_since_contact::INTEGER
        ),
        'time_decay',
        CASE 
            WHEN days_since_contact > 30 THEN 0.95
            WHEN days_since_contact > 21 THEN 0.85
            ELSE 0.75
        END,
        'high'
    FROM (
        SELECT 
            l.id,
            l.user_id,
            EXTRACT(EPOCH FROM (NOW() - COALESCE(c.last_interaction_date, l.created_at))) / 86400 as days_since_contact
        FROM leads l
        LEFT JOIN lead_context_summaries c ON c.lead_id = l.id
        WHERE l.status NOT IN ('won', 'lost', 'unqualified')
        AND EXTRACT(EPOCH FROM (NOW() - COALESCE(c.last_interaction_date, l.created_at))) / 86400 > 14
    ) aged_leads
    WHERE NOT EXISTS (
        -- Don't create duplicate recommendations
        SELECT 1 FROM ai_recommendations r
        WHERE r.lead_id = aged_leads.id
        AND r.triggered_by = 'time_decay'
        AND r.status = 'pending'
        AND r.created_at > NOW() - INTERVAL '7 days'
    );
    
    RAISE NOTICE 'Time-decay recommendations created';
END;
$$;

-- Schedule via pg_cron (optional, needs extension)
-- SELECT cron.schedule('check-time-decay', '0 9 * * *', 'SELECT check_lead_time_decay()');

-- ============================================================================
-- TRIGGER 5: Auto-expire old recommendations
-- ============================================================================
CREATE OR REPLACE FUNCTION expire_old_recommendations()
RETURNS void 
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE ai_recommendations
    SET 
        status = 'dismissed',
        dismissed_reason = 'Auto-expired after 30 days'
    WHERE status = 'pending'
    AND created_at < NOW() - INTERVAL '30 days'
    AND expires_at IS NULL;
    
    RAISE NOTICE 'Expired % old recommendations', ROW_COUNT;
END;
$$;

-- ============================================================================
-- TRIGGER 6: Compliance violation alerts
-- ============================================================================
CREATE OR REPLACE FUNCTION alert_compliance_violations()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
    -- If critical violation, create high-priority notification
    IF NEW.severity = 'critical' THEN
        -- Future: Send to admin dashboard or email
        PERFORM pg_notify('compliance_alert', json_build_object(
            'user_id', NEW.user_id,
            'severity', NEW.severity,
            'content_type', NEW.content_type,
            'violation_types', NEW.violation_types,
            'timestamp', NOW()
        )::TEXT);
        
        RAISE WARNING 'CRITICAL compliance violation by user %: %', 
            NEW.user_id, NEW.violation_types;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_compliance_violations
    AFTER INSERT ON compliance_logs
    FOR EACH ROW
    WHEN (NEW.violation_detected = TRUE AND NEW.severity IN ('high', 'critical'))
    EXECUTE FUNCTION alert_compliance_violations();

-- ============================================================================
-- TRIGGER 7: Playbook completion recommendations
-- ============================================================================
CREATE OR REPLACE FUNCTION handle_playbook_completion()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
    -- When playbook completes successfully
    IF NEW.status = 'completed' AND OLD.status = 'in_progress' THEN
        
        -- DEAL-MEDIC completed with low score → Follow-up recommendation
        IF NEW.playbook_name = 'DEAL-MEDIC' THEN
            DECLARE
                v_bant_score INTEGER;
            BEGIN
                SELECT total_score INTO v_bant_score
                FROM bant_assessments
                WHERE lead_id = NEW.lead_id
                ORDER BY assessed_at DESC
                LIMIT 1;
                
                IF v_bant_score < 50 THEN
                    INSERT INTO ai_recommendations (
                        lead_id,
                        user_id,
                        type,
                        priority,
                        title,
                        description,
                        reasoning,
                        triggered_by,
                        confidence_score
                    )
                    VALUES (
                        NEW.lead_id,
                        NEW.user_id,
                        'followup',
                        'high',
                        'DEAL-MEDIC abgeschlossen - Schwachstellen identifiziert',
                        'Fokus auf die schwächsten BANT-Bereiche legen.',
                        format('Playbook ergab Score von %s/100. Nächster Schritt: Gezielte Follow-ups.', v_bant_score),
                        'playbook_completion',
                        0.8
                    );
                END IF;
            END;
        END IF;
        
        -- NEURO-PROFILER completed → Suggest personalized outreach
        IF NEW.playbook_name = 'NEURO-PROFILER' THEN
            INSERT INTO ai_recommendations (
                lead_id,
                user_id,
                type,
                priority,
                title,
                description,
                reasoning,
                triggered_by,
                confidence_score
            )
            VALUES (
                NEW.lead_id,
                NEW.user_id,
                'message_draft',
                'medium',
                '🎯 Persönlichkeitsprofil erstellt - Personalisierte Message senden',
                'Nutze das neue DISG-Profil für eine maßgeschneiderte Nachricht.',
                'NEURO-PROFILER hat Persönlichkeitstyp identifiziert. Zeit für personalisierte Ansprache.',
                'playbook_completion',
                0.85
            );
        END IF;
        
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_playbook_completion
    AFTER UPDATE ON playbook_executions
    FOR EACH ROW
    EXECUTE FUNCTION handle_playbook_completion();

-- ============================================================================
-- HELPER FUNCTION: Clean up old data (Retention Policy)
-- ============================================================================
CREATE OR REPLACE FUNCTION cleanup_old_ki_data()
RETURNS void 
LANGUAGE plpgsql
AS $$
BEGIN
    -- Delete compliance logs older than 1 year
    DELETE FROM compliance_logs
    WHERE checked_at < NOW() - INTERVAL '1 year'
    AND severity NOT IN ('high', 'critical');
    
    RAISE NOTICE 'Deleted % old compliance logs', ROW_COUNT;
    
    -- Delete old coaching sessions (keep only last 6 months)
    DELETE FROM ai_coaching_sessions
    WHERE started_at < NOW() - INTERVAL '6 months';
    
    RAISE NOTICE 'Deleted % old coaching sessions', ROW_COUNT;
    
    -- Archive completed playbook executions older than 3 months
    -- (In production, move to separate archive table instead of deleting)
    DELETE FROM playbook_executions
    WHERE completed_at < NOW() - INTERVAL '3 months'
    AND status = 'completed';
    
    RAISE NOTICE 'Deleted % old playbook executions', ROW_COUNT;
END;
$$;

-- Schedule monthly cleanup (optional, needs pg_cron)
-- SELECT cron.schedule('cleanup-ki-data', '0 2 1 * *', 'SELECT cleanup_old_ki_data()');

-- ============================================================================
-- NOTIFICATION CHANNELS (For Backend Integration)
-- ============================================================================

-- Listen to these channels in your FastAPI backend:
-- - 'refresh_ki_views' → Refresh materialized views
-- - 'update_lead_context' → Update lead memory via GPT
-- - 'compliance_alert' → Send admin notification

-- Example Backend Listener (Python):
-- 
-- import asyncpg
-- 
-- async def listen_for_notifications():
--     conn = await asyncpg.connect(DATABASE_URL)
--     await conn.add_listener('refresh_ki_views', handle_view_refresh)
--     await conn.add_listener('update_lead_context', handle_context_update)
--     await conn.add_listener('compliance_alert', handle_compliance_alert)

-- ============================================================================
-- COMPLETE! 🚀
-- ============================================================================
-- Total Triggers: 7
-- - Auto-generate BANT recommendations
-- - Auto-suggest personality profiling
-- - Auto-update lead context
-- - Time-decay recommendations
-- - Auto-expire old recommendations
-- - Compliance violation alerts
-- - Playbook completion recommendations
--
-- Scheduled Jobs (requires pg_cron):
-- - check_lead_time_decay() → Daily at 9 AM
-- - expire_old_recommendations() → Daily
-- - cleanup_old_ki_data() → Monthly
-- ============================================================================


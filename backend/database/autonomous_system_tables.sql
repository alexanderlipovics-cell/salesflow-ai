-- ============================================================================
-- SALES FLOW AI - AUTONOMOUS SALES OS
-- Enhanced Tables für vollständig autonomes System
-- Version: 2.0.0 | Created: 2024-12-01
-- ============================================================================

-- ============================================================================
-- PHASE 1: ENHANCED LEAD LIFECYCLE
-- ============================================================================

-- 1. Erweitere Lead Status (falls nicht vorhanden, create enum)
DO $$ 
BEGIN
    -- Create enum if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_status_enum') THEN
        CREATE TYPE lead_status_enum AS ENUM (
            'new',
            'contacted',
            'qualified',
            'meeting_scheduled',
            'proposal_sent',
            'negotiation',
            'won',
            'lost',
            'nurture',
            'unqualified'
        );
    END IF;
END $$;

-- 2. Lead Status History Tracking
CREATE TABLE IF NOT EXISTS lead_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    changed_by UUID,
    reason TEXT,
    automated BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_status_history_lead ON lead_status_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_status_history_date ON lead_status_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_status_history_automated ON lead_status_history(automated) WHERE automated = TRUE;

-- 3. Autonomous Actions Log
CREATE TABLE IF NOT EXISTS autonomous_actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID,
    user_id UUID NOT NULL,
    action_type VARCHAR(50) NOT NULL, -- 'status_transition', 'recommendation_created', 'message_sent', 'playbook_triggered'
    action_details JSONB DEFAULT '{}'::JSONB,
    trigger_type VARCHAR(50), -- 'time_based', 'event_based', 'score_based', 'manual'
    trigger_data JSONB,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_autonomous_actions_lead ON autonomous_actions(lead_id);
CREATE INDEX IF NOT EXISTS idx_autonomous_actions_user ON autonomous_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_autonomous_actions_type ON autonomous_actions(action_type);
CREATE INDEX IF NOT EXISTS idx_autonomous_actions_date ON autonomous_actions(executed_at DESC);

-- 4. GPT Agent Memory (Conversation & Learning)
CREATE TABLE IF NOT EXISTS agent_memory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    lead_id UUID,
    memory_type VARCHAR(50) NOT NULL, -- 'conversation', 'insight', 'pattern', 'feedback'
    content TEXT NOT NULL,
    context JSONB DEFAULT '{}'::JSONB,
    importance_score FLOAT CHECK (importance_score BETWEEN 0 AND 1) DEFAULT 0.5,
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
    access_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_memory_user ON agent_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_lead ON agent_memory(lead_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_type ON agent_memory(memory_type);
CREATE INDEX IF NOT EXISTS idx_agent_memory_importance ON agent_memory(importance_score DESC);

-- 5. Daily Action Plans (GPT-Generated)
CREATE TABLE IF NOT EXISTS daily_action_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    plan_date DATE NOT NULL,
    top_priorities JSONB DEFAULT '[]'::JSONB, -- Array of prioritized actions
    strategic_insights TEXT,
    goal_progress JSONB DEFAULT '{}'::JSONB,
    completion_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
    actions_completed INTEGER DEFAULT 0,
    actions_total INTEGER,
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, plan_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_plans_user ON daily_action_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_plans_date ON daily_action_plans(plan_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_plans_status ON daily_action_plans(completion_status);

-- 6. Real-time Interventions
CREATE TABLE IF NOT EXISTS realtime_interventions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    lead_id UUID,
    event_type VARCHAR(50) NOT NULL, -- 'message_received', 'status_change', 'objection_detected', 'opportunity_detected'
    event_data JSONB DEFAULT '{}'::JSONB,
    intervention_type VARCHAR(50), -- 'warning', 'opportunity', 'coaching', 'playbook'
    title TEXT NOT NULL,
    message TEXT,
    suggested_response TEXT,
    playbook_recommendation VARCHAR(100),
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'viewed', 'acted', 'dismissed'
    viewed_at TIMESTAMPTZ,
    acted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interventions_user ON realtime_interventions(user_id);
CREATE INDEX IF NOT EXISTS idx_interventions_lead ON realtime_interventions(lead_id);
CREATE INDEX IF NOT EXISTS idx_interventions_status ON realtime_interventions(status);
CREATE INDEX IF NOT EXISTS idx_interventions_priority ON realtime_interventions(priority);
CREATE INDEX IF NOT EXISTS idx_interventions_date ON realtime_interventions(created_at DESC);

-- ============================================================================
-- PHASE 2: OMNICHANNEL AUTOMATION
-- ============================================================================

-- 7. Outbound Messages Queue
CREATE TABLE IF NOT EXISTS outbound_messages_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL,
    user_id UUID NOT NULL,
    channel VARCHAR(50) NOT NULL, -- 'whatsapp', 'email', 'sms', 'linkedin'
    message_type VARCHAR(50), -- 'followup', 'reengagement', 'proposal', 'check_in'
    content TEXT NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) DEFAULT 'queued', -- 'queued', 'sending', 'sent', 'failed', 'cancelled'
    sent_at TIMESTAMPTZ,
    external_id VARCHAR(200), -- Twilio SID, SendGrid ID, etc.
    error_message TEXT,
    compliance_checked BOOLEAN DEFAULT FALSE,
    compliance_log_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outbound_queue_lead ON outbound_messages_queue(lead_id);
CREATE INDEX IF NOT EXISTS idx_outbound_queue_user ON outbound_messages_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_outbound_queue_status ON outbound_messages_queue(status);
CREATE INDEX IF NOT EXISTS idx_outbound_queue_scheduled ON outbound_messages_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_outbound_queue_channel ON outbound_messages_queue(channel);

-- 8. Inbound Messages Processing
CREATE TABLE IF NOT EXISTS inbound_messages_processing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID,
    user_id UUID,
    channel VARCHAR(50) NOT NULL,
    from_number VARCHAR(50),
    from_email VARCHAR(200),
    content TEXT NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processing_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    gpt_analysis JSONB, -- Intent detection, sentiment, urgency
    auto_response_sent BOOLEAN DEFAULT FALSE,
    auto_response_content TEXT,
    requires_human BOOLEAN DEFAULT FALSE,
    human_notified_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inbound_processing_status ON inbound_messages_processing(processing_status);
CREATE INDEX IF NOT EXISTS idx_inbound_processing_lead ON inbound_messages_processing(lead_id);
CREATE INDEX IF NOT EXISTS idx_inbound_processing_requires_human ON inbound_messages_processing(requires_human) 
    WHERE requires_human = TRUE;

-- ============================================================================
-- PHASE 3: PROPOSALS & DOCUMENTS
-- ============================================================================

-- 9. Dynamic Proposals
CREATE TABLE IF NOT EXISTS dynamic_proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID NOT NULL,
    user_id UUID NOT NULL,
    version INTEGER DEFAULT 1,
    recommended_package VARCHAR(100),
    package_justification TEXT,
    personalized_pitch TEXT,
    objection_handling JSONB DEFAULT '{}'::JSONB,
    pricing JSONB DEFAULT '{}'::JSONB,
    call_to_action TEXT,
    full_proposal_data JSONB,
    pdf_url TEXT,
    pdf_generated BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ,
    viewed_at TIMESTAMPTZ,
    view_count INTEGER DEFAULT 0,
    accepted_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proposals_lead ON dynamic_proposals(lead_id);
CREATE INDEX IF NOT EXISTS idx_proposals_user ON dynamic_proposals(user_id);
CREATE INDEX IF NOT EXISTS idx_proposals_sent ON dynamic_proposals(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposals_accepted ON dynamic_proposals(accepted_at DESC) 
    WHERE accepted_at IS NOT NULL;

-- ============================================================================
-- PHASE 4: SQUAD INTELLIGENCE
-- ============================================================================

-- 10. Squad Performance Snapshots
CREATE TABLE IF NOT EXISTS squad_performance_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    squad_id UUID NOT NULL,
    snapshot_date DATE NOT NULL,
    member_count INTEGER,
    active_leads INTEGER,
    deals_closed INTEGER,
    conversion_rate FLOAT,
    avg_deal_size DECIMAL(10, 2),
    total_revenue DECIMAL(12, 2),
    member_performance JSONB DEFAULT '[]'::JSONB, -- Array of member stats
    top_performers JSONB DEFAULT '[]'::JSONB,
    needs_coaching JSONB DEFAULT '[]'::JSONB,
    squad_patterns JSONB DEFAULT '{}'::JSONB,
    gpt_analysis TEXT,
    recommended_actions JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(squad_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_squad_snapshots_squad ON squad_performance_snapshots(squad_id);
CREATE INDEX IF NOT EXISTS idx_squad_snapshots_date ON squad_performance_snapshots(snapshot_date DESC);

-- 11. Coaching Needs Detection
CREATE TABLE IF NOT EXISTS coaching_needs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    squad_id UUID,
    issue_type VARCHAR(50) NOT NULL, -- 'response_time', 'channel_usage', 'objection_handling', 'conversion_rate'
    issue_description TEXT NOT NULL,
    current_metric FLOAT,
    benchmark_metric FLOAT,
    gap_percentage FLOAT,
    severity VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
    recommended_playbook VARCHAR(100),
    recommended_training TEXT,
    status VARCHAR(20) DEFAULT 'open', -- 'open', 'acknowledged', 'in_progress', 'resolved'
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coaching_needs_user ON coaching_needs(user_id);
CREATE INDEX IF NOT EXISTS idx_coaching_needs_squad ON coaching_needs(squad_id);
CREATE INDEX IF NOT EXISTS idx_coaching_needs_status ON coaching_needs(status);
CREATE INDEX IF NOT EXISTS idx_coaching_needs_severity ON coaching_needs(severity);

-- 12. Success Patterns Tracking (Enhanced)
CREATE TABLE IF NOT EXISTS success_pattern_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_id UUID, -- References success_patterns table
    user_id UUID NOT NULL,
    lead_id UUID,
    pattern_applied_at TIMESTAMPTZ DEFAULT NOW(),
    outcome VARCHAR(50), -- 'won', 'lost', 'in_progress'
    time_to_outcome_days INTEGER,
    outcome_value DECIMAL(10, 2),
    pattern_effectiveness_score FLOAT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pattern_tracking_pattern ON success_pattern_tracking(pattern_id);
CREATE INDEX IF NOT EXISTS idx_pattern_tracking_user ON success_pattern_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_pattern_tracking_outcome ON success_pattern_tracking(outcome);

-- ============================================================================
-- AUTO-TRANSITION TRIGGERS
-- ============================================================================

-- Trigger 1: Auto Status Transitions
CREATE OR REPLACE FUNCTION auto_transition_lead_status()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_status VARCHAR(50);
    v_new_status VARCHAR(50);
BEGIN
    -- Get current lead status
    SELECT status INTO v_current_status FROM leads WHERE id = NEW.lead_id;
    
    -- NEW → CONTACTED (on first activity)
    IF v_current_status = 'new' AND TG_TABLE_NAME = 'activities' THEN
        v_new_status := 'contacted';
        
        UPDATE leads SET status = v_new_status WHERE id = NEW.lead_id;
        
        INSERT INTO lead_status_history (lead_id, from_status, to_status, automated, metadata)
        VALUES (NEW.lead_id, v_current_status, v_new_status, TRUE, 
                jsonb_build_object('trigger', 'first_activity', 'activity_id', NEW.id));
        
        -- Log autonomous action
        INSERT INTO autonomous_actions (lead_id, user_id, action_type, action_details, trigger_type)
        SELECT NEW.lead_id, user_id, 'status_transition', 
               jsonb_build_object('from', v_current_status, 'to', v_new_status),
               'event_based'
        FROM leads WHERE id = NEW.lead_id;
    END IF;
    
    -- CONTACTED → QUALIFIED (on BANT score >= 50)
    IF TG_TABLE_NAME = 'bant_assessments' AND NEW.total_score >= 50 THEN
        IF v_current_status IN ('contacted', 'new') THEN
            v_new_status := 'qualified';
            
            UPDATE leads SET status = v_new_status WHERE id = NEW.lead_id;
            
            INSERT INTO lead_status_history (lead_id, from_status, to_status, automated, metadata)
            VALUES (NEW.lead_id, v_current_status, v_new_status, TRUE,
                    jsonb_build_object('bant_score', NEW.total_score, 'traffic_light', NEW.traffic_light));
            
            -- Create urgent recommendation if green light
            IF NEW.traffic_light = 'green' THEN
                INSERT INTO ai_recommendations (lead_id, user_id, type, priority, title, description, triggered_by, confidence_score)
                SELECT NEW.lead_id, user_id, 'followup', 'urgent',
                       '🟢 HOT LEAD - Schedule Meeting NOW',
                       format('BANT Score: %s/100 (Green Light). This lead is ready to close!', NEW.total_score),
                       'high_bant_score',
                       0.95
                FROM leads WHERE id = NEW.lead_id;
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Attach triggers
DROP TRIGGER IF EXISTS trg_auto_status_activity ON activities;
CREATE TRIGGER trg_auto_status_activity
    AFTER INSERT ON activities
    FOR EACH ROW
    EXECUTE FUNCTION auto_transition_lead_status();

DROP TRIGGER IF EXISTS trg_auto_status_bant ON bant_assessments;
CREATE TRIGGER trg_auto_status_bant
    AFTER INSERT OR UPDATE ON bant_assessments
    FOR EACH ROW
    EXECUTE FUNCTION auto_transition_lead_status();

-- Trigger 2: Log All Autonomous Actions
CREATE OR REPLACE FUNCTION log_autonomous_action()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.triggered_by IN ('time_decay', 'low_bant_score', 'high_bant_score', 'interaction_threshold', 
                            'playbook_completion', 'ai_pattern') THEN
        INSERT INTO autonomous_actions (
            lead_id, 
            user_id, 
            action_type, 
            action_details, 
            trigger_type
        )
        VALUES (
            NEW.lead_id,
            NEW.user_id,
            'recommendation_created',
            jsonb_build_object(
                'recommendation_id', NEW.id,
                'type', NEW.type,
                'priority', NEW.priority,
                'title', NEW.title
            ),
            NEW.triggered_by
        );
    END IF;
    
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_autonomous_recommendations ON ai_recommendations;
CREATE TRIGGER trg_log_autonomous_recommendations
    AFTER INSERT ON ai_recommendations
    FOR EACH ROW
    EXECUTE FUNCTION log_autonomous_action();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Get Lead Lifecycle Stage
CREATE OR REPLACE FUNCTION get_lead_lifecycle_stage(p_lead_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'current_status', l.status,
        'days_in_status', EXTRACT(EPOCH FROM (NOW() - lsh.created_at)) / 86400,
        'total_transitions', (SELECT COUNT(*) FROM lead_status_history WHERE lead_id = p_lead_id),
        'last_transition', lsh.created_at,
        'transition_history', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'from', from_status,
                    'to', to_status,
                    'date', created_at,
                    'automated', automated
                )
                ORDER BY created_at DESC
            )
            FROM lead_status_history
            WHERE lead_id = p_lead_id
            LIMIT 10
        )
    )
    INTO v_result
    FROM leads l
    LEFT JOIN lead_status_history lsh ON lsh.lead_id = l.id
    WHERE l.id = p_lead_id
    ORDER BY lsh.created_at DESC
    LIMIT 1;
    
    RETURN v_result;
END;
$$;

-- Function: Get Autonomous Actions Summary
CREATE OR REPLACE FUNCTION get_autonomous_actions_summary(
    p_user_id UUID,
    p_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
    v_result JSONB;
BEGIN
    SELECT jsonb_build_object(
        'total_actions', COUNT(*),
        'by_type', jsonb_object_agg(
            action_type,
            COUNT(*)
        ),
        'success_rate', 
            ROUND(COUNT(*) FILTER (WHERE success = TRUE)::NUMERIC / NULLIF(COUNT(*), 0) * 100, 2),
        'recent_actions', (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'action_type', action_type,
                    'lead_id', lead_id,
                    'details', action_details,
                    'executed_at', executed_at
                )
                ORDER BY executed_at DESC
            )
            FROM (
                SELECT * FROM autonomous_actions
                WHERE user_id = p_user_id
                AND executed_at > NOW() - (p_days || ' days')::INTERVAL
                ORDER BY executed_at DESC
                LIMIT 20
            ) recent
        )
    )
    INTO v_result
    FROM autonomous_actions
    WHERE user_id = p_user_id
    AND executed_at > NOW() - (p_days || ' days')::INTERVAL;
    
    RETURN v_result;
END;
$$;

-- ============================================================================
-- COMPLETE! 🚀
-- ============================================================================
-- Autonomous System Tables: 12
-- Triggers: 2 (with auto-transitions)
-- Helper Functions: 2
-- 
-- Next: Implement Services Layer
-- ============================================================================


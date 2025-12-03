-- ============================================================================
-- SALES FLOW AI - KI RPC FUNCTIONS
-- PostgreSQL Functions für GPT-4 Integration
-- Version: 1.0.0 | Created: 2024-12-01
-- ============================================================================

-- ============================================================================
-- RPC 1: Generate DISG Recommendations
-- ============================================================================
CREATE OR REPLACE FUNCTION generate_disg_recommendations(
    p_lead_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_profile RECORD;
    v_recommendations JSONB;
BEGIN
    -- Get personality profile
    SELECT * INTO v_profile
    FROM personality_profiles
    WHERE lead_id = p_lead_id;
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'No personality profile found for this lead'
        );
    END IF;
    
    -- Generate recommendations based on primary type
    v_recommendations := jsonb_build_object(
        'lead_id', p_lead_id,
        'primary_type', v_profile.primary_type,
        'confidence_score', v_profile.confidence_score,
        'communication_style', CASE v_profile.primary_type
            WHEN 'D' THEN jsonb_build_object(
                'tone', 'direct and results-focused',
                'pace', 'fast',
                'key_phrases', jsonb_build_array('bottom line', 'efficiency', 'results', 'ROI', 'competitive advantage'),
                'avoid', jsonb_build_array('small talk', 'long explanations', 'emotional appeals', 'indecision'),
                'meeting_style', 'short and to the point, agenda-driven',
                'decision_speed', 'fast - wants to decide quickly',
                'preferred_communication', 'bullet points, executive summaries'
            )
            WHEN 'I' THEN jsonb_build_object(
                'tone', 'enthusiastic and relationship-oriented',
                'pace', 'energetic',
                'key_phrases', jsonb_build_array('exciting opportunity', 'team', 'recognition', 'innovation', 'community'),
                'avoid', jsonb_build_array('too much detail', 'negativity', 'isolation', 'boring data'),
                'meeting_style', 'energetic and interactive, collaborative',
                'decision_speed', 'quick but may need reminders to follow through',
                'preferred_communication', 'stories, testimonials, social proof'
            )
            WHEN 'S' THEN jsonb_build_object(
                'tone', 'patient and supportive',
                'pace', 'steady and calm',
                'key_phrases', jsonb_build_array('stability', 'support', 'proven', 'reliable', 'team harmony'),
                'avoid', jsonb_build_array('pressure', 'sudden changes', 'risk', 'confrontation'),
                'meeting_style', 'calm and reassuring, step-by-step',
                'decision_speed', 'slow and deliberate - needs time to process',
                'preferred_communication', 'personal connection, guarantees, ongoing support'
            )
            WHEN 'C' THEN jsonb_build_object(
                'tone', 'precise and analytical',
                'pace', 'methodical',
                'key_phrases', jsonb_build_array('data', 'accuracy', 'quality', 'details', 'systematic'),
                'avoid', jsonb_build_array('vague claims', 'emotions', 'hype', 'incomplete information'),
                'meeting_style', 'structured with agenda, detailed documentation',
                'decision_speed', 'slow with thorough research and validation',
                'preferred_communication', 'detailed reports, case studies, technical specs'
            )
        END,
        'objection_handling', CASE v_profile.primary_type
            WHEN 'D' THEN jsonb_build_object(
                'strategy', 'Address with facts and ROI calculations',
                'example', 'Show concrete numbers: "This saves 10 hours per week, worth €5,000 in productivity"'
            )
            WHEN 'I' THEN jsonb_build_object(
                'strategy', 'Use social proof and testimonials',
                'example', 'Share success stories: "Over 500 leaders in your industry already use this"'
            )
            WHEN 'S' THEN jsonb_build_object(
                'strategy', 'Provide guarantees and support assurances',
                'example', 'Emphasize safety: "30-day guarantee + dedicated support team available 24/7"'
            )
            WHEN 'C' THEN jsonb_build_object(
                'strategy', 'Present detailed data and research',
                'example', 'Show evidence: "Based on 3-year study with 1,000+ participants, 87% satisfaction rate"'
            )
        END,
        'ideal_pitch_structure', CASE v_profile.primary_type
            WHEN 'D' THEN jsonb_build_array(
                '1. Bottom line first (result)',
                '2. How it works (briefly)',
                '3. Timeline to implement',
                '4. Ask for decision'
            )
            WHEN 'I' THEN jsonb_build_array(
                '1. Paint exciting vision',
                '2. Share success stories',
                '3. Emphasize community/team',
                '4. Make it fun and interactive'
            )
            WHEN 'S' THEN jsonb_build_array(
                '1. Build rapport first',
                '2. Explain step-by-step',
                '3. Address concerns proactively',
                '4. Offer support and guarantees'
            )
            WHEN 'C' THEN jsonb_build_array(
                '1. Present detailed agenda',
                '2. Share data and specifications',
                '3. Answer all questions thoroughly',
                '4. Provide time to analyze'
            )
        END,
        'close_technique', CASE v_profile.primary_type
            WHEN 'D' THEN 'Challenge Close: "Are you ready to move forward and get results?"'
            WHEN 'I' THEN 'Assumptive Close: "I''ll get you set up with the team - exciting!"'
            WHEN 'S' THEN 'Soft Close: "Does this feel like a good fit for you?"'
            WHEN 'C' THEN 'Logical Close: "Based on the data, does this meet your requirements?"'
        END,
        'red_flags', CASE v_profile.primary_type
            WHEN 'D' THEN jsonb_build_array('Wasting their time', 'Being indecisive', 'Over-explaining')
            WHEN 'I' THEN jsonb_build_array('Being too serious', 'Ignoring their ideas', 'Too much data')
            WHEN 'S' THEN jsonb_build_array('Rushing them', 'Being pushy', 'Creating uncertainty')
            WHEN 'C' THEN jsonb_build_array('Lacking details', 'Being vague', 'Emotional appeals')
        END
    );
    
    -- Update profile with recommendations
    UPDATE personality_profiles
    SET 
        communication_tips = v_recommendations->'communication_style',
        objection_handling_style = (v_recommendations->'objection_handling'->>'strategy'),
        ideal_pitch_style = (v_recommendations->>'ideal_pitch_structure'),
        updated_at = NOW()
    WHERE lead_id = p_lead_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'lead_id', p_lead_id,
        'recommendations', v_recommendations
    );
END;
$$;

-- ============================================================================
-- RPC 2: Update Lead Memory (Auto-Context)
-- ============================================================================
CREATE OR REPLACE FUNCTION update_lead_memory(
    p_lead_id UUID,
    p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_context_text TEXT;
    v_lead_data JSONB;
    v_sources_count INTEGER;
BEGIN
    -- Build comprehensive context from all sources
    WITH lead_base AS (
        SELECT 
            id,
            name,
            email,
            phone,
            status,
            source,
            notes
        FROM leads
        WHERE id = p_lead_id
        LIMIT 1
    ),
    bant_data AS (
        SELECT 
            total_score as bant_score,
            traffic_light,
            budget_notes,
            authority_notes,
            need_notes,
            timeline_notes,
            next_steps
        FROM bant_assessments
        WHERE lead_id = p_lead_id
        ORDER BY created_at DESC
        LIMIT 1
    ),
    personality_data AS (
        SELECT 
            primary_type as personality,
            confidence_score as personality_confidence,
            communication_tips
        FROM personality_profiles
        WHERE lead_id = p_lead_id
        LIMIT 1
    ),
    messages_summary AS (
        SELECT 
            COUNT(*) as message_count,
            string_agg(content, ' | ' ORDER BY created_at DESC) as recent_messages
        FROM (
            SELECT content, created_at
            FROM messages
            WHERE lead_id = p_lead_id
            ORDER BY created_at DESC
            LIMIT 20
        ) recent
    ),
    activities_summary AS (
        SELECT 
            COUNT(*) as activity_count,
            string_agg(
                title || COALESCE(': ' || notes, ''), 
                ' | ' 
                ORDER BY created_at DESC
            ) as recent_activities
        FROM (
            SELECT title, notes, created_at
            FROM activities
            WHERE lead_id = p_lead_id
            ORDER BY created_at DESC
            LIMIT 15
        ) recent
    )
    SELECT jsonb_build_object(
        'lead', row_to_json(lb.*),
        'bant', row_to_json(bd.*),
        'personality', row_to_json(pd.*),
        'messages', row_to_json(ms.*),
        'activities', row_to_json(as_sum.*)
    )
    INTO v_lead_data
    FROM lead_base lb
    LEFT JOIN bant_data bd ON true
    LEFT JOIN personality_data pd ON true
    LEFT JOIN messages_summary ms ON true
    LEFT JOIN activities_summary as_sum ON true;
    
    -- Build GPT-optimized context text
    v_context_text := format(
        E'Lead: %s\nStatus: %s\nSource: %s\n\nBANT Score: %s (%s)\nPersonality: %s\n\nRecent Interactions:\n%s\n\nRecent Activities:\n%s',
        COALESCE(v_lead_data->'lead'->>'name', 'Unknown'),
        COALESCE(v_lead_data->'lead'->>'status', 'unknown'),
        COALESCE(v_lead_data->'lead'->>'source', 'unknown'),
        COALESCE((v_lead_data->'bant'->>'bant_score')::TEXT, 'not assessed'),
        COALESCE(v_lead_data->'bant'->>'traffic_light', 'unknown'),
        COALESCE(v_lead_data->'personality'->>'personality', 'not profiled'),
        COALESCE(v_lead_data->'messages'->>'recent_messages', 'No messages yet'),
        COALESCE(v_lead_data->'activities'->>'recent_activities', 'No activities yet')
    );
    
    -- Count sources
    v_sources_count := 
        COALESCE((v_lead_data->'messages'->>'message_count')::INTEGER, 0) +
        COALESCE((v_lead_data->'activities'->>'activity_count')::INTEGER, 0);
    
    -- Insert or update context summary
    INSERT INTO lead_context_summaries (
        lead_id,
        user_id,
        gpt_context_blob,
        sources_count,
        total_interactions,
        last_updated_at
    )
    VALUES (
        p_lead_id,
        p_user_id,
        v_context_text,
        v_sources_count,
        v_sources_count,
        NOW()
    )
    ON CONFLICT (lead_id) 
    DO UPDATE SET
        gpt_context_blob = EXCLUDED.gpt_context_blob,
        sources_count = EXCLUDED.sources_count,
        total_interactions = EXCLUDED.total_interactions,
        last_updated_at = NOW();
    
    RETURN jsonb_build_object(
        'success', true,
        'lead_id', p_lead_id,
        'context_length', LENGTH(v_context_text),
        'sources_count', v_sources_count,
        'updated_at', NOW()
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- ============================================================================
-- RPC 3: Log AI Output Compliance
-- ============================================================================
CREATE OR REPLACE FUNCTION log_ai_output_compliance(
    p_user_id UUID,
    p_content_type VARCHAR,
    p_original_content TEXT,
    p_filtered_content TEXT DEFAULT NULL,
    p_violation_detected BOOLEAN DEFAULT FALSE,
    p_violation_types JSONB DEFAULT '[]'::JSONB,
    p_action VARCHAR DEFAULT 'allowed',
    p_related_lead_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_id UUID;
    v_severity VARCHAR;
BEGIN
    -- Determine severity based on violation types
    v_severity := CASE 
        WHEN p_violation_types ? 'health_claim' OR p_violation_types ? 'income_guarantee' THEN 'critical'
        WHEN p_violation_types ? 'exaggeration' OR p_violation_types ? 'misleading' THEN 'high'
        WHEN p_violation_types ? 'unclear_disclaimer' THEN 'medium'
        ELSE 'low'
    END;
    
    -- Insert log
    INSERT INTO compliance_logs (
        user_id,
        content_type,
        original_content,
        filtered_content,
        violation_detected,
        violation_types,
        severity,
        action,
        related_lead_id
    )
    VALUES (
        p_user_id,
        p_content_type,
        p_original_content,
        p_filtered_content,
        p_violation_detected,
        p_violation_types,
        v_severity,
        p_action,
        p_related_lead_id
    )
    RETURNING id INTO v_log_id;
    
    -- If critical, could trigger notification here
    IF v_severity = 'critical' THEN
        -- Future: INSERT INTO admin_notifications
        RAISE NOTICE 'CRITICAL compliance violation detected for user %', p_user_id;
    END IF;
    
    RETURN v_log_id;
END;
$$;

-- ============================================================================
-- RPC 4: Recommend Follow-up Actions
-- ============================================================================
CREATE OR REPLACE FUNCTION recommend_followup_actions(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    lead_id UUID,
    lead_name TEXT,
    recommended_action TEXT,
    priority VARCHAR,
    reasoning TEXT,
    confidence FLOAT,
    lead_status TEXT,
    days_since_contact FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH lead_analysis AS (
        SELECT 
            l.id,
            l.name,
            l.status,
            c.last_interaction_date,
            b.total_score as bant_score,
            b.traffic_light,
            p.primary_type,
            
            -- Days since last contact
            EXTRACT(EPOCH FROM (NOW() - COALESCE(c.last_interaction_date, l.created_at))) / 86400 as days_since_contact,
            
            -- Pending recommendations
            (SELECT COUNT(*) FROM ai_recommendations r 
             WHERE r.lead_id = l.id AND r.status = 'pending') as pending_recs,
             
            -- Has BANT assessment
            (b.id IS NOT NULL) as has_bant,
            
            -- Has personality profile
            (p.id IS NOT NULL) as has_personality
             
        FROM leads l
        LEFT JOIN lead_context_summaries c ON c.lead_id = l.id
        LEFT JOIN bant_assessments b ON b.lead_id = l.id
        LEFT JOIN personality_profiles p ON p.lead_id = l.id
        WHERE l.user_id = p_user_id
        AND l.status NOT IN ('won', 'lost', 'unqualified')
    )
    SELECT 
        la.id,
        la.name,
        
        -- Action recommendation
        CASE 
            WHEN la.days_since_contact > 14 THEN 'URGENT: Re-engagement call needed'
            WHEN la.days_since_contact > 7 AND la.traffic_light = 'green' THEN 'Schedule demo/closing meeting'
            WHEN la.traffic_light = 'red' THEN 'Run DEAL-MEDIC assessment to improve BANT score'
            WHEN NOT la.has_personality THEN 'Complete NEURO-PROFILER for personalized approach'
            WHEN NOT la.has_bant THEN 'Run initial DEAL-MEDIC qualification'
            WHEN la.pending_recs > 0 THEN 'Review and act on pending AI recommendations'
            ELSE 'Send personalized follow-up message'
        END::TEXT,
        
        -- Priority
        CASE 
            WHEN la.days_since_contact > 14 OR la.traffic_light = 'green' THEN 'urgent'::VARCHAR
            WHEN la.days_since_contact > 7 OR la.traffic_light = 'yellow' THEN 'high'::VARCHAR
            ELSE 'medium'::VARCHAR
        END,
        
        -- Reasoning
        CASE 
            WHEN la.days_since_contact > 14 THEN 
                format('No contact for %s days - high risk of losing lead', ROUND(la.days_since_contact))
            WHEN la.traffic_light = 'green' THEN 
                format('High BANT score (%s/100) - deal is hot and ready to close', la.bant_score)
            WHEN la.traffic_light = 'red' THEN 
                format('Low qualification score (%s/100) - needs assessment to identify blockers', COALESCE(la.bant_score, 0))
            WHEN NOT la.has_personality THEN
                'Missing personality profile - could improve conversion with personalized approach'
            ELSE 'Routine follow-up to maintain engagement and move deal forward'
        END::TEXT,
        
        -- Confidence
        CASE 
            WHEN la.has_bant AND la.has_personality THEN 0.9::FLOAT
            WHEN la.has_bant OR la.has_personality THEN 0.7::FLOAT
            ELSE 0.5::FLOAT
        END,
        
        la.status::TEXT,
        la.days_since_contact::FLOAT
        
    FROM lead_analysis la
    ORDER BY 
        CASE 
            WHEN la.days_since_contact > 14 OR la.traffic_light = 'green' THEN 1
            WHEN la.days_since_contact > 7 OR la.traffic_light = 'yellow' THEN 2
            ELSE 3
        END,
        COALESCE(la.bant_score, 0) DESC,
        la.days_since_contact DESC
    LIMIT p_limit;
END;
$$;

-- ============================================================================
-- RPC 5: Get Best Contact Window (Channel Intelligence)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_best_contact_window(
    p_user_id UUID,
    p_channel VARCHAR DEFAULT 'all'
)
RETURNS TABLE (
    channel VARCHAR,
    best_hours INTEGER[],
    best_days INTEGER[],
    contact_rate FLOAT,
    sample_size INTEGER,
    avg_response_time_hours FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH recent_metrics AS (
        SELECT 
            cpm.channel,
            cpm.best_contact_hours,
            cpm.best_contact_days,
            cpm.contact_rate,
            cpm.total_attempts as sample_size,
            ROUND(cpm.avg_response_time_seconds::NUMERIC / 3600, 1) as avg_response_hours
        FROM channel_performance_metrics cpm
        WHERE cpm.user_id = p_user_id
        AND (p_channel = 'all' OR cpm.channel = p_channel)
        AND cpm.period_end > CURRENT_DATE - INTERVAL '90 days'
    )
    SELECT 
        rm.channel::VARCHAR,
        
        -- Best hours (extract from JSONB or default)
        COALESCE(
            ARRAY(SELECT jsonb_array_elements_text(rm.best_contact_hours)::INTEGER),
            ARRAY[9, 10, 11, 14, 15, 16]
        )::INTEGER[],
        
        -- Best days (extract from JSONB or default to Tue-Thu)
        COALESCE(
            ARRAY(SELECT jsonb_array_elements_text(rm.best_contact_days)::INTEGER),
            ARRAY[2, 3, 4]
        )::INTEGER[],
        
        rm.contact_rate::FLOAT,
        rm.sample_size::INTEGER,
        rm.avg_response_hours::FLOAT
        
    FROM recent_metrics rm
    ORDER BY rm.contact_rate DESC;
END;
$$;

-- ============================================================================
-- RPC 6: Get Lead Intelligence Summary (For GPT Context)
-- ============================================================================
CREATE OR REPLACE FUNCTION get_lead_intelligence(
    p_lead_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_intelligence JSONB;
BEGIN
    WITH lead_data AS (
        SELECT 
            l.id,
            l.name,
            l.email,
            l.status,
            l.source,
            
            -- BANT
            jsonb_build_object(
                'score', b.total_score,
                'traffic_light', b.traffic_light,
                'budget', b.budget_score,
                'authority', b.authority_score,
                'need', b.need_score,
                'timeline', b.timeline_score,
                'next_steps', b.next_steps
            ) as bant,
            
            -- Personality
            jsonb_build_object(
                'primary_type', p.primary_type,
                'confidence', p.confidence_score,
                'communication_tips', p.communication_tips,
                'ideal_pitch_style', p.ideal_pitch_style
            ) as personality,
            
            -- Context
            jsonb_build_object(
                'short_summary', c.short_summary,
                'key_facts', c.key_facts,
                'pain_points', c.pain_points,
                'goals', c.goals,
                'objections_raised', c.objections_raised,
                'last_interaction', c.last_interaction_date
            ) as context,
            
            -- Recommendations
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', r.id,
                        'type', r.type,
                        'priority', r.priority,
                        'title', r.title,
                        'reasoning', r.reasoning
                    )
                )
                FROM ai_recommendations r
                WHERE r.lead_id = l.id 
                AND r.status = 'pending'
                ORDER BY 
                    CASE r.priority
                        WHEN 'urgent' THEN 1
                        WHEN 'high' THEN 2
                        WHEN 'medium' THEN 3
                        ELSE 4
                    END
                LIMIT 5
            ) as pending_recommendations
            
        FROM leads l
        LEFT JOIN bant_assessments b ON b.lead_id = l.id
        LEFT JOIN personality_profiles p ON p.lead_id = l.id
        LEFT JOIN lead_context_summaries c ON c.lead_id = l.id
        WHERE l.id = p_lead_id
    )
    SELECT jsonb_build_object(
        'lead_id', ld.id,
        'name', ld.name,
        'email', ld.email,
        'status', ld.status,
        'source', ld.source,
        'bant', ld.bant,
        'personality', ld.personality,
        'context', ld.context,
        'pending_recommendations', COALESCE(ld.pending_recommendations, '[]'::JSONB),
        'intelligence_score', CASE
            WHEN ld.bant->>'score' IS NOT NULL AND ld.personality->>'primary_type' IS NOT NULL THEN 'high'
            WHEN ld.bant->>'score' IS NOT NULL OR ld.personality->>'primary_type' IS NOT NULL THEN 'medium'
            ELSE 'low'
        END
    )
    INTO v_intelligence
    FROM lead_data ld;
    
    RETURN COALESCE(v_intelligence, jsonb_build_object('error', 'Lead not found'));
END;
$$;

-- ============================================================================
-- RPC 7: Create AI Recommendation (Auto-triggered)
-- ============================================================================
CREATE OR REPLACE FUNCTION create_ai_recommendation(
    p_user_id UUID,
    p_lead_id UUID DEFAULT NULL,
    p_type VARCHAR DEFAULT 'general',
    p_priority VARCHAR DEFAULT 'medium',
    p_title TEXT DEFAULT 'AI Recommendation',
    p_description TEXT DEFAULT '',
    p_reasoning TEXT DEFAULT '',
    p_triggered_by VARCHAR DEFAULT 'manual',
    p_playbook_name VARCHAR DEFAULT NULL,
    p_confidence_score FLOAT DEFAULT 0.7
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_rec_id UUID;
BEGIN
    INSERT INTO ai_recommendations (
        user_id,
        lead_id,
        type,
        priority,
        title,
        description,
        reasoning,
        triggered_by,
        playbook_name,
        confidence_score
    )
    VALUES (
        p_user_id,
        p_lead_id,
        p_type,
        p_priority,
        p_title,
        p_description,
        p_reasoning,
        p_triggered_by,
        p_playbook_name,
        p_confidence_score
    )
    RETURNING id INTO v_rec_id;
    
    RETURN v_rec_id;
END;
$$;

-- ============================================================================
-- COMPLETE! 🚀
-- ============================================================================
-- Total RPC Functions: 7
-- - generate_disg_recommendations()
-- - update_lead_memory()
-- - log_ai_output_compliance()
-- - recommend_followup_actions()
-- - get_best_contact_window()
-- - get_lead_intelligence()
-- - create_ai_recommendation()
-- ============================================================================


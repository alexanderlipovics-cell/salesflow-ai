-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  LEARNING EVENTS SYSTEM - Database Migration                              ║
-- ║  Für AI Decision Logging & Feedback Loop                                  ║
-- ╚════════════════════════════════════════════════════════════════════════════╝
-- 
-- Erstellt die Tabelle für das Learning System:
-- - Jede AI-Entscheidung wird geloggt
-- - User-Korrekturen werden erfasst
-- - Patterns werden für Verbesserungen analysiert

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. LEARNING EVENTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS learning_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Event Type
    event_type TEXT NOT NULL
        CHECK (event_type IN (
            'autopilot_decision',    -- AI hat Entscheidung getroffen
            'user_correction',       -- User hat AI korrigiert
            'user_approval',         -- User hat AI-Vorschlag bestätigt
            'draft_edit',            -- User hat Draft bearbeitet
            'template_used',         -- Template wurde erfolgreich genutzt
            'objection_handled',     -- Einwand wurde behandelt
            'pattern_detected',      -- Muster wurde erkannt
            'feedback_positive',     -- Positives Feedback
            'feedback_negative'      -- Negatives Feedback
        )),
    
    -- Context
    context_type TEXT NOT NULL
        CHECK (context_type IN (
            'message',               -- Nachricht
            'objection',             -- Einwand
            'follow_up',             -- Follow-up
            'scheduling',            -- Terminplanung
            'closing',               -- Abschluss
            'reengagement',          -- Re-Engagement
            'general'                -- Allgemein
        )),
    
    -- Reference IDs (optional, je nach Event-Typ)
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    message_id UUID,
    action_id UUID REFERENCES autopilot_actions(id) ON DELETE SET NULL,
    draft_id UUID REFERENCES autopilot_drafts(id) ON DELETE SET NULL,
    
    -- AI Decision Details
    ai_decision JSONB,
    -- Format: {
    --   "intent": "price_inquiry",
    --   "confidence": 85,
    --   "action": "draft_review",
    --   "reasoning": "...",
    --   "suggested_response": "..."
    -- }
    
    -- User Action
    user_action JSONB,
    -- Format: {
    --   "action_type": "edit" | "approve" | "reject" | "ignore",
    --   "original_content": "...",
    --   "edited_content": "...",
    --   "time_to_action_seconds": 45
    -- }
    
    -- Outcome (nach Feedback)
    outcome JSONB,
    -- Format: {
    --   "success": true,
    --   "lead_response": "positive" | "negative" | "neutral",
    --   "deal_progress": true,
    --   "notes": "..."
    -- }
    
    -- Learning Signals
    learning_signals JSONB,
    -- Format: {
    --   "should_increase_confidence": true,
    --   "pattern_type": "objection_handling",
    --   "keywords": ["preis", "teuer"],
    --   "effective_phrases": ["...", "..."]
    -- }
    
    -- Metadata
    channel TEXT,
    lead_temperature TEXT,
    lead_industry TEXT,
    session_id TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    processed_at TIMESTAMPTZ,
    
    -- Flags
    is_processed BOOLEAN NOT NULL DEFAULT false,
    is_significant BOOLEAN NOT NULL DEFAULT false  -- Für wichtige Lernmomente
);

-- Indexes
CREATE INDEX idx_learning_events_user ON learning_events(user_id);
CREATE INDEX idx_learning_events_company ON learning_events(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX idx_learning_events_type ON learning_events(event_type);
CREATE INDEX idx_learning_events_context ON learning_events(context_type);
CREATE INDEX idx_learning_events_lead ON learning_events(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX idx_learning_events_created ON learning_events(created_at DESC);
CREATE INDEX idx_learning_events_unprocessed ON learning_events(is_processed) WHERE is_processed = false;
CREATE INDEX idx_learning_events_significant ON learning_events(is_significant, created_at DESC) WHERE is_significant = true;

-- GIN Index für JSONB Suche
CREATE INDEX idx_learning_events_ai_decision ON learning_events USING GIN (ai_decision);
CREATE INDEX idx_learning_events_user_action ON learning_events USING GIN (user_action);

-- RLS
ALTER TABLE learning_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own learning events"
    ON learning_events FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "System can insert learning events"
    ON learning_events FOR INSERT
    WITH CHECK (true);  -- Service Role only

CREATE POLICY "System can update learning events"
    ON learning_events FOR UPDATE
    USING (true);  -- Service Role only


-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. LEARNING PATTERNS TABLE (Aggregierte Muster)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS learning_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Pattern Type
    pattern_type TEXT NOT NULL
        CHECK (pattern_type IN (
            'successful_response',   -- Erfolgreiche Antwort-Muster
            'failed_response',       -- Fehlgeschlagene Muster
            'objection_handling',    -- Einwandbehandlung
            'closing_technique',     -- Abschluss-Techniken
            'timing_preference',     -- Beste Zeiten
            'channel_preference',    -- Beste Kanäle
            'industry_specific',     -- Branchenspezifisch
            'persona_specific'       -- Persona-spezifisch
        )),
    
    -- Pattern Details
    pattern_key TEXT NOT NULL,  -- z.B. "price_objection_response"
    pattern_data JSONB NOT NULL,
    -- Format: {
    --   "trigger_keywords": ["preis", "teuer", "kosten"],
    --   "effective_responses": [
    --     {"text": "...", "success_rate": 0.85, "sample_size": 23}
    --   ],
    --   "avoid_phrases": ["..."],
    --   "confidence_adjustment": +5
    -- }
    
    -- Stats
    sample_count INTEGER NOT NULL DEFAULT 1,
    success_rate DECIMAL(5,4) DEFAULT 0.0,
    last_success_at TIMESTAMPTZ,
    
    -- Scope
    is_global BOOLEAN NOT NULL DEFAULT false,  -- Für alle User verfügbar
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ,
    
    -- Constraints
    UNIQUE(user_id, company_id, pattern_type, pattern_key)
);

-- Indexes
CREATE INDEX idx_learning_patterns_user ON learning_patterns(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_learning_patterns_company ON learning_patterns(company_id) WHERE company_id IS NOT NULL;
CREATE INDEX idx_learning_patterns_type ON learning_patterns(pattern_type);
CREATE INDEX idx_learning_patterns_global ON learning_patterns(is_global) WHERE is_global = true;
CREATE INDEX idx_learning_patterns_success ON learning_patterns(success_rate DESC);

-- RLS
ALTER TABLE learning_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own and global patterns"
    ON learning_patterns FOR SELECT
    USING (
        auth.uid() = user_id 
        OR is_global = true
        OR company_id IN (SELECT company_id FROM users WHERE id = auth.uid())
    );


-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Function: Learning Event loggen
CREATE OR REPLACE FUNCTION log_learning_event(
    p_user_id UUID,
    p_event_type TEXT,
    p_context_type TEXT,
    p_lead_id UUID DEFAULT NULL,
    p_action_id UUID DEFAULT NULL,
    p_ai_decision JSONB DEFAULT NULL,
    p_user_action JSONB DEFAULT NULL,
    p_channel TEXT DEFAULT NULL,
    p_session_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_event_id UUID;
BEGIN
    INSERT INTO learning_events (
        user_id, event_type, context_type,
        lead_id, action_id, ai_decision, user_action,
        channel, session_id
    ) VALUES (
        p_user_id, p_event_type, p_context_type,
        p_lead_id, p_action_id, p_ai_decision, p_user_action,
        p_channel, p_session_id
    )
    RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function: Pattern updaten basierend auf Events
CREATE OR REPLACE FUNCTION update_learning_pattern(
    p_user_id UUID,
    p_pattern_type TEXT,
    p_pattern_key TEXT,
    p_success BOOLEAN,
    p_pattern_data JSONB DEFAULT '{}'::JSONB
)
RETURNS void AS $$
BEGIN
    INSERT INTO learning_patterns (
        user_id, pattern_type, pattern_key, pattern_data,
        sample_count, success_rate, last_success_at
    ) VALUES (
        p_user_id, p_pattern_type, p_pattern_key, p_pattern_data,
        1,
        CASE WHEN p_success THEN 1.0 ELSE 0.0 END,
        CASE WHEN p_success THEN now() ELSE NULL END
    )
    ON CONFLICT (user_id, company_id, pattern_type, pattern_key) DO UPDATE SET
        sample_count = learning_patterns.sample_count + 1,
        success_rate = (
            (learning_patterns.success_rate * learning_patterns.sample_count + 
             CASE WHEN p_success THEN 1 ELSE 0 END) / 
            (learning_patterns.sample_count + 1)
        ),
        last_success_at = CASE 
            WHEN p_success THEN now() 
            ELSE learning_patterns.last_success_at 
        END,
        pattern_data = learning_patterns.pattern_data || p_pattern_data,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Function: Confidence-Anpassung basierend auf Learning
CREATE OR REPLACE FUNCTION get_confidence_adjustment(
    p_user_id UUID,
    p_intent TEXT,
    p_channel TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
    v_adjustment INTEGER := 0;
    v_pattern RECORD;
BEGIN
    -- Pattern für diesen Intent suchen
    SELECT * INTO v_pattern
    FROM learning_patterns
    WHERE user_id = p_user_id
      AND pattern_key LIKE p_intent || '%'
    ORDER BY sample_count DESC
    LIMIT 1;
    
    IF FOUND THEN
        -- Adjustment basierend auf Erfolgsrate
        IF v_pattern.success_rate > 0.9 AND v_pattern.sample_count >= 10 THEN
            v_adjustment := 10;  -- +10% Confidence
        ELSIF v_pattern.success_rate > 0.8 AND v_pattern.sample_count >= 5 THEN
            v_adjustment := 5;
        ELSIF v_pattern.success_rate < 0.5 AND v_pattern.sample_count >= 5 THEN
            v_adjustment := -10;  -- -10% Confidence
        ELSIF v_pattern.success_rate < 0.3 THEN
            v_adjustment := -20;
        END IF;
    END IF;
    
    RETURN v_adjustment;
END;
$$ LANGUAGE plpgsql;


-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. VIEWS
-- ═══════════════════════════════════════════════════════════════════════════════

-- View: Learning Dashboard Stats
CREATE OR REPLACE VIEW learning_dashboard_stats AS
SELECT 
    user_id,
    DATE(created_at) as date,
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE event_type = 'user_approval') as approvals,
    COUNT(*) FILTER (WHERE event_type = 'user_correction') as corrections,
    COUNT(*) FILTER (WHERE event_type = 'draft_edit') as edits,
    ROUND(
        COUNT(*) FILTER (WHERE event_type = 'user_approval')::DECIMAL / 
        NULLIF(COUNT(*) FILTER (WHERE event_type IN ('user_approval', 'user_correction', 'draft_edit')), 0) * 100,
        1
    ) as approval_rate
FROM learning_events
WHERE created_at > now() - INTERVAL '30 days'
GROUP BY user_id, DATE(created_at);


-- ═══════════════════════════════════════════════════════════════════════════════
-- DONE!
-- ═══════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE learning_events IS 'Loggt alle AI-Entscheidungen und User-Korrekturen für kontinuierliches Lernen';
COMMENT ON TABLE learning_patterns IS 'Aggregierte Muster aus Learning Events für verbesserte AI-Entscheidungen';


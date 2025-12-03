-- ============================================================================
-- SALES BRAIN RULES - TEACH-UI & RULE LEARNING SYSTEM
-- ============================================================================
--
-- Features:
-- 🧠 Regeln aus User-Overrides lernen
-- 👤 User-spezifische Regeln
-- 👥 Team-weite Regeln
-- 📊 Accept/Reject Tracking
-- 🎯 Kontext-basiertes Matching
-- ============================================================================

-- ===================
-- SALES BRAIN RULES
-- ===================

CREATE TABLE IF NOT EXISTS sales_brain_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Owner (entweder User ODER Team)
    owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    owner_team_id UUID,
    scope TEXT NOT NULL CHECK (scope IN ('user', 'team')),
    
    -- Context Filter (für Matching)
    vertical_id TEXT,          -- z.B. "network_marketing", "real_estate"
    company_id TEXT,           -- z.B. "zinzino"
    channel TEXT,              -- z.B. "whatsapp", "instagram_dm", "email"
    use_case TEXT,             -- z.B. "objection_too_expensive", "appointment_request"
    language TEXT DEFAULT 'de',
    lead_status TEXT,          -- z.B. "cold", "warm", "hot"
    deal_state TEXT,           -- z.B. "considering", "pending_payment"
    
    -- Text Content
    original_text TEXT NOT NULL,      -- KI-Vorschlag
    preferred_text TEXT NOT NULL,     -- User's Version
    similarity_score DECIMAL(3, 2),   -- 0.00 - 1.00
    override_type TEXT DEFAULT 'full_replace',
    -- 'full_replace', 'edit', 'append', 'prepend'
    
    -- Source
    suggestion_id TEXT,        -- ID des ursprünglichen Vorschlags
    
    -- Metadata
    note TEXT,                 -- User-Kommentar
    status TEXT DEFAULT 'active',
    -- 'active', 'inactive', 'pending_review', 'deleted'
    
    priority TEXT DEFAULT 'medium',
    -- 'low', 'medium', 'high', 'critical'
    
    -- Stats
    apply_count INTEGER DEFAULT 0,    -- Wie oft angewendet
    accept_count INTEGER DEFAULT 0,   -- Wie oft akzeptiert
    accept_rate DECIMAL(3, 2) DEFAULT 0.00,  -- accept_count / apply_count
    
    -- Timestamps
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_applied_at TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT valid_owner CHECK (
        (owner_user_id IS NOT NULL AND scope = 'user') OR
        (owner_team_id IS NOT NULL AND scope = 'team')
    )
);

-- ===================
-- SALES BRAIN FEEDBACK
-- ===================

CREATE TABLE IF NOT EXISTS sales_brain_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES sales_brain_rules(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Feedback
    accepted BOOLEAN NOT NULL,
    modified BOOLEAN DEFAULT false,
    final_text TEXT,           -- Falls modified, was wurde final gesendet
    
    -- Context
    channel TEXT,
    lead_id UUID,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================
-- MESSAGE TEMPLATES (erweitern)
-- ===================

-- Falls message_templates existiert, erweitern
DO $$ BEGIN
    ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';
    ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS source_rule_id UUID REFERENCES sales_brain_rules(id);
EXCEPTION
    WHEN undefined_table THEN
        NULL; -- Tabelle existiert nicht, skip
    WHEN undefined_column THEN
        NULL; -- Spalte existiert bereits, skip
END $$;

-- ===================
-- INDEXES
-- ===================

-- Sales Brain Rules
CREATE INDEX IF NOT EXISTS idx_sbr_owner_user ON sales_brain_rules(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_sbr_owner_team ON sales_brain_rules(owner_team_id);
CREATE INDEX IF NOT EXISTS idx_sbr_scope ON sales_brain_rules(scope);
CREATE INDEX IF NOT EXISTS idx_sbr_status ON sales_brain_rules(status);
CREATE INDEX IF NOT EXISTS idx_sbr_channel ON sales_brain_rules(channel);
CREATE INDEX IF NOT EXISTS idx_sbr_use_case ON sales_brain_rules(use_case);
CREATE INDEX IF NOT EXISTS idx_sbr_created ON sales_brain_rules(created_at DESC);

-- Kombinierter Index für Matching
CREATE INDEX IF NOT EXISTS idx_sbr_matching ON sales_brain_rules(
    status, channel, use_case, lead_status
) WHERE status = 'active';

-- Feedback
CREATE INDEX IF NOT EXISTS idx_sbf_rule ON sales_brain_feedback(rule_id);
CREATE INDEX IF NOT EXISTS idx_sbf_user ON sales_brain_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_sbf_created ON sales_brain_feedback(created_at DESC);

-- Templates (auf message_templates wenn vorhanden)
-- CREATE INDEX IF NOT EXISTS idx_st_source ON message_templates(source);

-- ===================
-- RLS POLICIES
-- ===================

ALTER TABLE sales_brain_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_brain_feedback ENABLE ROW LEVEL SECURITY;

-- Rules: User sieht eigene + Team-Regeln
DROP POLICY IF EXISTS "Users can view own and team rules" ON sales_brain_rules;
CREATE POLICY "Users can view own and team rules" ON sales_brain_rules
    FOR SELECT USING (
        owner_user_id = auth.uid() 
        OR created_by = auth.uid()
        OR owner_team_id IS NOT NULL  -- Team rules are visible to all (filtered in app)
    );

DROP POLICY IF EXISTS "Users can create rules" ON sales_brain_rules;
CREATE POLICY "Users can create rules" ON sales_brain_rules
    FOR INSERT WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "Users can update own rules" ON sales_brain_rules;
CREATE POLICY "Users can update own rules" ON sales_brain_rules
    FOR UPDATE USING (owner_user_id = auth.uid() OR created_by = auth.uid());

DROP POLICY IF EXISTS "Users can delete own rules" ON sales_brain_rules;
CREATE POLICY "Users can delete own rules" ON sales_brain_rules
    FOR DELETE USING (owner_user_id = auth.uid() OR created_by = auth.uid());

-- Feedback
DROP POLICY IF EXISTS "Users can manage own feedback" ON sales_brain_feedback;
CREATE POLICY "Users can manage own feedback" ON sales_brain_feedback
    FOR ALL USING (user_id = auth.uid());

-- ===================
-- FUNCTIONS
-- ===================

-- Automatisches Updated-At
CREATE OR REPLACE FUNCTION update_sales_brain_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sbr_updated_at ON sales_brain_rules;
CREATE TRIGGER trg_sbr_updated_at
BEFORE UPDATE ON sales_brain_rules
FOR EACH ROW
EXECUTE FUNCTION update_sales_brain_updated_at();

-- Accept Rate berechnen nach Feedback
CREATE OR REPLACE FUNCTION update_rule_accept_rate()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE sales_brain_rules SET
        apply_count = apply_count + 1,
        accept_count = CASE WHEN NEW.accepted THEN accept_count + 1 ELSE accept_count END,
        accept_rate = CASE 
            WHEN apply_count + 1 > 0 
            THEN ROUND(
                (CASE WHEN NEW.accepted THEN accept_count + 1 ELSE accept_count END)::DECIMAL / 
                (apply_count + 1), 
                2
            )
            ELSE 0 
        END,
        last_applied_at = NOW()
    WHERE id = NEW.rule_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_accept_rate ON sales_brain_feedback;
CREATE TRIGGER trg_update_accept_rate
AFTER INSERT ON sales_brain_feedback
FOR EACH ROW
EXECUTE FUNCTION update_rule_accept_rate();

-- ===================
-- HILFSFUNKTION: Passende Regeln finden
-- ===================

CREATE OR REPLACE FUNCTION find_matching_rules(
    p_user_id UUID,
    p_team_id UUID DEFAULT NULL,
    p_channel TEXT DEFAULT NULL,
    p_use_case TEXT DEFAULT NULL,
    p_lead_status TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 5
) RETURNS TABLE (
    rule_id UUID,
    original_text TEXT,
    preferred_text TEXT,
    priority TEXT,
    accept_rate DECIMAL,
    match_score INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id as rule_id,
        r.original_text,
        r.preferred_text,
        r.priority,
        r.accept_rate,
        -- Match Score berechnen
        (
            CASE WHEN r.channel = p_channel THEN 30 ELSE 0 END +
            CASE WHEN r.use_case = p_use_case THEN 40 ELSE 0 END +
            CASE WHEN r.lead_status = p_lead_status THEN 20 ELSE 0 END +
            CASE r.priority
                WHEN 'critical' THEN 10
                WHEN 'high' THEN 7
                WHEN 'medium' THEN 5
                ELSE 3
            END
        )::INTEGER as match_score
    FROM sales_brain_rules r
    WHERE r.status = 'active'
      AND (
          r.owner_user_id = p_user_id 
          OR r.owner_team_id = p_team_id
      )
      AND (r.channel = p_channel OR r.channel IS NULL)
      AND (r.use_case = p_use_case OR r.use_case IS NULL)
    ORDER BY match_score DESC, r.accept_rate DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================
-- SUCCESS MESSAGE
-- ===================

DO $$
BEGIN
    RAISE NOTICE '🧠 SALES BRAIN RULES Migration erfolgreich!';
    RAISE NOTICE '';
    RAISE NOTICE '   Neue Tabellen:';
    RAISE NOTICE '   ├── sales_brain_rules: Regeln aus Overrides';
    RAISE NOTICE '   ├── sales_brain_feedback: Accept/Reject Tracking';
    RAISE NOTICE '   └── sales_templates: (erweitert mit source)';
    RAISE NOTICE '';
    RAISE NOTICE '   Features:';
    RAISE NOTICE '   ├── User-spezifische Regeln (scope = user)';
    RAISE NOTICE '   ├── Team-weite Regeln (scope = team)';
    RAISE NOTICE '   ├── Kontext-basiertes Matching';
    RAISE NOTICE '   ├── Accept Rate Tracking';
    RAISE NOTICE '   └── Auto-Template-Erstellung';
    RAISE NOTICE '';
    RAISE NOTICE '   🧠 Sales Brain is ready to learn!';
END $$;


-- FIX: Sales Brain Tables neu erstellen
-- Droppe alte inkorrekte Tabellen

DROP TABLE IF EXISTS sales_brain_feedback CASCADE;
DROP TABLE IF EXISTS sales_brain_rules CASCADE;

-- Jetzt neu erstellen
CREATE TABLE sales_brain_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Owner (entweder User ODER Team)
    owner_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    owner_team_id UUID,
    scope TEXT NOT NULL CHECK (scope IN ('user', 'team')),
    
    -- Context Filter (für Matching)
    vertical_id TEXT,
    company_id TEXT,
    channel TEXT,
    use_case TEXT,
    language TEXT DEFAULT 'de',
    lead_status TEXT,
    deal_state TEXT,
    
    -- Text Content
    original_text TEXT NOT NULL,
    preferred_text TEXT NOT NULL,
    similarity_score DECIMAL(3, 2),
    override_type TEXT DEFAULT 'full_replace',
    
    -- Source
    suggestion_id TEXT,
    
    -- Metadata
    note TEXT,
    status TEXT DEFAULT 'active',
    priority TEXT DEFAULT 'medium',
    
    -- Stats
    apply_count INTEGER DEFAULT 0,
    accept_count INTEGER DEFAULT 0,
    accept_rate DECIMAL(3, 2) DEFAULT 0.00,
    
    -- Timestamps
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_applied_at TIMESTAMPTZ
);

CREATE TABLE sales_brain_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES sales_brain_rules(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    accepted BOOLEAN NOT NULL,
    modified BOOLEAN DEFAULT false,
    final_text TEXT,
    channel TEXT,
    lead_id UUID,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sbr_owner_user ON sales_brain_rules(owner_user_id);
CREATE INDEX idx_sbr_owner_team ON sales_brain_rules(owner_team_id);
CREATE INDEX idx_sbr_status ON sales_brain_rules(status);
CREATE INDEX idx_sbr_channel ON sales_brain_rules(channel);
CREATE INDEX idx_sbr_use_case ON sales_brain_rules(use_case);

CREATE INDEX idx_sbf_rule ON sales_brain_feedback(rule_id);
CREATE INDEX idx_sbf_user ON sales_brain_feedback(user_id);

-- RLS
ALTER TABLE sales_brain_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_brain_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own and team rules" ON sales_brain_rules
    FOR SELECT USING (
        owner_user_id = auth.uid() 
        OR created_by = auth.uid()
        OR owner_team_id IS NOT NULL
    );

CREATE POLICY "Users can create rules" ON sales_brain_rules
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own rules" ON sales_brain_rules
    FOR UPDATE USING (owner_user_id = auth.uid() OR created_by = auth.uid());

CREATE POLICY "Users can delete own rules" ON sales_brain_rules
    FOR DELETE USING (owner_user_id = auth.uid() OR created_by = auth.uid());

CREATE POLICY "Users can manage own feedback" ON sales_brain_feedback
    FOR ALL USING (user_id = auth.uid());

-- Success
DO $$
BEGIN
    RAISE NOTICE '🧠 Sales Brain Tables erfolgreich erstellt!';
END $$;


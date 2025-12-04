-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  SYSTEM AUDIT - FEHLENDE TABELLEN                                         ║
-- ║  Erstellt: 2024-12-04                                                      ║
-- ║  Basierend auf Code-Analyse aller .from(), .table() Referenzen            ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- ============================================================================
-- 1. INTENT_EVENTS (Fehlt komplett - referenziert in signal_detection.py)
-- ============================================================================

CREATE TABLE IF NOT EXISTS intent_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    intent_type TEXT,
    signal_strength DECIMAL(3, 2) DEFAULT 0.5,
    channel TEXT,
    metadata JSONB DEFAULT '{}',
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_intent_events_user ON intent_events(user_id);
CREATE INDEX IF NOT EXISTS idx_intent_events_lead ON intent_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_intent_events_type ON intent_events(event_type);
CREATE INDEX IF NOT EXISTS idx_intent_events_date ON intent_events(detected_at DESC);

ALTER TABLE intent_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own intent_events" ON intent_events;
CREATE POLICY "Users own intent_events" ON intent_events FOR ALL USING (auth.uid() = user_id);

GRANT ALL ON intent_events TO authenticated;

-- ============================================================================
-- 2. INTERACTIONS (Generische Interaktionen-Tabelle - perception.py erwartet diese)
-- ============================================================================

CREATE TABLE IF NOT EXISTS interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL,
    channel TEXT,
    direction TEXT DEFAULT 'outbound', -- inbound / outbound
    content TEXT,
    summary TEXT,
    sentiment TEXT,
    outcome TEXT,
    duration_seconds INTEGER,
    metadata JSONB DEFAULT '{}',
    occurred_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interactions_user ON interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_lead ON interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_interactions_contact ON interactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_interactions_date ON interactions(occurred_at DESC);

ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own interactions" ON interactions;
CREATE POLICY "Users own interactions" ON interactions FOR ALL USING (auth.uid() = user_id);

GRANT ALL ON interactions TO authenticated;

-- ============================================================================
-- 3. CHAT_FEEDBACK (Referenziert in docs/AI_CHAT.md)
-- ============================================================================

CREATE TABLE IF NOT EXISTS chat_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_id UUID,
    interaction_id UUID REFERENCES ai_interactions(id) ON DELETE SET NULL,
    feedback_type TEXT NOT NULL, -- 'thumbs_up', 'thumbs_down', 'correction', 'report'
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    correction_text TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_feedback_user ON chat_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_feedback_session ON chat_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_feedback_type ON chat_feedback(feedback_type);

ALTER TABLE chat_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own chat_feedback" ON chat_feedback;
CREATE POLICY "Users own chat_feedback" ON chat_feedback FOR ALL USING (auth.uid() = user_id);

GRANT ALL ON chat_feedback TO authenticated;

-- ============================================================================
-- 4. LEAD_EVENTS (Referenziert in docs/LEADS.md)
-- ============================================================================

CREATE TABLE IF NOT EXISTS lead_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_category TEXT, -- 'status_change', 'interaction', 'score_update', etc.
    old_value TEXT,
    new_value TEXT,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_events_user ON lead_events(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_events_lead ON lead_events(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_events_type ON lead_events(event_type);
CREATE INDEX IF NOT EXISTS idx_lead_events_date ON lead_events(created_at DESC);

ALTER TABLE lead_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own lead_events" ON lead_events;
CREATE POLICY "Users own lead_events" ON lead_events FOR ALL USING (auth.uid() = user_id);

GRANT ALL ON lead_events TO authenticated;

-- ============================================================================
-- 5. TASKS (Tasks-Tabelle für Proposal Reminder Service)
-- ============================================================================

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    task_type TEXT NOT NULL DEFAULT 'general',
    priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
    status TEXT DEFAULT 'pending', -- pending, in_progress, completed, cancelled
    due_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    reminder_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_lead ON tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON tasks(due_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(task_type);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own tasks" ON tasks;
CREATE POLICY "Users own tasks" ON tasks FOR ALL USING (auth.uid() = user_id);

GRANT ALL ON tasks TO authenticated;

-- Trigger für updated_at
DROP TRIGGER IF EXISTS trigger_tasks_updated_at ON tasks;
CREATE TRIGGER trigger_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 6. USER_BUSINESS_PROFILE (Referenziert in goal adapters)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_business_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    business_type TEXT DEFAULT 'network_marketing',
    vertical_id TEXT DEFAULT 'network_marketing',
    commission_per_deal DECIMAL(10, 2),
    avg_deal_value DECIMAL(10, 2),
    sales_cycle_days INTEGER DEFAULT 30,
    target_monthly_revenue DECIMAL(10, 2),
    target_monthly_deals INTEGER,
    working_days_per_week INTEGER DEFAULT 5,
    working_hours_per_day INTEGER DEFAULT 8,
    experience_years INTEGER DEFAULT 0,
    team_size INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_business_profile_user ON user_business_profile(user_id);
CREATE INDEX IF NOT EXISTS idx_user_business_profile_vertical ON user_business_profile(vertical_id);

ALTER TABLE user_business_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users own business_profile" ON user_business_profile;
CREATE POLICY "Users own business_profile" ON user_business_profile FOR ALL USING (auth.uid() = user_id);

GRANT ALL ON user_business_profile TO authenticated;

-- Trigger für updated_at
DROP TRIGGER IF EXISTS trigger_user_business_profile_updated_at ON user_business_profile;
CREATE TRIGGER trigger_user_business_profile_updated_at
    BEFORE UPDATE ON user_business_profile
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DONE - REPORT
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
    RAISE NOTICE '  AUDIT - FEHLENDE TABELLEN ERSTELLT';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '  ✅ intent_events';
    RAISE NOTICE '  ✅ interactions';
    RAISE NOTICE '  ✅ chat_feedback';
    RAISE NOTICE '  ✅ lead_events';
    RAISE NOTICE '  ✅ tasks';
    RAISE NOTICE '  ✅ user_business_profile';
    RAISE NOTICE '';
    RAISE NOTICE '  Alle Tabellen haben RLS aktiviert.';
    RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
END $$;


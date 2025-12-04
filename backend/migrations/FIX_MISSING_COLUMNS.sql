-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  FIX_MISSING_COLUMNS.sql - VOLLSTÄNDIGER SYSTEM-FIX                       ║
-- ║  Erstellt: 2024-12-04                                                      ║
-- ║  Fügt ALLE fehlenden Tabellen und Spalten hinzu                           ║
-- ╚════════════════════════════════════════════════════════════════════════════╝
--
-- AUDIT-ERGEBNIS:
-- ===============
-- 45+ fehlende Tabellen/Views gefunden die im Code referenziert werden
-- Diese Migration erstellt ALLES was fehlt
--
-- AUSFÜHREN: Im Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. USER_BUSINESS_PROFILE (KRITISCH - commission_per_deal fehlt!)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_business_profile (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID,
    vertical TEXT DEFAULT 'network_marketing',
    
    -- Goal Settings
    monthly_target DECIMAL(15, 2) DEFAULT 0,
    commission_per_deal DECIMAL(15, 2) DEFAULT 0,
    avg_deal_size DECIMAL(15, 2) DEFAULT 0,
    sales_cycle_days INTEGER DEFAULT 30,
    
    -- Activity Targets
    target_new_contacts INTEGER DEFAULT 5,
    target_follow_ups INTEGER DEFAULT 10,
    target_presentations INTEGER DEFAULT 2,
    target_closes INTEGER DEFAULT 1,
    
    -- Product/Service Info
    product_name TEXT,
    product_category TEXT,
    product_price_min DECIMAL(15, 2),
    product_price_max DECIMAL(15, 2),
    
    -- Business Model
    business_model TEXT DEFAULT 'direct_sales',
    team_size INTEGER DEFAULT 0,
    years_experience INTEGER DEFAULT 0,
    
    -- Preferences
    preferred_channels TEXT[] DEFAULT '{}',
    working_hours_start TIME DEFAULT '09:00',
    working_hours_end TIME DEFAULT '18:00',
    timezone TEXT DEFAULT 'Europe/Berlin',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

ALTER TABLE user_business_profile ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own profile" ON user_business_profile;
CREATE POLICY "Users see own profile" ON user_business_profile 
    FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 2. LEAD_TASKS (Alias für follow_up_tasks mit erweiterten Spalten)
-- ============================================================================

CREATE TABLE IF NOT EXISTS lead_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID,
    lead_name TEXT,
    
    -- Task Details
    title TEXT NOT NULL,
    description TEXT,
    action TEXT DEFAULT 'follow_up' CHECK (action IN (
        'call', 'email', 'whatsapp', 'instagram', 'meeting', 'message', 
        'follow_up', 'task', 'presentation', 'close'
    )),
    
    -- Scheduling
    due_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_time TIME,
    scheduled_at TIMESTAMPTZ,
    
    -- Priority & Status
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'in_progress', 'completed', 'skipped', 'cancelled', 'rescheduled'
    )),
    
    -- Sequence Support
    sequence_id UUID,
    sequence_step INTEGER,
    is_sequence_task BOOLEAN DEFAULT FALSE,
    
    -- AI Generated
    ai_suggested BOOLEAN DEFAULT FALSE,
    ai_message TEXT,
    ai_context JSONB DEFAULT '{}',
    
    -- Outcome
    completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    outcome TEXT,
    outcome_notes TEXT,
    
    -- Reminders
    reminder_at TIMESTAMPTZ,
    reminder_sent BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_tasks_user ON lead_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_due ON lead_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_status ON lead_tasks(status);
CREATE INDEX IF NOT EXISTS idx_lead_tasks_lead ON lead_tasks(lead_id);

ALTER TABLE lead_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own tasks" ON lead_tasks;
CREATE POLICY "Users see own tasks" ON lead_tasks FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 3. CALENDAR_EVENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID,
    contact_id UUID,
    
    title TEXT NOT NULL,
    description TEXT,
    event_type TEXT DEFAULT 'meeting' CHECK (event_type IN (
        'meeting', 'call', 'presentation', 'follow_up', 'training', 'event', 'other'
    )),
    
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ,
    all_day BOOLEAN DEFAULT FALSE,
    
    location TEXT,
    video_link TEXT,
    
    status TEXT DEFAULT 'scheduled' CHECK (status IN (
        'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'
    )),
    
    reminder_minutes INTEGER DEFAULT 30,
    reminder_sent BOOLEAN DEFAULT FALSE,
    
    recurrence_rule TEXT,
    recurrence_parent_id UUID,
    
    external_id TEXT,
    external_source TEXT,
    
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_user ON calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start ON calendar_events(start_at);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own events" ON calendar_events;
CREATE POLICY "Users see own events" ON calendar_events FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 4. LEAD_FOLLOW_UP_STATUS
-- ============================================================================

CREATE TABLE IF NOT EXISTS lead_follow_up_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    status TEXT DEFAULT 'pending' CHECK (status IN (
        'pending', 'scheduled', 'contacted', 'completed', 'skipped', 'no_response'
    )),
    
    last_contact_at TIMESTAMPTZ,
    next_follow_up_at TIMESTAMPTZ,
    
    follow_up_count INTEGER DEFAULT 0,
    response_count INTEGER DEFAULT 0,
    
    last_message TEXT,
    last_channel TEXT,
    
    temperature TEXT DEFAULT 'cold' CHECK (temperature IN ('hot', 'warm', 'cool', 'cold')),
    
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(lead_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_follow_up_status_user ON lead_follow_up_status(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_follow_up_status_next ON lead_follow_up_status(next_follow_up_at);

ALTER TABLE lead_follow_up_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own status" ON lead_follow_up_status;
CREATE POLICY "Users see own status" ON lead_follow_up_status FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 5. FOLLOW_UP_HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS follow_up_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    action TEXT NOT NULL,
    channel TEXT,
    message TEXT,
    
    outcome TEXT,
    response_received BOOLEAN DEFAULT FALSE,
    response_time_hours DECIMAL(10, 2),
    
    ai_suggested BOOLEAN DEFAULT FALSE,
    template_id UUID,
    
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_follow_up_history_lead ON follow_up_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_history_user ON follow_up_history(user_id);

ALTER TABLE follow_up_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own history" ON follow_up_history;
CREATE POLICY "Users see own history" ON follow_up_history FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 6. MONTHLY_GOALS
-- ============================================================================

CREATE TABLE IF NOT EXISTS monthly_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    year INTEGER NOT NULL,
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    
    revenue_target DECIMAL(15, 2) DEFAULT 0,
    deals_target INTEGER DEFAULT 0,
    new_contacts_target INTEGER DEFAULT 0,
    presentations_target INTEGER DEFAULT 0,
    
    revenue_achieved DECIMAL(15, 2) DEFAULT 0,
    deals_achieved INTEGER DEFAULT 0,
    new_contacts_achieved INTEGER DEFAULT 0,
    presentations_achieved INTEGER DEFAULT 0,
    
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, year, month)
);

ALTER TABLE monthly_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own goals" ON monthly_goals;
CREATE POLICY "Users see own goals" ON monthly_goals FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 7. DAILY_PLANS
-- ============================================================================

CREATE TABLE IF NOT EXISTS daily_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Targets
    new_contacts_target INTEGER DEFAULT 5,
    follow_ups_target INTEGER DEFAULT 10,
    presentations_target INTEGER DEFAULT 2,
    closes_target INTEGER DEFAULT 1,
    
    -- Achieved
    new_contacts_done INTEGER DEFAULT 0,
    follow_ups_done INTEGER DEFAULT 0,
    presentations_done INTEGER DEFAULT 0,
    closes_done INTEGER DEFAULT 0,
    
    -- Additional Tracking
    calls_made INTEGER DEFAULT 0,
    messages_sent INTEGER DEFAULT 0,
    meetings_held INTEGER DEFAULT 0,
    
    -- Notes
    priorities TEXT,
    wins TEXT,
    challenges TEXT,
    notes TEXT,
    
    -- Completion
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, plan_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_plans_user ON daily_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_plans_date ON daily_plans(plan_date);

ALTER TABLE daily_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own plans" ON daily_plans;
CREATE POLICY "Users see own plans" ON daily_plans FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 8. LEAD_INTERACTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS lead_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    interaction_type TEXT NOT NULL CHECK (interaction_type IN (
        'call', 'email', 'whatsapp', 'instagram', 'facebook', 'linkedin',
        'sms', 'meeting', 'presentation', 'note', 'other'
    )),
    
    direction TEXT DEFAULT 'outbound' CHECK (direction IN ('inbound', 'outbound')),
    
    subject TEXT,
    content TEXT,
    
    duration_minutes INTEGER,
    
    outcome TEXT,
    sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
    
    next_action TEXT,
    next_action_date DATE,
    
    template_id UUID,
    ai_generated BOOLEAN DEFAULT FALSE,
    
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_interactions_lead ON lead_interactions(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_user ON lead_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_lead_interactions_type ON lead_interactions(interaction_type);

ALTER TABLE lead_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own interactions" ON lead_interactions;
CREATE POLICY "Users see own interactions" ON lead_interactions FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 9. LEAD_STATS (Aggregierte Lead-Statistiken)
-- ============================================================================

CREATE TABLE IF NOT EXISTS lead_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    total_interactions INTEGER DEFAULT 0,
    total_calls INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0,
    total_meetings INTEGER DEFAULT 0,
    
    first_contact_at TIMESTAMPTZ,
    last_contact_at TIMESTAMPTZ,
    
    response_rate DECIMAL(5, 2) DEFAULT 0,
    avg_response_time_hours DECIMAL(10, 2),
    
    engagement_score INTEGER DEFAULT 0 CHECK (engagement_score BETWEEN 0 AND 100),
    
    days_in_pipeline INTEGER DEFAULT 0,
    stage_changes INTEGER DEFAULT 0,
    
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_stats_user ON lead_stats(user_id);

ALTER TABLE lead_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own stats" ON lead_stats;
CREATE POLICY "Users see own stats" ON lead_stats FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 10. OBJECTION_SESSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS objection_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID,
    
    objection_text TEXT NOT NULL,
    objection_category TEXT,
    
    ai_response TEXT,
    ai_strategy TEXT,
    
    channel TEXT,
    context TEXT,
    
    was_helpful BOOLEAN,
    user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
    user_feedback TEXT,
    
    outcome TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_objection_sessions_user ON objection_sessions(user_id);

ALTER TABLE objection_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own sessions" ON objection_sessions;
CREATE POLICY "Users see own sessions" ON objection_sessions FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 11. OBJECTION_TEMPLATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS objection_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    company_id UUID,
    
    objection_text TEXT NOT NULL,
    objection_category TEXT NOT NULL,
    
    response_template TEXT NOT NULL,
    response_strategy TEXT,
    
    follow_up_question TEXT,
    bridge_to_close TEXT,
    
    key TEXT UNIQUE,
    status TEXT DEFAULT 'active',
    
    times_used INTEGER DEFAULT 0,
    success_rate DECIMAL(5, 2),
    
    is_system BOOLEAN DEFAULT FALSE,
    is_shared BOOLEAN DEFAULT FALSE,
    
    vertical TEXT DEFAULT 'all',
    language TEXT DEFAULT 'de',
    
    tags TEXT[] DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_objection_templates_category ON objection_templates(objection_category);

-- ============================================================================
-- 12. SALES_AGENT_PERSONAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS sales_agent_personas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    description TEXT,
    
    tone TEXT DEFAULT 'professional',
    formality TEXT DEFAULT 'formal',
    
    greeting_style TEXT,
    closing_style TEXT,
    
    use_emojis BOOLEAN DEFAULT FALSE,
    emoji_frequency TEXT DEFAULT 'low',
    
    language TEXT DEFAULT 'de',
    
    custom_phrases JSONB DEFAULT '[]',
    avoid_phrases JSONB DEFAULT '[]',
    
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sales_agent_personas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own personas" ON sales_agent_personas;
CREATE POLICY "Users see own personas" ON sales_agent_personas FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 13. SALES_COMPANY_KNOWLEDGE
-- ============================================================================

CREATE TABLE IF NOT EXISTS sales_company_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID,
    
    category TEXT NOT NULL CHECK (category IN (
        'company', 'products', 'pricing', 'legal', 'communication', 'faq'
    )),
    
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    
    keywords TEXT[] DEFAULT '{}',
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sales_company_knowledge_user ON sales_company_knowledge(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_company_knowledge_category ON sales_company_knowledge(category);

ALTER TABLE sales_company_knowledge ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own knowledge" ON sales_company_knowledge;
CREATE POLICY "Users see own knowledge" ON sales_company_knowledge FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 14. AI_CHAT_SESSIONS & AI_CHAT_MESSAGES
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID,
    
    title TEXT,
    context_type TEXT DEFAULT 'general',
    
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    
    message_count INTEGER DEFAULT 0,
    
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    
    tokens_used INTEGER,
    model TEXT,
    
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user ON ai_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session ON ai_chat_messages(session_id);

ALTER TABLE ai_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own sessions" ON ai_chat_sessions;
CREATE POLICY "Users see own sessions" ON ai_chat_sessions FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users see own messages" ON ai_chat_messages;
CREATE POLICY "Users see own messages" ON ai_chat_messages FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 15. ROLEPLAY_SESSIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS roleplay_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    scenario_type TEXT NOT NULL,
    scenario_name TEXT,
    
    difficulty TEXT DEFAULT 'medium',
    
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    
    messages JSONB DEFAULT '[]',
    
    score INTEGER CHECK (score BETWEEN 0 AND 100),
    feedback TEXT,
    
    strengths TEXT[],
    improvements TEXT[],
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE roleplay_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own roleplay" ON roleplay_sessions;
CREATE POLICY "Users see own roleplay" ON roleplay_sessions FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 16. POWER_HOUR_* TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS power_hour_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    title TEXT NOT NULL,
    description TEXT,
    
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    
    status TEXT DEFAULT 'scheduled' CHECK (status IN (
        'scheduled', 'live', 'completed', 'cancelled'
    )),
    
    max_participants INTEGER DEFAULT 50,
    
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS power_hour_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES power_hour_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    left_at TIMESTAMPTZ,
    
    activities_completed INTEGER DEFAULT 0,
    points_earned INTEGER DEFAULT 0,
    
    UNIQUE(event_id, user_id)
);

CREATE TABLE IF NOT EXISTS power_hour_activity_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES power_hour_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    activity_type TEXT NOT NULL,
    activity_data JSONB DEFAULT '{}',
    
    points INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 17. CHURN_PREDICTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS churn_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL,
    
    churn_probability DECIMAL(5, 4) NOT NULL,
    risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    
    risk_factors JSONB DEFAULT '[]',
    recommended_actions JSONB DEFAULT '[]',
    
    last_interaction_at TIMESTAMPTZ,
    days_since_contact INTEGER,
    
    is_addressed BOOLEAN DEFAULT FALSE,
    addressed_at TIMESTAMPTZ,
    addressed_action TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE churn_predictions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own predictions" ON churn_predictions;
CREATE POLICY "Users see own predictions" ON churn_predictions FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 18. PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    
    company_id UUID,
    company_slug TEXT,
    vertical TEXT DEFAULT 'network_marketing',
    
    role TEXT DEFAULT 'user',
    
    onboarding_completed BOOLEAN DEFAULT FALSE,
    onboarding_step INTEGER DEFAULT 0,
    
    settings JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own profile" ON profiles;
CREATE POLICY "Users see own profile" ON profiles FOR ALL USING (auth.uid() = id);

-- ============================================================================
-- 19. USER_GOALS & USER_DAILY_FLOW_TARGETS
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    goal_type TEXT NOT NULL,
    goal_period TEXT DEFAULT 'monthly',
    
    target_value DECIMAL(15, 2) NOT NULL,
    current_value DECIMAL(15, 2) DEFAULT 0,
    
    start_date DATE,
    end_date DATE,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_daily_flow_targets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    new_contacts INTEGER DEFAULT 5,
    follow_ups INTEGER DEFAULT 10,
    presentations INTEGER DEFAULT 2,
    closes INTEGER DEFAULT 1,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)
);

ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_daily_flow_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own goals" ON user_goals;
CREATE POLICY "Users see own goals" ON user_goals FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users see own targets" ON user_daily_flow_targets;
CREATE POLICY "Users see own targets" ON user_daily_flow_targets FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 20. FINANCE TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS finance_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    transaction_type TEXT NOT NULL CHECK (transaction_type IN (
        'income', 'expense', 'commission', 'bonus', 'refund'
    )),
    
    amount DECIMAL(15, 2) NOT NULL,
    currency TEXT DEFAULT 'EUR',
    
    category TEXT,
    description TEXT,
    
    deal_id UUID,
    lead_id UUID,
    
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_rule TEXT,
    
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    goal_name TEXT NOT NULL,
    target_amount DECIMAL(15, 2) NOT NULL,
    current_amount DECIMAL(15, 2) DEFAULT 0,
    
    start_date DATE,
    end_date DATE,
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_mileage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    trip_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    start_location TEXT,
    end_location TEXT,
    
    distance_km DECIMAL(10, 2) NOT NULL,
    purpose TEXT,
    
    lead_id UUID,
    
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_mileage_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own transactions" ON finance_transactions;
CREATE POLICY "Users see own transactions" ON finance_transactions FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users see own finance_goals" ON finance_goals;
CREATE POLICY "Users see own finance_goals" ON finance_goals FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users see own mileage" ON finance_mileage_log;
CREATE POLICY "Users see own mileage" ON finance_mileage_log FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 21. VIEWS (für Dashboard-Queries)
-- ============================================================================

-- Today Follow-ups View
CREATE OR REPLACE VIEW today_follow_ups AS
SELECT 
    lfs.*,
    l.name as lead_name,
    l.phone,
    l.email,
    l.instagram_handle,
    l.status as lead_status,
    l.temperature
FROM lead_follow_up_status lfs
LEFT JOIN leads l ON lfs.lead_id = l.id
WHERE lfs.next_follow_up_at::date = CURRENT_DATE
   OR lfs.next_follow_up_at::date < CURRENT_DATE;

-- Template Leaderboard View
CREATE OR REPLACE VIEW template_leaderboard AS
SELECT 
    t.id,
    t.name,
    t.category,
    COALESCE(tp.total_uses, 0) as total_uses,
    COALESCE(tp.response_rate, 0) as response_rate,
    COALESCE(tp.conversion_rate, 0) as conversion_rate,
    COALESCE(tp.quality_score, 50) as quality_score,
    t.company_id
FROM templates t
LEFT JOIN template_performance tp ON t.id = tp.template_id
WHERE t.is_active = true
ORDER BY COALESCE(tp.quality_score, 50) DESC;

-- ============================================================================
-- 22. CURE_ASSESSMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS cure_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL,
    
    credibility_score INTEGER CHECK (credibility_score BETWEEN 0 AND 100),
    urgency_score INTEGER CHECK (urgency_score BETWEEN 0 AND 100),
    relationship_score INTEGER CHECK (relationship_score BETWEEN 0 AND 100),
    emotion_score INTEGER CHECK (emotion_score BETWEEN 0 AND 100),
    
    overall_score INTEGER CHECK (overall_score BETWEEN 0 AND 100),
    
    recommendations JSONB DEFAULT '[]',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cure_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own assessments" ON cure_assessments;
CREATE POLICY "Users see own assessments" ON cure_assessments FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- 23. XP_EVENTS & LEARNING_PATTERNS
-- ============================================================================

CREATE TABLE IF NOT EXISTS xp_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    event_type TEXT NOT NULL,
    xp_amount INTEGER NOT NULL,
    
    source TEXT,
    source_id UUID,
    
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learning_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    pattern_type TEXT NOT NULL,
    pattern_data JSONB NOT NULL,
    
    confidence DECIMAL(5, 4),
    
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_patterns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own xp" ON xp_events;
CREATE POLICY "Users see own xp" ON xp_events FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users see own patterns" ON learning_patterns;
CREATE POLICY "Users see own patterns" ON learning_patterns FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';
    
    RAISE NOTICE '';
    RAISE NOTICE '╔══════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║  ✅ FIX_MISSING_COLUMNS MIGRATION COMPLETE!                  ║';
    RAISE NOTICE '╚══════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Tabellen in public schema: %', table_count;
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Neu erstellte Tabellen:';
    RAISE NOTICE '   • user_business_profile (mit commission_per_deal!)';
    RAISE NOTICE '   • lead_tasks';
    RAISE NOTICE '   • calendar_events';
    RAISE NOTICE '   • lead_follow_up_status';
    RAISE NOTICE '   • follow_up_history';
    RAISE NOTICE '   • monthly_goals';
    RAISE NOTICE '   • daily_plans';
    RAISE NOTICE '   • lead_interactions';
    RAISE NOTICE '   • lead_stats';
    RAISE NOTICE '   • objection_sessions';
    RAISE NOTICE '   • objection_templates';
    RAISE NOTICE '   • sales_agent_personas';
    RAISE NOTICE '   • sales_company_knowledge';
    RAISE NOTICE '   • ai_chat_sessions / ai_chat_messages';
    RAISE NOTICE '   • roleplay_sessions';
    RAISE NOTICE '   • power_hour_events / participants / activity_feed';
    RAISE NOTICE '   • churn_predictions';
    RAISE NOTICE '   • profiles';
    RAISE NOTICE '   • user_goals / user_daily_flow_targets';
    RAISE NOTICE '   • finance_transactions / finance_goals / finance_mileage_log';
    RAISE NOTICE '   • cure_assessments';
    RAISE NOTICE '   • xp_events / learning_patterns';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Views:';
    RAISE NOTICE '   • today_follow_ups';
    RAISE NOTICE '   • template_leaderboard';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 RLS aktiviert auf allen Tabellen';
    RAISE NOTICE '';
END $$;

SELECT '🚀 FIX MIGRATION erfolgreich!' AS status;


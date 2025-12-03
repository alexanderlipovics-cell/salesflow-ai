-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  FEHLENDE TABELLEN FÜR PRODUCTION                                         ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- Follow-up Tasks
CREATE TABLE IF NOT EXISTS follow_up_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    lead_id UUID,
    workspace_id UUID,
    lead_name TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    priority TEXT DEFAULT 'medium',
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    source TEXT DEFAULT 'manual',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily Flow Config
CREATE TABLE IF NOT EXISTS daily_flow_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    workspace_id UUID,
    target_deals_per_period INTEGER DEFAULT 5,
    period_type TEXT DEFAULT 'month',
    contacts_to_demo DECIMAL(5,4) DEFAULT 0.20,
    demo_to_close DECIMAL(5,4) DEFAULT 0.30,
    preferred_channels TEXT[] DEFAULT ARRAY['phone', 'whatsapp'],
    working_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5],
    working_hours_start TIME DEFAULT '09:00',
    working_hours_end TIME DEFAULT '18:00',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily Flow Plans
CREATE TABLE IF NOT EXISTS daily_flow_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    config_id UUID,
    plan_date DATE NOT NULL,
    planned_new_contacts INTEGER DEFAULT 0,
    planned_followups INTEGER DEFAULT 0,
    planned_actions_total INTEGER DEFAULT 0,
    completed_new_contacts INTEGER DEFAULT 0,
    completed_followups INTEGER DEFAULT 0,
    completed_actions_total INTEGER DEFAULT 0,
    state TEXT DEFAULT 'PLANNED',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, plan_date)
);

-- Daily Flow Actions
CREATE TABLE IF NOT EXISTS daily_flow_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID,
    user_id UUID NOT NULL,
    action_type TEXT NOT NULL,
    channel TEXT,
    lead_id UUID,
    lead_name TEXT,
    title TEXT NOT NULL,
    description TEXT,
    due_at TIMESTAMPTZ,
    priority INTEGER DEFAULT 50,
    status TEXT DEFAULT 'pending',
    completed_at TIMESTAMPTZ,
    skip_reason TEXT,
    snoozed_until TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learning Signals
CREATE TABLE IF NOT EXISTS learning_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    workspace_id UUID,
    context_type TEXT NOT NULL,
    context_id TEXT,
    original_text TEXT NOT NULL,
    corrected_text TEXT,
    similarity_score DECIMAL(5,4),
    change_type TEXT,
    detected_patterns JSONB DEFAULT '[]',
    signal_type TEXT NOT NULL DEFAULT 'correction',
    metadata JSONB DEFAULT '{}',
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    resulted_in_rule BOOLEAN DEFAULT false,
    rule_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Command Rules
CREATE TABLE IF NOT EXISTS command_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    workspace_id UUID,
    rule_type TEXT NOT NULL,
    scope TEXT NOT NULL DEFAULT 'personal',
    trigger_pattern TEXT,
    replacement_pattern TEXT,
    description TEXT NOT NULL,
    examples JSONB DEFAULT '[]',
    source_type TEXT NOT NULL DEFAULT 'manual',
    source_signals UUID[],
    confidence DECIMAL(5,4) DEFAULT 1.0,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 50,
    times_applied INTEGER DEFAULT 0,
    last_applied_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learned Patterns
CREATE TABLE IF NOT EXISTS learned_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    workspace_id UUID,
    pattern_type TEXT NOT NULL,
    pattern_key TEXT NOT NULL,
    pattern_value JSONB NOT NULL,
    occurrence_count INTEGER DEFAULT 1,
    confidence DECIMAL(5,4) DEFAULT 0.5,
    status TEXT DEFAULT 'detected',
    rule_id UUID,
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    UNIQUE(user_id, pattern_type, pattern_key)
);

-- Knowledge Sources
CREATE TABLE IF NOT EXISTS knowledge_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    name TEXT NOT NULL,
    source_type TEXT NOT NULL,
    source_url TEXT,
    raw_content TEXT,
    processed_content TEXT,
    status TEXT DEFAULT 'pending',
    processing_error TEXT,
    chunks_count INTEGER DEFAULT 0,
    file_type TEXT,
    file_size INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID
);

-- Knowledge Chunks
CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID,
    workspace_id UUID NOT NULL,
    content TEXT NOT NULL,
    chunk_type TEXT DEFAULT 'text',
    chunk_index INTEGER NOT NULL,
    parent_chunk_id UUID,
    metadata JSONB DEFAULT '{}',
    word_count INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge Tags
CREATE TABLE IF NOT EXISTS knowledge_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#3b82f6',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(workspace_id, name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_user_date ON follow_up_tasks(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_daily_flow_plans_user_date ON daily_flow_plans(user_id, plan_date);
CREATE INDEX IF NOT EXISTS idx_daily_flow_actions_plan ON daily_flow_actions(plan_id);
CREATE INDEX IF NOT EXISTS idx_learning_signals_user ON learning_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_command_rules_user ON command_rules(user_id);

-- Enable RLS
ALTER TABLE follow_up_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_flow_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_flow_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_flow_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE command_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE learned_patterns ENABLE ROW LEVEL SECURITY;

-- Success Message
DO $$ BEGIN RAISE NOTICE '✅ Alle fehlenden Tabellen erstellt!'; END $$;


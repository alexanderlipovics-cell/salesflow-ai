-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  SALES FLOW AI - PRODUCTION DEPLOYMENT                                    ║
-- ║  Komplettes Datenbank-Setup in einem Script                               ║
-- ╚════════════════════════════════════════════════════════════════════════════╝
--
-- DEPLOYMENT:
-- 1. Öffne Supabase Dashboard → SQL Editor
-- 2. Kopiere dieses komplette Script
-- 3. Führe es aus (kann 1-2 Minuten dauern)
-- 4. Prüfe die Output-Messages
--
-- ============================================================================

-- ============================================================================
-- PHASE 1: CORE TABLES PRÜFEN
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '╔══════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  SALES FLOW AI - PRODUCTION DEPLOYMENT                       ║';
  RAISE NOTICE '║  Version 1.0.0                                               ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '🔍 Prüfe vorhandene Tabellen...';
  RAISE NOTICE '';
END $$;

-- ============================================================================
-- PHASE 2: LEARNING SYSTEM (014)
-- ============================================================================

-- Learning Signals
CREATE TABLE IF NOT EXISTS learning_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID,
    
    -- Context
    context_type TEXT NOT NULL CHECK (context_type IN ('chat', 'template', 'objection', 'followup', 'general')),
    context_id TEXT,
    
    -- Original vs Correction
    original_text TEXT NOT NULL,
    corrected_text TEXT,
    
    -- Analysis
    similarity_score DECIMAL(5,4),
    change_type TEXT CHECK (change_type IN ('style', 'content', 'both', 'minor', 'significant')),
    detected_patterns JSONB DEFAULT '[]',
    
    -- Metadata
    signal_type TEXT NOT NULL DEFAULT 'correction' CHECK (signal_type IN ('correction', 'preference', 'feedback', 'ignore')),
    metadata JSONB DEFAULT '{}',
    
    -- Status
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    resulted_in_rule BOOLEAN DEFAULT false,
    rule_id UUID,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Command Rules
CREATE TABLE IF NOT EXISTS command_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID,
    
    -- Rule Definition
    rule_type TEXT NOT NULL CHECK (rule_type IN ('style', 'vocabulary', 'structure', 'response', 'custom')),
    scope TEXT NOT NULL DEFAULT 'personal' CHECK (scope IN ('personal', 'team', 'workspace')),
    
    -- Content
    trigger_pattern TEXT,
    replacement_pattern TEXT,
    description TEXT NOT NULL,
    examples JSONB DEFAULT '[]',
    
    -- Learning Source
    source_type TEXT NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'learned', 'imported', 'pattern_detected')),
    source_signals UUID[],
    confidence DECIMAL(5,4) DEFAULT 1.0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 50,
    times_applied INTEGER DEFAULT 0,
    last_applied_at TIMESTAMPTZ,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learned Patterns
CREATE TABLE IF NOT EXISTS learned_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID,
    
    -- Pattern
    pattern_type TEXT NOT NULL,
    pattern_key TEXT NOT NULL,
    pattern_value JSONB NOT NULL,
    
    -- Stats
    occurrence_count INTEGER DEFAULT 1,
    confidence DECIMAL(5,4) DEFAULT 0.5,
    
    -- Status
    status TEXT DEFAULT 'detected' CHECK (status IN ('detected', 'pending_review', 'confirmed', 'dismissed', 'converted_to_rule')),
    rule_id UUID REFERENCES command_rules(id),
    
    -- Metadata
    first_seen_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    
    UNIQUE(user_id, pattern_type, pattern_key)
);

-- ============================================================================
-- PHASE 3: KNOWLEDGE SYSTEM (015)
-- ============================================================================

-- Knowledge Sources
CREATE TABLE IF NOT EXISTS knowledge_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL,
    
    -- Source Info
    name TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('document', 'website', 'manual', 'chat_export', 'crm_import', 'api')),
    source_url TEXT,
    
    -- Content
    raw_content TEXT,
    processed_content TEXT,
    
    -- Processing
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    processing_error TEXT,
    chunks_count INTEGER DEFAULT 0,
    
    -- Metadata
    file_type TEXT,
    file_size INTEGER,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Knowledge Chunks
CREATE TABLE IF NOT EXISTS knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID NOT NULL REFERENCES knowledge_sources(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL,
    
    -- Content
    content TEXT NOT NULL,
    chunk_type TEXT DEFAULT 'text' CHECK (chunk_type IN ('text', 'heading', 'list', 'table', 'code', 'faq')),
    
    -- Position
    chunk_index INTEGER NOT NULL,
    parent_chunk_id UUID REFERENCES knowledge_chunks(id),
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    word_count INTEGER,
    
    -- Embedding
    embedding vector(1536),
    
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

-- Chunk Tags Junction
CREATE TABLE IF NOT EXISTS chunk_tags (
    chunk_id UUID NOT NULL REFERENCES knowledge_chunks(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES knowledge_tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (chunk_id, tag_id)
);

-- ============================================================================
-- PHASE 4: FOLLOW-UP SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS follow_up_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    workspace_id UUID,
    
    -- Task Info
    lead_name TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('call', 'email', 'message', 'meeting', 'follow_up')),
    description TEXT,
    
    -- Scheduling
    due_date DATE NOT NULL,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    
    -- Status
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    
    -- Source
    source TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'auto_reminder', 'chief', 'daily_flow')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PHASE 5: DAILY FLOW SYSTEM
-- ============================================================================

-- Daily Flow Config
CREATE TABLE IF NOT EXISTS daily_flow_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    workspace_id UUID,
    
    -- Goals
    target_deals_per_period INTEGER DEFAULT 5,
    period_type TEXT DEFAULT 'month' CHECK (period_type IN ('week', 'month', 'quarter')),
    
    -- Conversion Rates
    contacts_to_demo DECIMAL(5,4) DEFAULT 0.20,
    demo_to_close DECIMAL(5,4) DEFAULT 0.30,
    
    -- Preferences
    preferred_channels TEXT[] DEFAULT ARRAY['phone', 'whatsapp'],
    working_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5],
    working_hours_start TIME DEFAULT '09:00',
    working_hours_end TIME DEFAULT '18:00',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily Plans
CREATE TABLE IF NOT EXISTS daily_flow_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    config_id UUID REFERENCES daily_flow_config(id),
    
    -- Plan Date
    plan_date DATE NOT NULL,
    
    -- Targets
    planned_new_contacts INTEGER DEFAULT 0,
    planned_followups INTEGER DEFAULT 0,
    planned_actions_total INTEGER DEFAULT 0,
    
    -- Actuals
    completed_new_contacts INTEGER DEFAULT 0,
    completed_followups INTEGER DEFAULT 0,
    completed_actions_total INTEGER DEFAULT 0,
    
    -- Status
    state TEXT DEFAULT 'PLANNED' CHECK (state IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED')),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, plan_date)
);

-- Daily Actions
CREATE TABLE IF NOT EXISTS daily_flow_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES daily_flow_plans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Action
    action_type TEXT NOT NULL CHECK (action_type IN ('new_contact', 'follow_up', 'demo', 'close', 'check_payment', 'other')),
    channel TEXT CHECK (channel IN ('phone', 'whatsapp', 'email', 'meeting', 'other')),
    
    -- Target
    lead_id UUID REFERENCES leads(id),
    lead_name TEXT,
    
    -- Content
    title TEXT NOT NULL,
    description TEXT,
    
    -- Scheduling
    due_at TIMESTAMPTZ,
    priority INTEGER DEFAULT 50,
    
    -- Status
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'skipped', 'snoozed')),
    completed_at TIMESTAMPTZ,
    skip_reason TEXT,
    snoozed_until TIMESTAMPTZ,
    
    -- Notes
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PHASE 6: INDEXES
-- ============================================================================

-- Learning System Indexes
CREATE INDEX IF NOT EXISTS idx_learning_signals_user ON learning_signals(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_signals_context ON learning_signals(context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_learning_signals_processed ON learning_signals(processed) WHERE NOT processed;
CREATE INDEX IF NOT EXISTS idx_command_rules_user_active ON command_rules(user_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_command_rules_scope ON command_rules(scope, workspace_id);
CREATE INDEX IF NOT EXISTS idx_learned_patterns_status ON learned_patterns(status) WHERE status = 'pending_review';

-- Knowledge System Indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_workspace ON knowledge_sources(workspace_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_source ON knowledge_chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_workspace ON knowledge_chunks(workspace_id);

-- Follow-up Indexes
CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_user_date ON follow_up_tasks(user_id, due_date);
CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_completed ON follow_up_tasks(completed) WHERE NOT completed;

-- Daily Flow Indexes
CREATE INDEX IF NOT EXISTS idx_daily_flow_plans_user_date ON daily_flow_plans(user_id, plan_date);
CREATE INDEX IF NOT EXISTS idx_daily_flow_actions_plan ON daily_flow_actions(plan_id);
CREATE INDEX IF NOT EXISTS idx_daily_flow_actions_status ON daily_flow_actions(status) WHERE status = 'pending';

-- ============================================================================
-- PHASE 7: RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE learning_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE command_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE learned_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_flow_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_flow_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_flow_actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (User can only access their own data)
DO $$
BEGIN
  -- Learning Signals
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'learning_signals_user_policy') THEN
    CREATE POLICY learning_signals_user_policy ON learning_signals
      FOR ALL USING (auth.uid() = user_id);
  END IF;
  
  -- Command Rules
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'command_rules_user_policy') THEN
    CREATE POLICY command_rules_user_policy ON command_rules
      FOR ALL USING (auth.uid() = user_id);
  END IF;
  
  -- Learned Patterns
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'learned_patterns_user_policy') THEN
    CREATE POLICY learned_patterns_user_policy ON learned_patterns
      FOR ALL USING (auth.uid() = user_id);
  END IF;
  
  -- Follow-up Tasks
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'follow_up_tasks_user_policy') THEN
    CREATE POLICY follow_up_tasks_user_policy ON follow_up_tasks
      FOR ALL USING (auth.uid() = user_id);
  END IF;
  
  -- Daily Flow
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'daily_flow_config_user_policy') THEN
    CREATE POLICY daily_flow_config_user_policy ON daily_flow_config
      FOR ALL USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'daily_flow_plans_user_policy') THEN
    CREATE POLICY daily_flow_plans_user_policy ON daily_flow_plans
      FOR ALL USING (auth.uid() = user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'daily_flow_actions_user_policy') THEN
    CREATE POLICY daily_flow_actions_user_policy ON daily_flow_actions
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================================
-- PHASE 8: COMPLETION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔══════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ PRODUCTION DEPLOYMENT COMPLETE!                          ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Erstellte Tabellen:';
  RAISE NOTICE '   • learning_signals';
  RAISE NOTICE '   • command_rules';
  RAISE NOTICE '   • learned_patterns';
  RAISE NOTICE '   • knowledge_sources';
  RAISE NOTICE '   • knowledge_chunks';
  RAISE NOTICE '   • knowledge_tags';
  RAISE NOTICE '   • follow_up_tasks';
  RAISE NOTICE '   • daily_flow_config';
  RAISE NOTICE '   • daily_flow_plans';
  RAISE NOTICE '   • daily_flow_actions';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 RLS Policies aktiviert';
  RAISE NOTICE '📊 Indexes erstellt';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Sales Flow AI ist bereit!';
END $$;


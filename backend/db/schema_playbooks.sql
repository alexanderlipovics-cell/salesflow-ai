-- ============================================================
-- PLAYBOOKS SCHEMA
-- Sales playbooks with step-by-step guidance
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PLAYBOOKS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS playbooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL, -- prospecting, closing, objection_handling, etc.
    industry TEXT[] NOT NULL DEFAULT '{}', -- network_marketing, real_estate, finance
    difficulty VARCHAR(50) NOT NULL DEFAULT 'intermediate', -- beginner, intermediate, advanced
    estimated_time VARCHAR(100), -- e.g. "15 minutes", "1 hour"
    success_metrics JSONB DEFAULT '{}', -- Key metrics to track
    tags TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_difficulty CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    CONSTRAINT valid_category CHECK (category IN (
        'prospecting', 'qualification', 'presentation', 'objection_handling',
        'closing', 'follow_up', 'relationship_building', 'team_building',
        'event_planning', 'social_media', 'content_creation', 'lead_generation'
    ))
);

-- ============================================================
-- 2. PLAYBOOK STEPS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS playbook_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    playbook_id UUID NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    action_items TEXT[] DEFAULT '{}',
    tips TEXT[] DEFAULT '{}',
    common_mistakes TEXT[] DEFAULT '{}',
    estimated_duration INTEGER, -- Duration in minutes
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT unique_step_per_playbook UNIQUE(playbook_id, step_number),
    CONSTRAINT positive_step_number CHECK (step_number > 0)
);

-- ============================================================
-- 3. BEST PRACTICES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS best_practices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100) NOT NULL,
    industry TEXT[] NOT NULL DEFAULT '{}',
    impact_level VARCHAR(50) NOT NULL DEFAULT 'medium', -- high, medium, low
    implementation_difficulty VARCHAR(50) NOT NULL DEFAULT 'medium', -- easy, medium, hard
    examples TEXT[] DEFAULT '{}',
    related_playbooks UUID[] DEFAULT '{}', -- Array of playbook IDs
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT valid_impact CHECK (impact_level IN ('high', 'medium', 'low')),
    CONSTRAINT valid_difficulty CHECK (implementation_difficulty IN ('easy', 'medium', 'hard'))
);

-- ============================================================
-- 4. PLAYBOOK RUNS TABLE (Track user progress)
-- ============================================================
CREATE TABLE IF NOT EXISTS playbook_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    playbook_id UUID NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
    lead_id UUID, -- Optional: Link to specific lead
    user_id UUID, -- User executing the playbook
    status VARCHAR(50) NOT NULL DEFAULT 'in_progress', -- in_progress, completed, abandoned
    current_step INTEGER DEFAULT 1,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    notes TEXT,
    
    CONSTRAINT valid_status CHECK (status IN ('in_progress', 'completed', 'abandoned'))
);

-- ============================================================
-- 5. PLAYBOOK RUN STEPS TABLE (Track individual step completion)
-- ============================================================
CREATE TABLE IF NOT EXISTS playbook_run_steps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL REFERENCES playbook_runs(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES playbook_steps(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, skipped
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    
    CONSTRAINT unique_step_per_run UNIQUE(run_id, step_id),
    CONSTRAINT valid_step_status CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped'))
);

-- ============================================================
-- INDEXES for Performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_playbooks_category ON playbooks(category);
CREATE INDEX IF NOT EXISTS idx_playbooks_industry ON playbooks USING GIN(industry);
CREATE INDEX IF NOT EXISTS idx_playbooks_difficulty ON playbooks(difficulty);
CREATE INDEX IF NOT EXISTS idx_playbooks_active ON playbooks(is_active);

CREATE INDEX IF NOT EXISTS idx_playbook_steps_playbook ON playbook_steps(playbook_id);
CREATE INDEX IF NOT EXISTS idx_playbook_steps_number ON playbook_steps(step_number);

CREATE INDEX IF NOT EXISTS idx_best_practices_category ON best_practices(category);
CREATE INDEX IF NOT EXISTS idx_best_practices_industry ON best_practices USING GIN(industry);
CREATE INDEX IF NOT EXISTS idx_best_practices_impact ON best_practices(impact_level);

CREATE INDEX IF NOT EXISTS idx_playbook_runs_playbook ON playbook_runs(playbook_id);
CREATE INDEX IF NOT EXISTS idx_playbook_runs_user ON playbook_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_playbook_runs_status ON playbook_runs(status);

CREATE INDEX IF NOT EXISTS idx_playbook_run_steps_run ON playbook_run_steps(run_id);
CREATE INDEX IF NOT EXISTS idx_playbook_run_steps_status ON playbook_run_steps(status);

-- ============================================================
-- TRIGGERS for Updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_playbooks_updated_at BEFORE UPDATE ON playbooks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_best_practices_updated_at BEFORE UPDATE ON best_practices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


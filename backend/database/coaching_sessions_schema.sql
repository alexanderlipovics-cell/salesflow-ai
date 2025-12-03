-- ============================================================================
-- Sales Flow AI - Coaching Sessions Schema
-- ============================================================================
-- Stores AI-generated coaching insights for squad leaders
-- ============================================================================

-- ============================================================================
-- Create coaching_sessions table
-- ============================================================================

CREATE TABLE IF NOT EXISTS coaching_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    squad_id UUID NOT NULL, -- References squads table (adjust FK as needed)
    insights JSONB NOT NULL,
    feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
    feedback_text TEXT,
    
    -- Metadata
    challenge_id UUID, -- Optional: Link to specific challenge
    model_version TEXT DEFAULT 'gpt-4o-mini'
);

-- ============================================================================
-- Create Indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_coaching_sessions_user ON coaching_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_squad ON coaching_sessions(squad_id);
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_created ON coaching_sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coaching_sessions_challenge ON coaching_sessions(challenge_id) WHERE challenge_id IS NOT NULL;

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================

ALTER TABLE coaching_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own coaching sessions
DROP POLICY IF EXISTS "Users can view own coaching sessions" ON coaching_sessions;
CREATE POLICY "Users can view own coaching sessions"
    ON coaching_sessions FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: System can insert coaching sessions
DROP POLICY IF EXISTS "System can insert coaching sessions" ON coaching_sessions;
CREATE POLICY "System can insert coaching sessions"
    ON coaching_sessions FOR INSERT
    WITH CHECK (true);

-- Policy: Users can update feedback on their sessions
DROP POLICY IF EXISTS "Users can update feedback" ON coaching_sessions;
CREATE POLICY "Users can update feedback"
    ON coaching_sessions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Success Message
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Coaching Sessions schema created successfully!';
    RAISE NOTICE '📋 Table: coaching_sessions';
    RAISE NOTICE '🔍 Indexes: 4 indexes created';
    RAISE NOTICE '👁️  RLS: Enabled with read/insert/update policies';
END $$;


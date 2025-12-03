-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  FIX: Recreate sequences table with correct schema                         ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- Drop old broken table
DROP TABLE IF EXISTS sequences CASCADE;

-- Recreate with correct schema
CREATE TABLE sequences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft',
    settings JSONB DEFAULT '{"timezone": "Europe/Berlin", "send_days": ["mon", "tue", "wed", "thu", "fri"], "send_hours_start": 9, "send_hours_end": 18, "max_per_day": 50, "stop_on_reply": true}',
    stats JSONB DEFAULT '{"enrolled": 0, "active": 0, "completed": 0, "replied": 0}',
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    activated_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Re-add foreign key to sequence_steps
ALTER TABLE sequence_steps DROP CONSTRAINT IF EXISTS sequence_steps_sequence_id_fkey;
ALTER TABLE sequence_steps ADD CONSTRAINT sequence_steps_sequence_id_fkey 
    FOREIGN KEY (sequence_id) REFERENCES sequences(id) ON DELETE CASCADE;

-- Re-add foreign key to sequence_enrollments
ALTER TABLE sequence_enrollments DROP CONSTRAINT IF EXISTS sequence_enrollments_sequence_id_fkey;
ALTER TABLE sequence_enrollments ADD CONSTRAINT sequence_enrollments_sequence_id_fkey 
    FOREIGN KEY (sequence_id) REFERENCES sequences(id) ON DELETE CASCADE;

-- Re-add foreign key to sequence_daily_stats
ALTER TABLE sequence_daily_stats DROP CONSTRAINT IF EXISTS sequence_daily_stats_sequence_id_fkey;
ALTER TABLE sequence_daily_stats ADD CONSTRAINT sequence_daily_stats_sequence_id_fkey 
    FOREIGN KEY (sequence_id) REFERENCES sequences(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sequences_user ON sequences(user_id);
CREATE INDEX IF NOT EXISTS idx_sequences_status ON sequences(status);

-- RLS
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own sequences" ON sequences;
CREATE POLICY "Users manage own sequences" ON sequences FOR ALL USING (auth.uid() = user_id);

SELECT '✅ sequences table fixed!' AS status;


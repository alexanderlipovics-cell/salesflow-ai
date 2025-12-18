-- Migration: Add MLM Company and Rank fields to users table
-- Date: 2025-01-XX

-- Add MLM fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS mlm_company TEXT DEFAULT 'zinzino';
ALTER TABLE users ADD COLUMN IF NOT EXISTS mlm_rank TEXT DEFAULT 'partner';
ALTER TABLE users ADD COLUMN IF NOT EXISTS mlm_rank_data JSONB DEFAULT '{}';

-- Add index for fast queries
CREATE INDEX IF NOT EXISTS idx_users_mlm_company ON users(mlm_company);

-- Add comment
COMMENT ON COLUMN users.mlm_company IS 'MLM company identifier: zinzino, pm_international, herbalife, doterra, other';
COMMENT ON COLUMN users.mlm_rank IS 'Current MLM rank/title (e.g., bronze, silver, gold, q-team, etc.)';
COMMENT ON COLUMN users.mlm_rank_data IS 'JSONB with rank progress data: customer_points, pcv, mcv, left_credits, right_credits, etc.';


-- Add onboarding columns to users table
-- Run this in Supabase SQL Editor

ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_data JSONB DEFAULT '{}';

-- Optional: Add comments for documentation
COMMENT ON COLUMN users.onboarding_completed IS 'Whether the user has completed the onboarding process';
COMMENT ON COLUMN users.onboarding_data IS 'JSON data containing onboarding information like goals, experience, team_size, etc.';

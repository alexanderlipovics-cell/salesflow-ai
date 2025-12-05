-- SUPABASE SCHEMA CACHE FIX
-- Run this in Supabase SQL Editor to force reload

-- 1. Verify users table exists
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- If table exists, you should see all columns including 'company'

-- 2. Force PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';

-- 3. Reload config
NOTIFY pgrst, 'reload config';

-- 4. If still not working, try recreating the table (BACKUP FIRST!)
-- DROP TABLE IF EXISTS users CASCADE;
-- Then run the full migration again: 20250105_create_users_table.sql

-- 5. Alternative: Restart your Supabase Project
-- Go to: Settings → General → "Pause Project" → "Resume Project"
-- This forces a complete reload


-- Force Supabase Schema Cache Reload
-- Execute this after creating/modifying tables

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- Verify users table exists
SELECT table_name, column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- Should show all columns including 'company'


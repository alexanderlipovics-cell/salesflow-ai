-- ============================================================================
-- ENABLE RLS FOR OBJECTION_RESPONSES
-- ============================================================================

-- 1. Enable RLS
ALTER TABLE objection_responses ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any
DROP POLICY IF EXISTS "objection_responses_read" ON objection_responses;
DROP POLICY IF EXISTS "objection_responses_write" ON objection_responses;

-- 3. Create read policy - anyone can read active responses
CREATE POLICY "objection_responses_read" ON objection_responses
FOR SELECT
USING (is_active = true);

-- 4. Create write policy - only admins can write
-- (Falls du company_users hast, kannst du es einschraenken)
CREATE POLICY "objection_responses_write" ON objection_responses
FOR ALL
USING (true)
WITH CHECK (true);

-- 5. Verify
SELECT 'objection_responses RLS enabled!' as status;


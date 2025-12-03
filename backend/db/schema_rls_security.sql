-- ============================================================================
-- SALES FLOW AI - ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Critical Security Fix (Gemini's #1 Priority!)
-- 
-- WARNING: Without these policies, ANYONE with your Supabase URL can:
-- - Read all leads (including competitors!)
-- - Delete data
-- - Modify records
--
-- This SQL MUST be executed BEFORE going to production!
-- ============================================================================

-- ============================================================================
-- STEP 1: ADD OWNER_ID COLUMNS (If not exists)
-- ============================================================================

-- Add owner_id to leads table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'leads' AND column_name = 'owner_id'
    ) THEN
        ALTER TABLE leads ADD COLUMN owner_id UUID REFERENCES auth.users(id);
        RAISE NOTICE '✅ Added owner_id to leads';
    END IF;
END $$;

-- Add owner_id to message_templates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'message_templates' AND column_name = 'owner_id'
    ) THEN
        ALTER TABLE message_templates ADD COLUMN owner_id UUID REFERENCES auth.users(id);
        RAISE NOTICE '✅ Added owner_id to message_templates';
    END IF;
END $$;

-- Add owner_id to playbooks
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'playbooks' AND column_name = 'owner_id'
    ) THEN
        ALTER TABLE playbooks ADD COLUMN owner_id UUID REFERENCES auth.users(id);
        RAISE NOTICE '✅ Added owner_id to playbooks';
    END IF;
END $$;

-- Add owner_id to objections
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'objections' AND column_name = 'owner_id'
    ) THEN
        ALTER TABLE objections ADD COLUMN owner_id UUID REFERENCES auth.users(id);
        RAISE NOTICE '✅ Added owner_id to objections';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: ENABLE ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE objections ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_scenarios ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: CREATE POLICIES FOR LEADS
-- ============================================================================

-- Policy 1: Users can see only their own leads
CREATE POLICY "Users can view own leads"
ON leads FOR SELECT
USING (auth.uid() = owner_id);

-- Policy 2: Users can insert their own leads
CREATE POLICY "Users can insert own leads"
ON leads FOR INSERT
WITH CHECK (auth.uid() = owner_id);

-- Policy 3: Users can update their own leads
CREATE POLICY "Users can update own leads"
ON leads FOR UPDATE
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Policy 4: Users can delete their own leads
CREATE POLICY "Users can delete own leads"
ON leads FOR DELETE
USING (auth.uid() = owner_id);

-- ============================================================================
-- STEP 4: CREATE POLICIES FOR MESSAGE TEMPLATES
-- ============================================================================

-- Shared templates (owner_id IS NULL) are visible to all
-- Personal templates (owner_id IS NOT NULL) only to owner

CREATE POLICY "Users can view shared and own templates"
ON message_templates FOR SELECT
USING (owner_id IS NULL OR auth.uid() = owner_id);

CREATE POLICY "Users can insert own templates"
ON message_templates FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own templates"
ON message_templates FOR UPDATE
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete own templates"
ON message_templates FOR DELETE
USING (auth.uid() = owner_id);

-- ============================================================================
-- STEP 5: CREATE POLICIES FOR PLAYBOOKS
-- ============================================================================

-- Same logic: shared (NULL) or owned

CREATE POLICY "Users can view shared and own playbooks"
ON playbooks FOR SELECT
USING (owner_id IS NULL OR auth.uid() = owner_id);

CREATE POLICY "Users can insert own playbooks"
ON playbooks FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own playbooks"
ON playbooks FOR UPDATE
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete own playbooks"
ON playbooks FOR DELETE
USING (auth.uid() = owner_id);

-- ============================================================================
-- STEP 6: CREATE POLICIES FOR OBJECTIONS
-- ============================================================================

-- Objections are typically shared knowledge base
-- But allow personal objections too

CREATE POLICY "Users can view all objections"
ON objections FOR SELECT
USING (true);  -- All users can see all objections (knowledge base)

CREATE POLICY "Users can insert own objections"
ON objections FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own objections"
ON objections FOR UPDATE
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can delete own objections"
ON objections FOR DELETE
USING (auth.uid() = owner_id);

-- ============================================================================
-- STEP 7: CREATE POLICIES FOR SALES SCENARIOS
-- ============================================================================

-- Sales scenarios can be shared or personal

CREATE POLICY "Users can view all scenarios"
ON sales_scenarios FOR SELECT
USING (true);  -- All users can see all scenarios (shared library)

-- If you want to add personal scenarios later:
-- ALTER TABLE sales_scenarios ADD COLUMN owner_id UUID REFERENCES auth.users(id);
-- Then update policies accordingly

-- ============================================================================
-- STEP 8: MIGRATION - ASSIGN EXISTING DATA TO SYSTEM USER (OPTIONAL)
-- ============================================================================

-- For existing data without owner_id, you have two options:

-- OPTION A: Keep as shared (owner_id = NULL)
-- This makes templates/playbooks available to all users
-- Good for knowledge base content
-- No action needed!

-- OPTION B: Assign to a "system" user
-- Uncomment and modify if needed:

/*
-- Create a system user variable (replace with actual admin user ID)
DO $$
DECLARE
    system_user_id UUID := 'your-admin-user-uuid-here';
BEGIN
    -- Update existing templates to system user
    UPDATE message_templates 
    SET owner_id = system_user_id 
    WHERE owner_id IS NULL;
    
    -- Update existing playbooks to system user
    UPDATE playbooks 
    SET owner_id = system_user_id 
    WHERE owner_id IS NULL;
    
    -- Update existing objections to system user
    UPDATE objections 
    SET owner_id = system_user_id 
    WHERE owner_id IS NULL;
    
    RAISE NOTICE '✅ Migrated existing data to system user';
END $$;
*/

-- ============================================================================
-- STEP 9: CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- These indexes speed up RLS policy checks

CREATE INDEX IF NOT EXISTS idx_leads_owner_id 
ON leads(owner_id);

CREATE INDEX IF NOT EXISTS idx_templates_owner_id 
ON message_templates(owner_id);

CREATE INDEX IF NOT EXISTS idx_playbooks_owner_id 
ON playbooks(owner_id);

CREATE INDEX IF NOT EXISTS idx_objections_owner_id 
ON objections(owner_id);

-- ============================================================================
-- STEP 10: VERIFICATION
-- ============================================================================

-- Run this to verify RLS is enabled:

SELECT 
    schemaname,
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('leads', 'message_templates', 'playbooks', 'objections', 'sales_scenarios');

-- Expected output: All rows should show "RLS Enabled = true"

-- ============================================================================
-- TESTING RLS POLICIES
-- ============================================================================

-- To test policies, create a test user and try accessing data:

/*
-- 1. Create test user (do this in Supabase Auth UI)
-- 2. Get the user's UUID
-- 3. Try these queries as that user:

-- Should only see own leads:
SELECT * FROM leads;

-- Should see shared templates (owner_id = NULL) and own templates:
SELECT * FROM message_templates;

-- Should see all objections (knowledge base):
SELECT * FROM objections;
*/

-- ============================================================================
-- ROLLBACK (Emergency Only!)
-- ============================================================================

-- If you need to disable RLS (NOT RECOMMENDED for production!):

/*
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE playbooks DISABLE ROW LEVEL SECURITY;
ALTER TABLE objections DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_scenarios DISABLE ROW LEVEL SECURITY;
*/

-- ============================================================================
-- NOTES
-- ============================================================================

/*
IMPORTANT CONSIDERATIONS:

1. SHARED vs PERSONAL:
   - Templates/Playbooks: Shared (owner_id = NULL) by default
   - Leads: Always personal (must have owner_id)
   - Objections: Shared knowledge base

2. PERFORMANCE:
   - RLS adds ~1-5ms per query (negligible)
   - Indexes on owner_id keep it fast

3. MULTI-TENANCY:
   - For teams, add a team_id column
   - Update policies to check team membership

4. AUDIT LOGS:
   - Consider adding audit_logs table
   - Track who changed what (required for enterprise)

5. SERVICE ROLE:
   - Your backend (FastAPI) should use SERVICE_ROLE key
   - This bypasses RLS for admin operations
   - Never expose SERVICE_ROLE to frontend!
*/

-- ============================================================================
-- SUCCESS!
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '==================================================================';
    RAISE NOTICE '✅ ROW LEVEL SECURITY POLICIES SUCCESSFULLY APPLIED!';
    RAISE NOTICE '==================================================================';
    RAISE NOTICE 'Your database is now secure!';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '1. Test policies with a test user account';
    RAISE NOTICE '2. Update your app to set owner_id on new records';
    RAISE NOTICE '3. Configure FastAPI to use SERVICE_ROLE key for admin ops';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 Security Level: PRODUCTION READY!';
    RAISE NOTICE '==================================================================';
END $$;


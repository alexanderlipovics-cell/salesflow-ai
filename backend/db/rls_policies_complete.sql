-- ============================================================================
-- SALES FLOW AI - COMPLETE RLS POLICIES v1.0
-- ============================================================================
-- Purpose: Row Level Security for Multi-Tenancy and User Isolation
-- This script creates all necessary tables and RLS policies
-- ============================================================================
-- IMPORTANT: Run this AFTER base schemas are created
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 0. USER-COMPANY MAPPING (Foundation)
-- ============================================================================

-- User Profiles (one per auth.user)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT,
  default_company_id UUID REFERENCES public.mlm_companies(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User-Company Members (Many-to-Many: User ↔ Company)
CREATE TABLE IF NOT EXISTS public.user_company_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id  UUID NOT NULL REFERENCES public.mlm_companies(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'leader', 'admin')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (user_id, company_id)
);

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_company_members ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USER PROFILES POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users select own profile" ON public.user_profiles;
CREATE POLICY "Users select own profile" 
ON public.user_profiles
FOR SELECT
USING (id = auth.uid());

DROP POLICY IF EXISTS "Users modify own profile" ON public.user_profiles;
CREATE POLICY "Users modify own profile"
ON public.user_profiles
FOR ALL
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ============================================================================
-- USER COMPANY MEMBERS POLICIES
-- ============================================================================

DROP POLICY IF EXISTS "Users select own memberships" ON public.user_company_members;
CREATE POLICY "Users select own memberships"
ON public.user_company_members
FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own memberships" ON public.user_company_members;
CREATE POLICY "Users insert own memberships"
ON public.user_company_members
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 1. MLM COMPANIES POLICIES
-- ============================================================================

ALTER TABLE public.mlm_companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "All authenticated can read companies" ON public.mlm_companies;
CREATE POLICY "All authenticated can read companies"
ON public.mlm_companies
FOR SELECT
USING (auth.role() = 'authenticated');

-- Write: Only via Service-Role (Backend) - no public policy needed

-- ============================================================================
-- 2. TEMPLATES POLICIES
-- ============================================================================

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company members can read templates" ON public.templates;
CREATE POLICY "Company members can read templates"
ON public.templates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_company_members m
    WHERE m.user_id = auth.uid()
      AND m.company_id = templates.company_id
  )
);

DROP POLICY IF EXISTS "Company leaders can modify templates" ON public.templates;
CREATE POLICY "Company leaders can modify templates"
ON public.templates
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_company_members m
    WHERE m.user_id = auth.uid()
      AND m.company_id = templates.company_id
      AND m.role IN ('leader', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_company_members m
    WHERE m.user_id = auth.uid()
      AND m.company_id = templates.company_id
      AND m.role IN ('leader', 'admin')
  )
);

-- ============================================================================
-- TEMPLATE TRANSLATIONS POLICIES
-- ============================================================================

ALTER TABLE public.template_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company members can read template translations" ON public.template_translations;
CREATE POLICY "Company members can read template translations"
ON public.template_translations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.templates t
    JOIN public.user_company_members m ON m.company_id = t.company_id
    WHERE t.id = template_translations.template_id
      AND m.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Company leaders can modify template translations" ON public.template_translations;
CREATE POLICY "Company leaders can modify template translations"
ON public.template_translations
FOR ALL
USING (
  EXISTS (
    SELECT 1 
    FROM public.templates t
    JOIN public.user_company_members m ON m.company_id = t.company_id
    WHERE t.id = template_translations.template_id
      AND m.user_id = auth.uid()
      AND m.role IN ('leader', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.templates t
    JOIN public.user_company_members m ON m.company_id = t.company_id
    WHERE t.id = template_translations.template_id
      AND m.user_id = auth.uid()
      AND m.role IN ('leader', 'admin')
  )
);

-- ============================================================================
-- TEMPLATE PERFORMANCE POLICIES
-- ============================================================================

ALTER TABLE public.template_performance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company members can read template performance" ON public.template_performance;
CREATE POLICY "Company members can read template performance"
ON public.template_performance
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.user_company_members m
    WHERE m.user_id = auth.uid()
      AND m.company_id = template_performance.company_id
  )
);

-- Write: Only via Service-Role (Analytics Backend)

-- ============================================================================
-- 3. LEADS POLICIES (Neuro-Profiler)
-- ============================================================================

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own leads" ON public.leads;
CREATE POLICY "Users can view own leads"
ON public.leads
FOR SELECT
USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage own leads" ON public.leads;
CREATE POLICY "Users can manage own leads"
ON public.leads
FOR ALL
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

-- ============================================================================
-- DISC ANALYSES POLICIES
-- ============================================================================

ALTER TABLE public.disc_analyses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see analyses of own leads" ON public.disc_analyses;
CREATE POLICY "Users see analyses of own leads"
ON public.disc_analyses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = disc_analyses.lead_id
      AND l.owner_user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users insert analyses for own leads" ON public.disc_analyses;
CREATE POLICY "Users insert analyses for own leads"
ON public.disc_analyses
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = disc_analyses.lead_id
      AND l.owner_user_id = auth.uid()
  )
);

-- ============================================================================
-- 4. SPEED HUNTER POLICIES
-- ============================================================================

ALTER TABLE public.speed_hunter_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own speed hunter sessions" ON public.speed_hunter_sessions;
CREATE POLICY "Users manage own speed hunter sessions"
ON public.speed_hunter_sessions
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- SPEED HUNTER ACTIONS POLICIES
-- ============================================================================

ALTER TABLE public.speed_hunter_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own speed hunter actions" ON public.speed_hunter_actions;
CREATE POLICY "Users see own speed hunter actions"
ON public.speed_hunter_actions
FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own speed hunter actions" ON public.speed_hunter_actions;
CREATE POLICY "Users insert own speed hunter actions"
ON public.speed_hunter_actions
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 5. OBJECTION TEMPLATES POLICIES
-- ============================================================================

ALTER TABLE public.objection_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company members can read objection templates" ON public.objection_templates;
CREATE POLICY "Company members can read objection templates"
ON public.objection_templates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_company_members m
    WHERE m.user_id = auth.uid()
      AND m.company_id = objection_templates.company_id
  )
);

DROP POLICY IF EXISTS "Leaders can manage objection templates" ON public.objection_templates;
CREATE POLICY "Leaders can manage objection templates"
ON public.objection_templates
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_company_members m
    WHERE m.user_id = auth.uid()
      AND m.company_id = objection_templates.company_id
      AND m.role IN ('leader', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_company_members m
    WHERE m.user_id = auth.uid()
      AND m.company_id = objection_templates.company_id
      AND m.role IN ('leader', 'admin')
  )
);

-- ============================================================================
-- OBJECTION LOGS POLICIES
-- ============================================================================

ALTER TABLE public.objection_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own objection logs" ON public.objection_logs;
CREATE POLICY "Users see own objection logs"
ON public.objection_logs
FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own objection logs" ON public.objection_logs;
CREATE POLICY "Users insert own objection logs"
ON public.objection_logs
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- ============================================================================
-- 6. COMPLIANCE RULES POLICIES
-- ============================================================================

ALTER TABLE public.compliance_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read compliance rules" ON public.compliance_rules;
CREATE POLICY "Admins can read compliance rules"
ON public.compliance_rules
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_company_members m
    WHERE m.user_id = auth.uid()
      AND m.role = 'admin'
      AND (m.company_id = compliance_rules.company_id OR compliance_rules.company_id IS NULL)
  )
);

-- Write: Only via Service-Role

-- ============================================================================
-- COMPLIANCE VIOLATIONS POLICIES
-- ============================================================================

ALTER TABLE public.compliance_violations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own compliance violations" ON public.compliance_violations;
CREATE POLICY "Users see own compliance violations"
ON public.compliance_violations
FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own compliance violations" ON public.compliance_violations;
CREATE POLICY "Users insert own compliance violations"
ON public.compliance_violations
FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Company admins see company violations" ON public.compliance_violations;
CREATE POLICY "Company admins see company violations"
ON public.compliance_violations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.user_company_members m
    WHERE m.user_id = auth.uid()
      AND m.role = 'admin'
      AND m.company_id = compliance_violations.company_id
  )
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_user_company_members_user_id ON public.user_company_members(user_id);
CREATE INDEX IF NOT EXISTS idx_user_company_members_company_id ON public.user_company_members(company_id);
CREATE INDEX IF NOT EXISTS idx_user_company_members_role ON public.user_company_members(role);
CREATE INDEX IF NOT EXISTS idx_leads_owner_user_id ON public.leads(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_disc_analyses_lead_id ON public.disc_analyses(lead_id);

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '══════════════════════════════════════════════════';
  RAISE NOTICE '✅ RLS POLICIES COMPLETED SUCCESSFULLY!';
  RAISE NOTICE '══════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Tables with RLS enabled:';
  RAISE NOTICE '   • user_profiles';
  RAISE NOTICE '   • user_company_members';
  RAISE NOTICE '   • mlm_companies';
  RAISE NOTICE '   • templates + template_translations';
  RAISE NOTICE '   • template_performance';
  RAISE NOTICE '   • leads + disc_analyses';
  RAISE NOTICE '   • speed_hunter_sessions + actions';
  RAISE NOTICE '   • objection_templates + objection_logs';
  RAISE NOTICE '   • compliance_rules + compliance_violations';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Multi-tenancy and user isolation enabled';
  RAISE NOTICE '══════════════════════════════════════════════════';
  RAISE NOTICE '';
END $$;


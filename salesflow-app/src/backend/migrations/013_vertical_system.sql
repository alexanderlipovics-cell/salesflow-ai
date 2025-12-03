-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  SALES FLOW AI - VERTICAL SYSTEM                                          ║
-- ║  Migration 013: Multi-Vertical Support für Makler, Coaches, etc.          ║
-- ╚════════════════════════════════════════════════════════════════════════════╝
--
-- Dieses Modul ermöglicht:
--   • User können ihre Branche (Vertical) auswählen
--   • Branchenspezifische Konfiguration
--   • Vertical-spezifische Objection Brain Prompts
--   • Flexible Erweiterung für neue Branchen
--
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. VERTICAL TYPE ENUM
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  CREATE TYPE vertical_type AS ENUM (
    'network_marketing',    -- Network Marketing / MLM
    'real_estate',          -- Immobilien / Makler
    'coaching',             -- Coaching & Beratung
    'finance',              -- Finanzvertrieb
    'insurance',            -- Versicherung
    'solar',                -- Solar / Erneuerbare Energien
    'custom'                -- Eigene Branche
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. USER VERTICAL SETTINGS TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.user_vertical_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Vertical Selection
  vertical_id vertical_type NOT NULL DEFAULT 'network_marketing',
  
  -- Optional: Verknüpfung zu einer Firma (für NWM, Finance)
  company_id TEXT,
  
  -- Custom Label für "custom" Vertical
  custom_label TEXT,
  custom_icon TEXT,
  custom_color TEXT,
  
  -- Angepasste Daily Flow Targets (überschreibt Defaults)
  custom_daily_contacts INTEGER,
  custom_daily_followups INTEGER,
  custom_daily_reactivations INTEGER,
  
  -- Feature Overrides
  enable_lead_scoring BOOLEAN DEFAULT true,
  enable_proposal_reminders BOOLEAN DEFAULT true,
  enable_team_dashboard BOOLEAN,
  enable_finance_tracking BOOLEAN DEFAULT true,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  onboarding_completed BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Ein User hat nur eine aktive Vertical-Einstellung
  UNIQUE(user_id)
);

COMMENT ON TABLE public.user_vertical_settings IS 
  'User Vertical/Branche Einstellungen für Multi-Vertical Support';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_vertical_settings_user 
  ON user_vertical_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_user_vertical_settings_vertical 
  ON user_vertical_settings(vertical_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. TRIGGER: Auto-Update updated_at
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_user_vertical_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_vertical_settings_updated_at ON public.user_vertical_settings;
CREATE TRIGGER trigger_user_vertical_settings_updated_at
  BEFORE UPDATE ON public.user_vertical_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_vertical_settings_updated_at();

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. RPC: Get User Vertical Settings
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_user_vertical_settings(
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', id,
    'user_id', user_id,
    'vertical_id', vertical_id::TEXT,
    'company_id', company_id,
    'custom_label', custom_label,
    'custom_icon', custom_icon,
    'custom_color', custom_color,
    'custom_daily_contacts', custom_daily_contacts,
    'custom_daily_followups', custom_daily_followups,
    'custom_daily_reactivations', custom_daily_reactivations,
    'enable_lead_scoring', enable_lead_scoring,
    'enable_proposal_reminders', enable_proposal_reminders,
    'enable_team_dashboard', enable_team_dashboard,
    'enable_finance_tracking', enable_finance_tracking,
    'is_active', is_active,
    'onboarding_completed', onboarding_completed,
    'created_at', created_at,
    'updated_at', updated_at
  ) INTO v_result
  FROM user_vertical_settings
  WHERE user_id = p_user_id
    AND is_active = true
  LIMIT 1;
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_user_vertical_settings IS 
  'Holt die Vertical-Einstellungen für einen User';

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. RPC: Set User Vertical
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.set_user_vertical(
  p_user_id UUID,
  p_vertical_id TEXT,
  p_company_id TEXT DEFAULT NULL,
  p_custom_label TEXT DEFAULT NULL,
  p_custom_icon TEXT DEFAULT NULL,
  p_custom_color TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  INSERT INTO user_vertical_settings (
    user_id, vertical_id, company_id,
    custom_label, custom_icon, custom_color
  )
  VALUES (
    p_user_id, p_vertical_id::vertical_type, p_company_id,
    p_custom_label, p_custom_icon, p_custom_color
  )
  ON CONFLICT (user_id) DO UPDATE SET
    vertical_id = p_vertical_id::vertical_type,
    company_id = COALESCE(p_company_id, user_vertical_settings.company_id),
    custom_label = COALESCE(p_custom_label, user_vertical_settings.custom_label),
    custom_icon = COALESCE(p_custom_icon, user_vertical_settings.custom_icon),
    custom_color = COALESCE(p_custom_color, user_vertical_settings.custom_color),
    updated_at = NOW();
  
  -- Return updated settings
  RETURN get_user_vertical_settings(p_user_id);
END;
$$;

COMMENT ON FUNCTION public.set_user_vertical IS 
  'Setzt oder aktualisiert das Vertical für einen User';

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. RPC: Update Vertical Daily Flow Settings
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.update_vertical_daily_flow(
  p_user_id UUID,
  p_daily_contacts INTEGER DEFAULT NULL,
  p_daily_followups INTEGER DEFAULT NULL,
  p_daily_reactivations INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_vertical_settings SET
    custom_daily_contacts = COALESCE(p_daily_contacts, custom_daily_contacts),
    custom_daily_followups = COALESCE(p_daily_followups, custom_daily_followups),
    custom_daily_reactivations = COALESCE(p_daily_reactivations, custom_daily_reactivations),
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN get_user_vertical_settings(p_user_id);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. RPC: Update Vertical Feature Flags
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.update_vertical_features(
  p_user_id UUID,
  p_enable_lead_scoring BOOLEAN DEFAULT NULL,
  p_enable_proposal_reminders BOOLEAN DEFAULT NULL,
  p_enable_team_dashboard BOOLEAN DEFAULT NULL,
  p_enable_finance_tracking BOOLEAN DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_vertical_settings SET
    enable_lead_scoring = COALESCE(p_enable_lead_scoring, enable_lead_scoring),
    enable_proposal_reminders = COALESCE(p_enable_proposal_reminders, enable_proposal_reminders),
    enable_team_dashboard = COALESCE(p_enable_team_dashboard, enable_team_dashboard),
    enable_finance_tracking = COALESCE(p_enable_finance_tracking, enable_finance_tracking),
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN get_user_vertical_settings(p_user_id);
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. RPC: Complete Vertical Onboarding
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.complete_vertical_onboarding(
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_vertical_settings SET
    onboarding_completed = true,
    updated_at = NOW()
  WHERE user_id = p_user_id;
  
  RETURN FOUND;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. VIEW: User Vertical Overview
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.v_user_vertical_overview AS
SELECT 
  uvs.user_id,
  uvs.vertical_id,
  CASE 
    WHEN uvs.vertical_id = 'custom' THEN uvs.custom_label
    ELSE uvs.vertical_id::TEXT
  END AS vertical_label,
  uvs.company_id,
  uvs.onboarding_completed,
  uvs.enable_lead_scoring,
  uvs.enable_team_dashboard,
  COALESCE(uvs.custom_daily_contacts, 8) AS daily_contacts,
  COALESCE(uvs.custom_daily_followups, 6) AS daily_followups,
  COALESCE(uvs.custom_daily_reactivations, 2) AS daily_reactivations
FROM user_vertical_settings uvs
WHERE uvs.is_active = true;

COMMENT ON VIEW public.v_user_vertical_overview IS 
  'Übersicht der User Vertical Einstellungen';

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE user_vertical_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vertical_settings_select_own" ON user_vertical_settings;
CREATE POLICY "vertical_settings_select_own"
ON user_vertical_settings FOR SELECT
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "vertical_settings_insert_own" ON user_vertical_settings;
CREATE POLICY "vertical_settings_insert_own"
ON user_vertical_settings FOR INSERT
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "vertical_settings_update_own" ON user_vertical_settings;
CREATE POLICY "vertical_settings_update_own"
ON user_vertical_settings FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "vertical_settings_delete_own" ON user_vertical_settings;
CREATE POLICY "vertical_settings_delete_own"
ON user_vertical_settings FOR DELETE
USING (user_id = auth.uid());

-- ═══════════════════════════════════════════════════════════════════════════
-- 11. GRANTS
-- ═══════════════════════════════════════════════════════════════════════════

GRANT ALL ON user_vertical_settings TO authenticated;
GRANT SELECT ON v_user_vertical_overview TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_vertical_settings TO authenticated;
GRANT EXECUTE ON FUNCTION set_user_vertical TO authenticated;
GRANT EXECUTE ON FUNCTION update_vertical_daily_flow TO authenticated;
GRANT EXECUTE ON FUNCTION update_vertical_features TO authenticated;
GRANT EXECUTE ON FUNCTION complete_vertical_onboarding TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- SUCCESS MESSAGE
-- ═══════════════════════════════════════════════════════════════════════════

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔══════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║  ✅ VERTICAL SYSTEM INSTALLED SUCCESSFULLY!                 ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Created Tables:';
  RAISE NOTICE '   • user_vertical_settings (User Branche/Vertical)';
  RAISE NOTICE '';
  RAISE NOTICE '🔧 Created Functions:';
  RAISE NOTICE '   • get_user_vertical_settings() - Einstellungen holen';
  RAISE NOTICE '   • set_user_vertical() - Vertical setzen';
  RAISE NOTICE '   • update_vertical_daily_flow() - Daily Flow anpassen';
  RAISE NOTICE '   • update_vertical_features() - Features aktivieren';
  RAISE NOTICE '   • complete_vertical_onboarding() - Onboarding abschließen';
  RAISE NOTICE '';
  RAISE NOTICE '🏷️ Available Verticals:';
  RAISE NOTICE '   • network_marketing - Network Marketing / MLM';
  RAISE NOTICE '   • real_estate - Immobilien / Makler';
  RAISE NOTICE '   • coaching - Coaching & Beratung';
  RAISE NOTICE '   • finance - Finanzvertrieb';
  RAISE NOTICE '   • insurance - Versicherung';
  RAISE NOTICE '   • solar - Solar / Erneuerbare Energien';
  RAISE NOTICE '   • custom - Eigene Branche';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 RLS enabled - users can only access their own data';
  RAISE NOTICE '';
END $$;


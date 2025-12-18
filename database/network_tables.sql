-- Team/Downline Structure
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    member_name TEXT NOT NULL,
    member_email TEXT,
    member_phone TEXT,
    sponsor_id UUID REFERENCES public.team_members(id), -- Parent in tree
    level INTEGER DEFAULT 1, -- Depth in tree
    rank TEXT DEFAULT 'Starter',
    personal_volume DECIMAL(12,2) DEFAULT 0,
    group_volume DECIMAL(12,2) DEFAULT 0,
    status TEXT DEFAULT 'active', -- active, inactive, prospect
    joined_at DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rank Definitions (per MLM company)
CREATE TABLE IF NOT EXISTS public.rank_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company TEXT, -- Herbalife, doTERRA, Zinzino, etc.
    rank_name TEXT NOT NULL,
    rank_order INTEGER NOT NULL, -- 1=lowest, 10=highest
    pv_required DECIMAL(12,2), -- Personal Volume
    gv_required DECIMAL(12,2), -- Group Volume
    active_legs_required INTEGER,
    bonus_percent DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Settings (vertical, plan, etc.)
CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    vertical TEXT DEFAULT 'network_marketing',
    plan TEXT DEFAULT 'free',
    mlm_company TEXT, -- Which MLM company
    current_rank TEXT,
    personal_volume_monthly DECIMAL(12,2) DEFAULT 0,
    team_volume_monthly DECIMAL(12,2) DEFAULT 0,
    features_enabled JSONB DEFAULT '[]',
    onboarding_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rank_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own team" ON public.team_members;
CREATE POLICY "Users manage own team" ON public.team_members
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own ranks" ON public.rank_definitions;
CREATE POLICY "Users manage own ranks" ON public.rank_definitions
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own settings" ON public.user_settings;
CREATE POLICY "Users manage own settings" ON public.user_settings
    FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_team_user_sponsor ON public.team_members(user_id, sponsor_id);
CREATE INDEX IF NOT EXISTS idx_team_user_status ON public.team_members(user_id, status);

-- Safety: ensure user_id column exists on user_settings (older schema fallback)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_settings'
          AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.user_settings
            ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            ADD CONSTRAINT user_settings_user_id_unique UNIQUE (user_id);
    END IF;
END $$;


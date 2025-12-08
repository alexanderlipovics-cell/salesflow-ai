-- Power Hour Sessions
CREATE TABLE IF NOT EXISTS public.power_hour_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_contacts INTEGER NOT NULL DEFAULT 20,
    goal_messages INTEGER NOT NULL DEFAULT 15,
    contacts_made INTEGER NOT NULL DEFAULT 0,
    messages_sent INTEGER NOT NULL DEFAULT 0,
    duration_minutes INTEGER NOT NULL DEFAULT 60,
    actual_duration_minutes INTEGER,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist (idempotent)
ALTER TABLE public.power_hour_sessions ADD COLUMN IF NOT EXISTS actual_duration_minutes INTEGER;
ALTER TABLE public.power_hour_sessions ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;
ALTER TABLE public.power_hour_sessions ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.power_hour_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add streak columns to user_stats (create if not exists)
CREATE TABLE IF NOT EXISTS public.user_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    power_hour_streak INTEGER DEFAULT 0,
    power_hour_longest_streak INTEGER DEFAULT 0,
    power_hour_last_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS power_hour_streak INTEGER DEFAULT 0;
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS power_hour_longest_streak INTEGER DEFAULT 0;
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS power_hour_last_date DATE;
ALTER TABLE public.user_stats ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- RLS
ALTER TABLE public.power_hour_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- Policies (idempotent via DROP + CREATE)
DROP POLICY IF EXISTS "Users manage own sessions" ON public.power_hour_sessions;
CREATE POLICY "Users manage own sessions" ON public.power_hour_sessions
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own stats" ON public.user_stats;
CREATE POLICY "Users manage own stats" ON public.user_stats
    FOR ALL USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS idx_power_hour_user_active ON public.power_hour_sessions(user_id, is_active);

-- Function to increment streak
CREATE OR REPLACE FUNCTION increment_power_hour_streak(p_user_id UUID)
RETURNS void AS $$
DECLARE
    v_last_date DATE;
    v_current_streak INTEGER;
    v_longest_streak INTEGER;
BEGIN
    -- Get or create user stats
    INSERT INTO public.user_stats (user_id, power_hour_streak, power_hour_longest_streak, power_hour_last_date)
    VALUES (p_user_id, 0, 0, NULL)
    ON CONFLICT (user_id) DO NOTHING;

    SELECT power_hour_last_date, power_hour_streak, power_hour_longest_streak
    INTO v_last_date, v_current_streak, v_longest_streak
    FROM public.user_stats WHERE user_id = p_user_id;

    IF v_last_date IS NULL OR v_last_date < CURRENT_DATE - 1 THEN
        -- Streak broken or first time
        v_current_streak := 1;
    ELSIF v_last_date = CURRENT_DATE - 1 THEN
        -- Continue streak
        v_current_streak := v_current_streak + 1;
    ELSIF v_last_date = CURRENT_DATE THEN
        -- Already counted today
        RETURN;
    END IF;

    -- Update longest streak
    IF v_current_streak > v_longest_streak THEN
        v_longest_streak := v_current_streak;
    END IF;

    UPDATE public.user_stats
    SET power_hour_streak = v_current_streak,
        power_hour_longest_streak = v_longest_streak,
        power_hour_last_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;


-- Follow-up Sequence Templates
CREATE TABLE IF NOT EXISTS public.follow_up_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    total_steps INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sequence Steps
CREATE TABLE IF NOT EXISTS public.sequence_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_id UUID NOT NULL REFERENCES public.follow_up_sequences(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    delay_days INTEGER NOT NULL, -- Days after previous step
    message_template TEXT NOT NULL,
    channel TEXT DEFAULT 'whatsapp', -- whatsapp, email, instagram
    subject TEXT, -- For email
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Leads in Sequences
CREATE TABLE IF NOT EXISTS public.sequence_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    sequence_id UUID NOT NULL REFERENCES public.follow_up_sequences(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    current_step INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active', -- active, paused, completed, replied
    next_action_date DATE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    paused_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Idempotente Spalten-Ergänzungen (falls Tabelle bereits existiert)
ALTER TABLE public.sequence_enrollments ADD COLUMN IF NOT EXISTS next_action_date DATE;
ALTER TABLE public.sequence_enrollments ADD COLUMN IF NOT EXISTS current_step INTEGER DEFAULT 1;
ALTER TABLE public.sequence_enrollments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.sequence_enrollments ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.sequence_enrollments ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;
ALTER TABLE public.sequence_enrollments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- RLS
ALTER TABLE public.follow_up_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sequence_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own sequences" ON public.follow_up_sequences
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own steps" ON public.sequence_steps
    FOR ALL USING (
        sequence_id IN (SELECT id FROM public.follow_up_sequences WHERE user_id = auth.uid())
    );

CREATE POLICY "Users manage own enrollments" ON public.sequence_enrollments
    FOR ALL USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_enrollments_next_action ON public.sequence_enrollments(user_id, next_action_date, status);


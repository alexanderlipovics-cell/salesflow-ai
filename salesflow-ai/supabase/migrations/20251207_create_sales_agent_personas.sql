-- Create sales_agent_personas table for user persona settings
-- Migration: 20251207_create_sales_agent_personas.sql

-- Safe migration: only creates if not exists
DO $$
BEGIN
    -- Create sales_agent_personas table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema = 'public'
                   AND table_name = 'sales_agent_personas') THEN

        CREATE TABLE public.sales_agent_personas (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            persona_key TEXT NOT NULL CHECK (persona_key IN ('speed', 'balanced', 'relationship')),
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(user_id) -- One persona per user
        );

        -- Create indexes
        CREATE INDEX idx_sales_agent_personas_user_id ON public.sales_agent_personas(user_id);
        CREATE INDEX idx_sales_agent_personas_persona_key ON public.sales_agent_personas(persona_key);

        -- Add column comments
        COMMENT ON TABLE public.sales_agent_personas IS 'User-specific AI sales agent persona settings';
        COMMENT ON COLUMN public.sales_agent_personas.persona_key IS 'Persona type: speed (fast/direct), balanced (standard), relationship (warm/contextual)';

        RAISE NOTICE '✅ Created sales_agent_personas table';

    ELSE
        RAISE NOTICE 'ℹ️  sales_agent_personas table already exists';

    END IF;

END $$;

-- Enable Row Level Security
ALTER TABLE public.sales_agent_personas ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can view own persona" ON public.sales_agent_personas
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own persona" ON public.sales_agent_personas
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own persona" ON public.sales_agent_personas
    FOR UPDATE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sales_agent_personas_updated_at
    BEFORE UPDATE ON public.sales_agent_personas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

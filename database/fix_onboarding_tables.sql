-- Direct SQL execution for onboarding tables fix
-- Execute this directly in Supabase SQL Editor if migrations don't work

-- Create sales_agent_personas table if it doesn't exist
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

-- Create sales_company_knowledge table if it doesn't exist
DO $$
BEGIN
    -- Create sales_company_knowledge table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema = 'public'
                   AND table_name = 'sales_company_knowledge') THEN

        CREATE TABLE public.sales_company_knowledge (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            company_name TEXT,
            vision TEXT,
            target_audience TEXT,
            products TEXT,
            pricing TEXT,
            usps TEXT,
            legal_disclaimers TEXT,
            communication_style TEXT,
            no_go_phrases TEXT,
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(user_id) -- One record per user
        );

        -- Create indexes
        CREATE INDEX idx_sales_company_knowledge_user_id ON public.sales_company_knowledge(user_id);

        -- Add column comments
        COMMENT ON TABLE public.sales_company_knowledge IS 'User-specific company knowledge for AI sales agent context';
        COMMENT ON COLUMN public.sales_company_knowledge.company_name IS 'Name of the company/brand';
        COMMENT ON COLUMN public.sales_company_knowledge.vision IS 'Company vision/mission statement';
        COMMENT ON COLUMN public.sales_company_knowledge.target_audience IS 'Description of target customers';
        COMMENT ON COLUMN public.sales_company_knowledge.products IS 'Main products/services offered';
        COMMENT ON COLUMN public.sales_company_knowledge.usps IS 'Unique selling propositions';
        COMMENT ON COLUMN public.sales_company_knowledge.communication_style IS 'Preferred communication style';
        COMMENT ON COLUMN public.sales_company_knowledge.no_go_phrases IS 'Phrases to avoid in communication';

        RAISE NOTICE '✅ Created sales_company_knowledge table';

    ELSE
        RAISE NOTICE 'ℹ️  sales_company_knowledge table already exists';

    END IF;

END $$;

-- Enable Row Level Security for both tables
ALTER TABLE public.sales_agent_personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_company_knowledge ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for sales_agent_personas
CREATE POLICY "Users can view own persona" ON public.sales_agent_personas
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own persona" ON public.sales_agent_personas
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own persona" ON public.sales_agent_personas
    FOR UPDATE USING (auth.uid() = user_id);

-- Create RLS Policies for sales_company_knowledge
CREATE POLICY "Users can view own company knowledge" ON public.sales_company_knowledge
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own company knowledge" ON public.sales_company_knowledge
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own company knowledge" ON public.sales_company_knowledge
    FOR UPDATE USING (auth.uid() = user_id);

-- Create trigger for updated_at (reuse existing function if it exists)
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

CREATE TRIGGER update_sales_company_knowledge_updated_at
    BEFORE UPDATE ON public.sales_company_knowledge
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Verification queries
SELECT 'Onboarding Tables Status:' as status;
SELECT
    table_name,
    CASE
        WHEN table_name = 'sales_agent_personas' THEN '✅ Created - User persona settings'
        WHEN table_name = 'sales_company_knowledge' THEN '✅ Created - Company knowledge storage'
        ELSE 'Unknown table'
    END as description
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('sales_agent_personas', 'sales_company_knowledge')
ORDER BY table_name;

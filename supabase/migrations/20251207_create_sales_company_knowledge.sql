-- Create sales_company_knowledge table for company information storage
-- Migration: 20251207_create_sales_company_knowledge.sql

-- Safe migration: only creates if not exists
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

-- Enable Row Level Security
ALTER TABLE public.sales_company_knowledge ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
CREATE POLICY "Users can view own company knowledge" ON public.sales_company_knowledge
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own company knowledge" ON public.sales_company_knowledge
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own company knowledge" ON public.sales_company_knowledge
    FOR UPDATE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sales_company_knowledge_updated_at
    BEFORE UPDATE ON public.sales_company_knowledge
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

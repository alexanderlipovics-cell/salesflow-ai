-- Create user_business_profile table for goal engine
-- Migration: 20251207_create_user_business_profile.sql

-- Safe migration: only creates if not exists
DO $$
BEGIN
    -- Create user_business_profile table if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables
                   WHERE table_schema = 'public'
                   AND table_name = 'user_business_profile') THEN

        CREATE TABLE public.user_business_profile (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            industry TEXT NOT NULL CHECK (industry IN ('network', 'real_estate', 'finance', 'coaching')),
            product_name TEXT NOT NULL,
            commission_per_deal DECIMAL(10,2) NOT NULL CHECK (commission_per_deal > 0),
            sales_cycle_days INTEGER NOT NULL CHECK (sales_cycle_days > 0),
            conversion_rate_lead_to_meeting DECIMAL(5,2) DEFAULT 0.20 CHECK (conversion_rate_lead_to_meeting >= 0 AND conversion_rate_lead_to_meeting <= 1),
            conversion_rate_meeting_to_deal DECIMAL(5,2) DEFAULT 0.50 CHECK (conversion_rate_meeting_to_deal >= 0 AND conversion_rate_meeting_to_deal <= 1),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Create indexes
        CREATE INDEX idx_user_business_profile_user_id ON public.user_business_profile(user_id);
        CREATE INDEX idx_user_business_profile_industry ON public.user_business_profile(industry);

        -- Add column comments
        COMMENT ON TABLE public.user_business_profile IS 'Business profile for goal engine calculations';
        COMMENT ON COLUMN public.user_business_profile.conversion_rate_lead_to_meeting IS 'Lead to meeting conversion rate (0.0-1.0)';
        COMMENT ON COLUMN public.user_business_profile.conversion_rate_meeting_to_deal IS 'Meeting to deal conversion rate (0.0-1.0)';

        RAISE NOTICE '✅ Created user_business_profile table';

    ELSE
        -- Check if conversion_rate_lead_to_meeting column exists, add if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'user_business_profile'
                       AND column_name = 'conversion_rate_lead_to_meeting') THEN

            ALTER TABLE public.user_business_profile
            ADD COLUMN conversion_rate_lead_to_meeting DECIMAL(5,2) DEFAULT 0.20 CHECK (conversion_rate_lead_to_meeting >= 0 AND conversion_rate_lead_to_meeting <= 1);

            COMMENT ON COLUMN public.user_business_profile.conversion_rate_lead_to_meeting IS 'Lead to meeting conversion rate (0.0-1.0)';

            RAISE NOTICE '✅ Added conversion_rate_lead_to_meeting column';

        END IF;

        -- Check if conversion_rate_meeting_to_deal column exists, add if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_name = 'user_business_profile'
                       AND column_name = 'conversion_rate_meeting_to_deal') THEN

            ALTER TABLE public.user_business_profile
            ADD COLUMN conversion_rate_meeting_to_deal DECIMAL(5,2) DEFAULT 0.50 CHECK (conversion_rate_meeting_to_deal >= 0 AND conversion_rate_meeting_to_deal <= 1);

            COMMENT ON COLUMN public.user_business_profile.conversion_rate_meeting_to_deal IS 'Meeting to deal conversion rate (0.0-1.0)';

            RAISE NOTICE '✅ Added conversion_rate_meeting_to_deal column';

        END IF;

        RAISE NOTICE 'ℹ️  user_business_profile table already exists, checked for missing columns';

    END IF;

END $$;

-- Enable Row Level Security
ALTER TABLE public.user_business_profile ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies (adjust as needed for your auth setup)
-- TODO: Enable these policies once auth is fully configured
-- CREATE POLICY "Users can view own profile" ON public.user_business_profile
--     FOR SELECT USING (auth.uid() = user_id);
--
-- CREATE POLICY "Users can insert own profile" ON public.user_business_profile
--     FOR INSERT WITH CHECK (auth.uid() = user_id);
--
-- CREATE POLICY "Users can update own profile" ON public.user_business_profile
--     FOR UPDATE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_business_profile_updated_at
    BEFORE UPDATE ON public.user_business_profile
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

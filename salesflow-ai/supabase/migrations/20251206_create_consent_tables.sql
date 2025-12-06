-- supabase/migrations/20251206_create_consent_tables.sql

-- Create consent_records table for GDPR compliance
CREATE TABLE public.consent_records (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    consent_data JSONB NOT NULL,
    consent_hash VARCHAR(64) NOT NULL,
    consent_version VARCHAR(16) NOT NULL DEFAULT '1.0',
    ip_address INET NOT NULL,
    user_agent TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create index for user lookup
CREATE INDEX idx_consent_records_user_id ON public.consent_records (user_id);
CREATE INDEX idx_consent_records_created_at ON public.consent_records (created_at DESC);

-- Create cookie_categories table for cookie management
CREATE TABLE public.cookie_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(32) NOT NULL UNIQUE,
    description TEXT NOT NULL,
    required BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Insert default cookie categories
INSERT INTO public.cookie_categories (name, description, required) VALUES
('strictly_necessary', 'Essential for website function', true),
('functional', 'Improves user experience', false),
('analytics', 'Tracks usage for analytics', false),
('marketing', 'Used for advertising/marketing', false),
('preferences', 'Remembers user preferences', false),
('social_media', 'Social media integration', false);

-- Enable RLS
ALTER TABLE public.consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cookie_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for consent_records
CREATE POLICY "Users can view their own consent records"
    ON public.consent_records FOR SELECT
    USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own consent records"
    ON public.consent_records FOR INSERT
    WITH CHECK (auth.uid()::text = user_id);

-- RLS Policies for cookie_categories (read-only for all authenticated users)
CREATE POLICY "Authenticated users can view cookie categories"
    ON public.cookie_categories FOR SELECT
    TO authenticated
    USING (true);

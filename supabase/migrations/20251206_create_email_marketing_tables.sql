-- supabase/migrations/20251206_create_email_marketing_tables.sql

-- Create email_campaigns table
CREATE TABLE public.email_campaigns (
    id SERIAL PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    template VARCHAR(64) NOT NULL,
    status VARCHAR(16) DEFAULT 'draft',
    audience_size INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    open_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    scheduled_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Create email_sends table for tracking individual sends
CREATE TABLE public.email_sends (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL,
    campaign VARCHAR(64) NOT NULL,
    template VARCHAR(64) NOT NULL,
    message_id VARCHAR(128) NOT NULL,
    subject VARCHAR(256) NOT NULL,
    status VARCHAR(16) DEFAULT 'sent',
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    unsubscribed BOOLEAN DEFAULT FALSE
);

-- Create indexes for performance
CREATE INDEX idx_email_campaigns_status ON public.email_campaigns (status);
CREATE INDEX idx_email_campaigns_created_at ON public.email_campaigns (created_at DESC);
CREATE INDEX idx_email_sends_user_id ON public.email_sends (user_id);
CREATE INDEX idx_email_sends_campaign ON public.email_sends (campaign);
CREATE INDEX idx_email_sends_sent_at ON public.email_sends (sent_at DESC);

-- Enable RLS
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sends ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_campaigns (admin only)
CREATE POLICY "Admins can manage email campaigns"
    ON public.email_campaigns FOR ALL
    TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin');

-- RLS Policies for email_sends (users can view their own)
CREATE POLICY "Users can view their own email sends"
    ON public.email_sends FOR SELECT
    TO authenticated
    USING (auth.uid()::text = user_id);

-- Insert sample data
INSERT INTO public.email_campaigns (name, template, status) VALUES
('Welcome Sequence', 'welcome', 'active'),
('Feature Updates', 'feature_highlight', 'active'),
('Re-engagement', 'reengagement', 'draft');

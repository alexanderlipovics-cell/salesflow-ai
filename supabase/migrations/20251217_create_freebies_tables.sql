-- ============================================================================
-- FREEBIES / LEAD MAGNET SYSTEM
-- Vifugo-Style: User erstellen Freebies, bekommen Landing Page URL, Leads werden automatisch erfasst
-- ============================================================================

-- Freebies Table
CREATE TABLE IF NOT EXISTS freebies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    
    -- Content
    title TEXT NOT NULL,
    description TEXT,
    file_url TEXT NOT NULL,
    file_type TEXT DEFAULT 'pdf' CHECK (file_type IN ('pdf', 'video', 'zip', 'other')),
    thumbnail_url TEXT,
    
    -- Landing Page Settings
    slug TEXT NOT NULL UNIQUE,
    headline TEXT,
    subheadline TEXT,
    button_text TEXT DEFAULT 'Jetzt herunterladen',
    thank_you_message TEXT DEFAULT 'Danke! Check deine Emails.',
    
    -- Form Fields
    collect_phone BOOLEAN DEFAULT false,
    collect_company BOOLEAN DEFAULT false,
    
    -- Follow-up Settings
    follow_up_enabled BOOLEAN DEFAULT true,
    follow_up_delay_hours INTEGER DEFAULT 24,
    follow_up_message TEXT,
    
    -- Stats
    view_count INTEGER DEFAULT 0,
    download_count INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Freebie Leads Table
CREATE TABLE IF NOT EXISTS freebie_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    freebie_id UUID NOT NULL REFERENCES freebies(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    
    -- Contact Info
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    company TEXT,
    
    -- Tracking
    ip_address TEXT,
    user_agent TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    referrer TEXT,
    
    -- Timestamps
    downloaded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_freebies_user ON freebies(user_id);
CREATE INDEX IF NOT EXISTS idx_freebies_slug ON freebies(slug);
CREATE INDEX IF NOT EXISTS idx_freebies_active ON freebies(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_freebie_leads_freebie ON freebie_leads(freebie_id);
CREATE INDEX IF NOT EXISTS idx_freebie_leads_email ON freebie_leads(email);
CREATE INDEX IF NOT EXISTS idx_freebie_leads_lead ON freebie_leads(lead_id);

-- RLS (Row Level Security)
ALTER TABLE freebies ENABLE ROW LEVEL SECURITY;
ALTER TABLE freebie_leads ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only see their own freebies
CREATE POLICY "Users can view their own freebies"
    ON freebies FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own freebies"
    ON freebies FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own freebies"
    ON freebies FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own freebies"
    ON freebies FOR DELETE
    USING (auth.uid() = user_id);

-- Policies: Users can only see leads for their own freebies
CREATE POLICY "Users can view leads for their freebies"
    ON freebie_leads FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM freebies
            WHERE freebies.id = freebie_leads.freebie_id
            AND freebies.user_id = auth.uid()
        )
    );

-- Public access for lead capture (no auth required)
-- Note: This allows public inserts, but we'll handle auth in the backend
CREATE POLICY "Public can insert freebie leads"
    ON freebie_leads FOR INSERT
    WITH CHECK (true);

-- Comments
COMMENT ON TABLE freebies IS 'Lead magnets / freebies created by users';
COMMENT ON TABLE freebie_leads IS 'Leads captured from freebie landing pages';
COMMENT ON COLUMN freebies.slug IS 'URL-friendly identifier for landing page (e.g., "ultimate-guide-abc123")';
COMMENT ON COLUMN freebies.view_count IS 'Number of times landing page was viewed';
COMMENT ON COLUMN freebies.download_count IS 'Number of leads captured/downloads';
COMMENT ON COLUMN freebie_leads.lead_id IS 'Link to main leads table if lead was created in CRM';


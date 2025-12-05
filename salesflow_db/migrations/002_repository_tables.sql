-- ============================================================================
-- SalesFlow AI - Database Schema for Repository Pattern
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- Leads Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Contact Info
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    company VARCHAR(200),
    job_title VARCHAR(200),
    
    -- Lead Data
    status VARCHAR(20) NOT NULL DEFAULT 'new'
        CHECK (status IN ('new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost', 'archived')),
    source VARCHAR(20) NOT NULL DEFAULT 'other'
        CHECK (source IN ('website', 'referral', 'linkedin', 'cold_outreach', 'trade_show', 'advertising', 'other')),
    priority VARCHAR(20) NOT NULL DEFAULT 'medium'
        CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),
    
    -- Assignment
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Tracking
    last_contacted_at TIMESTAMPTZ,
    next_follow_up TIMESTAMPTZ,
    
    -- Value
    estimated_value DECIMAL(15, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Notes & Tags
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    custom_fields JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ  -- Soft delete
);

-- Indexes
CREATE UNIQUE INDEX idx_leads_email ON leads(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_status ON leads(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_assigned_to ON leads(assigned_to) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_priority ON leads(priority) WHERE deleted_at IS NULL;
CREATE INDEX idx_leads_next_follow_up ON leads(next_follow_up) WHERE deleted_at IS NULL AND next_follow_up IS NOT NULL;
CREATE INDEX idx_leads_created_at ON leads(created_at);
CREATE INDEX idx_leads_tags ON leads USING GIN(tags);

-- ============================================================================
-- Contacts Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Association
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    
    -- Contact Info
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(50),
    mobile VARCHAR(50),
    
    -- Role
    job_title VARCHAR(200),
    department VARCHAR(100),
    contact_type VARCHAR(20) NOT NULL DEFAULT 'primary'
        CHECK (contact_type IN ('primary', 'secondary', 'billing', 'technical', 'decision_maker')),
    is_primary BOOLEAN DEFAULT false,
    
    -- Preferences
    preferred_contact_method VARCHAR(50),
    timezone VARCHAR(50),
    language VARCHAR(10) DEFAULT 'en',
    
    -- Social
    linkedin_url VARCHAR(500),
    twitter_handle VARCHAR(100),
    
    -- Notes
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- Indexes
CREATE UNIQUE INDEX idx_contacts_lead_email ON contacts(lead_id, email) WHERE deleted_at IS NULL;
CREATE INDEX idx_contacts_lead_id ON contacts(lead_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_contacts_email ON contacts(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_contacts_is_primary ON contacts(lead_id, is_primary) WHERE is_primary = true AND deleted_at IS NULL;

-- ============================================================================
-- Message Events Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS message_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Associations
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    campaign_id UUID,  -- Reference to campaigns table if exists
    template_id UUID,  -- Reference to templates table if exists
    
    -- Message Details
    channel VARCHAR(20) NOT NULL
        CHECK (channel IN ('email', 'sms', 'whatsapp', 'linkedin', 'phone', 'meeting', 'other')),
    direction VARCHAR(10) NOT NULL
        CHECK (direction IN ('outbound', 'inbound')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'failed', 'spam', 'unsubscribed')),
    
    -- Content
    subject VARCHAR(500),
    body TEXT,
    body_html TEXT,
    
    -- External Reference
    external_id VARCHAR(255),  -- ID from SendGrid, Twilio, etc.
    metadata JSONB DEFAULT '{}',
    
    -- Tracking Timestamps
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    
    -- Error Handling
    error_code VARCHAR(50),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Analytics
    open_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    
    -- Sender
    sent_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_message_events_lead_id ON message_events(lead_id);
CREATE INDEX idx_message_events_contact_id ON message_events(contact_id);
CREATE INDEX idx_message_events_campaign_id ON message_events(campaign_id);
CREATE INDEX idx_message_events_channel ON message_events(channel);
CREATE INDEX idx_message_events_status ON message_events(status);
CREATE INDEX idx_message_events_external_id ON message_events(external_id) WHERE external_id IS NOT NULL;
CREATE INDEX idx_message_events_created_at ON message_events(created_at);
CREATE INDEX idx_message_events_sent_at ON message_events(sent_at);

-- ============================================================================
-- Trigger: Update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DROP TRIGGER IF EXISTS update_leads_updated_at ON leads;
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_message_events_updated_at ON message_events;
CREATE TRIGGER update_message_events_updated_at
    BEFORE UPDATE ON message_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Row Level Security
-- ============================================================================
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_events ENABLE ROW LEVEL SECURITY;

-- Policies for service role (full access)
CREATE POLICY "Service role full access to leads"
    ON leads FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to contacts"
    ON contacts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access to message_events"
    ON message_events FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE leads IS 'Sales leads with lifecycle tracking';
COMMENT ON TABLE contacts IS 'Individual contacts associated with leads';
COMMENT ON TABLE message_events IS 'Message delivery and engagement tracking';

COMMENT ON COLUMN leads.status IS 'Lead lifecycle status';
COMMENT ON COLUMN leads.score IS 'Lead quality score (0-100)';
COMMENT ON COLUMN leads.deleted_at IS 'Soft delete timestamp';

COMMENT ON COLUMN contacts.is_primary IS 'Primary contact for the lead';
COMMENT ON COLUMN contacts.contact_type IS 'Role/type of contact';

COMMENT ON COLUMN message_events.external_id IS 'ID from external email/SMS service';
COMMENT ON COLUMN message_events.metadata IS 'Additional tracking data (clicks, etc.)';

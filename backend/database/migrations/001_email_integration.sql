-- =====================================================
-- EMAIL INTEGRATION TABLES
-- Gmail & Outlook/Exchange Integration
-- =====================================================

-- OAuth States (for CSRF protection)
CREATE TABLE IF NOT EXISTS oauth_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    state TEXT NOT NULL,
    provider TEXT NOT NULL, -- 'gmail' or 'outlook'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '10 minutes',
    
    INDEX idx_oauth_states_user_provider (user_id, provider),
    INDEX idx_oauth_states_state (state)
);

-- Email Accounts
CREATE TABLE IF NOT EXISTS email_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- 'gmail' or 'outlook'
    email_address TEXT NOT NULL,
    display_name TEXT,
    
    -- OAuth Tokens
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    
    -- Sync Status
    sync_enabled BOOLEAN DEFAULT TRUE,
    sync_status TEXT DEFAULT 'active', -- 'active', 'error', 'paused'
    sync_error TEXT,
    last_sync_at TIMESTAMPTZ,
    total_emails_synced INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE (user_id, email_address),
    INDEX idx_email_accounts_user (user_id),
    INDEX idx_email_accounts_provider (provider)
);

-- Email Messages
CREATE TABLE IF NOT EXISTS email_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_account_id UUID NOT NULL REFERENCES email_accounts(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    
    -- Message IDs
    message_id TEXT UNIQUE NOT NULL, -- Provider's message ID
    thread_id TEXT, -- Email thread ID
    
    -- Email Headers
    from_address TEXT NOT NULL,
    to_addresses TEXT[] NOT NULL,
    cc_addresses TEXT[],
    bcc_addresses TEXT[],
    subject TEXT,
    
    -- Body
    body_text TEXT,
    body_html TEXT,
    
    -- Metadata
    direction TEXT NOT NULL, -- 'inbound' or 'outbound'
    is_read BOOLEAN DEFAULT FALSE,
    is_starred BOOLEAN DEFAULT FALSE,
    has_attachments BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    sent_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    INDEX idx_email_messages_account (email_account_id),
    INDEX idx_email_messages_lead (lead_id),
    INDEX idx_email_messages_direction (direction),
    INDEX idx_email_messages_sent_at (sent_at DESC)
);

-- Email Attachments
CREATE TABLE IF NOT EXISTS email_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email_message_id UUID NOT NULL REFERENCES email_messages(id) ON DELETE CASCADE,
    
    filename TEXT NOT NULL,
    content_type TEXT,
    file_size INTEGER,
    file_path TEXT, -- S3 path or local path
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    INDEX idx_email_attachments_message (email_message_id)
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_email_accounts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_email_accounts_updated_at
    BEFORE UPDATE ON email_accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_email_accounts_updated_at();

-- Comments
COMMENT ON TABLE oauth_states IS 'Temporary OAuth states for CSRF protection';
COMMENT ON TABLE email_accounts IS 'Connected email accounts (Gmail, Outlook)';
COMMENT ON TABLE email_messages IS 'Synced email messages';
COMMENT ON TABLE email_attachments IS 'Email attachments';


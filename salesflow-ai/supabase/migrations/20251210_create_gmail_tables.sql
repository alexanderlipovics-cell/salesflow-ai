-- Gmail Integration Tables

-- Email Accounts (connected Gmail accounts)
CREATE TABLE IF NOT EXISTS email_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT DEFAULT 'google',
    email TEXT NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, email)
);

-- Emails (synchronized emails)
CREATE TABLE IF NOT EXISTS emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email_account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE,
    gmail_id TEXT UNIQUE,
    thread_id TEXT,
    subject TEXT,
    snippet TEXT,
    body_text TEXT,
    body_html TEXT,
    from_email TEXT,
    from_name TEXT,
    to_emails TEXT[],
    cc_emails TEXT[],
    bcc_emails TEXT[],
    labels TEXT[],
    is_read BOOLEAN DEFAULT false,
    is_sent BOOLEAN DEFAULT false,
    is_draft BOOLEAN DEFAULT false,
    has_attachments BOOLEAN DEFAULT false,
    received_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL
);

-- Email Threads
CREATE TABLE IF NOT EXISTS email_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    gmail_thread_id TEXT UNIQUE,
    subject TEXT,
    snippet TEXT,
    message_count INTEGER DEFAULT 1,
    last_message_at TIMESTAMPTZ,
    participants TEXT[],
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_emails_user_id ON emails(user_id);
CREATE INDEX IF NOT EXISTS idx_emails_lead_id ON emails(lead_id) WHERE lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_emails_gmail_id ON emails(gmail_id);
CREATE INDEX IF NOT EXISTS idx_emails_from_email ON emails(from_email);
CREATE INDEX IF NOT EXISTS idx_email_threads_lead_id ON email_threads(lead_id) WHERE lead_id IS NOT NULL;

-- Enable RLS
ALTER TABLE email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_threads ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own email accounts" ON email_accounts
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own emails" ON emails
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own threads" ON email_threads
    FOR ALL USING (auth.uid() = user_id);


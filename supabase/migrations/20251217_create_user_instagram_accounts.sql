-- Create user_instagram_accounts table for storing Instagram OAuth connections
CREATE TABLE IF NOT EXISTS user_instagram_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    instagram_user_id TEXT NOT NULL,
    instagram_username TEXT,
    access_token TEXT NOT NULL,
    token_expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint: one active connection per user per Instagram account
    UNIQUE(user_id, instagram_user_id)
);

-- Index für schnelle Suche
CREATE INDEX IF NOT EXISTS idx_user_instagram_accounts_user ON user_instagram_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_instagram_accounts_active ON user_instagram_accounts(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_instagram_accounts_instagram_id ON user_instagram_accounts(instagram_user_id);

-- RLS deaktivieren für jetzt (OAuth callbacks brauchen Service Role)
ALTER TABLE user_instagram_accounts DISABLE ROW LEVEL SECURITY;

-- Permissions
GRANT ALL ON user_instagram_accounts TO anon, authenticated, service_role;

-- Kommentare
COMMENT ON TABLE user_instagram_accounts IS 'Stores Instagram OAuth connections for users';
COMMENT ON COLUMN user_instagram_accounts.instagram_user_id IS 'Instagram user ID from Meta API';
COMMENT ON COLUMN user_instagram_accounts.instagram_username IS 'Instagram username (@handle)';
COMMENT ON COLUMN user_instagram_accounts.access_token IS 'Instagram access token (encrypted in production)';
COMMENT ON COLUMN user_instagram_accounts.token_expires_at IS 'When the access token expires (long-lived tokens: 60 days)';
COMMENT ON COLUMN user_instagram_accounts.is_active IS 'Whether this connection is active';


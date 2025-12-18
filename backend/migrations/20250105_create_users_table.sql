-- Migration: Create users table for JWT Authentication
-- Date: 2025-01-05
-- Description: User authentication and account management

-- ============================================================================
-- CREATE USERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    company VARCHAR(200),
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    last_login TIMESTAMPTZ,
    
    -- Constraints
    CONSTRAINT users_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
    CONSTRAINT users_role_check CHECK (role IN ('user', 'admin', 'superadmin'))
);

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- ============================================================================
-- CREATE TOKEN BLACKLIST TABLE (for logout functionality)
-- ============================================================================

CREATE TABLE IF NOT EXISTS token_blacklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_jti VARCHAR(255) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blacklisted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    
    -- Indexes
    CONSTRAINT token_blacklist_token_jti_key UNIQUE (token_jti)
);

CREATE INDEX IF NOT EXISTS idx_token_blacklist_user_id ON token_blacklist(user_id);
CREATE INDEX IF NOT EXISTS idx_token_blacklist_expires_at ON token_blacklist(expires_at);

-- ============================================================================
-- CREATE FUNCTION: Update updated_at timestamp
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CREATE TRIGGER: Auto-update updated_at on users table
-- ============================================================================

DROP TRIGGER IF EXISTS update_users_updated_at ON users;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_blacklist ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own data
CREATE POLICY users_select_own
    ON users
    FOR SELECT
    USING (id = auth.uid() OR role = 'admin');

-- Policy: Users can update their own data
CREATE POLICY users_update_own
    ON users
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Policy: Admins can manage all users
CREATE POLICY users_admin_all
    ON users
    FOR ALL
    USING (auth.jwt()->>'role' = 'admin');

-- Policy: Public can insert (signup)
CREATE POLICY users_insert_public
    ON users
    FOR INSERT
    WITH CHECK (true);

-- ============================================================================
-- INSERT DEFAULT ADMIN USER (optional - for development)
-- ============================================================================

-- Password: Admin123! (change this in production!)
-- Hash generated with bcrypt

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@salesflow-ai.com') THEN
        INSERT INTO users (
            id,
            email,
            password_hash,
            name,
            company,
            role,
            is_active,
            created_at
        ) VALUES (
            gen_random_uuid(),
            'admin@salesflow-ai.com',
            '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYk8fHm.Gzi',  -- Admin123!
            'Admin User',
            'SalesFlow AI',
            'admin',
            true,
            NOW()
        );
    END IF;
END
$$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE users IS 'User accounts for authentication and authorization';
COMMENT ON COLUMN users.id IS 'Unique user identifier (UUID)';
COMMENT ON COLUMN users.email IS 'User email address (unique, used for login)';
COMMENT ON COLUMN users.password_hash IS 'Bcrypt hashed password';
COMMENT ON COLUMN users.name IS 'User full name';
COMMENT ON COLUMN users.company IS 'Company or organization name';
COMMENT ON COLUMN users.role IS 'User role: user, admin, superadmin';
COMMENT ON COLUMN users.is_active IS 'Whether the account is active';
COMMENT ON COLUMN users.created_at IS 'Account creation timestamp';
COMMENT ON COLUMN users.updated_at IS 'Last update timestamp (auto-updated)';
COMMENT ON COLUMN users.last_login IS 'Last successful login timestamp';

COMMENT ON TABLE token_blacklist IS 'Blacklisted JWT tokens (for logout)';
COMMENT ON COLUMN token_blacklist.token_jti IS 'JWT token ID (jti claim)';
COMMENT ON COLUMN token_blacklist.user_id IS 'User who owns the token';
COMMENT ON COLUMN token_blacklist.blacklisted_at IS 'When the token was blacklisted';
COMMENT ON COLUMN token_blacklist.expires_at IS 'When the token expires naturally';

-- ============================================================================
-- CLEANUP FUNCTION: Remove expired tokens from blacklist
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM token_blacklist WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (run daily via cron or manually)
-- CALL: SELECT cleanup_expired_tokens();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify tables created
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users', 'token_blacklist');

-- Verify indexes
-- SELECT indexname FROM pg_indexes WHERE tablename IN ('users', 'token_blacklist');

-- Verify default admin user
-- SELECT id, email, name, role, is_active FROM users WHERE role = 'admin';

-- ============================================================================
-- ROLLBACK (if needed)
-- ============================================================================

-- DROP TABLE IF EXISTS token_blacklist CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;
-- DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
-- DROP FUNCTION IF EXISTS cleanup_expired_tokens CASCADE;


-- Sicherstellen, dass Token-Spalten vorhanden sind (idempotent)
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS access_token TEXT;
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS refresh_token TEXT;
ALTER TABLE email_accounts ADD COLUMN IF NOT EXISTS token_expires_at TIMESTAMPTZ;


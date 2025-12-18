-- Create Instagram Messages table for storing DM events
CREATE TABLE IF NOT EXISTS instagram_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instagram_sender_id TEXT NOT NULL,
    instagram_recipient_id TEXT,
    message_id TEXT,
    message_text TEXT,
    timestamp TEXT,
    direction TEXT DEFAULT 'inbound',
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    user_id UUID,
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index für schnelle Suche
CREATE INDEX IF NOT EXISTS idx_instagram_messages_sender ON instagram_messages(instagram_sender_id);
CREATE INDEX IF NOT EXISTS idx_instagram_messages_lead ON instagram_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_instagram_messages_user ON instagram_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_instagram_messages_processed ON instagram_messages(processed) WHERE processed = false;

-- RLS deaktivieren für jetzt (Webhooks brauchen Service Role)
ALTER TABLE instagram_messages DISABLE ROW LEVEL SECURITY;

-- Permissions
GRANT ALL ON instagram_messages TO anon, authenticated, service_role;

-- Kommentare
COMMENT ON TABLE instagram_messages IS 'Stores Instagram DM messages from webhook events';
COMMENT ON COLUMN instagram_messages.instagram_sender_id IS 'Instagram user ID of the sender';
COMMENT ON COLUMN instagram_messages.instagram_recipient_id IS 'Instagram user ID of the recipient (our business account)';
COMMENT ON COLUMN instagram_messages.message_id IS 'Instagram message ID (mid)';
COMMENT ON COLUMN instagram_messages.direction IS 'inbound or outbound';
COMMENT ON COLUMN instagram_messages.processed IS 'Whether the message has been processed (e.g., AI response sent)';


-- ============================================================================
-- MESSAGING TABLES (SMS & WhatsApp via Twilio)
-- ============================================================================

-- Message Logs
CREATE TABLE IF NOT EXISTS message_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    lead_id UUID REFERENCES leads(id),
    sequence_action_id UUID,
    
    -- Message Details
    channel VARCHAR(20) NOT NULL DEFAULT 'sms', -- sms, whatsapp
    direction VARCHAR(10) DEFAULT 'outbound', -- outbound, inbound
    from_number VARCHAR(50),
    to_number VARCHAR(50),
    body TEXT,
    media_url TEXT,
    
    -- Twilio
    message_sid VARCHAR(100),
    status VARCHAR(20) DEFAULT 'queued',
    error_code VARCHAR(10),
    error_message TEXT,
    
    -- Cost
    cost DECIMAL(10, 4),
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_message_logs_user_id ON message_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_lead_id ON message_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_message_logs_message_sid ON message_logs(message_sid);
CREATE INDEX IF NOT EXISTS idx_message_logs_channel ON message_logs(channel);
CREATE INDEX IF NOT EXISTS idx_message_logs_created_at ON message_logs(created_at DESC);

-- RLS
ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages" ON message_logs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages" ON message_logs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own messages" ON message_logs
    FOR UPDATE USING (auth.uid() = user_id);


-- ============================================================================
-- TWILIO SETTINGS (User-Level)
-- ============================================================================

CREATE TABLE IF NOT EXISTS twilio_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) UNIQUE,
    
    -- Credentials (encrypted in production)
    account_sid VARCHAR(100),
    auth_token_encrypted TEXT, -- Should be encrypted
    
    -- Phone Numbers
    phone_number VARCHAR(50),
    whatsapp_number VARCHAR(50),
    
    -- Limits
    daily_sms_limit INTEGER DEFAULT 100,
    daily_whatsapp_limit INTEGER DEFAULT 50,
    sms_sent_today INTEGER DEFAULT 0,
    whatsapp_sent_today INTEGER DEFAULT 0,
    last_reset_daily TIMESTAMPTZ,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE twilio_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own twilio settings" ON twilio_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own twilio settings" ON twilio_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own twilio settings" ON twilio_settings
    FOR UPDATE USING (auth.uid() = user_id);


-- ============================================================================
-- SMS/WHATSAPP TEMPLATES (Separate from email templates)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sms_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    
    -- Template
    name VARCHAR(100) NOT NULL,
    channel VARCHAR(20) NOT NULL DEFAULT 'sms', -- sms, whatsapp
    category VARCHAR(50), -- follow_up, reminder, engagement, value
    body TEXT NOT NULL,
    
    -- Metadata
    variables TEXT[], -- ['first_name', 'company', etc.]
    is_default BOOLEAN DEFAULT false,
    usage_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sms templates" ON sms_templates
    FOR SELECT USING (auth.uid() = user_id OR is_default = true);

CREATE POLICY "Users can insert own sms templates" ON sms_templates
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sms templates" ON sms_templates
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sms templates" ON sms_templates
    FOR DELETE USING (auth.uid() = user_id AND is_default = false);


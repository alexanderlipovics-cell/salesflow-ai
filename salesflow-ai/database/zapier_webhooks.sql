-- Zapier webhook subscriptions
CREATE TABLE zapier_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger_type VARCHAR(50) NOT NULL, -- 'new_lead', 'lead_status_changed', 'deal_won', 'task_completed'
  target_url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_triggered_at TIMESTAMPTZ,
  UNIQUE(user_id, trigger_type, target_url)
);

-- API keys for Zapier authentication
CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash VARCHAR(64) NOT NULL, -- SHA256 hash
  key_prefix VARCHAR(8) NOT NULL, -- First 8 chars for identification
  name VARCHAR(100) DEFAULT 'Zapier',
  scopes TEXT[] DEFAULT ARRAY['leads:read', 'leads:write', 'deals:read', 'deals:write'],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
);

-- Webhook delivery log
CREATE TABLE webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID REFERENCES zapier_webhooks(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  response_status INT,
  response_body TEXT,
  delivered_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webhooks_user ON zapier_webhooks(user_id);
CREATE INDEX idx_webhooks_trigger ON zapier_webhooks(trigger_type);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);


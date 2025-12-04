-- ═══════════════════════════════════════════════════════════════════════════
-- SUBSCRIPTIONS TABLE
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Tabelle für User-Abonnements (Stripe Integration)
-- 
-- Migration:
-- 1. Führe dieses SQL in Supabase SQL Editor aus
-- 2. Oder nutze Supabase Migration Tool
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Stripe IDs
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    
    -- Plan Info
    plan TEXT NOT NULL DEFAULT 'free', -- 'free', 'starter', 'growth', 'scale', 'founding_member'
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'canceled', 'past_due', 'trialing', etc.
    billing_cycle TEXT, -- 'monthly', 'yearly', 'one_time'
    
    -- Dates
    current_period_end TIMESTAMPTZ,
    cancel_at TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_user_subscription UNIQUE(user_id),
    CONSTRAINT valid_plan CHECK (plan IN ('free', 'starter', 'growth', 'scale', 'founding_member')),
    CONSTRAINT valid_status CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'incomplete', 'incomplete_expired', 'unpaid'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Updated At Trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users können nur ihre eigene Subscription sehen
CREATE POLICY "Users can view own subscription"
    ON subscriptions
    FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Service Role kann alles
CREATE POLICY "Service role can manage subscriptions"
    ON subscriptions
    FOR ALL
    USING (auth.role() = 'service_role');

-- ═══════════════════════════════════════════════════════════════════════════
-- COMMENTS
-- ═══════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE subscriptions IS 'User-Abonnements für Stripe Payment Integration';
COMMENT ON COLUMN subscriptions.plan IS 'Plan-Typ: free, starter, growth, scale, founding_member';
COMMENT ON COLUMN subscriptions.status IS 'Subscription Status: active, canceled, past_due, etc.';
COMMENT ON COLUMN subscriptions.billing_cycle IS 'Billing-Zyklus: monthly, yearly, one_time';


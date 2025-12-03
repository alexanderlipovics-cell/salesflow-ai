-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  BILLING SYSTEM - Database Schema                                          ║
-- ║  Stripe Integration für Subscriptions & Usage Tracking                     ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════════════════
-- PROFILES UPDATE - Stripe Customer ID
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_plan ON profiles(plan);


-- ═══════════════════════════════════════════════════════════════════════════
-- SUBSCRIPTIONS TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT UNIQUE NOT NULL,
    stripe_customer_id TEXT NOT NULL,
    
    -- Plan Info
    plan TEXT NOT NULL DEFAULT 'basic',
    status TEXT NOT NULL DEFAULT 'active',  -- active, past_due, canceled, trialing
    
    -- Billing Period
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    
    -- Cancellation
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    canceled_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id)  -- Ein User hat max eine aktive Subscription
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- SUBSCRIPTION ITEMS (Add-Ons)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS subscription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id TEXT NOT NULL,  -- Stripe Subscription ID
    stripe_item_id TEXT UNIQUE NOT NULL,
    addon_id TEXT NOT NULL,  -- autopilot_pro, finance_starter, etc.
    price_id TEXT NOT NULL,  -- Stripe Price ID
    
    quantity INTEGER DEFAULT 1,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subscription_items_sub ON subscription_items(subscription_id);
CREATE INDEX idx_subscription_items_addon ON subscription_items(addon_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- USAGE RECORDS (für Metered Billing & Limit Tracking)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    feature TEXT NOT NULL,  -- ai_analyses, auto_actions, chats_import, etc.
    quantity INTEGER DEFAULT 1,
    
    -- Metadata
    context JSONB DEFAULT '{}',  -- Lead ID, Chat ID, etc.
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_usage_user ON usage_records(user_id);
CREATE INDEX idx_usage_feature ON usage_records(feature);
CREATE INDEX idx_usage_created ON usage_records(created_at);
CREATE INDEX idx_usage_user_feature_month ON usage_records(user_id, feature, created_at);


-- ═══════════════════════════════════════════════════════════════════════════
-- INVOICES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_invoice_id TEXT UNIQUE NOT NULL,
    
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'eur',
    status TEXT NOT NULL,  -- paid, open, void, uncollectible
    
    invoice_pdf TEXT,  -- URL zum PDF
    
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_user ON invoices(user_id);
CREATE INDEX idx_invoices_status ON invoices(status);


-- ═══════════════════════════════════════════════════════════════════════════
-- PAYMENT METHODS (Cached from Stripe)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    stripe_payment_method_id TEXT UNIQUE NOT NULL,
    
    type TEXT NOT NULL,  -- card, sepa_debit
    last_four TEXT,
    brand TEXT,  -- visa, mastercard, etc.
    exp_month INTEGER,
    exp_year INTEGER,
    
    is_default BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_methods_user ON payment_methods(user_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- PROMO CODES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    
    discount_type TEXT NOT NULL,  -- percent, fixed
    discount_value DECIMAL(10,2) NOT NULL,
    
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    
    max_uses INTEGER,
    current_uses INTEGER DEFAULT 0,
    
    applicable_plans TEXT[],  -- NULL = alle Plans
    
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_promo_codes_code ON promo_codes(code);


-- ═══════════════════════════════════════════════════════════════════════════
-- REFERRALS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES auth.users(id),
    referred_id UUID NOT NULL REFERENCES auth.users(id),
    
    status TEXT DEFAULT 'pending',  -- pending, converted, paid
    
    reward_amount DECIMAL(10,2),
    reward_paid_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX idx_referrals_referred ON referrals(referred_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- FEATURE FLAGS (für gradual rollout)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    
    enabled BOOLEAN DEFAULT FALSE,
    
    -- Targeting
    plans TEXT[],  -- Nur für bestimmte Plans
    user_ids UUID[],  -- Nur für bestimmte User
    percentage INTEGER DEFAULT 0,  -- 0-100% der User
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ═══════════════════════════════════════════════════════════════════════════
-- HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- Funktion: Prüft ob User ein Feature nutzen kann
CREATE OR REPLACE FUNCTION can_use_feature(
    p_user_id UUID,
    p_feature TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_limit INTEGER;
    v_usage INTEGER;
    v_plan TEXT;
BEGIN
    -- Plan holen
    SELECT plan INTO v_plan FROM profiles WHERE id = p_user_id;
    
    -- Limit basierend auf Plan
    CASE v_plan
        WHEN 'basic' THEN
            CASE p_feature
                WHEN 'leads' THEN v_limit := 100;
                WHEN 'chats_import' THEN v_limit := 50;
                WHEN 'ai_analyses' THEN v_limit := 100;
                ELSE v_limit := 0;
            END CASE;
        WHEN 'free' THEN
            CASE p_feature
                WHEN 'leads' THEN v_limit := 10;
                WHEN 'chats_import' THEN v_limit := 5;
                WHEN 'ai_analyses' THEN v_limit := 10;
                ELSE v_limit := 0;
            END CASE;
        ELSE v_limit := 0;
    END CASE;
    
    -- Aktuelle Nutzung
    SELECT COALESCE(SUM(quantity), 0) INTO v_usage
    FROM usage_records
    WHERE user_id = p_user_id
      AND feature = p_feature
      AND created_at >= date_trunc('month', NOW());
    
    RETURN v_usage < v_limit OR v_limit = -1;
END;
$$ LANGUAGE plpgsql;


-- Funktion: Usage erhöhen mit Limit-Check
CREATE OR REPLACE FUNCTION record_usage_with_check(
    p_user_id UUID,
    p_feature TEXT,
    p_quantity INTEGER DEFAULT 1
) RETURNS BOOLEAN AS $$
BEGIN
    IF can_use_feature(p_user_id, p_feature) THEN
        INSERT INTO usage_records (user_id, feature, quantity)
        VALUES (p_user_id, p_feature, p_quantity);
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;


-- ═══════════════════════════════════════════════════════════════════════════
-- RLS POLICIES
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Subscriptions: User sieht nur eigene
CREATE POLICY subscriptions_user_policy ON subscriptions
    FOR ALL USING (auth.uid() = user_id);

-- Usage: User sieht nur eigene
CREATE POLICY usage_user_policy ON usage_records
    FOR ALL USING (auth.uid() = user_id);

-- Invoices: User sieht nur eigene
CREATE POLICY invoices_user_policy ON invoices
    FOR ALL USING (auth.uid() = user_id);

-- Payment Methods: User sieht nur eigene
CREATE POLICY payment_methods_user_policy ON payment_methods
    FOR ALL USING (auth.uid() = user_id);


-- ═══════════════════════════════════════════════════════════════════════════
-- INITIAL DATA
-- ═══════════════════════════════════════════════════════════════════════════

-- Feature Flags
INSERT INTO feature_flags (name, description, enabled, plans) VALUES
('autopilot_v2', 'Neues Autopilot System', true, ARRAY['basic']),
('ai_coach_advanced', 'Erweiterte KI-Coaching Features', true, ARRAY['basic']),
('lead_gen', 'Lead-Generierung Feature', false, ARRAY['basic']),
('finance_module', 'Finanz-Modul', false, ARRAY['basic'])
ON CONFLICT (name) DO NOTHING;

-- Promo Codes
INSERT INTO promo_codes (code, discount_type, discount_value, valid_until, max_uses) VALUES
('LAUNCH50', 'percent', 50, NOW() + INTERVAL '30 days', 100),
('EARLYBIRD', 'percent', 30, NOW() + INTERVAL '60 days', 500),
('FRIEND10', 'percent', 10, NOW() + INTERVAL '365 days', NULL)
ON CONFLICT (code) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- DONE
-- ═══════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE subscriptions IS 'Stripe Subscriptions mit Plan-Info';
COMMENT ON TABLE subscription_items IS 'Add-Ons zu einer Subscription';
COMMENT ON TABLE usage_records IS 'Feature-Nutzung für Limit-Tracking';
COMMENT ON TABLE invoices IS 'Bezahlte Rechnungen von Stripe';
COMMENT ON TABLE promo_codes IS 'Rabatt-Codes für Checkout';


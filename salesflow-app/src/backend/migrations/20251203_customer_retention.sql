-- ============================================================================
-- CUSTOMER RETENTION SYSTEM
-- Kundenbindung & Upselling für Bestandskunden
-- ============================================================================

-- ===================
-- MONTHLY OFFERS (Monatliche Angebote)
-- ===================

CREATE TABLE IF NOT EXISTS monthly_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Angebots-Details
    title TEXT NOT NULL,
    description TEXT,
    benefit TEXT NOT NULL,              -- z.B. "20% Rabatt", "Gratis Upgrade"
    valid_until DATE NOT NULL,
    target TEXT DEFAULT 'Alle Bestandskunden',
    cta TEXT DEFAULT 'Jetzt sichern!',
    product_id UUID,                    -- Optional: Verknüpftes Produkt
    
    -- Tracking
    times_shown INTEGER DEFAULT 0,
    times_clicked INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index für aktive Angebote (ohne Predicate wegen IMMUTABLE Requirement)
CREATE INDEX IF NOT EXISTS idx_monthly_offers_user_valid 
ON monthly_offers(user_id, valid_until DESC);

-- ===================
-- RETENTION CONTACTS (Kontakt-Protokoll)
-- ===================

CREATE TABLE IF NOT EXISTS retention_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    customer_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    
    -- Kontakt-Details
    contacted_at TIMESTAMPTZ DEFAULT NOW(),
    channel TEXT DEFAULT 'whatsapp',    -- whatsapp, phone, email, etc.
    touchpoint_type TEXT,               -- day_3, week_1, month_2, etc.
    
    -- Nachricht
    message_sent TEXT,
    offer_included BOOLEAN DEFAULT false,
    offer_id UUID REFERENCES monthly_offers(id),
    
    -- Ergebnis
    response_received BOOLEAN DEFAULT false,
    response_positive BOOLEAN,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index für Kontakte pro Kunde
CREATE INDEX IF NOT EXISTS idx_retention_contacts_customer 
ON retention_contacts(customer_id, contacted_at DESC);

-- Index für User-Statistiken
CREATE INDEX IF NOT EXISTS idx_retention_contacts_user 
ON retention_contacts(user_id, contacted_at);

-- ===================
-- LEADS ERWEITERUNG (für Retention)
-- ===================

-- Füge Spalten für Retention hinzu (falls nicht vorhanden)
DO $$ BEGIN
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS purchased_product TEXT;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS purchase_date TIMESTAMPTZ;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS purchase_value DECIMAL(10,2);
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS last_retention_contact TIMESTAMPTZ;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_retention_date TIMESTAMPTZ;
    ALTER TABLE leads ADD COLUMN IF NOT EXISTS retention_score INTEGER DEFAULT 0;
EXCEPTION WHEN others THEN NULL;
END $$;

-- ===================
-- RETENTION SCHEDULE VIEW
-- ===================

CREATE OR REPLACE VIEW view_retention_schedule AS
SELECT 
    l.id,
    l.name,
    l.email,
    l.phone,
    l.purchased_product,
    l.purchase_date,
    l.user_id,
    EXTRACT(DAY FROM (NOW() - COALESCE(l.purchase_date, l.created_at)))::INTEGER as days_since_purchase,
    COALESCE(l.last_retention_contact, l.purchase_date) as last_contact,
    l.disg_type as disc_style,
    NULL::FLOAT as disc_confidence,
    -- Nächster Touchpoint
    CASE 
        WHEN EXTRACT(DAY FROM (NOW() - COALESCE(l.purchase_date, l.created_at))) <= 3 THEN 'day_3'
        WHEN EXTRACT(DAY FROM (NOW() - COALESCE(l.purchase_date, l.created_at))) <= 7 THEN 'week_1'
        WHEN EXTRACT(DAY FROM (NOW() - COALESCE(l.purchase_date, l.created_at))) <= 21 THEN 'week_3'
        WHEN EXTRACT(DAY FROM (NOW() - COALESCE(l.purchase_date, l.created_at))) <= 60 THEN 'month_2'
        WHEN EXTRACT(DAY FROM (NOW() - COALESCE(l.purchase_date, l.created_at))) <= 90 THEN 'month_3'
        WHEN EXTRACT(DAY FROM (NOW() - COALESCE(l.purchase_date, l.created_at))) <= 180 THEN 'month_6'
        ELSE 'year_1'
    END as next_touchpoint,
    -- Ist fällig?
    CASE 
        WHEN l.last_retention_contact IS NULL THEN true
        WHEN EXTRACT(DAY FROM (NOW() - l.last_retention_contact)) >= 14 THEN true
        ELSE false
    END as is_due
FROM leads l
WHERE l.status = 'customer'
ORDER BY is_due DESC, days_since_purchase ASC;

-- ===================
-- RLS POLICIES
-- ===================

ALTER TABLE monthly_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_contacts ENABLE ROW LEVEL SECURITY;

-- Monthly Offers Policies
DROP POLICY IF EXISTS "Users can view own offers" ON monthly_offers;
CREATE POLICY "Users can view own offers" ON monthly_offers
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own offers" ON monthly_offers;
CREATE POLICY "Users can create own offers" ON monthly_offers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own offers" ON monthly_offers;
CREATE POLICY "Users can update own offers" ON monthly_offers
    FOR UPDATE USING (auth.uid() = user_id);

-- Retention Contacts Policies
DROP POLICY IF EXISTS "Users can view own retention contacts" ON retention_contacts;
CREATE POLICY "Users can view own retention contacts" ON retention_contacts
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own retention contacts" ON retention_contacts;
CREATE POLICY "Users can create own retention contacts" ON retention_contacts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ===================
-- FUNCTIONS
-- ===================

-- Funktion: Nächste Retention-Kontakte für heute
CREATE OR REPLACE FUNCTION get_retention_due_today(p_user_id UUID)
RETURNS TABLE (
    customer_id UUID,
    customer_name TEXT,
    product_name TEXT,
    days_since_purchase INTEGER,
    disc_style TEXT,
    touchpoint_type TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.name,
        l.purchased_product,
        EXTRACT(DAY FROM (NOW() - COALESCE(l.purchase_date, l.created_at)))::INTEGER,
        l.disg_type,
        CASE 
            WHEN EXTRACT(DAY FROM (NOW() - COALESCE(l.purchase_date, l.created_at))) <= 3 THEN 'day_3'::TEXT
            WHEN EXTRACT(DAY FROM (NOW() - COALESCE(l.purchase_date, l.created_at))) <= 7 THEN 'week_1'::TEXT
            WHEN EXTRACT(DAY FROM (NOW() - COALESCE(l.purchase_date, l.created_at))) <= 21 THEN 'week_3'::TEXT
            WHEN EXTRACT(DAY FROM (NOW() - COALESCE(l.purchase_date, l.created_at))) <= 60 THEN 'month_2'::TEXT
            ELSE 'month_3'::TEXT
        END
    FROM leads l
    WHERE l.user_id = p_user_id
      AND l.status = 'customer'
      AND (
          l.last_retention_contact IS NULL 
          OR EXTRACT(DAY FROM (NOW() - l.last_retention_contact)) >= 14
      )
    ORDER BY COALESCE(l.purchase_date, l.created_at) ASC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Update last_retention_contact
CREATE OR REPLACE FUNCTION update_last_retention_contact()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE leads 
    SET last_retention_contact = NEW.contacted_at,
        updated_at = NOW()
    WHERE id = NEW.customer_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_retention_contact ON retention_contacts;
CREATE TRIGGER trg_update_retention_contact
    AFTER INSERT ON retention_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_last_retention_contact();

-- ===================
-- GRANTS
-- ===================

GRANT SELECT, INSERT, UPDATE ON monthly_offers TO authenticated;
GRANT SELECT, INSERT ON retention_contacts TO authenticated;
GRANT SELECT ON view_retention_schedule TO authenticated;


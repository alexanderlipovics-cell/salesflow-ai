-- ============================================================================
-- MIGRATION 020: FINANCE & TAX PREP EXTENDED
-- Erweiterte Steuer-Vorbereitung für Networker (DACH-konform)
-- ============================================================================
-- RECHTLICHER HINWEIS: Dieses Modul bietet KEINE Steuerberatung,
-- sondern nur Strukturhilfe und Vorbereitung für den Steuerberater.
-- ============================================================================

-- ===================
-- NEUE ENUMS
-- ===================

DO $$ BEGIN
  CREATE TYPE account_type AS ENUM (
    'commission',        -- Provisionen von MLM-Firma
    'bank',              -- Bankkonto (manuell)
    'cash',              -- Bargeld
    'paypal',            -- PayPal/Online-Wallets
    'crypto'             -- Krypto (falls relevant)
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE income_source AS ENUM (
    'commission',        -- Grundprovision
    'bonus',             -- Bonus/Prämie
    'team_bonus',        -- Strukturbonus/Team-Provision
    'event_speaker',     -- Referenten-Honorar
    'coaching',          -- Coaching-Einnahmen
    'product_sale',      -- Direktverkauf
    'refund',            -- Rückerstattung
    'other'              -- Sonstiges
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE expense_category_extended AS ENUM (
    -- Direkte Betriebsausgaben
    'marketing_ads',         -- Werbeanzeigen (Facebook, Google, etc.)
    'marketing_content',     -- Content-Erstellung, Grafik
    'marketing_materials',   -- Flyer, Visitenkarten, Samples
    
    -- Events & Reisen
    'travel_transport',      -- Flug, Bahn, Taxi
    'travel_hotel',          -- Übernachtung
    'travel_meals',          -- Verpflegung (Pauschalen beachten)
    'events_tickets',        -- Event-Tickets, Kongresse
    'events_booth',          -- Messestand, Standgebühren
    
    -- Fahrzeug
    'vehicle_fuel',          -- Benzin/Diesel
    'vehicle_maintenance',   -- Wartung, Reparatur
    'vehicle_insurance',     -- KFZ-Versicherung
    'vehicle_leasing',       -- Leasing-Rate
    'vehicle_mileage',       -- Kilometerpauschale
    
    -- Büro & Ausstattung
    'office_rent',           -- Büro-Miete (anteilig)
    'office_equipment',      -- Möbel, Geräte
    'office_supplies',       -- Büromaterial
    
    -- Kommunikation & Tools
    'phone_mobile',          -- Handy (anteilig)
    'phone_landline',        -- Festnetz
    'internet',              -- Internet (anteilig)
    'software_tools',        -- Zoom, Canva, CRM, etc.
    'hosting_domains',       -- Webhosting, Domains
    
    -- Versicherungen & Gebühren
    'insurance_business',    -- Betriebshaftpflicht
    'bank_fees',             -- Kontogebühren
    'payment_fees',          -- PayPal-Gebühren, Stripe
    
    -- Weiterbildung
    'education_courses',     -- Online-Kurse, Coaching
    'education_books',       -- Fachbücher
    'education_seminars',    -- Seminare, Workshops
    
    -- Produkte & Samples
    'product_samples',       -- Test-/Demo-Produkte
    'product_own_use',       -- Eigenverbrauch (steuerlich relevant)
    
    -- Sonstiges
    'gifts_clients',         -- Kundengeschenke (Grenzen beachten!)
    'memberships',           -- Verbands-/Vereinsbeiträge
    'legal_accounting',      -- Steuerberater, Rechtsanwalt
    'other'                  -- Sonstiges
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE tax_country AS ENUM (
    'AT',    -- Österreich
    'DE',    -- Deutschland
    'CH'     -- Schweiz
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE vat_status AS ENUM (
    'none',              -- Nicht USt-pflichtig (Kleinunternehmer)
    'registered',        -- USt-pflichtig, normale Abrechnung
    'reverse_charge'     -- Reverse Charge (B2B EU)
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ===================
-- FINANCE ACCOUNTS
-- ===================

CREATE TABLE IF NOT EXISTS finance_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID,
  
  name TEXT NOT NULL,
  account_type account_type NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  
  -- Verknüpfung zu MLM-Firma (für Provisions-Import)
  mlm_company_slug TEXT,  -- 'zinzino', 'herbalife', etc.
  
  -- Saldo (wird berechnet, optional für UI)
  current_balance NUMERIC(12,2) DEFAULT 0,
  
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, name)
);

COMMENT ON TABLE finance_accounts IS 
  'Finanzkonten/Quellen für Einnahmen und Ausgaben (Bank, PayPal, Provisionen, etc.)';

-- ===================
-- FINANCE TAX PROFILES
-- ===================

CREATE TABLE IF NOT EXISTS finance_tax_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Land & Status
  country tax_country NOT NULL DEFAULT 'AT',
  vat_status vat_status NOT NULL DEFAULT 'none',
  vat_id TEXT,  -- UID-Nummer falls vorhanden
  
  -- Steuersätze (User-Eingabe, KEINE Beratung!)
  estimated_income_tax_rate NUMERIC(5,2),  -- z.B. 30.00
  reserve_percentage NUMERIC(5,2) DEFAULT 25,  -- Empfohlene Rücklage
  
  -- Pauschalen (länderspezifisch)
  mileage_rate NUMERIC(4,2),               -- Kilometerpauschale
  home_office_rate NUMERIC(6,2),           -- Home-Office Pauschale/Tag
  
  -- Geschäftsjahr
  fiscal_year_start_month INTEGER DEFAULT 1,  -- 1 = Januar
  
  -- Kleinunternehmer-Grenze
  small_business_limit NUMERIC(10,2),      -- AT: 35.000, DE: 22.000
  
  -- Notizen
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE finance_tax_profiles IS 
  'Steuerprofil des Users mit Landeseinstellungen und Pauschalen. KEINE Steuerberatung!';

-- ===================
-- FINANCE MILEAGE LOG (Fahrtenbuch)
-- ===================

CREATE TABLE IF NOT EXISTS finance_mileage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES finance_transactions(id) ON DELETE SET NULL,
  
  date DATE NOT NULL,
  
  -- Route
  start_location TEXT NOT NULL,
  end_location TEXT NOT NULL,
  distance_km NUMERIC(8,2) NOT NULL,
  
  -- Zweck (wichtig für Finanzamt!)
  purpose TEXT NOT NULL,  -- "Kundentermin bei...", "Event XY"
  purpose_category TEXT CHECK (purpose_category IN ('client_visit', 'event', 'training', 'team_meeting', 'other')),
  
  -- Verknüpfung zu Lead (falls Kundenbesuch)
  lead_id UUID,
  
  -- Berechnung
  rate_per_km NUMERIC(4,2) NOT NULL,
  total_amount NUMERIC(10,2) GENERATED ALWAYS AS (distance_km * rate_per_km) STORED,
  
  -- Fahrzeug
  vehicle_type TEXT DEFAULT 'car' CHECK (vehicle_type IN ('car', 'motorcycle', 'bike', 'public')),
  license_plate TEXT,
  
  -- Hin- und Rückfahrt
  is_round_trip BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE finance_mileage_log IS 
  'Fahrtenbuch für steuerlich absetzbare Fahrten. Wichtig: Zweck dokumentieren!';

-- ===================
-- FINANCE CUSTOM CATEGORIES
-- ===================

CREATE TABLE IF NOT EXISTS finance_custom_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  parent_category TEXT,  -- Zuordnung zu Standard-Kategorie
  kind TEXT NOT NULL CHECK (kind IN ('income', 'expense')),
  
  -- Steuer-Hinweis (allgemein, keine Beratung!)
  tax_hint TEXT,  -- z.B. "Typischerweise als Betriebsausgabe behandelt"
  
  icon TEXT DEFAULT '📁',
  color TEXT DEFAULT '#6B7280',
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, name)
);

COMMENT ON TABLE finance_custom_categories IS 
  'Benutzerdefinierte Kategorien für Einnahmen/Ausgaben';

-- ===================
-- FINANCE RECURRING (Wiederkehrende Buchungen)
-- ===================

CREATE TABLE IF NOT EXISTS finance_recurring (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense')),
  category TEXT,
  
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'EUR',
  
  -- Rhythmus
  frequency TEXT NOT NULL CHECK (frequency IN ('monthly', 'quarterly', 'yearly')),
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 28),
  
  -- Zeitraum
  start_date DATE NOT NULL,
  end_date DATE,
  
  -- Letzter & nächster Lauf
  last_run DATE,
  next_run DATE,
  
  is_active BOOLEAN DEFAULT true,
  auto_create BOOLEAN DEFAULT true,  -- Automatisch Buchung erstellen?
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE finance_recurring IS 
  'Wiederkehrende Buchungen (Abos, monatliche Kosten, etc.)';

-- ===================
-- FINANCE EXPORTS (Steuer-Exporte)
-- ===================

CREATE TABLE IF NOT EXISTS finance_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Zeitraum
  year INTEGER NOT NULL,
  period TEXT NOT NULL,  -- 'year', 'q1', 'q2', 'q3', 'q4', 'month_01', etc.
  
  -- Export-Typ
  export_type TEXT NOT NULL CHECK (export_type IN (
    'summary_pdf', 
    'transactions_csv', 
    'datev_csv', 
    'steuerberater_package',
    'mileage_log_pdf'
  )),
  
  -- Datei
  file_url TEXT NOT NULL,
  file_size INTEGER,
  
  -- Inhalt-Zusammenfassung
  summary JSONB,  -- {total_income, total_expenses, profit, categories: [...]}
  
  -- Disclaimer (wichtig!)
  disclaimer_accepted BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE finance_exports IS 
  'Generierte Steuer-Vorbereitungs-Exporte. KEINE Steuererklärungen!';

-- ===================
-- FINANCE COMMISSION IMPORTS
-- ===================

CREATE TABLE IF NOT EXISTS finance_commission_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES finance_accounts(id),
  
  -- Import-Details
  mlm_company_slug TEXT NOT NULL,
  import_date DATE NOT NULL,
  
  -- Datei
  source_file_url TEXT,
  source_file_type TEXT CHECK (source_file_type IN ('csv', 'pdf', 'api', 'manual')),
  
  -- Ergebnis
  transactions_created INTEGER DEFAULT 0,
  total_amount NUMERIC(12,2),
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  
  -- Raw Data (für Debugging)
  raw_data JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE finance_commission_imports IS 
  'Import-Log für Provisions-Daten aus MLM-Firmen';

-- ===================
-- ERWEITERE BESTEHENDE TABELLEN
-- ===================

-- Erweitere finance_transactions um neue Felder
ALTER TABLE finance_transactions 
  ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES finance_accounts(id),
  ADD COLUMN IF NOT EXISTS income_source income_source,
  ADD COLUMN IF NOT EXISTS expense_category_ext expense_category_extended,
  ADD COLUMN IF NOT EXISTS custom_category_id UUID REFERENCES finance_custom_categories(id),
  ADD COLUMN IF NOT EXISTS gross_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS net_amount NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS tax_deductible_percent NUMERIC(5,2) DEFAULT 100,
  ADD COLUMN IF NOT EXISTS is_tax_relevant BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS mileage_km NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS mileage_purpose TEXT,
  ADD COLUMN IF NOT EXISTS receipt_url TEXT,
  ADD COLUMN IF NOT EXISTS receipt_ocr_data JSONB,
  ADD COLUMN IF NOT EXISTS import_reference TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[];

-- ===================
-- INDEXES
-- ===================

CREATE INDEX IF NOT EXISTS idx_finance_accounts_user ON finance_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_tax_profiles_user ON finance_tax_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_mileage_user_date ON finance_mileage_log(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_finance_recurring_next ON finance_recurring(next_run) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_finance_exports_user_year ON finance_exports(user_id, year);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_tax ON finance_transactions(user_id, is_tax_relevant) 
  WHERE is_tax_relevant = true;

-- ===================
-- VIEWS
-- ===================

-- Jahresübersicht für Steuer-Prep
CREATE OR REPLACE VIEW finance_year_summary AS
SELECT 
  user_id,
  EXTRACT(YEAR FROM transaction_date) as year,
  
  -- Einnahmen
  SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) as total_income,
  
  -- Ausgaben
  SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as total_expenses,
  SUM(CASE WHEN transaction_type = 'expense' THEN 
    amount * COALESCE(tax_deductible_percent, 100) / 100 
    ELSE 0 END) as total_expenses_deductible,
  
  -- Gewinn
  SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) -
  SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as profit_gross,
  
  -- USt
  SUM(CASE WHEN transaction_type = 'income' THEN COALESCE(vat_amount, 0) ELSE 0 END) as vat_collected,
  SUM(CASE WHEN transaction_type = 'expense' THEN COALESCE(vat_amount, 0) ELSE 0 END) as vat_paid,
  
  -- Counts
  COUNT(*) as transaction_count,
  COUNT(*) FILTER (WHERE receipt_url IS NOT NULL OR document_url IS NOT NULL) as receipts_count

FROM finance_transactions
WHERE is_tax_relevant = true OR is_tax_relevant IS NULL
  AND status = 'confirmed'
GROUP BY user_id, EXTRACT(YEAR FROM transaction_date);

-- ===================
-- FUNCTIONS
-- ===================

-- Berechne Steuer-Reserve (grobe Schätzung, KEINE Steuerberatung!)
CREATE OR REPLACE FUNCTION calculate_tax_reserve(p_user_id UUID, p_year INTEGER)
RETURNS TABLE (
  profit NUMERIC,
  estimated_tax NUMERIC,
  reserve_amount NUMERIC,
  reserve_percentage NUMERIC,
  disclaimer TEXT
) AS $$
DECLARE
  v_profile finance_tax_profiles%ROWTYPE;
  v_profit NUMERIC;
BEGIN
  -- Get tax profile
  SELECT * INTO v_profile FROM finance_tax_profiles WHERE user_id = p_user_id;
  
  -- Calculate profit
  SELECT COALESCE(SUM(
    CASE WHEN transaction_type = 'income' THEN amount ELSE -amount END
  ), 0)
  INTO v_profit
  FROM finance_transactions
  WHERE user_id = p_user_id 
    AND EXTRACT(YEAR FROM transaction_date) = p_year
    AND (is_tax_relevant = true OR is_tax_relevant IS NULL)
    AND status = 'confirmed';
  
  RETURN QUERY SELECT 
    v_profit,
    v_profit * COALESCE(v_profile.estimated_income_tax_rate, 30) / 100,
    v_profit * COALESCE(v_profile.reserve_percentage, 25) / 100,
    COALESCE(v_profile.reserve_percentage, 25),
    'Dies ist nur eine grobe Schätzung, keine Steuerberatung. Bitte konsultiere deinen Steuerberater.'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION calculate_tax_reserve IS 
  'Berechnet eine GROBE Steuer-Reserve-Schätzung. KEINE Steuerberatung!';

-- Initialisiere Tax Profile mit Länder-Defaults
CREATE OR REPLACE FUNCTION initialize_tax_profile(
  p_user_id UUID,
  p_country tax_country DEFAULT 'AT'
)
RETURNS finance_tax_profiles AS $$
DECLARE
  v_mileage_rate NUMERIC;
  v_small_business_limit NUMERIC;
  v_result finance_tax_profiles%ROWTYPE;
BEGIN
  -- Länder-spezifische Defaults
  CASE p_country
    WHEN 'AT' THEN
      v_mileage_rate := 0.42;
      v_small_business_limit := 35000;
    WHEN 'DE' THEN
      v_mileage_rate := 0.30;
      v_small_business_limit := 22000;
    WHEN 'CH' THEN
      v_mileage_rate := 0.70;
      v_small_business_limit := NULL;
  END CASE;
  
  INSERT INTO finance_tax_profiles (
    user_id, country, mileage_rate, small_business_limit, reserve_percentage
  ) VALUES (
    p_user_id, p_country, v_mileage_rate, v_small_business_limit, 25
  )
  ON CONFLICT (user_id) DO UPDATE SET
    country = p_country,
    mileage_rate = v_mileage_rate,
    small_business_limit = v_small_business_limit,
    updated_at = NOW()
  RETURNING * INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tax Prep Export Generator
CREATE OR REPLACE FUNCTION generate_tax_prep_summary(
  p_user_id UUID,
  p_year INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_summary JSONB;
  v_income_by_source JSONB;
  v_expenses_by_category JSONB;
  v_mileage JSONB;
BEGIN
  -- Haupt-Summary
  SELECT jsonb_build_object(
    'total_income', COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END), 0),
    'total_expenses', COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0),
    'profit', COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE -amount END), 0),
    'vat_collected', COALESCE(SUM(CASE WHEN transaction_type = 'income' THEN COALESCE(vat_amount, 0) ELSE 0 END), 0),
    'vat_paid', COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN COALESCE(vat_amount, 0) ELSE 0 END), 0),
    'transaction_count', COUNT(*),
    'receipts_count', COUNT(*) FILTER (WHERE receipt_url IS NOT NULL OR document_url IS NOT NULL)
  )
  INTO v_summary
  FROM finance_transactions
  WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM transaction_date) = p_year
    AND (is_tax_relevant = true OR is_tax_relevant IS NULL)
    AND status = 'confirmed';
  
  -- Einnahmen nach Quelle
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  INTO v_income_by_source
  FROM (
    SELECT 
      COALESCE(category::TEXT, 'other') as source,
      SUM(amount) as total,
      COUNT(*) as count
    FROM finance_transactions
    WHERE user_id = p_user_id
      AND EXTRACT(YEAR FROM transaction_date) = p_year
      AND transaction_type = 'income'
      AND status = 'confirmed'
    GROUP BY category
    ORDER BY SUM(amount) DESC
  ) t;
  
  -- Ausgaben nach Kategorie
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  INTO v_expenses_by_category
  FROM (
    SELECT 
      COALESCE(category::TEXT, 'other') as category,
      SUM(amount) as total,
      SUM(amount * COALESCE(tax_deductible_percent, 100) / 100) as deductible,
      COUNT(*) as count
    FROM finance_transactions
    WHERE user_id = p_user_id
      AND EXTRACT(YEAR FROM transaction_date) = p_year
      AND transaction_type = 'expense'
      AND status = 'confirmed'
    GROUP BY category
    ORDER BY SUM(amount) DESC
  ) t;
  
  -- Fahrtenbuch
  SELECT jsonb_build_object(
    'total_km', COALESCE(SUM(distance_km), 0),
    'total_amount', COALESCE(SUM(total_amount), 0),
    'trips_count', COUNT(*)
  )
  INTO v_mileage
  FROM finance_mileage_log
  WHERE user_id = p_user_id
    AND EXTRACT(YEAR FROM date) = p_year;
  
  RETURN jsonb_build_object(
    'year', p_year,
    'generated_at', NOW(),
    'summary', v_summary,
    'income_by_source', v_income_by_source,
    'expenses_by_category', v_expenses_by_category,
    'mileage', v_mileage,
    'disclaimer', 'Dies ist eine Zusammenfassung zur Steuer-VORBEREITUNG, KEINE Steuererklärung. Bitte konsultiere deinen Steuerberater.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===================
-- RLS POLICIES
-- ===================

ALTER TABLE finance_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_tax_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_mileage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_custom_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_recurring ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_commission_imports ENABLE ROW LEVEL SECURITY;

-- Policies: Nur eigene Daten
DROP POLICY IF EXISTS "Users manage own accounts" ON finance_accounts;
CREATE POLICY "Users manage own accounts" ON finance_accounts
  FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own tax profile" ON finance_tax_profiles;
CREATE POLICY "Users manage own tax profile" ON finance_tax_profiles
  FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own mileage" ON finance_mileage_log;
CREATE POLICY "Users manage own mileage" ON finance_mileage_log
  FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own categories" ON finance_custom_categories;
CREATE POLICY "Users manage own categories" ON finance_custom_categories
  FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own recurring" ON finance_recurring;
CREATE POLICY "Users manage own recurring" ON finance_recurring
  FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own exports" ON finance_exports;
CREATE POLICY "Users manage own exports" ON finance_exports
  FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users manage own imports" ON finance_commission_imports;
CREATE POLICY "Users manage own imports" ON finance_commission_imports
  FOR ALL USING (user_id = auth.uid());

-- ===================
-- GRANTS
-- ===================

GRANT ALL ON finance_accounts TO authenticated;
GRANT ALL ON finance_tax_profiles TO authenticated;
GRANT ALL ON finance_mileage_log TO authenticated;
GRANT ALL ON finance_custom_categories TO authenticated;
GRANT ALL ON finance_recurring TO authenticated;
GRANT ALL ON finance_exports TO authenticated;
GRANT ALL ON finance_commission_imports TO authenticated;

GRANT EXECUTE ON FUNCTION calculate_tax_reserve TO authenticated;
GRANT EXECUTE ON FUNCTION initialize_tax_profile TO authenticated;
GRANT EXECUTE ON FUNCTION generate_tax_prep_summary TO authenticated;

-- ===================
-- UPDATED_AT TRIGGERS
-- ===================

CREATE OR REPLACE FUNCTION update_finance_ext_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_finance_accounts_updated ON finance_accounts;
CREATE TRIGGER trigger_finance_accounts_updated
  BEFORE UPDATE ON finance_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_finance_ext_updated_at();

DROP TRIGGER IF EXISTS trigger_finance_tax_profiles_updated ON finance_tax_profiles;
CREATE TRIGGER trigger_finance_tax_profiles_updated
  BEFORE UPDATE ON finance_tax_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_finance_ext_updated_at();

-- ===================
-- MIGRATION COMPLETE
-- ===================

SELECT 'Migration 020_finance_tax_prep_extended.sql erfolgreich ausgeführt' AS status;


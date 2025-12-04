-- ═══════════════════════════════════════════════════════════════════════════
-- MLM FIELDS FÜR CONTACTS
-- ═══════════════════════════════════════════════════════════════════════════
-- Fügt MLM-spezifische Felder zur contacts Tabelle hinzu

-- MLM Company (PM-International, doTERRA, Herbalife, LR, Vorwerk, etc.)
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS mlm_company TEXT;

-- MLM ID (interne ID des Kontakts im MLM-System)
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS mlm_id TEXT;

-- MLM Rank (Rang im MLM-System: z.B. "Director", "Executive", "Diamond")
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS mlm_rank TEXT;

-- Team Position (Position im Team: Sponsor, Downline, Upline)
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS team_position TEXT;

-- MLM-spezifische Metriken
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS mlm_pv DECIMAL(10, 2); -- Personal Volume
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS mlm_gv DECIMAL(10, 2); -- Group Volume
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS mlm_ov DECIMAL(10, 2); -- Organization Volume
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS mlm_vp DECIMAL(10, 2); -- Volume Points
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS mlm_pp DECIMAL(10, 2); -- Performance Points

-- Team-ID (ID des Teams im MLM-System)
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS team_id TEXT;

-- Sponsor-ID (ID des Sponsors)
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS sponsor_id TEXT;

-- Sponsor Name
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS sponsor_name TEXT;

-- MLM Level (Level im Downline)
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS mlm_level INTEGER;

-- ZINZINO-spezifische Felder
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS mlm_rank_level INTEGER; -- Numerischer Rang-Level (1-18)
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true; -- Partner Status
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS subscription_active BOOLEAN DEFAULT false; -- Z4F / Auto Order Status
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS customer_points INTEGER DEFAULT 0; -- PCP (Personal Customer Points)
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS z4f_active BOOLEAN DEFAULT false; -- Zinzino4Free Status
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS ecb_active BOOLEAN DEFAULT false; -- Enrollment Credit Bonus Status
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS rcb_active BOOLEAN DEFAULT false; -- Residual Credit Bonus Status
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS grace_period_end DATE; -- Grace Period End Date (für X-Team Ziel)

-- Import Metadata (für Sync-Tracking)
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS import_source TEXT; -- z.B. "csv_pm_international"
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS import_batch_id UUID; -- Batch-ID für Re-Import
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS last_imported_at TIMESTAMPTZ;

-- Index für schnelle Suche
CREATE INDEX IF NOT EXISTS idx_contacts_mlm_company ON contacts(mlm_company);
CREATE INDEX IF NOT EXISTS idx_contacts_mlm_id ON contacts(mlm_id);
CREATE INDEX IF NOT EXISTS idx_contacts_team_id ON contacts(team_id);
CREATE INDEX IF NOT EXISTS idx_contacts_sponsor_id ON contacts(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_contacts_import_batch_id ON contacts(import_batch_id);

-- Kommentare
COMMENT ON COLUMN contacts.mlm_company IS 'MLM-Unternehmen (PM-International, doTERRA, Herbalife, LR, Vorwerk)';
COMMENT ON COLUMN contacts.mlm_id IS 'Interne ID im MLM-System';
COMMENT ON COLUMN contacts.mlm_rank IS 'Rang im MLM-System';
COMMENT ON COLUMN contacts.team_position IS 'Position im Team (Sponsor, Downline, Upline)';
COMMENT ON COLUMN contacts.import_batch_id IS 'Batch-ID für Re-Import und Sync';


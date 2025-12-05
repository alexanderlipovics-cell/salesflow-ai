-- ============================================================================
-- SCHRITT 4: Contacts Tabelle erweitern (Autopilot V2 Felder)
-- ============================================================================
-- Diese Migration fügt die fehlenden Autopilot V2 Felder zur contacts Tabelle hinzu
-- ============================================================================

-- Autopilot V2 Felder zu contacts hinzufügen
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS best_contact_time TIME;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS preferred_channel VARCHAR(50) DEFAULT 'email';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS opt_out_channels TEXT[] DEFAULT '{}';
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS linkedin_id VARCHAR(200);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS instagram_id VARCHAR(200);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS whatsapp_number VARCHAR(50);

-- Indizes für Performance (optional, aber empfohlen)
CREATE INDEX IF NOT EXISTS idx_contacts_timezone ON contacts(timezone);
CREATE INDEX IF NOT EXISTS idx_contacts_preferred_channel ON contacts(preferred_channel);
CREATE INDEX IF NOT EXISTS idx_contacts_best_contact_time ON contacts(best_contact_time);

-- Schema Cache neu laden
NOTIFY pgrst, 'reload schema';

-- Prüfung: Zeige die neuen Felder
SELECT 
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'contacts'
  AND column_name IN ('timezone', 'best_contact_time', 'preferred_channel', 'opt_out_channels', 'linkedin_id', 'instagram_id', 'whatsapp_number')
ORDER BY column_name;


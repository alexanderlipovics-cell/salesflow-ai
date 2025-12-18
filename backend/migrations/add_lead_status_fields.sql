-- Migration: Lead Status System für sicheres Auto-Send
-- Datum: 2024
-- Beschreibung: Fügt Felder für Contact Status Management hinzu

-- Contact Status Feld
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS contact_status TEXT DEFAULT 'never_contacted';

-- Kommentar für Status-Werte
COMMENT ON COLUMN leads.contact_status IS 
'Status-Werte: never_contacted, awaiting_reply, in_conversation, customer, lost';

-- Last Contact Date
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMP;

-- Last Contact By (wer hat zuletzt kontaktiert)
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS last_contact_by TEXT;

COMMENT ON COLUMN leads.last_contact_by IS 
'Wer hat zuletzt kontaktiert: user oder lead';

-- Contact Count
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS contact_count INTEGER DEFAULT 0;

-- Awaiting Reply Since (wann wartet User auf Antwort)
ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS awaiting_reply_since TIMESTAMP;

-- Index für Performance
CREATE INDEX IF NOT EXISTS idx_leads_contact_status ON leads(contact_status);
CREATE INDEX IF NOT EXISTS idx_leads_awaiting_reply_since ON leads(awaiting_reply_since);
CREATE INDEX IF NOT EXISTS idx_leads_last_contact_date ON leads(last_contact_date);


-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  IMPORT LOGS TABLE                                                         ║
-- ║  Protokolliert CSV/Excel-Imports                                           ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- Import Logs Tabelle
CREATE TABLE IF NOT EXISTS import_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',  -- pending, processing, completed, failed, partial
    total_rows INTEGER DEFAULT 0,
    imported INTEGER DEFAULT 0,
    skipped INTEGER DEFAULT 0,
    errors INTEGER DEFAULT 0,
    duplicates INTEGER DEFAULT 0,
    error_details JSONB DEFAULT '[]'::jsonb,
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Index für User-Abfragen
CREATE INDEX IF NOT EXISTS idx_import_logs_user 
ON import_logs(user_id, created_at DESC);

-- RLS aktivieren
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;

-- Policy: User sieht nur eigene Imports
DROP POLICY IF EXISTS "Users can view own imports" ON import_logs;
CREATE POLICY "Users can view own imports" 
ON import_logs FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own imports" ON import_logs;
CREATE POLICY "Users can insert own imports" 
ON import_logs FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- LEADS TABLE CHECK & UPDATE
-- ═══════════════════════════════════════════════════════════════════════════

-- Stelle sicher, dass alle benötigten Felder in der leads Tabelle existieren
DO $$
BEGIN
    -- Add first_name if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leads' AND column_name = 'first_name') THEN
        ALTER TABLE leads ADD COLUMN first_name TEXT;
    END IF;
    
    -- Add last_name if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leads' AND column_name = 'last_name') THEN
        ALTER TABLE leads ADD COLUMN last_name TEXT;
    END IF;
    
    -- Add company if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leads' AND column_name = 'company') THEN
        ALTER TABLE leads ADD COLUMN company TEXT;
    END IF;
    
    -- Add position if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leads' AND column_name = 'position') THEN
        ALTER TABLE leads ADD COLUMN position TEXT;
    END IF;
    
    -- Add city if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leads' AND column_name = 'city') THEN
        ALTER TABLE leads ADD COLUMN city TEXT;
    END IF;
    
    -- Add country if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leads' AND column_name = 'country') THEN
        ALTER TABLE leads ADD COLUMN country TEXT;
    END IF;
    
    -- Add instagram if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leads' AND column_name = 'instagram') THEN
        ALTER TABLE leads ADD COLUMN instagram TEXT;
    END IF;
    
    -- Add linkedin if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leads' AND column_name = 'linkedin') THEN
        ALTER TABLE leads ADD COLUMN linkedin TEXT;
    END IF;
    
    -- Add tags if not exists (as array)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leads' AND column_name = 'tags') THEN
        ALTER TABLE leads ADD COLUMN tags TEXT[] DEFAULT '{}';
    END IF;
    
    -- Add source if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leads' AND column_name = 'source') THEN
        ALTER TABLE leads ADD COLUMN source TEXT DEFAULT 'manual';
    END IF;

END $$;

-- Index für Import-Duplikat-Check
CREATE INDEX IF NOT EXISTS idx_leads_email_user 
ON leads(user_id, email) WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_phone_user 
ON leads(user_id, phone) WHERE phone IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- SUMMARY
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Erstellte Tabellen:
-- ✅ import_logs - Protokolliert alle CSV/Excel-Imports
-- 
-- Aktualisierte Tabellen:
-- ✅ leads - Neue Felder für erweiterten Import
-- 
-- Neue Indexes:
-- ✅ idx_import_logs_user
-- ✅ idx_leads_email_user  
-- ✅ idx_leads_phone_user


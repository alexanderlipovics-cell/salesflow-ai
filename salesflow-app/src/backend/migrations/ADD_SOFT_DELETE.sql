-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  SOFT DELETE FÜR LEADS                                                     ║
-- ║  Leads werden NIE gelöscht - nur archiviert                               ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- ============================================================================
-- 1. LEADS: Soft-Delete Spalten
-- ============================================================================

ALTER TABLE leads ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS archived_reason TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS archived_by UUID;

-- Index für schnelle Abfragen (nur aktive Leads)
CREATE INDEX IF NOT EXISTS idx_leads_active ON leads(is_archived) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS idx_leads_archived_at ON leads(archived_at) WHERE archived_at IS NOT NULL;

DO $$ BEGIN RAISE NOTICE '✅ Leads Soft-Delete Spalten hinzugefügt'; END $$;

-- ============================================================================
-- 2. OUTREACH MESSAGES: Soft-Delete (falls Tabelle existiert)
-- ============================================================================

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pulse_outreach_messages') THEN
        ALTER TABLE pulse_outreach_messages ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
        ALTER TABLE pulse_outreach_messages ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
        CREATE INDEX IF NOT EXISTS idx_outreach_active ON pulse_outreach_messages(is_archived) WHERE is_archived = false;
        RAISE NOTICE '✅ Outreach Messages Soft-Delete hinzugefügt';
    ELSE
        RAISE NOTICE 'ℹ️  pulse_outreach_messages existiert nicht (noch) - übersprungen';
    END IF;
END $$;

-- ============================================================================
-- 3. CONVERSATIONS: Soft-Delete (falls Tabelle existiert)
-- ============================================================================

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'conversations') THEN
        ALTER TABLE conversations ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
        ALTER TABLE conversations ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
        CREATE INDEX IF NOT EXISTS idx_conversations_active ON conversations(is_archived) WHERE is_archived = false;
        RAISE NOTICE '✅ Conversations Soft-Delete hinzugefügt';
    END IF;
END $$;

-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

-- Funktion: Lead archivieren (statt löschen)
CREATE OR REPLACE FUNCTION archive_lead(
    p_lead_id UUID,
    p_reason TEXT DEFAULT 'manual',
    p_archived_by UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE leads 
    SET 
        is_archived = true,
        archived_at = NOW(),
        archived_reason = p_reason,
        archived_by = p_archived_by,
        updated_at = NOW()
    WHERE id = p_lead_id AND is_archived = false;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funktion: Lead wiederherstellen
CREATE OR REPLACE FUNCTION restore_lead(p_lead_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE leads 
    SET 
        is_archived = false,
        archived_at = NULL,
        archived_reason = NULL,
        archived_by = NULL,
        updated_at = NOW()
    WHERE id = p_lead_id AND is_archived = true;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funktion: Alle archivierten Leads eines Users
CREATE OR REPLACE FUNCTION get_archived_leads(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    archived_at TIMESTAMPTZ,
    archived_reason TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT l.id, l.name, l.archived_at, l.archived_reason
    FROM leads l
    WHERE l.user_id = p_user_id AND l.is_archived = true
    ORDER BY l.archived_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN RAISE NOTICE '✅ Helper Functions erstellt'; END $$;

-- ============================================================================
-- 5. VIEW FÜR AKTIVE LEADS (Optional)
-- ============================================================================

CREATE OR REPLACE VIEW active_leads AS
SELECT * FROM leads WHERE is_archived = false;

CREATE OR REPLACE VIEW archived_leads AS
SELECT * FROM leads WHERE is_archived = true;

DO $$ BEGIN RAISE NOTICE '✅ Views erstellt'; END $$;

-- ============================================================================
-- 6. TRIGGER: Verhindere echtes Löschen
-- ============================================================================

-- Trigger-Funktion: Statt DELETE → Archive
CREATE OR REPLACE FUNCTION prevent_lead_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- Statt zu löschen, archivieren
    UPDATE leads 
    SET 
        is_archived = true,
        archived_at = NOW(),
        archived_reason = 'auto_prevented_delete',
        updated_at = NOW()
    WHERE id = OLD.id;
    
    -- Verhindere echtes Löschen
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger aktivieren (verhindert DELETE)
DROP TRIGGER IF EXISTS trigger_prevent_lead_delete ON leads;
CREATE TRIGGER trigger_prevent_lead_delete
    BEFORE DELETE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION prevent_lead_delete();

DO $$ BEGIN RAISE NOTICE '✅ Delete-Prevention Trigger aktiviert'; END $$;

-- ============================================================================
-- FERTIG
-- ============================================================================

DO $$ BEGIN RAISE NOTICE '🎉 SOFT DELETE KOMPLETT! Leads werden NIE mehr gelöscht.'; END $$;


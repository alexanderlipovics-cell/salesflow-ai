-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  FIX_RELATIONSHIPS_V2.sql - Korrigierte Version                           ║
-- ║  Räumt orphaned Daten auf BEVOR Foreign Keys hinzugefügt werden           ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- ============================================================================
-- SCHRITT 1: Orphaned Daten in lead_tasks aufräumen
-- ============================================================================

-- Setze lead_id auf NULL wenn der Lead nicht existiert
UPDATE lead_tasks 
SET lead_id = NULL 
WHERE lead_id IS NOT NULL 
AND lead_id NOT IN (SELECT id FROM leads);

-- ============================================================================
-- SCHRITT 2: Orphaned Daten in anderen Tabellen aufräumen
-- ============================================================================

-- lead_follow_up_status
UPDATE lead_follow_up_status 
SET lead_id = NULL 
WHERE lead_id IS NOT NULL 
AND lead_id NOT IN (SELECT id FROM leads);

-- lead_interactions (falls existiert)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_interactions') THEN
        UPDATE lead_interactions 
        SET lead_id = NULL 
        WHERE lead_id IS NOT NULL 
        AND lead_id NOT IN (SELECT id FROM leads);
    END IF;
END $$;

-- lead_stats (falls existiert)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_stats') THEN
        DELETE FROM lead_stats 
        WHERE lead_id NOT IN (SELECT id FROM leads);
    END IF;
END $$;

-- follow_up_history (falls existiert)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'follow_up_history') THEN
        UPDATE follow_up_history 
        SET lead_id = NULL 
        WHERE lead_id IS NOT NULL 
        AND lead_id NOT IN (SELECT id FROM leads);
    END IF;
END $$;

-- churn_predictions (falls existiert)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'churn_predictions') THEN
        DELETE FROM churn_predictions 
        WHERE lead_id NOT IN (SELECT id FROM leads);
    END IF;
END $$;

-- cure_assessments (falls existiert)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cure_assessments') THEN
        DELETE FROM cure_assessments 
        WHERE lead_id NOT IN (SELECT id FROM leads);
    END IF;
END $$;

-- objection_sessions (falls existiert)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'objection_sessions') THEN
        UPDATE objection_sessions 
        SET lead_id = NULL 
        WHERE lead_id IS NOT NULL 
        AND lead_id NOT IN (SELECT id FROM leads);
    END IF;
END $$;

-- ============================================================================
-- SCHRITT 3: Foreign Keys hinzufügen (jetzt sicher)
-- ============================================================================

-- lead_tasks → leads
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'lead_tasks_lead_id_fkey'
    ) THEN
        ALTER TABLE lead_tasks 
        ADD CONSTRAINT lead_tasks_lead_id_fkey 
        FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;
        RAISE NOTICE 'FK lead_tasks → leads hinzugefügt';
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'FK lead_tasks konnte nicht hinzugefügt werden: %', SQLERRM;
END $$;

-- lead_follow_up_status → leads
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'lead_follow_up_status_lead_id_fkey'
    ) THEN
        ALTER TABLE lead_follow_up_status 
        ADD CONSTRAINT lead_follow_up_status_lead_id_fkey 
        FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'FK lead_follow_up_status: %', SQLERRM;
END $$;

-- ============================================================================
-- SCHRITT 4: objection_sessions Tabelle sicherstellen
-- ============================================================================

CREATE TABLE IF NOT EXISTS objection_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    lead_id UUID,
    objection_text TEXT NOT NULL,
    objection_category TEXT,
    ai_response TEXT,
    ai_strategy TEXT,
    channel TEXT,
    context TEXT,
    was_helpful BOOLEAN,
    user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
    user_feedback TEXT,
    outcome TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE objection_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own objection_sessions" ON objection_sessions;
CREATE POLICY "Users see own objection_sessions" ON objection_sessions 
    FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- SCHRITT 5: phoenix_spots Tabelle
-- ============================================================================

CREATE TABLE IF NOT EXISTS phoenix_spots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    location TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    category TEXT DEFAULT 'cafe',
    rating INTEGER CHECK (rating BETWEEN 1 AND 5),
    notes TEXT,
    is_favorite BOOLEAN DEFAULT FALSE,
    visit_count INTEGER DEFAULT 0,
    last_visited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE phoenix_spots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own spots" ON phoenix_spots;
CREATE POLICY "Users see own spots" ON phoenix_spots 
    FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- SCHRITT 6: Views
-- ============================================================================

CREATE OR REPLACE VIEW today_follow_ups AS
SELECT 
    lfs.*,
    l.name as lead_name,
    l.phone,
    l.email,
    l.status as lead_status
FROM lead_follow_up_status lfs
LEFT JOIN leads l ON lfs.lead_id = l.id
WHERE lfs.next_follow_up_at::date <= CURRENT_DATE;

-- ============================================================================
-- FERTIG
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ FIX_RELATIONSHIPS_V2 ERFOLGREICH!';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE '• Orphaned Daten bereinigt';
    RAISE NOTICE '• Foreign Keys hinzugefügt';
    RAISE NOTICE '• objection_sessions erstellt';
    RAISE NOTICE '• phoenix_spots erstellt';
    RAISE NOTICE '• Views aktualisiert';
    RAISE NOTICE '';
END $$;

SELECT '🚀 Migration V2 erfolgreich!' AS status;


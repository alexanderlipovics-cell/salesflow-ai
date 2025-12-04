-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  FIX_RELATIONSHIPS_V3.sql - FINALE VERSION                                ║
-- ║  Entfernt NOT NULL Constraints vor Bereinigung                            ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- ============================================================================
-- SCHRITT 1: NOT NULL Constraints entfernen (damit wir NULL setzen können)
-- ============================================================================

-- lead_tasks: lead_id nullable machen
ALTER TABLE lead_tasks ALTER COLUMN lead_id DROP NOT NULL;

-- lead_follow_up_status: lead_id nullable machen (falls NOT NULL)
DO $$
BEGIN
    ALTER TABLE lead_follow_up_status ALTER COLUMN lead_id DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- lead_interactions (falls existiert)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_interactions') THEN
        ALTER TABLE lead_interactions ALTER COLUMN lead_id DROP NOT NULL;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- follow_up_history (falls existiert)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'follow_up_history') THEN
        ALTER TABLE follow_up_history ALTER COLUMN lead_id DROP NOT NULL;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- objection_sessions (falls existiert)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'objection_sessions') THEN
        ALTER TABLE objection_sessions ALTER COLUMN lead_id DROP NOT NULL;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================================
-- SCHRITT 2: Orphaned Daten bereinigen (jetzt funktioniert's!)
-- ============================================================================

-- lead_tasks
UPDATE lead_tasks 
SET lead_id = NULL 
WHERE lead_id IS NOT NULL 
AND lead_id NOT IN (SELECT id FROM leads);

-- lead_follow_up_status
DO $$
BEGIN
    UPDATE lead_follow_up_status 
    SET lead_id = NULL 
    WHERE lead_id IS NOT NULL 
    AND lead_id NOT IN (SELECT id FROM leads);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- lead_interactions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_interactions') THEN
        UPDATE lead_interactions 
        SET lead_id = NULL 
        WHERE lead_id IS NOT NULL 
        AND lead_id NOT IN (SELECT id FROM leads);
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- lead_stats - löschen statt NULL setzen (lead_id ist essentiell)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'lead_stats') THEN
        DELETE FROM lead_stats 
        WHERE lead_id NOT IN (SELECT id FROM leads);
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- follow_up_history
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'follow_up_history') THEN
        UPDATE follow_up_history 
        SET lead_id = NULL 
        WHERE lead_id IS NOT NULL 
        AND lead_id NOT IN (SELECT id FROM leads);
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- churn_predictions - löschen
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'churn_predictions') THEN
        DELETE FROM churn_predictions 
        WHERE lead_id NOT IN (SELECT id FROM leads);
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- cure_assessments - löschen
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cure_assessments') THEN
        DELETE FROM cure_assessments 
        WHERE lead_id NOT IN (SELECT id FROM leads);
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================================
-- SCHRITT 3: Foreign Keys hinzufügen
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
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
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
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================================
-- SCHRITT 4: Fehlende Tabellen erstellen
-- ============================================================================

-- objection_sessions
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

ALTER TABLE objection_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own objection_sessions" ON objection_sessions;
CREATE POLICY "Users see own objection_sessions" ON objection_sessions 
    FOR ALL USING (auth.uid() = user_id);

-- phoenix_spots
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
-- SCHRITT 5: View erstellen
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
-- FERTIG!
-- ============================================================================

SELECT 'Migration V3 erfolgreich!' AS status,
       (SELECT COUNT(*) FROM lead_tasks WHERE lead_id IS NULL) AS orphaned_tasks_fixed;


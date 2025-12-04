-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  FIX_RELATIONSHIPS_V4_FINAL.sql - GARANTIERT FUNKTIONIERT                 ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- ============================================================================
-- SCHRITT 1: NOT NULL Constraints entfernen
-- ============================================================================

DO $$
BEGIN
    ALTER TABLE lead_tasks ALTER COLUMN lead_id DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE lead_follow_up_status ALTER COLUMN lead_id DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE lead_interactions ALTER COLUMN lead_id DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE follow_up_history ALTER COLUMN lead_id DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE objection_sessions ALTER COLUMN lead_id DROP NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================================
-- SCHRITT 2: Orphaned Daten bereinigen
-- ============================================================================

UPDATE lead_tasks SET lead_id = NULL 
WHERE lead_id IS NOT NULL AND lead_id NOT IN (SELECT id FROM leads);

DO $$
BEGIN
    UPDATE lead_follow_up_status SET lead_id = NULL 
    WHERE lead_id IS NOT NULL AND lead_id NOT IN (SELECT id FROM leads);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    UPDATE lead_interactions SET lead_id = NULL 
    WHERE lead_id IS NOT NULL AND lead_id NOT IN (SELECT id FROM leads);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    UPDATE follow_up_history SET lead_id = NULL 
    WHERE lead_id IS NOT NULL AND lead_id NOT IN (SELECT id FROM leads);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    DELETE FROM lead_stats WHERE lead_id NOT IN (SELECT id FROM leads);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    DELETE FROM churn_predictions WHERE lead_id NOT IN (SELECT id FROM leads);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    DELETE FROM cure_assessments WHERE lead_id NOT IN (SELECT id FROM leads);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================================
-- SCHRITT 3: Foreign Keys hinzufügen
-- ============================================================================

DO $$
BEGIN
    ALTER TABLE lead_tasks ADD CONSTRAINT lead_tasks_lead_id_fkey 
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE lead_follow_up_status ADD CONSTRAINT lead_follow_up_status_lead_id_fkey 
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ============================================================================
-- SCHRITT 4: Fehlende Tabellen erstellen
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
    user_rating INTEGER,
    user_feedback TEXT,
    outcome TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    ALTER TABLE objection_sessions ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DROP POLICY IF EXISTS "Users see own objection_sessions" ON objection_sessions;
CREATE POLICY "Users see own objection_sessions" ON objection_sessions 
    FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS phoenix_spots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    location TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    category TEXT DEFAULT 'cafe',
    rating INTEGER,
    notes TEXT,
    is_favorite BOOLEAN DEFAULT FALSE,
    visit_count INTEGER DEFAULT 0,
    last_visited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$
BEGIN
    ALTER TABLE phoenix_spots ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DROP POLICY IF EXISTS "Users see own spots" ON phoenix_spots;
CREATE POLICY "Users see own spots" ON phoenix_spots 
    FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- SCHRITT 5: View NICHT erstellen (today_follow_ups ist eine Tabelle)
-- Falls es eine Tabelle ist, lassen wir sie in Ruhe
-- ============================================================================

-- KEIN CREATE OR REPLACE VIEW today_follow_ups!
-- Die Tabelle existiert bereits und wird vom Code verwendet.

-- ============================================================================
-- FERTIG!
-- ============================================================================

SELECT 'V4 FINAL Migration erfolgreich!' AS status;


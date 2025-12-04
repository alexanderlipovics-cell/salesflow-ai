-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  FIX_RELATIONSHIPS.sql - Foreign Keys & Fehlende Beziehungen              ║
-- ║  Erstellt: 2024-12-04                                                      ║
-- ║  Behebt Schema Cache Fehler                                               ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- ============================================================================
-- 1. FIX: lead_tasks → leads Beziehung
-- ============================================================================

-- Erst prüfen ob lead_id Column existiert und Foreign Key hinzufügen
DO $$
BEGIN
    -- Add Foreign Key if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'lead_tasks_lead_id_fkey'
        AND table_name = 'lead_tasks'
    ) THEN
        -- Nur hinzufügen wenn leads Tabelle existiert
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads') THEN
            ALTER TABLE lead_tasks 
            ADD CONSTRAINT lead_tasks_lead_id_fkey 
            FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE SET NULL;
            RAISE NOTICE 'Foreign Key lead_tasks → leads hinzugefügt';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 2. FIX: objection_sessions Tabelle sicherstellen
-- ============================================================================

CREATE TABLE IF NOT EXISTS objection_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    
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

-- RLS aktivieren
ALTER TABLE objection_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own objection_sessions" ON objection_sessions;
CREATE POLICY "Users see own objection_sessions" ON objection_sessions 
    FOR ALL USING (auth.uid() = user_id);

-- Index für Performance
CREATE INDEX IF NOT EXISTS idx_objection_sessions_user ON objection_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_objection_sessions_created ON objection_sessions(created_at);

-- ============================================================================
-- 3. FIX: lead_follow_up_status → leads Beziehung
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'lead_follow_up_status_lead_id_fkey'
        AND table_name = 'lead_follow_up_status'
    ) THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads') THEN
            ALTER TABLE lead_follow_up_status 
            ADD CONSTRAINT lead_follow_up_status_lead_id_fkey 
            FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
            RAISE NOTICE 'Foreign Key lead_follow_up_status → leads hinzugefügt';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 4. FIX: lead_interactions → leads Beziehung
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'lead_interactions_lead_id_fkey'
        AND table_name = 'lead_interactions'
    ) THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads') THEN
            ALTER TABLE lead_interactions 
            ADD CONSTRAINT lead_interactions_lead_id_fkey 
            FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
            RAISE NOTICE 'Foreign Key lead_interactions → leads hinzugefügt';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 5. FIX: lead_stats → leads Beziehung  
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'lead_stats_lead_id_fkey'
        AND table_name = 'lead_stats'
    ) THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads') THEN
            ALTER TABLE lead_stats 
            ADD CONSTRAINT lead_stats_lead_id_fkey 
            FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
            RAISE NOTICE 'Foreign Key lead_stats → leads hinzugefügt';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 6. FIX: follow_up_history → leads Beziehung
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'follow_up_history_lead_id_fkey'
        AND table_name = 'follow_up_history'
    ) THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads') THEN
            ALTER TABLE follow_up_history 
            ADD CONSTRAINT follow_up_history_lead_id_fkey 
            FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
            RAISE NOTICE 'Foreign Key follow_up_history → leads hinzugefügt';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 7. FIX: churn_predictions → leads Beziehung
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'churn_predictions_lead_id_fkey'
        AND table_name = 'churn_predictions'
    ) THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads') THEN
            ALTER TABLE churn_predictions 
            ADD CONSTRAINT churn_predictions_lead_id_fkey 
            FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
            RAISE NOTICE 'Foreign Key churn_predictions → leads hinzugefügt';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 8. FIX: cure_assessments → leads Beziehung
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'cure_assessments_lead_id_fkey'
        AND table_name = 'cure_assessments'
    ) THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'leads') THEN
            ALTER TABLE cure_assessments 
            ADD CONSTRAINT cure_assessments_lead_id_fkey 
            FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE;
            RAISE NOTICE 'Foreign Key cure_assessments → leads hinzugefügt';
        END IF;
    END IF;
END $$;

-- ============================================================================
-- 9. VIEWS für Follow-ups (falls nicht existiert)
-- ============================================================================

-- View für Today Follow-ups mit Leads
CREATE OR REPLACE VIEW today_follow_ups AS
SELECT 
    lfs.*,
    l.name as lead_name,
    l.phone,
    l.email,
    l.instagram_handle,
    l.status as lead_status,
    l.temperature
FROM lead_follow_up_status lfs
LEFT JOIN leads l ON lfs.lead_id = l.id
WHERE lfs.next_follow_up_at::date <= CURRENT_DATE;

-- ============================================================================
-- 10. Phoenix/Phönix API Support - Spots Tabelle
-- ============================================================================

CREATE TABLE IF NOT EXISTS phoenix_spots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    description TEXT,
    
    location TEXT,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    
    category TEXT DEFAULT 'cafe' CHECK (category IN (
        'cafe', 'restaurant', 'coworking', 'park', 'library', 'other'
    )),
    
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
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    fk_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY'
    AND table_schema = 'public';
    
    RAISE NOTICE '';
    RAISE NOTICE '╔══════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║  ✅ FIX_RELATIONSHIPS MIGRATION COMPLETE!                    ║';
    RAISE NOTICE '╚══════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '🔗 Foreign Keys im Schema: %', fk_count;
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Gefixt:';
    RAISE NOTICE '   • lead_tasks → leads';
    RAISE NOTICE '   • lead_follow_up_status → leads';
    RAISE NOTICE '   • lead_interactions → leads';
    RAISE NOTICE '   • lead_stats → leads';
    RAISE NOTICE '   • follow_up_history → leads';
    RAISE NOTICE '   • churn_predictions → leads';
    RAISE NOTICE '   • cure_assessments → leads';
    RAISE NOTICE '   • objection_sessions (neu erstellt)';
    RAISE NOTICE '   • phoenix_spots (für Phönix-Feature)';
    RAISE NOTICE '';
END $$;

SELECT '🚀 Relationships Fixed!' AS status;


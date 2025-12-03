-- ============================================================================
-- SALES BRAIN: Self-Learning Rules System
-- ============================================================================
-- 
-- Migration: 20251203_sales_brain.sql
-- Beschreibung: Self-Learning Rules Engine für Sales Flow AI
-- 
-- Features:
--   - Lernregeln aus User-Korrekturen
--   - Push Notification Schedules (Morning/Evening)
--   - Rule Application Tracking
--   - Effectiveness Scoring
-- ============================================================================

-- ============================================================================
-- 1. ENUM TYPES
-- ============================================================================

-- 1.1 Rule Types
CREATE TYPE rule_type AS ENUM (
    'tone',              -- Wie schreiben (formell, locker, etc.)
    'structure',         -- Aufbau von Nachrichten
    'vocabulary',        -- Welche Wörter nutzen/vermeiden
    'timing',            -- Wann senden, wie lange warten
    'channel',           -- Kanal-spezifische Regeln
    'objection',         -- Einwandbehandlung
    'persona',           -- Lead-Typ-spezifisch
    'product',           -- Produkt-spezifische Formulierungen
    'compliance',        -- Compliance/rechtliche Regeln
    'custom'             -- Benutzerdefiniert
);

-- 1.2 Rule Scope
CREATE TYPE rule_scope AS ENUM (
    'personal',          -- Nur für diesen User
    'team',              -- Für das ganze Team/Company
    'global'             -- System-weit (nur Admins)
);

-- 1.3 Rule Priority
CREATE TYPE rule_priority AS ENUM (
    'override',          -- Überschreibt alles andere (höchste)
    'high',              -- Hohe Priorität
    'normal',            -- Standard
    'suggestion'         -- Nur als Vorschlag
);

-- ============================================================================
-- 2. SALES BRAIN RULES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS sales_brain_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Zuordnung
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,  -- NULL = Team-Regel
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,       -- Optional: Team-spezifisch
    
    -- Regel-Definition
    rule_type rule_type NOT NULL,
    scope rule_scope NOT NULL DEFAULT 'personal',
    priority rule_priority NOT NULL DEFAULT 'normal',
    
    -- Kontext (wann gilt die Regel?)
    context JSONB DEFAULT '{}',
    -- Beispiel: {"channel": "instagram_dm", "lead_status": "cold", "vertical": "network_marketing"}
    
    -- Die Regel selbst
    title TEXT NOT NULL,                    -- Kurzer Titel
    description TEXT,                       -- Ausführliche Beschreibung
    
    -- Für CHIEF: Was soll er tun?
    instruction TEXT NOT NULL,              -- Die eigentliche Anweisung
    -- Beispiel: "Verwende nie 'Ich würde gerne...'. Nutze stattdessen direkte Aussagen."
    
    -- Beispiele (für besseres Lernen)
    example_bad TEXT,                       -- So nicht
    example_good TEXT,                      -- So besser
    
    -- Ursprung
    source_type TEXT DEFAULT 'user_correction',  
    -- 'user_correction', 'admin', 'team_lead', 'system', 'imported'
    source_message_id UUID,                 -- Ursprüngliche Nachricht (falls aus Korrektur)
    original_text TEXT,                     -- Was CHIEF vorgeschlagen hat
    corrected_text TEXT,                    -- Was User daraus gemacht hat
    
    -- Effektivität
    times_applied INTEGER DEFAULT 0,
    times_helpful INTEGER DEFAULT 0,        -- User fand Anwendung gut
    times_ignored INTEGER DEFAULT 0,        -- User hat trotzdem geändert
    effectiveness_score NUMERIC(3,2),       -- Berechnet: helpful / applied
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,      -- Von Team Lead bestätigt
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMPTZ,
    
    -- Meta
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ                  -- Optional: Regel läuft ab
);

-- ============================================================================
-- 3. RULE APPLICATION LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS rule_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID NOT NULL REFERENCES sales_brain_rules(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    message_id UUID,                        -- Auf welche Nachricht angewendet
    
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    was_helpful BOOLEAN,                    -- User-Feedback
    user_modified BOOLEAN DEFAULT false,    -- Hat User trotzdem geändert?
    
    context_snapshot JSONB                  -- Kontext bei Anwendung
);

-- ============================================================================
-- 4. USER CORRECTIONS LOG
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    lead_id UUID REFERENCES leads(id),
    
    -- Was passiert ist
    original_suggestion TEXT NOT NULL,      -- CHIEF's Vorschlag
    user_final_text TEXT NOT NULL,          -- Was User tatsächlich gesendet hat
    
    -- Kontext
    channel TEXT,
    lead_status TEXT,
    message_type TEXT,                      -- 'first_contact', 'followup', 'reactivation'
    
    -- Analyse
    similarity_score NUMERIC(3,2),          -- Wie ähnlich? (0 = komplett anders, 1 = identisch)
    detected_changes JSONB,                 -- Was wurde geändert? (automatisch analysiert)
    
    -- Status
    rule_extracted BOOLEAN DEFAULT false,   -- Wurde daraus eine Regel?
    extracted_rule_id UUID REFERENCES sales_brain_rules(id),
    
    -- User-Feedback
    user_feedback TEXT,                     -- "personal" / "team" / "ignore"
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. PUSH SCHEDULES
-- ============================================================================

CREATE TABLE IF NOT EXISTS push_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Morning Briefing
    morning_enabled BOOLEAN DEFAULT true,
    morning_time TIME DEFAULT '08:00',
    morning_days INTEGER[] DEFAULT '{1,2,3,4,5}',  -- 1=Mo, 7=So
    
    -- Evening Recap
    evening_enabled BOOLEAN DEFAULT true,
    evening_time TIME DEFAULT '18:00',
    evening_days INTEGER[] DEFAULT '{1,2,3,4,5}',
    
    -- Timezone
    timezone TEXT DEFAULT 'Europe/Vienna',
    
    -- Push Token
    push_token TEXT,
    push_platform TEXT,                     -- 'ios', 'android', 'web'
    
    -- Preferences
    include_stats BOOLEAN DEFAULT true,
    include_tips BOOLEAN DEFAULT true,
    include_motivation BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint
    CONSTRAINT push_schedules_user_unique UNIQUE (user_id)
);

-- ============================================================================
-- 6. PUSH HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS push_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    push_type TEXT NOT NULL,                -- 'morning_briefing', 'evening_recap', 'reminder', 'achievement'
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    data JSONB,
    
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    opened_at TIMESTAMPTZ,
    action_taken TEXT                       -- Was hat User gemacht?
);

-- ============================================================================
-- 7. INDEXES
-- ============================================================================

-- Sales Brain Rules
CREATE INDEX IF NOT EXISTS idx_rules_company ON sales_brain_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_rules_user ON sales_brain_rules(user_id);
CREATE INDEX IF NOT EXISTS idx_rules_active ON sales_brain_rules(is_active, scope);
CREATE INDEX IF NOT EXISTS idx_rules_type ON sales_brain_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_rules_priority ON sales_brain_rules(priority);
CREATE INDEX IF NOT EXISTS idx_rules_context ON sales_brain_rules USING gin(context);

-- User Corrections
CREATE INDEX IF NOT EXISTS idx_corrections_user ON user_corrections(user_id);
CREATE INDEX IF NOT EXISTS idx_corrections_company ON user_corrections(company_id);
CREATE INDEX IF NOT EXISTS idx_corrections_pending ON user_corrections(rule_extracted) WHERE rule_extracted = false;
CREATE INDEX IF NOT EXISTS idx_corrections_created ON user_corrections(created_at DESC);

-- Rule Applications
CREATE INDEX IF NOT EXISTS idx_applications_rule ON rule_applications(rule_id);
CREATE INDEX IF NOT EXISTS idx_applications_user ON rule_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_date ON rule_applications(applied_at DESC);

-- Push Schedules
CREATE INDEX IF NOT EXISTS idx_push_schedules_user ON push_schedules(user_id);
CREATE INDEX IF NOT EXISTS idx_push_schedules_morning ON push_schedules(morning_enabled, morning_time);
CREATE INDEX IF NOT EXISTS idx_push_schedules_evening ON push_schedules(evening_enabled, evening_time);

-- Push History
CREATE INDEX IF NOT EXISTS idx_push_history_user ON push_history(user_id);
CREATE INDEX IF NOT EXISTS idx_push_history_type ON push_history(push_type);
CREATE INDEX IF NOT EXISTS idx_push_history_sent ON push_history(sent_at DESC);

-- ============================================================================
-- 8. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE sales_brain_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE rule_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "view_own_and_team_rules" ON sales_brain_rules;
DROP POLICY IF EXISTS "insert_own_rules" ON sales_brain_rules;
DROP POLICY IF EXISTS "update_own_rules" ON sales_brain_rules;
DROP POLICY IF EXISTS "view_own_applications" ON rule_applications;
DROP POLICY IF EXISTS "insert_own_applications" ON rule_applications;
DROP POLICY IF EXISTS "view_own_corrections" ON user_corrections;
DROP POLICY IF EXISTS "insert_own_corrections" ON user_corrections;
DROP POLICY IF EXISTS "update_own_corrections" ON user_corrections;
DROP POLICY IF EXISTS "own_push_schedules" ON push_schedules;
DROP POLICY IF EXISTS "own_push_history" ON push_history;

-- 8.1 Sales Brain Rules Policies
CREATE POLICY "view_own_and_team_rules" ON sales_brain_rules
    FOR SELECT USING (
        user_id = auth.uid() OR
        (scope = 'team' AND company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )) OR
        scope = 'global'
    );

CREATE POLICY "insert_own_rules" ON sales_brain_rules
    FOR INSERT WITH CHECK (
        user_id = auth.uid() OR 
        user_id IS NULL  -- Team rules
    );

CREATE POLICY "update_own_rules" ON sales_brain_rules
    FOR UPDATE USING (
        user_id = auth.uid() OR
        (scope = 'team' AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND company_id = sales_brain_rules.company_id
            AND role IN ('admin', 'team_lead')
        ))
    );

-- 8.2 Rule Applications Policies
CREATE POLICY "view_own_applications" ON rule_applications
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "insert_own_applications" ON rule_applications
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- 8.3 User Corrections Policies
CREATE POLICY "view_own_corrections" ON user_corrections
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "insert_own_corrections" ON user_corrections
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "update_own_corrections" ON user_corrections
    FOR UPDATE USING (user_id = auth.uid());

-- 8.4 Push Schedules Policies
CREATE POLICY "own_push_schedules" ON push_schedules
    FOR ALL USING (user_id = auth.uid());

-- 8.5 Push History Policies
CREATE POLICY "own_push_history" ON push_history
    FOR ALL USING (user_id = auth.uid());

-- ============================================================================
-- 9. FUNCTIONS
-- ============================================================================

-- 9.1 Update effectiveness score trigger
CREATE OR REPLACE FUNCTION update_rule_effectiveness()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE sales_brain_rules
    SET effectiveness_score = (
        CASE 
            WHEN times_applied > 0 
            THEN times_helpful::numeric / times_applied 
            ELSE NULL 
        END
    ),
    updated_at = NOW()
    WHERE id = NEW.rule_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger für Effectiveness Score Update
DROP TRIGGER IF EXISTS trg_update_effectiveness ON rule_applications;
CREATE TRIGGER trg_update_effectiveness
    AFTER INSERT OR UPDATE OF was_helpful ON rule_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_rule_effectiveness();

-- 9.2 Get rules for context
CREATE OR REPLACE FUNCTION get_rules_for_context(
    p_user_id UUID,
    p_company_id UUID,
    p_channel TEXT DEFAULT NULL,
    p_lead_status TEXT DEFAULT NULL,
    p_message_type TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    rule_type rule_type,
    scope rule_scope,
    priority rule_priority,
    title TEXT,
    instruction TEXT,
    example_bad TEXT,
    example_good TEXT,
    context JSONB,
    effectiveness_score NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        r.id,
        r.rule_type,
        r.scope,
        r.priority,
        r.title,
        r.instruction,
        r.example_bad,
        r.example_good,
        r.context,
        r.effectiveness_score
    FROM sales_brain_rules r
    WHERE r.company_id = p_company_id
      AND r.is_active = true
      AND (
          (r.scope = 'personal' AND r.user_id = p_user_id) OR
          r.scope = 'team' OR
          r.scope = 'global'
      )
      AND (
          p_channel IS NULL OR 
          r.context->>'channel' = p_channel OR 
          r.context->>'channel' IS NULL
      )
      AND (
          p_lead_status IS NULL OR 
          r.context->>'lead_status' = p_lead_status OR 
          r.context->>'lead_status' IS NULL
      )
      AND (
          p_message_type IS NULL OR 
          r.context->>'message_type' = p_message_type OR 
          r.context->>'message_type' IS NULL
      )
    ORDER BY 
        CASE r.priority 
            WHEN 'override' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'normal' THEN 3 
            ELSE 4 
        END,
        r.effectiveness_score DESC NULLS LAST,
        r.times_applied DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9.3 Get pending corrections (for rule extraction)
CREATE OR REPLACE FUNCTION get_pending_corrections(
    p_user_id UUID,
    p_limit INT DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    original_suggestion TEXT,
    user_final_text TEXT,
    channel TEXT,
    lead_status TEXT,
    message_type TEXT,
    similarity_score NUMERIC,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.original_suggestion,
        c.user_final_text,
        c.channel,
        c.lead_status,
        c.message_type,
        c.similarity_score,
        c.created_at
    FROM user_corrections c
    WHERE c.user_id = p_user_id
      AND c.rule_extracted = false
      AND c.user_feedback IS NULL
      AND c.similarity_score < 0.9  -- Only significantly different
    ORDER BY c.created_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9.4 Get users for morning briefing
CREATE OR REPLACE FUNCTION get_users_for_morning_push(
    p_hour INT,
    p_minute INT DEFAULT 0
)
RETURNS TABLE (
    user_id UUID,
    timezone TEXT,
    morning_time TIME
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ps.user_id,
        ps.timezone,
        ps.morning_time
    FROM push_schedules ps
    WHERE ps.morning_enabled = true
      AND ps.push_token IS NOT NULL
      AND EXTRACT(DOW FROM NOW() AT TIME ZONE ps.timezone) + 1 = ANY(ps.morning_days)
      AND EXTRACT(HOUR FROM ps.morning_time) = p_hour
      AND ABS(EXTRACT(MINUTE FROM ps.morning_time) - p_minute) <= 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9.5 Get users for evening recap
CREATE OR REPLACE FUNCTION get_users_for_evening_push(
    p_hour INT,
    p_minute INT DEFAULT 0
)
RETURNS TABLE (
    user_id UUID,
    timezone TEXT,
    evening_time TIME
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ps.user_id,
        ps.timezone,
        ps.evening_time
    FROM push_schedules ps
    WHERE ps.evening_enabled = true
      AND ps.push_token IS NOT NULL
      AND EXTRACT(DOW FROM NOW() AT TIME ZONE ps.timezone) + 1 = ANY(ps.evening_days)
      AND EXTRACT(HOUR FROM ps.evening_time) = p_hour
      AND ABS(EXTRACT(MINUTE FROM ps.evening_time) - p_minute) <= 5;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 10. COMMENTS
-- ============================================================================

COMMENT ON TABLE sales_brain_rules IS 'Selbstlernende Regeln aus User-Korrekturen';
COMMENT ON TABLE rule_applications IS 'Log wann welche Regel angewendet wurde';
COMMENT ON TABLE user_corrections IS 'Rohdaten für Regel-Extraktion aus User-Korrekturen';
COMMENT ON TABLE push_schedules IS 'Push Notification Schedules (Morning Briefing, Evening Recap)';
COMMENT ON TABLE push_history IS 'Gesendete Push Notifications mit Tracking';

COMMENT ON COLUMN sales_brain_rules.context IS 'JSON mit Kontextfiltern: channel, lead_status, message_type, vertical';
COMMENT ON COLUMN sales_brain_rules.instruction IS 'Die eigentliche Anweisung für CHIEF';
COMMENT ON COLUMN sales_brain_rules.effectiveness_score IS 'Berechneter Score: times_helpful / times_applied';
COMMENT ON COLUMN user_corrections.similarity_score IS '0.0 = komplett anders, 1.0 = identisch';
COMMENT ON COLUMN push_schedules.morning_days IS 'Array der Wochentage: 1=Mo, 7=So';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================


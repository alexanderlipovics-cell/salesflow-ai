-- ============================================================================
-- LIVING OS - SELF-EVOLVING SALES INTELLIGENCE SYSTEM
-- Override Loop, Command Line, Team Broadcast, Learning Cases
-- ============================================================================
--
-- Dieses System macht Sales Flow AI zu einem SELBSTLERNENDEN BETRIEBSSYSTEM:
-- 
-- 1. OVERRIDE LOOP: Erkennt wenn User CHIEF-Vorschläge ändert → Pattern-Erkennung
-- 2. COMMAND LINE: "CHIEF, bei 'zu teuer' keine Rabatte" → Strukturierte Regeln
-- 3. TEAM BROADCAST: Best Practices vom Leader ans Team → Skalierte Exzellenz
-- 4. LEARNING CASES: Echte Gespräche importieren → Trainingsmaterial
--
-- ============================================================================

-- ===================
-- PHASE 1: ENUMS
-- ===================

-- Signal Type: Wie wurde gelernt?
DO $$ BEGIN
    CREATE TYPE learning_signal_type AS ENUM (
        'implicit_override',     -- User hat Vorschlag modifiziert
        'explicit_command',      -- User hat expliziten Befehl gegeben
        'template_created',      -- User hat Template erstellt
        'template_liked',        -- User hat Template positiv bewertet
        'template_rejected'      -- User hat Template abgelehnt
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Rule Status: Lifecycle einer Regel
DO $$ BEGIN
    CREATE TYPE rule_status AS ENUM (
        'candidate',             -- Noch nicht genug Signale
        'active',                -- Aktiv, wird angewendet
        'testing',               -- Im A/B-Test
        'archived',              -- Deaktiviert
        'rejected'               -- Vom User abgelehnt
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Broadcast Status: Lifecycle eines Team-Broadcasts
DO $$ BEGIN
    CREATE TYPE broadcast_status AS ENUM (
        'suggested',             -- System schlägt vor
        'leader_approved',       -- Leader hat bestätigt
        'team_active',           -- Fürs Team aktiv
        'team_archived'          -- Archiviert
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN RAISE NOTICE '✅ Phase 1: Enums erstellt'; END $$;

-- ===================
-- PHASE 2: TEAMS TABLE (falls nicht vorhanden)
-- ===================

CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    leader_id UUID REFERENCES auth.users(id),
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',  -- 'leader', 'admin', 'member'
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

DO $$ BEGIN RAISE NOTICE '✅ Phase 2: Teams-Tabellen erstellt'; END $$;

-- ===================
-- PHASE 3: LEARNING SIGNALS
-- ===================

-- Jede Korrektur wird als Signal gespeichert
CREATE TABLE IF NOT EXISTS learning_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id),
    
    -- Was wurde korrigiert?
    signal_type learning_signal_type NOT NULL,
    
    -- Original vs. Final
    original_text TEXT NOT NULL,
    final_text TEXT NOT NULL,
    
    -- Kontext
    context JSONB NOT NULL DEFAULT '{}',
    -- {
    --   "channel": "whatsapp",
    --   "lead_status": "warm",
    --   "message_type": "follow_up",
    --   "objection_type": "busy",
    --   "template_id": "...",
    --   "lead_id": "..."
    -- }
    
    -- Was wurde geändert? (AI-Analyse)
    detected_changes JSONB,
    -- {
    --   "changes": ["tone_changed", "length_reduced", "emoji_removed"],
    --   "pattern": "shorter_more_direct",
    --   "significance": "high"
    -- }
    
    -- Similarity Score (wie unterschiedlich?)
    similarity_score NUMERIC(3,2),  -- 0-1, niedriger = mehr Unterschied
    
    -- Performance (später tracken)
    was_sent BOOLEAN DEFAULT true,
    got_reply BOOLEAN,
    reply_sentiment TEXT,  -- 'positive', 'neutral', 'negative'
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN RAISE NOTICE '✅ Phase 3: Learning Signals erstellt'; END $$;

-- ===================
-- PHASE 4: PATTERN DETECTION
-- ===================

-- Aggregierte Patterns aus Signalen
CREATE TABLE IF NOT EXISTS learning_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id),
    team_id UUID REFERENCES teams(id),
    
    -- Pattern-Beschreibung
    pattern_type TEXT NOT NULL,
    -- 'shorter_messages', 'no_emojis', 'direct_cta', 'informal_greeting', etc.
    
    pattern_description TEXT,
    
    -- Kontext wo Pattern gilt
    context_filter JSONB DEFAULT '{}',
    -- {
    --   "channels": ["whatsapp", "instagram"],
    --   "message_types": ["follow_up"],
    --   "lead_statuses": ["warm", "hot"]
    -- }
    
    -- Statistiken
    signal_count INTEGER DEFAULT 0,
    success_rate NUMERIC(5,2),  -- Reply-Rate wenn Pattern angewendet
    
    -- Status
    status rule_status DEFAULT 'candidate',
    promoted_to_rule_id UUID,  -- FK zu command_rules falls promoted
    
    -- Thresholds
    min_signals_for_promotion INTEGER DEFAULT 5,
    min_success_rate_for_promotion NUMERIC(5,2) DEFAULT 0.3,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, pattern_type)
);

DO $$ BEGIN RAISE NOTICE '✅ Phase 4: Learning Patterns erstellt'; END $$;

-- ===================
-- PHASE 5: COMMAND RULES
-- ===================

-- Explizite Befehle vom User
CREATE TABLE IF NOT EXISTS command_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id),
    team_id UUID REFERENCES teams(id),
    
    -- Original Command
    original_command TEXT NOT NULL,
    -- z.B. "CHIEF, ab jetzt bei 'zu teuer': keine Rabatte, immer ROI-Fragen"
    
    -- Parsed Rule
    rule_type TEXT NOT NULL,
    -- 'reply_strategy', 'tone', 'structure', 'never_do', 'always_do'
    
    -- Trigger (wann gilt die Regel?)
    trigger_config JSONB NOT NULL,
    -- {
    --   "trigger_type": "objection",
    --   "trigger_pattern": ["zu teuer", "kein budget", "kostet zu viel"],
    --   "channels": ["all"],
    --   "lead_statuses": ["all"]
    -- }
    
    -- Action (was soll passieren?)
    action_config JSONB NOT NULL,
    -- {
    --   "actions": ["never_offer_discount", "use_template_group:roi_questions"],
    --   "instruction": "Stelle immer erst ROI-Fragen, bevor du über Preis sprichst"
    -- }
    
    -- Beispiele (vom User oder generiert)
    examples JSONB,
    -- [
    --   {"bad": "Ich kann dir 10% Rabatt geben", "good": "Was wäre es dir wert, wenn..."}
    -- ]
    
    -- Priorität (höher = wichtiger)
    priority INTEGER DEFAULT 50,  -- 0-100
    
    -- Scope
    scope TEXT DEFAULT 'personal',  -- 'personal', 'team', 'company'
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Statistiken
    times_applied INTEGER DEFAULT 0,
    times_followed INTEGER DEFAULT 0,  -- User hat Output unverändert gesendet
    times_overridden INTEGER DEFAULT 0,  -- User hat trotzdem geändert
    
    -- Versioning
    version INTEGER DEFAULT 1,
    previous_version_id UUID REFERENCES command_rules(id),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN RAISE NOTICE '✅ Phase 5: Command Rules erstellt'; END $$;

-- ===================
-- PHASE 6: TEAM BROADCASTS
-- ===================

-- Best Practices die fürs Team geteilt werden
CREATE TABLE IF NOT EXISTS team_broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Wer hat es erstellt?
    creator_user_id UUID NOT NULL REFERENCES auth.users(id),
    team_id UUID NOT NULL REFERENCES teams(id),
    company_id UUID REFERENCES companies(id),
    
    -- Was wird geteilt?
    broadcast_type TEXT NOT NULL,
    -- 'template', 'rule', 'strategy', 'objection_handler'
    
    -- Source
    source_type TEXT NOT NULL,
    -- 'auto_detected' (System hat Pattern erkannt)
    -- 'leader_created' (Leader hat manuell erstellt)
    -- 'promoted_from_personal' (war erst personal, jetzt Team)
    
    source_id UUID,  -- ID des ursprünglichen Items
    
    -- Content
    title TEXT NOT NULL,
    description TEXT,
    content JSONB NOT NULL,
    -- Je nach broadcast_type unterschiedlich
    
    -- Performance-Daten (warum wurde es promoted?)
    performance_data JSONB,
    -- {
    --   "send_count": 50,
    --   "reply_rate": 0.65,
    --   "positive_rate": 0.80,
    --   "improvement_vs_average": "+25%"
    -- }
    
    -- Status
    status broadcast_status DEFAULT 'suggested',
    
    -- Approval
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMPTZ,
    rejection_reason TEXT,
    
    -- Team-Nutzung
    team_adoption_count INTEGER DEFAULT 0,
    team_success_rate NUMERIC(5,2),
    
    -- Visibility
    show_in_morning_briefing BOOLEAN DEFAULT false,
    show_in_template_library BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN RAISE NOTICE '✅ Phase 6: Team Broadcasts erstellt'; END $$;

-- ===================
-- PHASE 7: LEARNING CASES
-- ===================

-- Importierte Gespräche als Trainingsmaterial
CREATE TABLE IF NOT EXISTS learning_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id),
    
    -- Metadaten
    vertical TEXT,  -- 'network_marketing', 'art', 'coaching', 'real_estate'
    product_or_service TEXT,
    channel TEXT,  -- 'instagram_dm', 'whatsapp', 'email'
    
    -- Ziel & Ergebnis
    conversation_goal TEXT,  -- 'schedule_call', 'close_sale', 'reactivation'
    outcome TEXT,  -- 'success', 'pending', 'lost', 'ongoing'
    outcome_details TEXT,
    
    -- Der Conversation Content
    raw_conversation TEXT NOT NULL,
    
    -- Strukturierte Extraktion (AI-generiert)
    extracted_data JSONB,
    -- {
    --   "participants": ["seller", "customer"],
    --   "seller_name": "Alex",
    --   "customer_name": "Ela",
    --   "message_count": 12,
    --   "timespan_days": 45,
    --   "key_objections": ["busy", "think_about_it"],
    --   "successful_techniques": ["pressure_off", "future_pacing"],
    --   "best_messages": [...],
    --   "deal_state_progression": ["none", "considering", "pending_payment"]
    -- }
    
    -- Extrahierte Templates
    extracted_templates JSONB,
    -- [
    --   {
    --     "use_case": "follow_up_after_busy",
    --     "message": "Ja sicher, will dich nicht stressen...",
    --     "context": {...},
    --     "effectiveness_indicators": ["reopened_conversation"]
    --   }
    -- ]
    
    -- Verkäufer-Stil Analyse
    seller_style JSONB,
    -- {
    --   "tone": "friendly_casual",
    --   "pressure_level": "low",
    --   "emoji_usage": "moderate",
    --   "message_length": "medium",
    --   "response_speed": "same_day",
    --   "closing_style": "soft_ask"
    -- }
    
    -- Source Info (wessen Gespräch?)
    source_type TEXT DEFAULT 'own',  -- 'own', 'team_member', 'external'
    source_seller_name TEXT,
    source_seller_skill_level TEXT,  -- 'rookie', 'advanced', 'pro'
    anonymized BOOLEAN DEFAULT false,
    
    -- Processing Status
    processing_status TEXT DEFAULT 'pending',
    -- 'pending', 'processing', 'completed', 'failed'
    processed_at TIMESTAMPTZ,
    
    -- Quality
    quality_score NUMERIC(3,2),  -- 0-1, wie wertvoll ist dieses Case?
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extrahierte Objections aus Learning Cases
CREATE TABLE IF NOT EXISTS extracted_objections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    learning_case_id UUID REFERENCES learning_cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Objection
    objection_type TEXT NOT NULL,
    -- 'price', 'time', 'think_about_it', 'not_interested', 'competitor'
    
    objection_text TEXT NOT NULL,  -- Original-Text vom Kunden
    objection_context TEXT,  -- Kontext drumherum
    
    -- Response
    response_text TEXT,  -- Wie wurde reagiert?
    response_technique TEXT,  -- 'reframe', 'empathize', 'question', 'social_proof'
    
    -- Outcome
    response_worked BOOLEAN,
    outcome_notes TEXT,
    
    -- Template-Kandidat?
    promoted_to_template BOOLEAN DEFAULT false,
    template_id UUID,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN RAISE NOTICE '✅ Phase 7: Learning Cases erstellt'; END $$;

-- ===================
-- PHASE 8: USER SETTINGS ERWEITERUNG
-- ===================

-- Erweitere user_settings um skill_level falls nicht vorhanden
DO $$ 
BEGIN
    -- Check if column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_settings' 
        AND column_name = 'skill_level'
    ) THEN
        ALTER TABLE user_settings ADD COLUMN skill_level TEXT DEFAULT 'advanced';
    END IF;
EXCEPTION
    WHEN undefined_table THEN
        -- Tabelle existiert nicht, erstellen
        CREATE TABLE user_settings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            skill_level TEXT DEFAULT 'advanced',  -- 'rookie', 'advanced', 'pro'
            daily_targets JSONB DEFAULT '{}',
            preferences JSONB DEFAULT '{}',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            UNIQUE(user_id)
        );
END $$;

DO $$ BEGIN RAISE NOTICE '✅ Phase 8: User Settings erweitert'; END $$;

-- ===================
-- PHASE 9: INDEXES
-- ===================

-- Learning Signals
CREATE INDEX IF NOT EXISTS idx_signals_user_type ON learning_signals(user_id, signal_type);
CREATE INDEX IF NOT EXISTS idx_signals_context ON learning_signals USING GIN(context);
CREATE INDEX IF NOT EXISTS idx_signals_recent ON learning_signals(user_id, created_at DESC);

-- Learning Patterns
CREATE INDEX IF NOT EXISTS idx_patterns_user_status ON learning_patterns(user_id, status);
CREATE INDEX IF NOT EXISTS idx_patterns_type ON learning_patterns(pattern_type);

-- Command Rules
CREATE INDEX IF NOT EXISTS idx_commands_user_active ON command_rules(user_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_commands_trigger ON command_rules USING GIN(trigger_config);
CREATE INDEX IF NOT EXISTS idx_commands_scope ON command_rules(scope, team_id);

-- Team Broadcasts
CREATE INDEX IF NOT EXISTS idx_broadcasts_team_status ON team_broadcasts(team_id, status);
CREATE INDEX IF NOT EXISTS idx_broadcasts_creator ON team_broadcasts(creator_user_id);

-- Learning Cases
CREATE INDEX IF NOT EXISTS idx_cases_user_vertical ON learning_cases(user_id, vertical);
CREATE INDEX IF NOT EXISTS idx_cases_outcome ON learning_cases(outcome);
CREATE INDEX IF NOT EXISTS idx_cases_processing ON learning_cases(processing_status);

-- Extracted Objections
CREATE INDEX IF NOT EXISTS idx_objections_type ON extracted_objections(objection_type);
CREATE INDEX IF NOT EXISTS idx_objections_case ON extracted_objections(learning_case_id);

-- Teams
CREATE INDEX IF NOT EXISTS idx_teams_company ON teams(company_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);

DO $$ BEGIN RAISE NOTICE '✅ Phase 9: Indexes erstellt'; END $$;

-- ===================
-- PHASE 10: ROW LEVEL SECURITY
-- ===================

ALTER TABLE learning_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE command_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_objections ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Learning Signals: Nur eigene
DROP POLICY IF EXISTS "signals_own_only" ON learning_signals;
CREATE POLICY "signals_own_only" ON learning_signals 
    FOR ALL USING (user_id = auth.uid());

-- Learning Patterns: Eigene + Team wenn shared
DROP POLICY IF EXISTS "patterns_own" ON learning_patterns;
CREATE POLICY "patterns_own" ON learning_patterns 
    FOR ALL USING (user_id = auth.uid());

-- Command Rules: Eigene + Team/Company Rules sehen
DROP POLICY IF EXISTS "rules_view_own_and_team" ON command_rules;
CREATE POLICY "rules_view_own_and_team" ON command_rules 
    FOR SELECT USING (
        user_id = auth.uid() 
        OR (scope IN ('team', 'company') AND team_id IN (
            SELECT team_id FROM team_members WHERE user_id = auth.uid()
        ))
    );

DROP POLICY IF EXISTS "rules_manage_own" ON command_rules;
CREATE POLICY "rules_manage_own" ON command_rules 
    FOR ALL USING (user_id = auth.uid());

-- Team Broadcasts: Team-Mitglieder können sehen
DROP POLICY IF EXISTS "broadcasts_view_team" ON team_broadcasts;
CREATE POLICY "broadcasts_view_team" ON team_broadcasts 
    FOR SELECT USING (
        team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "broadcasts_leaders_manage" ON team_broadcasts;
CREATE POLICY "broadcasts_leaders_manage" ON team_broadcasts 
    FOR ALL USING (
        creator_user_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM team_members 
            WHERE user_id = auth.uid() 
              AND team_id = team_broadcasts.team_id 
              AND role IN ('leader', 'admin')
        )
    );

-- Learning Cases: Nur eigene
DROP POLICY IF EXISTS "cases_own_only" ON learning_cases;
CREATE POLICY "cases_own_only" ON learning_cases 
    FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "objections_own_only" ON extracted_objections;
CREATE POLICY "objections_own_only" ON extracted_objections 
    FOR ALL USING (user_id = auth.uid());

-- Teams: Mitglieder können sehen
DROP POLICY IF EXISTS "teams_members_view" ON teams;
CREATE POLICY "teams_members_view" ON teams 
    FOR SELECT USING (
        id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
        OR company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
    );

-- Team Members
DROP POLICY IF EXISTS "team_members_view" ON team_members;
CREATE POLICY "team_members_view" ON team_members 
    FOR SELECT USING (
        user_id = auth.uid()
        OR team_id IN (SELECT team_id FROM team_members tm WHERE tm.user_id = auth.uid())
    );

DO $$ BEGIN RAISE NOTICE '✅ Phase 10: RLS Policies erstellt'; END $$;

-- ===================
-- PHASE 11: FUNCTIONS
-- ===================

-- Finde passende Command Rules für einen Kontext
CREATE OR REPLACE FUNCTION get_matching_command_rules(
    p_user_id UUID,
    p_context JSONB
)
RETURNS TABLE (
    rule_id UUID,
    rule_type TEXT,
    action_config JSONB,
    priority INTEGER,
    scope TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cr.id,
        cr.rule_type,
        cr.action_config,
        cr.priority,
        cr.scope
    FROM command_rules cr
    WHERE cr.is_active = true
      AND (
          cr.user_id = p_user_id  -- Personal rules
          OR (cr.scope IN ('team', 'company') AND cr.team_id IN (
              SELECT tm.team_id FROM team_members tm WHERE tm.user_id = p_user_id
          ))
      )
      -- Trigger matching
      AND (
          -- Check if trigger pattern matches
          cr.trigger_config->>'trigger_type' = p_context->>'trigger_type'
          OR cr.trigger_config->>'trigger_type' = 'all'
      )
      AND (
          -- Check channel
          cr.trigger_config->'channels' ? (p_context->>'channel')
          OR cr.trigger_config->'channels' ? 'all'
          OR cr.trigger_config->'channels' IS NULL
      )
    ORDER BY cr.priority DESC, cr.scope ASC;  -- Personal > Team > Company
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Detect patterns from recent signals
CREATE OR REPLACE FUNCTION detect_patterns_for_user(p_user_id UUID)
RETURNS void AS $$
DECLARE
    v_pattern RECORD;
BEGIN
    -- Find recurring patterns in last 30 days
    FOR v_pattern IN
        SELECT 
            detected_changes->>'pattern' as pattern_type,
            context->>'channel' as channel,
            context->>'message_type' as message_type,
            COUNT(*) as signal_count,
            AVG(CASE WHEN got_reply THEN 1 ELSE 0 END) as success_rate
        FROM learning_signals
        WHERE user_id = p_user_id
          AND created_at > NOW() - INTERVAL '30 days'
          AND detected_changes->>'pattern' IS NOT NULL
        GROUP BY 
            detected_changes->>'pattern',
            context->>'channel',
            context->>'message_type'
        HAVING COUNT(*) >= 3
    LOOP
        -- Upsert pattern
        INSERT INTO learning_patterns (
            user_id, pattern_type, context_filter, 
            signal_count, success_rate, status
        ) VALUES (
            p_user_id,
            v_pattern.pattern_type,
            jsonb_build_object(
                'channels', ARRAY[v_pattern.channel],
                'message_types', ARRAY[v_pattern.message_type]
            ),
            v_pattern.signal_count,
            v_pattern.success_rate,
            CASE 
                WHEN v_pattern.signal_count >= 5 AND v_pattern.success_rate >= 0.3 
                THEN 'active'::rule_status
                ELSE 'candidate'::rule_status
            END
        )
        ON CONFLICT (user_id, pattern_type) 
        DO UPDATE SET
            signal_count = EXCLUDED.signal_count,
            success_rate = EXCLUDED.success_rate,
            status = EXCLUDED.status,
            updated_at = NOW();
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get User's Active Rules and Patterns for CHIEF Context
CREATE OR REPLACE FUNCTION get_user_living_os_context(p_user_id UUID)
RETURNS TABLE (
    rules JSONB,
    patterns JSONB,
    broadcasts JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        -- Active Rules
        COALESCE(
            (SELECT jsonb_agg(row_to_json(r))
             FROM (
                 SELECT id, rule_type, trigger_config, action_config, examples, priority, scope
                 FROM command_rules
                 WHERE is_active = true
                   AND (user_id = p_user_id 
                        OR (scope IN ('team', 'company') AND team_id IN (
                            SELECT team_id FROM team_members WHERE user_id = p_user_id
                        )))
                 ORDER BY priority DESC
                 LIMIT 10
             ) r),
            '[]'::jsonb
        ) as rules,
        
        -- Active Patterns
        COALESCE(
            (SELECT jsonb_agg(row_to_json(p))
             FROM (
                 SELECT id, pattern_type, pattern_description, context_filter, success_rate
                 FROM learning_patterns
                 WHERE user_id = p_user_id
                   AND status = 'active'
                 ORDER BY signal_count DESC
                 LIMIT 5
             ) p),
            '[]'::jsonb
        ) as patterns,
        
        -- Recent Team Broadcasts
        COALESCE(
            (SELECT jsonb_agg(row_to_json(b))
             FROM (
                 SELECT id, title, description, content, performance_data, broadcast_type
                 FROM team_broadcasts
                 WHERE status = 'team_active'
                   AND team_id IN (SELECT team_id FROM team_members WHERE user_id = p_user_id)
                 ORDER BY approved_at DESC
                 LIMIT 3
             ) b),
            '[]'::jsonb
        ) as broadcasts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN RAISE NOTICE '✅ Phase 11: Functions erstellt'; END $$;

-- ===================
-- PHASE 12: TRIGGERS
-- ===================

-- Updated_at Trigger für neue Tabellen
DROP TRIGGER IF EXISTS update_learning_patterns_updated_at ON learning_patterns;
CREATE TRIGGER update_learning_patterns_updated_at
    BEFORE UPDATE ON learning_patterns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_command_rules_updated_at ON command_rules;
CREATE TRIGGER update_command_rules_updated_at
    BEFORE UPDATE ON command_rules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_team_broadcasts_updated_at ON team_broadcasts;
CREATE TRIGGER update_team_broadcasts_updated_at
    BEFORE UPDATE ON team_broadcasts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DO $$ BEGIN RAISE NOTICE '✅ Phase 12: Triggers erstellt'; END $$;

-- ============================================================================
-- DEPLOYMENT COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║  🚀 LIVING OS DEPLOYMENT ERFOLGREICH!                          ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Erstellte Tabellen:';
    RAISE NOTICE '   • teams & team_members';
    RAISE NOTICE '   • learning_signals';
    RAISE NOTICE '   • learning_patterns';
    RAISE NOTICE '   • command_rules';
    RAISE NOTICE '   • team_broadcasts';
    RAISE NOTICE '   • learning_cases';
    RAISE NOTICE '   • extracted_objections';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Erstellte Functions:';
    RAISE NOTICE '   • get_matching_command_rules(user_id, context)';
    RAISE NOTICE '   • detect_patterns_for_user(user_id)';
    RAISE NOTICE '   • get_user_living_os_context(user_id)';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Living OS Features:';
    RAISE NOTICE '   ✅ Override Loop - Lernt aus Korrekturen';
    RAISE NOTICE '   ✅ Command Line - Natürliche Befehle';
    RAISE NOTICE '   ✅ Team Broadcast - Best Practices teilen';
    RAISE NOTICE '   ✅ Learning Cases - Gespräche importieren';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- PHASE 13: COLLECTIVE INTELLIGENCE
-- Lernen von anderen Usern (anonymisiert)
-- ============================================================================

-- Aggregierte Erfolgsstrategien (Company/Vertical-weit)
CREATE TABLE IF NOT EXISTS collective_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Scope: company oder vertical
    scope_type TEXT NOT NULL,  -- 'company', 'vertical', 'global'
    company_id UUID REFERENCES companies(id),
    vertical_id TEXT,
    
    -- Was wurde gelernt?
    insight_type TEXT NOT NULL,
    -- 'top_template', 'best_pattern', 'winning_objection_handler', 
    -- 'optimal_timing', 'best_channel', 'message_style'
    
    -- Insight Details
    title TEXT NOT NULL,
    description TEXT,
    content JSONB NOT NULL,
    -- Für top_template: {"template_text": "...", "category": "..."}
    -- Für best_pattern: {"pattern": "shorter_direct", "context": {...}}
    -- Für winning_objection_handler: {"objection": "...", "response": "...", "technique": "..."}
    
    -- Aggregierte Performance-Daten
    sample_size INTEGER DEFAULT 0,  -- Von wie vielen Usern?
    success_rate NUMERIC(5,2),
    avg_reply_rate NUMERIC(5,2),
    avg_conversion_rate NUMERIC(5,2),
    improvement_vs_average NUMERIC(5,2),  -- +X% vs Durchschnitt
    
    -- Confidence
    confidence_level TEXT DEFAULT 'low',  -- 'low', 'medium', 'high'
    min_sample_for_confidence INTEGER DEFAULT 10,
    
    -- Zeitraum
    period_start DATE,
    period_end DATE,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    show_to_users BOOLEAN DEFAULT true,
    
    -- Meta
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Top Performer Benchmarks
CREATE TABLE IF NOT EXISTS performer_benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    vertical_id TEXT,
    
    -- Zeitraum
    period_type TEXT NOT NULL,  -- 'weekly', 'monthly'
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Benchmark-Typ
    benchmark_type TEXT NOT NULL,
    -- 'reply_rate', 'conversion_rate', 'avg_messages_to_close', 
    -- 'best_time_to_contact', 'optimal_message_length'
    
    -- Werte
    top_10_percent NUMERIC(10,2),  -- Was erreichen die Top 10%?
    top_25_percent NUMERIC(10,2),
    median NUMERIC(10,2),
    bottom_25_percent NUMERIC(10,2),
    
    -- Details
    details JSONB,
    -- Für best_time: {"hour": 10, "day": "tuesday", "performance": 0.65}
    -- Für message_length: {"optimal_words": 45, "range": [30, 60]}
    
    sample_size INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Was ein User von Collective Insights übernommen hat
CREATE TABLE IF NOT EXISTS collective_adoptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    insight_id UUID NOT NULL REFERENCES collective_insights(id) ON DELETE CASCADE,
    
    -- Wann übernommen?
    adopted_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Performance nach Übernahme
    uses_since_adoption INTEGER DEFAULT 0,
    success_rate_before NUMERIC(5,2),  -- User's Rate vor Adoption
    success_rate_after NUMERIC(5,2),   -- Rate nach Adoption
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    dismissed_at TIMESTAMPTZ,
    dismiss_reason TEXT,
    
    UNIQUE(user_id, insight_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_collective_insights_scope ON collective_insights(scope_type, company_id, vertical_id);
CREATE INDEX IF NOT EXISTS idx_collective_insights_type ON collective_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_collective_insights_active ON collective_insights(is_active, show_to_users);
CREATE INDEX IF NOT EXISTS idx_benchmarks_company_period ON performer_benchmarks(company_id, period_type, period_start);
CREATE INDEX IF NOT EXISTS idx_adoptions_user ON collective_adoptions(user_id);

-- RLS
ALTER TABLE collective_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE performer_benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE collective_adoptions ENABLE ROW LEVEL SECURITY;

-- Alle können Insights sehen (anonymisiert)
DROP POLICY IF EXISTS "insights_viewable" ON collective_insights;
CREATE POLICY "insights_viewable" ON collective_insights 
    FOR SELECT USING (is_active = true AND show_to_users = true);

-- Benchmarks für eigene Company/Vertical
DROP POLICY IF EXISTS "benchmarks_viewable" ON performer_benchmarks;
CREATE POLICY "benchmarks_viewable" ON performer_benchmarks 
    FOR SELECT USING (true);  -- Vereinfacht

-- Eigene Adoptions
DROP POLICY IF EXISTS "adoptions_own" ON collective_adoptions;
CREATE POLICY "adoptions_own" ON collective_adoptions 
    FOR ALL USING (user_id = auth.uid());

-- ============================================================================
-- FUNCTION: Aggregate Collective Insights
-- ============================================================================

CREATE OR REPLACE FUNCTION compute_collective_insights(
    p_company_id UUID DEFAULT NULL,
    p_vertical_id TEXT DEFAULT NULL,
    p_days INTEGER DEFAULT 30
)
RETURNS void AS $$
DECLARE
    v_scope_type TEXT;
    v_period_start DATE;
    v_period_end DATE;
BEGIN
    v_period_end := CURRENT_DATE;
    v_period_start := CURRENT_DATE - (p_days || ' days')::INTERVAL;
    
    -- Determine scope
    IF p_company_id IS NOT NULL THEN
        v_scope_type := 'company';
    ELSIF p_vertical_id IS NOT NULL THEN
        v_scope_type := 'vertical';
    ELSE
        v_scope_type := 'global';
    END IF;
    
    -- 1. Aggregate Top Templates
    INSERT INTO collective_insights (
        scope_type, company_id, vertical_id,
        insight_type, title, description, content,
        sample_size, avg_reply_rate, avg_conversion_rate,
        confidence_level, period_start, period_end
    )
    SELECT 
        v_scope_type,
        p_company_id,
        p_vertical_id,
        'top_template',
        'Top-Performing Template',
        'Dieses Template hat bei vielen Usern überdurchschnittlich gut funktioniert.',
        jsonb_build_object(
            'template_name', t.name,
            'category', t.category,
            'preview', LEFT(t.content, 100) || '...'
        ),
        COUNT(DISTINCT le.user_id) as sample_size,
        AVG(CASE WHEN le.response_received THEN 1.0 ELSE 0.0 END) as reply_rate,
        AVG(CASE WHEN le.converted_to_next_stage THEN 1.0 ELSE 0.0 END) as conv_rate,
        CASE 
            WHEN COUNT(DISTINCT le.user_id) >= 20 THEN 'high'
            WHEN COUNT(DISTINCT le.user_id) >= 10 THEN 'medium'
            ELSE 'low'
        END,
        v_period_start,
        v_period_end
    FROM templates t
    JOIN learning_events le ON le.template_id = t.id
    WHERE le.created_at >= v_period_start
        AND (p_company_id IS NULL OR t.company_id = p_company_id)
    GROUP BY t.id, t.name, t.category, t.content
    HAVING COUNT(*) >= 30  -- Mindestens 30 Nutzungen
        AND AVG(CASE WHEN le.response_received THEN 1.0 ELSE 0.0 END) > 0.4  -- >40% Reply
    ORDER BY AVG(CASE WHEN le.response_received THEN 1.0 ELSE 0.0 END) DESC
    LIMIT 5
    ON CONFLICT DO NOTHING;
    
    -- 2. Aggregate Best Patterns (aus learning_patterns)
    INSERT INTO collective_insights (
        scope_type, company_id, vertical_id,
        insight_type, title, description, content,
        sample_size, success_rate, confidence_level,
        period_start, period_end
    )
    SELECT 
        v_scope_type,
        p_company_id,
        p_vertical_id,
        'best_pattern',
        'Erfolgs-Pattern: ' || lp.pattern_type,
        'Viele erfolgreiche User nutzen dieses Muster.',
        jsonb_build_object(
            'pattern_type', lp.pattern_type,
            'context_filter', lp.context_filter
        ),
        COUNT(*) as sample_size,
        AVG(lp.success_rate) as avg_success,
        CASE 
            WHEN COUNT(*) >= 10 THEN 'high'
            WHEN COUNT(*) >= 5 THEN 'medium'
            ELSE 'low'
        END,
        v_period_start,
        v_period_end
    FROM learning_patterns lp
    WHERE lp.status = 'active'
        AND lp.success_rate > 0.4
        AND (p_company_id IS NULL OR lp.company_id = p_company_id)
    GROUP BY lp.pattern_type, lp.context_filter
    HAVING COUNT(*) >= 3  -- Mindestens 3 User haben dieses Pattern
    ORDER BY AVG(lp.success_rate) DESC
    LIMIT 5
    ON CONFLICT DO NOTHING;
    
    -- 3. Aggregate Winning Objection Handlers
    INSERT INTO collective_insights (
        scope_type, company_id, vertical_id,
        insight_type, title, description, content,
        sample_size, success_rate, confidence_level,
        period_start, period_end
    )
    SELECT 
        v_scope_type,
        p_company_id,
        p_vertical_id,
        'winning_objection_handler',
        'Bewährte Antwort auf: ' || eo.objection_type,
        'Diese Reaktion hat bei vielen Usern funktioniert.',
        jsonb_build_object(
            'objection_type', eo.objection_type,
            'response_technique', eo.response_technique,
            'example_response', LEFT(eo.response_text, 150)
        ),
        COUNT(*) as sample_size,
        AVG(CASE WHEN eo.response_worked THEN 1.0 ELSE 0.0 END) as success_rate,
        CASE 
            WHEN COUNT(*) >= 15 THEN 'high'
            WHEN COUNT(*) >= 8 THEN 'medium'
            ELSE 'low'
        END,
        v_period_start,
        v_period_end
    FROM extracted_objections eo
    JOIN learning_cases lc ON eo.learning_case_id = lc.id
    WHERE eo.response_worked = true
        AND (p_company_id IS NULL OR lc.company_id = p_company_id)
    GROUP BY eo.objection_type, eo.response_technique, eo.response_text
    HAVING COUNT(*) >= 5
    ORDER BY AVG(CASE WHEN eo.response_worked THEN 1.0 ELSE 0.0 END) DESC
    LIMIT 10
    ON CONFLICT DO NOTHING;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Get Insights for User
-- ============================================================================

CREATE OR REPLACE FUNCTION get_collective_insights_for_user(
    p_user_id UUID,
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
    insight_id UUID,
    insight_type TEXT,
    title TEXT,
    description TEXT,
    content JSONB,
    sample_size INTEGER,
    success_rate NUMERIC,
    confidence_level TEXT,
    already_adopted BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    WITH user_context AS (
        SELECT 
            p.company_id,
            p.vertical_id
        FROM profiles p
        WHERE p.id = p_user_id
    )
    SELECT 
        ci.id,
        ci.insight_type,
        ci.title,
        ci.description,
        ci.content,
        ci.sample_size,
        COALESCE(ci.success_rate, ci.avg_reply_rate) as success_rate,
        ci.confidence_level,
        ca.id IS NOT NULL as already_adopted
    FROM collective_insights ci
    CROSS JOIN user_context uc
    LEFT JOIN collective_adoptions ca ON ca.insight_id = ci.id AND ca.user_id = p_user_id
    WHERE ci.is_active = true 
        AND ci.show_to_users = true
        AND ci.confidence_level IN ('medium', 'high')
        AND (
            -- Company-spezifische Insights
            (ci.scope_type = 'company' AND ci.company_id = uc.company_id)
            -- Oder Vertical-spezifische
            OR (ci.scope_type = 'vertical' AND ci.vertical_id = uc.vertical_id)
            -- Oder globale
            OR ci.scope_type = 'global'
        )
    ORDER BY 
        CASE ci.confidence_level WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        ci.success_rate DESC NULLS LAST
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNCTION: Get User Benchmark Position
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_benchmark_position(
    p_user_id UUID,
    p_benchmark_type TEXT DEFAULT 'reply_rate'
)
RETURNS TABLE (
    user_value NUMERIC,
    percentile INTEGER,
    top_10_value NUMERIC,
    median_value NUMERIC,
    improvement_potential NUMERIC,
    tip TEXT
) AS $$
DECLARE
    v_company_id UUID;
    v_user_rate NUMERIC;
BEGIN
    -- Get user's company
    SELECT company_id INTO v_company_id FROM profiles WHERE id = p_user_id;
    
    -- Calculate user's current rate
    SELECT 
        AVG(CASE WHEN response_received THEN 1.0 ELSE 0.0 END)
    INTO v_user_rate
    FROM learning_events
    WHERE user_id = p_user_id
        AND created_at > NOW() - INTERVAL '30 days';
    
    RETURN QUERY
    SELECT 
        v_user_rate,
        CASE 
            WHEN v_user_rate >= pb.top_10_percent THEN 90
            WHEN v_user_rate >= pb.top_25_percent THEN 75
            WHEN v_user_rate >= pb.median THEN 50
            ELSE 25
        END,
        pb.top_10_percent,
        pb.median,
        pb.top_10_percent - COALESCE(v_user_rate, 0),
        CASE 
            WHEN v_user_rate >= pb.top_10_percent THEN 'Du gehörst zu den Top 10%! 🏆'
            WHEN v_user_rate >= pb.median THEN 'Überdurchschnittlich! Mit ein paar Optimierungen könntest du zu den Top 10% gehören.'
            ELSE 'Es gibt Verbesserungspotenzial. Schau dir die Team Best Practices an!'
        END
    FROM performer_benchmarks pb
    WHERE pb.company_id = v_company_id
        AND pb.benchmark_type = p_benchmark_type
        AND pb.period_type = 'monthly'
    ORDER BY pb.period_start DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN RAISE NOTICE '✅ Phase 13: Collective Intelligence erstellt'; END $$;

-- ============================================================================
-- DEPLOYMENT COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║  🧠 COLLECTIVE INTELLIGENCE HINZUGEFÜGT!                       ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Neue Tabellen:';
    RAISE NOTICE '   • collective_insights (aggregierte Erfolgsstrategien)';
    RAISE NOTICE '   • performer_benchmarks (Top-Performer Vergleiche)';
    RAISE NOTICE '   • collective_adoptions (was User übernommen haben)';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Neue Functions:';
    RAISE NOTICE '   • compute_collective_insights() - Aggregiert Learnings';
    RAISE NOTICE '   • get_collective_insights_for_user() - Relevante Insights';
    RAISE NOTICE '   • get_user_benchmark_position() - Wo steht der User?';
    RAISE NOTICE '';
    RAISE NOTICE '🎯 Features:';
    RAISE NOTICE '   ✅ Anonymisiertes Lernen von anderen Usern';
    RAISE NOTICE '   ✅ Company-weite Top-Templates';
    RAISE NOTICE '   ✅ Vertical-Benchmarks';
    RAISE NOTICE '   ✅ "Was machen die Top 10% anders?"';
    RAISE NOTICE '';
END $$;

SELECT '🚀 Living OS - Self-Evolving Sales Intelligence deployed!' as status;


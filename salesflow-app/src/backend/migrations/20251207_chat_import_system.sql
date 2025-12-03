-- ============================================================================
-- CHAT IMPORT SYSTEM - VOLLSTÄNDIGE MIGRATION
-- Conversations, Messages, Contact Plans, Templates
-- ============================================================================

-- ===================
-- CONVERSATIONS
-- ===================

CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    
    -- Source
    channel TEXT NOT NULL,              -- 'whatsapp', 'instagram_dm', 'facebook', 'email', 'sms'
    external_id TEXT,                   -- ID aus externem System
    
    -- Raw Data
    raw_text TEXT,                      -- Original importierter Text
    
    -- Parsed Metadata
    participant_names TEXT[],           -- ['Alex', 'Nadja']
    message_count INTEGER DEFAULT 0,
    first_message_at TIMESTAMPTZ,
    last_message_at TIMESTAMPTZ,
    
    -- Analysis Results
    summary TEXT,                       -- Kurze Zusammenfassung
    detected_language TEXT DEFAULT 'de',
    
    -- Import Info
    import_source TEXT,                 -- 'manual_paste', 'file_upload', 'api_sync'
    imported_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Processing
    processing_status TEXT DEFAULT 'pending',
    -- 'pending', 'processing', 'completed', 'failed'
    processing_error TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================
-- MESSAGES
-- ===================

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    
    -- Sender
    sender_type TEXT NOT NULL,          -- 'user', 'lead', 'unknown'
    sender_name TEXT,
    
    -- Content
    content TEXT NOT NULL,
    content_type TEXT DEFAULT 'text',   -- 'text', 'image', 'voice', 'video', 'file'
    
    -- Timing
    sent_at TIMESTAMPTZ,
    sequence_number INTEGER,            -- Reihenfolge im Gespräch
    
    -- Analysis
    message_intent TEXT,                -- 'greeting', 'question', 'objection', 'interest', 'closing', 'rejection'
    detected_objection_type TEXT,       -- 'price', 'time', 'think_about_it', 'not_interested'
    sentiment TEXT,                     -- 'positive', 'neutral', 'negative'
    
    -- For Template Extraction
    is_template_candidate BOOLEAN DEFAULT false,
    template_use_case TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================
-- CONTACT ACTION TYPE (nur erstellen wenn nicht existiert)
-- ===================

DO $$ BEGIN
    CREATE TYPE contact_action_type AS ENUM (
        'no_action',
        'follow_up_message',
        'call',
        'check_payment',
        'reactivation_follow_up',
        'send_info',
        'schedule_meeting',
        'custom'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ===================
-- CONTACT PLAN STATUS (nur erstellen wenn nicht existiert)
-- ===================

DO $$ BEGIN
    CREATE TYPE contact_plan_status AS ENUM (
        'open',
        'completed',
        'skipped',
        'rescheduled',
        'auto_completed'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ===================
-- CONTACT PLANS
-- ===================

CREATE TABLE IF NOT EXISTS contact_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    
    -- Source
    source_conversation_id UUID REFERENCES conversations(id),
    source_type TEXT DEFAULT 'manual',  -- 'manual', 'chat_import', 'chief_suggestion', 'system_rule'
    
    -- Action
    action_type TEXT NOT NULL,          -- Nutze TEXT statt ENUM für Flexibilität
    action_description TEXT,
    
    -- Timing
    planned_at DATE NOT NULL,
    planned_time TIME,                  -- Optional: konkrete Uhrzeit
    
    -- Suggested Content
    suggested_message TEXT,
    suggested_channel TEXT,             -- Empfohlener Kanal
    
    -- Priority
    priority INTEGER DEFAULT 50,        -- 0-100
    is_urgent BOOLEAN DEFAULT false,
    
    -- Status
    status TEXT DEFAULT 'open',
    completed_at TIMESTAMPTZ,
    completion_note TEXT,
    
    -- Rescheduling
    original_planned_at DATE,
    reschedule_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================
-- CHAT IMPORTS (Batch)
-- ===================

-- Erweitere existierende chat_imports Tabelle oder erstelle neu
CREATE TABLE IF NOT EXISTS chat_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Batch Info
    import_name TEXT,
    total_conversations INTEGER DEFAULT 0,
    processed_conversations INTEGER DEFAULT 0,
    failed_conversations INTEGER DEFAULT 0,
    
    -- Results Summary
    leads_created INTEGER DEFAULT 0,
    leads_updated INTEGER DEFAULT 0,
    templates_extracted INTEGER DEFAULT 0,
    objections_detected INTEGER DEFAULT 0,
    
    -- Raw Data & Analysis
    raw_text TEXT,
    detected_channel TEXT,
    ai_analysis JSONB,
    confidence_score NUMERIC(3,2),
    lead_id UUID REFERENCES leads(id),
    action_taken TEXT,
    
    -- Status
    status TEXT DEFAULT 'pending',
    -- 'pending', 'processing', 'completed', 'failed'
    
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_log JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================
-- LEADS ERWEITERN
-- ===================

-- Falls noch nicht vorhanden
ALTER TABLE leads ADD COLUMN IF NOT EXISTS 
    deal_state TEXT DEFAULT 'none';
    -- 'none', 'considering', 'pending_payment', 'paid', 'on_hold', 'lost'

ALTER TABLE leads ADD COLUMN IF NOT EXISTS 
    last_contact_at TIMESTAMPTZ;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS 
    last_contact_summary TEXT;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS 
    last_contact_direction TEXT DEFAULT 'outbound';

ALTER TABLE leads ADD COLUMN IF NOT EXISTS 
    conversation_count INTEGER DEFAULT 0;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS 
    total_messages INTEGER DEFAULT 0;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS 
    seller_notes TEXT;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS 
    conversation_summary TEXT;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS 
    import_source TEXT;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS 
    deal_amount NUMERIC(12,2);

-- ===================
-- MESSAGE TEMPLATES (für Extraktion)
-- ===================

CREATE TABLE IF NOT EXISTS message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Source
    source_message_id UUID REFERENCES messages(id),
    source_conversation_id UUID REFERENCES conversations(id),
    extraction_type TEXT DEFAULT 'manual',  -- 'manual', 'ai_suggested', 'chat_import'
    
    -- Content
    name TEXT,
    content TEXT NOT NULL,
    
    -- Kategorisierung
    use_case TEXT,                      -- 'opening', 'follow_up', 'objection_price', 'closing', etc.
    channel TEXT,                       -- 'whatsapp', 'instagram', 'all'
    vertical TEXT,
    
    -- Context
    context_tags TEXT[],
    works_for_lead_status TEXT[],       -- ['warm', 'hot']
    works_for_deal_state TEXT[],        -- ['considering', 'on_hold']
    
    -- Performance
    times_used INTEGER DEFAULT 0,
    times_successful INTEGER DEFAULT 0,
    success_rate NUMERIC(3,2),
    
    -- Flags
    is_active BOOLEAN DEFAULT true,
    is_team_shared BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================
-- EXTRACTED OBJECTIONS (für Living OS)
-- ===================

CREATE TABLE IF NOT EXISTS extracted_objections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Objection Details
    objection_type TEXT NOT NULL,       -- 'price', 'time', 'think_about_it', etc.
    objection_text TEXT NOT NULL,
    objection_context TEXT,
    
    -- Response
    response_text TEXT,
    response_technique TEXT,            -- 'reframe', 'empathize', 'question', etc.
    response_worked BOOLEAN,
    
    -- Source
    source_conversation_id UUID REFERENCES conversations(id),
    source_message_id UUID REFERENCES messages(id),
    
    -- Metadata
    vertical TEXT,
    channel TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================
-- INDEXES
-- ===================

CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_lead ON conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversations_channel ON conversations(channel);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(processing_status);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_type);
CREATE INDEX IF NOT EXISTS idx_messages_intent ON messages(message_intent);
CREATE INDEX IF NOT EXISTS idx_messages_template ON messages(is_template_candidate) WHERE is_template_candidate = true;

CREATE INDEX IF NOT EXISTS idx_contact_plans_user ON contact_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_plans_lead ON contact_plans(lead_id);
CREATE INDEX IF NOT EXISTS idx_contact_plans_date ON contact_plans(planned_at);
CREATE INDEX IF NOT EXISTS idx_contact_plans_status ON contact_plans(status);
CREATE INDEX IF NOT EXISTS idx_contact_plans_open ON contact_plans(user_id, planned_at) 
    WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_templates_user ON message_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_use_case ON message_templates(use_case);
CREATE INDEX IF NOT EXISTS idx_templates_channel ON message_templates(channel);

CREATE INDEX IF NOT EXISTS idx_extracted_objections_user ON extracted_objections(user_id);
CREATE INDEX IF NOT EXISTS idx_extracted_objections_type ON extracted_objections(objection_type);

-- ===================
-- RLS POLICIES
-- ===================

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE extracted_objections ENABLE ROW LEVEL SECURITY;

-- Conversations: Nur eigene
DROP POLICY IF EXISTS "Users can manage own conversations" ON conversations;
CREATE POLICY "Users can manage own conversations" ON conversations
    FOR ALL USING (user_id = auth.uid());

-- Messages: Via Conversation
DROP POLICY IF EXISTS "Users can view messages of own conversations" ON messages;
CREATE POLICY "Users can view messages of own conversations" ON messages
    FOR ALL USING (
        conversation_id IN (SELECT id FROM conversations WHERE user_id = auth.uid())
    );

-- Contact Plans: Nur eigene
DROP POLICY IF EXISTS "Users can manage own contact plans" ON contact_plans;
CREATE POLICY "Users can manage own contact plans" ON contact_plans
    FOR ALL USING (user_id = auth.uid());

-- Chat Imports: Nur eigene
DROP POLICY IF EXISTS "Users can manage own imports" ON chat_imports;
CREATE POLICY "Users can manage own imports" ON chat_imports
    FOR ALL USING (user_id = auth.uid());

-- Templates: Eigene + Team-Shared
DROP POLICY IF EXISTS "Users can view own and shared templates" ON message_templates;
CREATE POLICY "Users can view own and shared templates" ON message_templates
    FOR SELECT USING (
        user_id = auth.uid() OR is_team_shared = true
    );

DROP POLICY IF EXISTS "Users can manage own templates" ON message_templates;
CREATE POLICY "Users can manage own templates" ON message_templates
    FOR ALL USING (user_id = auth.uid());

-- Extracted Objections
DROP POLICY IF EXISTS "Users can manage own objections" ON extracted_objections;
CREATE POLICY "Users can manage own objections" ON extracted_objections
    FOR ALL USING (user_id = auth.uid());

-- ===================
-- FUNCTIONS
-- ===================

-- Get today's contact plan
CREATE OR REPLACE FUNCTION get_todays_contact_plan(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    lead_id UUID,
    lead_name TEXT,
    action_type TEXT,
    action_description TEXT,
    suggested_message TEXT,
    suggested_channel TEXT,
    priority INTEGER,
    is_urgent BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cp.id,
        cp.lead_id,
        COALESCE(l.first_name || ' ' || COALESCE(l.last_name, ''), l.first_name, 'Unbekannt') as lead_name,
        cp.action_type,
        cp.action_description,
        cp.suggested_message,
        cp.suggested_channel,
        cp.priority,
        cp.is_urgent
    FROM contact_plans cp
    JOIN leads l ON l.id = cp.lead_id
    WHERE cp.user_id = p_user_id
      AND cp.planned_at <= CURRENT_DATE
      AND cp.status = 'open'
    ORDER BY cp.is_urgent DESC, cp.priority DESC, cp.planned_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get overdue contact plans
CREATE OR REPLACE FUNCTION get_overdue_contact_plans(p_user_id UUID)
RETURNS TABLE (
    id UUID,
    lead_id UUID,
    lead_name TEXT,
    action_type TEXT,
    planned_at DATE,
    days_overdue INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cp.id,
        cp.lead_id,
        COALESCE(l.first_name || ' ' || COALESCE(l.last_name, ''), l.first_name, 'Unbekannt') as lead_name,
        cp.action_type,
        cp.planned_at,
        (CURRENT_DATE - cp.planned_at)::INTEGER as days_overdue
    FROM contact_plans cp
    JOIN leads l ON l.id = cp.lead_id
    WHERE cp.user_id = p_user_id
      AND cp.planned_at < CURRENT_DATE
      AND cp.status = 'open'
    ORDER BY cp.planned_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update lead stats after conversation import
CREATE OR REPLACE FUNCTION update_lead_conversation_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.lead_id IS NOT NULL THEN
        UPDATE leads SET
            conversation_count = (
                SELECT COUNT(*) FROM conversations 
                WHERE lead_id = NEW.lead_id
            ),
            last_contact_at = NEW.last_message_at,
            updated_at = NOW()
        WHERE id = NEW.lead_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS trg_update_lead_stats ON conversations;
CREATE TRIGGER trg_update_lead_stats
AFTER INSERT OR UPDATE ON conversations
FOR EACH ROW
EXECUTE FUNCTION update_lead_conversation_stats();

-- ===================
-- XP EVENTS TABLE (falls nicht existiert)
-- ===================

CREATE TABLE IF NOT EXISTS xp_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    amount INTEGER NOT NULL,
    reason TEXT,
    source TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_xp_events_user ON xp_events(user_id);

ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own xp events" ON xp_events;
CREATE POLICY "Users can manage own xp events" ON xp_events
    FOR ALL USING (user_id = auth.uid());

-- ===================
-- SUCCESS MESSAGE
-- ===================

DO $$
BEGIN
    RAISE NOTICE '✅ Chat Import System Migration erfolgreich!';
    RAISE NOTICE '   - conversations Tabelle erstellt/aktualisiert';
    RAISE NOTICE '   - messages Tabelle erstellt';
    RAISE NOTICE '   - contact_plans Tabelle erstellt';
    RAISE NOTICE '   - message_templates Tabelle erstellt';
    RAISE NOTICE '   - extracted_objections Tabelle erstellt';
    RAISE NOTICE '   - leads Tabelle erweitert';
    RAISE NOTICE '   - RLS Policies aktiviert';
    RAISE NOTICE '   - Helper Functions erstellt';
END $$;


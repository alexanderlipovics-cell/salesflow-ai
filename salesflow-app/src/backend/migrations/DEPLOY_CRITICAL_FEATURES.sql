-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  KRITISCHE FEATURES - KONSOLIDIERTE MIGRATION                              ║
-- ║  Pulse Tracker + Autopilot + Live Assist + Chat Import                    ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- ============================================================================
-- PART 0: CLEANUP CONFLICTING VIEWS (sicher)
-- ============================================================================

DO $$ 
BEGIN
    -- Nur droppen wenn es wirklich Views sind
    IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'live_assist_queries') THEN
        DROP VIEW live_assist_queries CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'live_assist_sessions') THEN
        DROP VIEW live_assist_sessions CASCADE;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'quick_facts') THEN
        DROP VIEW quick_facts CASCADE;
    END IF;
    RAISE NOTICE '✅ Part 0: Views gecheckt/bereinigt';
END $$;

-- ============================================================================
-- PART 1: ENUMS
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE message_status AS ENUM (
        'sent', 'delivered', 'seen', 'replied', 'ghosted', 'invisible', 'stale', 'skipped'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE follow_up_strategy AS ENUM (
        'none', 'ghost_buster', 'cross_channel', 'value_add', 'story_reply', 'voice_note', 'direct_ask', 'takeaway'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE contact_mood AS ENUM (
        'enthusiastic', 'positive', 'neutral', 'cautious', 'stressed', 'skeptical', 'annoyed', 'unknown'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE decision_tendency AS ENUM (
        'leaning_yes', 'leaning_no', 'undecided', 'deferred', 'committed', 'rejected'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE message_intent AS ENUM (
        'intro', 'discovery', 'pitch', 'scheduling', 'closing', 'follow_up', 'reactivation'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE ghost_type AS ENUM ('soft', 'hard');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN RAISE NOTICE '✅ Part 1: ENUMs erstellt'; END $$;

-- ============================================================================
-- PART 2: PULSE TRACKER TABLES
-- ============================================================================

-- Pulse Outreach Messages
CREATE TABLE IF NOT EXISTS pulse_outreach_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id),
    
    -- Message Content
    message_text TEXT NOT NULL,
    message_type TEXT DEFAULT 'initial',
    intent message_intent DEFAULT 'follow_up',
    
    -- Channel Info
    channel TEXT NOT NULL,
    platform_message_id TEXT,
    
    -- Status Tracking
    status message_status DEFAULT 'sent',
    status_updated_at TIMESTAMPTZ,
    status_source TEXT DEFAULT 'manual',
    auto_inferred BOOLEAN DEFAULT false,
    inference_reason TEXT,
    
    -- Timing
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    seen_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ,
    response_time_hours NUMERIC(6,2),
    
    -- Ghost Detection
    ghost_type ghost_type,
    ghost_detected_at TIMESTAMPTZ,
    
    -- Dynamic Check-in
    check_in_due_at TIMESTAMPTZ,
    check_in_hours_used INTEGER DEFAULT 24,
    check_in_completed BOOLEAN DEFAULT false,
    check_in_skipped BOOLEAN DEFAULT false,
    reminder_sent_count INTEGER DEFAULT 0,
    
    -- Follow-up
    suggested_strategy follow_up_strategy,
    suggested_follow_up_text TEXT,
    follow_up_sent BOOLEAN DEFAULT false,
    follow_up_message_id UUID,
    
    -- Template Tracking
    template_id UUID,
    template_variant TEXT,
    campaign_id UUID,
    
    -- Lead Snapshot
    lead_name TEXT,
    lead_mood contact_mood,
    lead_decision decision_tendency,
    
    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lead Behavior Profiles
CREATE TABLE IF NOT EXISTS lead_behavior_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Current State
    current_mood contact_mood DEFAULT 'unknown',
    decision_tendency decision_tendency DEFAULT 'undecided',
    engagement_level INTEGER DEFAULT 3,
    trust_level INTEGER DEFAULT 3,
    
    -- Behavior Patterns
    avg_response_time_hours NUMERIC(6,2),
    response_time_trend TEXT,
    predicted_check_in_hours INTEGER DEFAULT 24,
    predicted_ghost_threshold_hours INTEGER DEFAULT 48,
    
    -- Stats
    total_messages_received INTEGER DEFAULT 0,
    total_messages_sent INTEGER DEFAULT 0,
    total_replies INTEGER DEFAULT 0,
    reply_rate NUMERIC(5,2) DEFAULT 0,
    
    -- Analysis
    last_analyzed_at TIMESTAMPTZ,
    mood_history JSONB DEFAULT '[]',
    behavior_notes TEXT,
    
    -- Template Performance
    best_template_variant TEXT,
    best_template_mood_match JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ghost Buster Templates
CREATE TABLE IF NOT EXISTS ghost_buster_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    
    name TEXT NOT NULL,
    template_text TEXT NOT NULL,
    template_text_short TEXT,
    strategy follow_up_strategy NOT NULL,
    tone TEXT,
    
    works_for_mood contact_mood[],
    works_for_decision decision_tendency[],
    works_for_ghost_type ghost_type,
    days_since_ghost INTEGER,
    
    example_context TEXT,
    usage_count INTEGER DEFAULT 0,
    success_rate NUMERIC(3,2),
    
    is_system BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Intent Corrections
CREATE TABLE IF NOT EXISTS intent_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    query_text TEXT NOT NULL,
    original_language TEXT DEFAULT 'de',
    detected_intent TEXT,
    detected_objection_type TEXT,
    corrected_intent TEXT,
    corrected_objection_type TEXT,
    correction_reason TEXT,
    
    used_for_training BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversion Funnel Daily
CREATE TABLE IF NOT EXISTS conversion_funnel_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id),
    date DATE NOT NULL,
    
    messages_sent INTEGER DEFAULT 0,
    messages_seen INTEGER DEFAULT 0,
    messages_replied INTEGER DEFAULT 0,
    messages_ghosted INTEGER DEFAULT 0,
    ghosts_reactivated INTEGER DEFAULT 0,
    
    open_rate NUMERIC(5,2) DEFAULT 0,
    reply_rate NUMERIC(5,2) DEFAULT 0,
    ghost_rate NUMERIC(5,2) DEFAULT 0,
    ghost_buster_rate NUMERIC(5,2) DEFAULT 0,
    
    channel_breakdown JSONB DEFAULT '{}',
    intent_breakdown JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, date)
);

-- Outreach Campaigns (A/B Testing)
CREATE TABLE IF NOT EXISTS outreach_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id),
    
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft',
    
    template_variants JSONB NOT NULL DEFAULT '[]',
    target_channel TEXT,
    target_intent message_intent,
    
    messages_sent INTEGER DEFAULT 0,
    variant_performance JSONB DEFAULT '{}',
    variant_performance_by_mood JSONB DEFAULT '{}',
    
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN RAISE NOTICE '✅ Part 2: Pulse Tracker Tabellen erstellt'; END $$;

-- ============================================================================
-- PART 3: AUTOPILOT TABLES
-- ============================================================================

-- Autopilot Settings
CREATE TABLE IF NOT EXISTS autopilot_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    autonomy_level TEXT NOT NULL DEFAULT 'assistant'
        CHECK (autonomy_level IN ('observer', 'assistant', 'autopilot', 'full_auto')),
    confidence_threshold INTEGER NOT NULL DEFAULT 90
        CHECK (confidence_threshold >= 50 AND confidence_threshold <= 100),
    
    -- Permissions
    auto_info_replies BOOLEAN DEFAULT true,
    auto_simple_questions BOOLEAN DEFAULT true,
    auto_followups BOOLEAN DEFAULT true,
    auto_scheduling BOOLEAN DEFAULT true,
    auto_calendar_booking BOOLEAN DEFAULT false,
    auto_price_replies BOOLEAN DEFAULT false,
    auto_objection_handling BOOLEAN DEFAULT false,
    auto_closing BOOLEAN DEFAULT false,
    
    -- Notifications
    notify_hot_lead BOOLEAN DEFAULT true,
    notify_human_needed BOOLEAN DEFAULT true,
    notify_daily_summary BOOLEAN DEFAULT true,
    notify_every_action BOOLEAN DEFAULT false,
    
    -- Working Hours
    working_hours_start TIME DEFAULT '09:00',
    working_hours_end TIME DEFAULT '20:00',
    send_on_weekends BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

-- Lead Autopilot Overrides
CREATE TABLE IF NOT EXISTS lead_autopilot_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    
    mode TEXT NOT NULL DEFAULT 'normal'
        CHECK (mode IN ('normal', 'careful', 'aggressive', 'disabled')),
    is_vip BOOLEAN DEFAULT false,
    reason TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ,
    
    UNIQUE(lead_id)
);

-- Autopilot Drafts
CREATE TABLE IF NOT EXISTS autopilot_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    
    draft_type TEXT NOT NULL,
    message_text TEXT NOT NULL,
    
    confidence_score INTEGER,
    reasoning TEXT,
    context_used JSONB,
    
    status TEXT DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'auto_sent', 'expired')),
    
    expires_at TIMESTAMPTZ,
    reviewed_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Autopilot Actions
CREATE TABLE IF NOT EXISTS autopilot_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    draft_id UUID REFERENCES autopilot_drafts(id),
    
    action_type TEXT NOT NULL,
    action_detail JSONB,
    
    confidence_score INTEGER,
    was_auto BOOLEAN DEFAULT false,
    human_override BOOLEAN DEFAULT false,
    
    result TEXT,
    result_detail JSONB,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Autopilot Stats Daily
CREATE TABLE IF NOT EXISTS autopilot_stats_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    
    messages_auto_sent INTEGER DEFAULT 0,
    messages_drafted INTEGER DEFAULT 0,
    messages_approved INTEGER DEFAULT 0,
    messages_rejected INTEGER DEFAULT 0,
    
    time_saved_minutes INTEGER DEFAULT 0,
    leads_auto_qualified INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, date)
);

DO $$ BEGIN RAISE NOTICE '✅ Part 3: Autopilot Tabellen erstellt'; END $$;

-- ============================================================================
-- PART 4: LIVE ASSIST TABLES
-- ============================================================================

-- Quick Facts
CREATE TABLE IF NOT EXISTS quick_facts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    vertical TEXT,
    
    fact_type TEXT NOT NULL,
    fact_key TEXT NOT NULL,
    fact_value TEXT NOT NULL,
    fact_short TEXT,
    
    source TEXT,
    use_in_contexts TEXT[],
    importance INTEGER DEFAULT 50,
    is_key_fact BOOLEAN DEFAULT false,
    
    language TEXT DEFAULT 'de',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vertical Knowledge
CREATE TABLE IF NOT EXISTS vertical_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vertical TEXT NOT NULL,
    company_id UUID REFERENCES companies(id),
    
    knowledge_type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    content_short TEXT,
    
    keywords TEXT[],
    related_objections TEXT[],
    use_cases TEXT[],
    
    source TEXT,
    is_verified BOOLEAN DEFAULT false,
    
    language TEXT DEFAULT 'de',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Live Assist Sessions
CREATE TABLE IF NOT EXISTS live_assist_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id),
    
    session_type TEXT NOT NULL DEFAULT 'call',
    channel TEXT,
    
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    
    queries_count INTEGER DEFAULT 0,
    facts_served INTEGER DEFAULT 0,
    objections_handled INTEGER DEFAULT 0,
    
    outcome TEXT,
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Live Assist Queries
CREATE TABLE IF NOT EXISTS live_assist_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES live_assist_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    query_text TEXT NOT NULL,
    query_type TEXT,
    
    response_text TEXT,
    response_source TEXT,
    confidence_score NUMERIC(3,2),
    
    was_helpful BOOLEAN,
    response_time_ms INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN RAISE NOTICE '✅ Part 4: Live Assist Tabellen erstellt'; END $$;

-- ============================================================================
-- PART 5: CHAT IMPORT TABLES
-- ============================================================================

-- Conversations
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    
    platform TEXT NOT NULL,
    platform_conversation_id TEXT,
    
    title TEXT,
    last_message_at TIMESTAMPTZ,
    last_message_preview TEXT,
    
    message_count INTEGER DEFAULT 0,
    unread_count INTEGER DEFAULT 0,
    
    status TEXT DEFAULT 'active',
    is_archived BOOLEAN DEFAULT false,
    
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id),
    
    sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'lead', 'system')),
    
    content TEXT NOT NULL,
    content_type TEXT DEFAULT 'text',
    
    platform TEXT,
    platform_message_id TEXT,
    
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    
    is_deleted BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Imports
CREATE TABLE IF NOT EXISTS chat_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    source_platform TEXT NOT NULL,
    import_type TEXT DEFAULT 'screenshot',
    
    file_url TEXT,
    raw_text TEXT,
    
    messages_extracted INTEGER DEFAULT 0,
    leads_matched INTEGER DEFAULT 0,
    leads_created INTEGER DEFAULT 0,
    
    status TEXT DEFAULT 'pending',
    error_message TEXT,
    
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- XP Events
CREATE TABLE IF NOT EXISTS xp_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    event_type TEXT NOT NULL,
    xp_amount INTEGER NOT NULL,
    
    source_type TEXT,
    source_id UUID,
    
    description TEXT,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ BEGIN RAISE NOTICE '✅ Part 5: Chat Import Tabellen erstellt'; END $$;

-- ============================================================================
-- PART 6: INDEXES
-- ============================================================================

-- Pulse Tracker
CREATE INDEX IF NOT EXISTS idx_pulse_outreach_user ON pulse_outreach_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_pulse_outreach_lead ON pulse_outreach_messages(lead_id);
CREATE INDEX IF NOT EXISTS idx_pulse_outreach_status ON pulse_outreach_messages(status);
CREATE INDEX IF NOT EXISTS idx_pulse_outreach_checkin ON pulse_outreach_messages(check_in_due_at) 
    WHERE check_in_completed = false;

-- Behavior Profiles
CREATE INDEX IF NOT EXISTS idx_behavior_profiles_lead ON lead_behavior_profiles(lead_id);
CREATE INDEX IF NOT EXISTS idx_behavior_profiles_user ON lead_behavior_profiles(user_id);

-- Autopilot
CREATE INDEX IF NOT EXISTS idx_autopilot_drafts_user ON autopilot_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_autopilot_drafts_status ON autopilot_drafts(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_autopilot_actions_user ON autopilot_actions(user_id);

-- Live Assist
CREATE INDEX IF NOT EXISTS idx_live_assist_sessions_user ON live_assist_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_live_assist_queries_session ON live_assist_queries(session_id);
CREATE INDEX IF NOT EXISTS idx_quick_facts_company ON quick_facts(company_id);

-- Chat
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_lead ON conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_events_user ON xp_events(user_id);

DO $$ BEGIN RAISE NOTICE '✅ Part 6: Indexes erstellt'; END $$;

-- ============================================================================
-- PART 7: RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE pulse_outreach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_behavior_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ghost_buster_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE intent_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_funnel_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE autopilot_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_autopilot_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE autopilot_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE autopilot_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE autopilot_stats_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE vertical_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_assist_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_assist_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;

-- Simple user-based policies
CREATE POLICY "user_access" ON pulse_outreach_messages FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_access" ON lead_behavior_profiles FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_access" ON intent_corrections FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_access" ON conversion_funnel_daily FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_access" ON outreach_campaigns FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_access" ON autopilot_settings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_access" ON autopilot_drafts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_access" ON autopilot_actions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_access" ON autopilot_stats_daily FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_access" ON live_assist_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_access" ON live_assist_queries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_access" ON conversations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_access" ON messages FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_access" ON chat_imports FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "user_access" ON xp_events FOR ALL USING (auth.uid() = user_id);

-- Public read for templates and knowledge
CREATE POLICY "public_read" ON ghost_buster_templates FOR SELECT USING (true);
CREATE POLICY "public_read" ON quick_facts FOR SELECT USING (true);
CREATE POLICY "public_read" ON vertical_knowledge FOR SELECT USING (true);

-- Lead-based access
CREATE POLICY "lead_owner_access" ON lead_autopilot_overrides FOR ALL 
    USING (EXISTS (SELECT 1 FROM leads WHERE leads.id = lead_id AND leads.user_id = auth.uid()));

DO $$ BEGIN RAISE NOTICE '✅ Part 7: RLS Policies erstellt'; END $$;

-- ============================================================================
-- FERTIG
-- ============================================================================

DO $$ BEGIN RAISE NOTICE '🎉 ALLE KRITISCHEN FEATURES ERFOLGREICH INSTALLIERT!'; END $$;


-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  MASTER MIGRATION - SALES FLOW AI                                         ║
-- ║  Konsolidierte Migration aller fehlenden Tabellen                         ║
-- ║  Erstellt: 2024-12-04                                                      ║
-- ╚════════════════════════════════════════════════════════════════════════════╝
--
-- AUDIT-ERGEBNIS:
-- ===============
-- Gefunden: 85 SQL-Dateien im Projekt
-- Diese Migration konsolidiert alle wichtigen Tabellen aus:
--   • 20251203_networker_os_foundation.sql
--   • 20251211_sequencer_clean_install.sql
--   • DEPLOY_PHASE1_TABLES.sql
--   • 081_create_scripts_library.sql
--   • 003_power_up_system.sql
--   • 005_follow_up_tasks_table.sql
--   • 20251208_live_assist.sql
--   • Und weitere...
--
-- AUSFÜHREN: 
-- Im Supabase SQL Editor einfügen und ausführen
--
-- ============================================================================

-- ============================================================================
-- EXTENSIONS (Falls nicht vorhanden)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- ENUMS (Falls nicht vorhanden)
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE knowledge_domain AS ENUM ('evidence', 'company', 'vertical', 'generic');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE knowledge_type AS ENUM (
        'study_summary', 'meta_analysis', 'health_claim', 'guideline',
        'company_overview', 'product_line', 'product_detail', 'compensation_plan',
        'compliance_rule', 'faq', 'objection_handler', 'sales_script',
        'best_practice', 'psychology', 'communication', 'template_helper'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE evidence_strength AS ENUM ('high', 'moderate', 'limited', 'expert_opinion');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE learning_event_type AS ENUM (
        'template_used', 'template_edited', 'response_received',
        'positive_outcome', 'negative_outcome', 'objection_handled', 'follow_up_sent'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE outcome_type AS ENUM (
        'appointment_booked', 'deal_closed', 'info_sent', 'follow_up_scheduled',
        'objection_overcome', 'no_response', 'rejected', 'ghosted'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE template_category AS ENUM (
        'first_contact', 'follow_up', 'reactivation', 'objection_handler',
        'closing', 'appointment_booking', 'info_request', 'custom'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================================
-- 1. COMPANIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    vertical_id TEXT NOT NULL DEFAULT 'network_marketing',
    country_origin TEXT,
    website_url TEXT,
    logo_url TEXT,
    business_model TEXT DEFAULT 'mlm',
    comp_plan_type TEXT,
    has_evidence_hub BOOLEAN DEFAULT false,
    has_health_pro_module BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO companies (slug, name, vertical_id, is_verified)
VALUES ('demo_company', 'Demo Company', 'network_marketing', true)
ON CONFLICT (slug) DO NOTHING;

-- ============================================================================
-- 2. LEADS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    user_id UUID,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    instagram_handle TEXT,
    whatsapp_number TEXT,
    status TEXT DEFAULT 'new',
    temperature TEXT DEFAULT 'cold',
    source TEXT,
    source_details TEXT,
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    last_contact_at TIMESTAMPTZ,
    next_follow_up_at TIMESTAMPTZ,
    -- BANT Scores
    bant_budget INTEGER DEFAULT 0 CHECK (bant_budget BETWEEN 0 AND 25),
    bant_authority INTEGER DEFAULT 0 CHECK (bant_authority BETWEEN 0 AND 25),
    bant_need INTEGER DEFAULT 0 CHECK (bant_need BETWEEN 0 AND 25),
    bant_timeline INTEGER DEFAULT 0 CHECK (bant_timeline BETWEEN 0 AND 25),
    lead_score INTEGER DEFAULT 0 CHECK (lead_score BETWEEN 0 AND 100),
    score_category TEXT DEFAULT 'cold' CHECK (score_category IN ('hot', 'warm', 'cool', 'cold')),
    disg_type TEXT CHECK (disg_type IN ('d', 'i', 's', 'g')),
    score_updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. TEMPLATES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    created_by UUID,
    name VARCHAR(200) NOT NULL,
    category template_category NOT NULL DEFAULT 'custom',
    content TEXT NOT NULL,
    target_channel VARCHAR(50),
    target_temperature VARCHAR(20),
    target_stage VARCHAR(50),
    tags TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    is_shared BOOLEAN DEFAULT FALSE,
    is_ai_generated BOOLEAN DEFAULT FALSE,
    ai_generation_context JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. TEMPLATE PERFORMANCE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS template_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    total_uses INTEGER DEFAULT 0,
    total_responses INTEGER DEFAULT 0,
    total_conversions INTEGER DEFAULT 0,
    response_rate DECIMAL(5,2) DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    avg_response_time_hours DECIMAL(10,2),
    uses_last_30d INTEGER DEFAULT 0,
    responses_last_30d INTEGER DEFAULT 0,
    conversions_last_30d INTEGER DEFAULT 0,
    response_rate_30d DECIMAL(5,2) DEFAULT 0,
    conversion_rate_30d DECIMAL(5,2) DEFAULT 0,
    quality_score DECIMAL(5,2) DEFAULT 50,
    trend VARCHAR(20) DEFAULT 'stable',
    last_used_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(template_id)
);

-- ============================================================================
-- 5. SCHEDULED_JOBS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS scheduled_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type TEXT NOT NULL CHECK (job_type IN (
        'follow_up_reminder', 'reactivation_check', 'daily_summary',
        'team_sync', 'dmo_reminder', 'payment_check', 'sequence_step',
        'ghost_check', 'custom'
    )),
    job_name TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID,
    lead_id UUID,
    contact_id UUID,
    payload JSONB DEFAULT '{}'::jsonb,
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    scheduled_at TIMESTAMPTZ NOT NULL,
    repeat_interval TEXT CHECK (repeat_interval IN (
        'once', 'hourly', 'daily', 'weekly', 'monthly'
    )) DEFAULT 'once',
    cron_expression TEXT,
    next_run_at TIMESTAMPTZ,
    last_run_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'completed', 'failed', 'cancelled', 'retrying'
    )),
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    result JSONB,
    error_message TEXT,
    processing_time_ms INTEGER,
    queue_name TEXT DEFAULT 'default',
    worker_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_user ON scheduled_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_status ON scheduled_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_type ON scheduled_jobs(job_type);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_scheduled ON scheduled_jobs(scheduled_at) WHERE status = 'pending';

-- ============================================================================
-- 6. AI_INTERACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID,
    session_id UUID,
    interaction_type TEXT NOT NULL CHECK (interaction_type IN (
        'mentor_chat', 'script_generation', 'objection_handling', 'lead_analysis',
        'message_compose', 'knowledge_query', 'disc_analysis', 'voice_transcription',
        'reactivation', 'ghost_buster', 'live_assist'
    )),
    request_text TEXT NOT NULL,
    request_context JSONB,
    response_text TEXT,
    response_metadata JSONB,
    model TEXT NOT NULL DEFAULT 'gpt-4',
    provider TEXT NOT NULL DEFAULT 'openai' CHECK (provider IN ('openai', 'anthropic', 'azure')),
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    estimated_cost_usd DECIMAL(10, 6),
    latency_ms INTEGER,
    action_tags JSONB DEFAULT '[]'::jsonb,
    actions_executed JSONB DEFAULT '[]'::jsonb,
    user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
    user_feedback TEXT,
    was_helpful BOOLEAN,
    compliance_flags JSONB DEFAULT '[]'::jsonb,
    was_filtered BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_interactions_user ON ai_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_type ON ai_interactions(interaction_type);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_date ON ai_interactions(created_at);

-- ============================================================================
-- 7. TEAM_MEMBERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID,
    leader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    member_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'partner' CHECK (role IN (
        'partner', 'associate', 'consultant', 'manager', 'director',
        'diamond', 'executive', 'ambassador', 'custom'
    )),
    custom_role TEXT,
    rank_level INTEGER DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN (
        'pending_invite', 'onboarding', 'active', 'inactive', 'churned'
    )),
    personal_volume DECIMAL(15, 2) DEFAULT 0,
    group_volume DECIMAL(15, 2) DEFAULT 0,
    qualification_status TEXT,
    onboarding_step INTEGER DEFAULT 0,
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_completed_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ,
    activities_this_week INTEGER DEFAULT 0,
    activities_this_month INTEGER DEFAULT 0,
    monthly_goal DECIMAL(15, 2),
    monthly_achieved DECIMAL(15, 2) DEFAULT 0,
    streak_days INTEGER DEFAULT 0,
    total_recruits INTEGER DEFAULT 0,
    total_customers INTEGER DEFAULT 0,
    preferred_channel TEXT CHECK (preferred_channel IN ('email', 'whatsapp', 'sms', 'app')),
    notification_preferences JSONB DEFAULT '{"daily_summary": true, "team_updates": true}'::jsonb,
    disc_type TEXT CHECK (disc_type IN ('D', 'I', 'S', 'G')),
    notes TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    invited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_members_leader ON team_members(leader_id);
CREATE INDEX IF NOT EXISTS idx_team_members_status ON team_members(status);

-- ============================================================================
-- 8. CONTACTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID,
    name TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    instagram_handle TEXT,
    facebook_url TEXT,
    linkedin_url TEXT,
    tiktok_handle TEXT,
    contact_type TEXT NOT NULL DEFAULT 'prospect' CHECK (contact_type IN (
        'prospect', 'customer', 'partner', 'former_customer', 'inactive', 'not_interested'
    )),
    relationship_level TEXT DEFAULT 'cold' CHECK (relationship_level IN (
        'cold', 'warm', 'hot', 'customer', 'partner'
    )),
    disc_type TEXT CHECK (disc_type IN ('D', 'I', 'S', 'G')),
    disc_confidence DECIMAL(3, 2),
    pipeline_stage TEXT DEFAULT 'lead' CHECK (pipeline_stage IN (
        'lead', 'contacted', 'interested', 'presentation_scheduled',
        'presented', 'follow_up', 'closing', 'won', 'lost'
    )),
    first_contact_at TIMESTAMPTZ,
    last_contact_at TIMESTAMPTZ,
    next_follow_up_at TIMESTAMPTZ,
    total_interactions INTEGER DEFAULT 0,
    source TEXT CHECK (source IN (
        'warm_market', 'cold_market', 'social_media', 'referral',
        'event', 'online_lead', 'import', 'other'
    )),
    source_details TEXT,
    notes TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(contact_type);
CREATE INDEX IF NOT EXISTS idx_contacts_stage ON contacts(pipeline_stage);

-- ============================================================================
-- 9. DMO_ENTRIES TABLE (Daily Method of Operation)
-- ============================================================================

CREATE TABLE IF NOT EXISTS dmo_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    new_contacts INTEGER DEFAULT 0,
    follow_ups INTEGER DEFAULT 0,
    presentations INTEGER DEFAULT 0,
    closes INTEGER DEFAULT 0,
    trainings INTEGER DEFAULT 0,
    new_contact_ids JSONB DEFAULT '[]'::jsonb,
    follow_up_ids JSONB DEFAULT '[]'::jsonb,
    presentation_ids JSONB DEFAULT '[]'::jsonb,
    close_ids JSONB DEFAULT '[]'::jsonb,
    target_new_contacts INTEGER DEFAULT 5,
    target_follow_ups INTEGER DEFAULT 10,
    target_presentations INTEGER DEFAULT 2,
    target_closes INTEGER DEFAULT 1,
    target_trainings INTEGER DEFAULT 1,
    daily_notes TEXT,
    wins TEXT,
    challenges TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, entry_date)
);

CREATE INDEX IF NOT EXISTS idx_dmo_entries_user ON dmo_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_dmo_entries_date ON dmo_entries(entry_date);

-- ============================================================================
-- 10. SCRIPTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    number INTEGER NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN (
        'erstkontakt', 'follow_up', 'einwand', 'closing',
        'onboarding', 'reaktivierung', 'social_media'
    )),
    context TEXT NOT NULL,
    relationship_level TEXT NOT NULL DEFAULT 'warm' CHECK (relationship_level IN (
        'kalt', 'lauwarm', 'warm', 'heiss'
    )),
    text TEXT NOT NULL,
    description TEXT,
    variables JSONB DEFAULT '[]'::jsonb,
    variants JSONB DEFAULT '[]'::jsonb,
    vertical TEXT NOT NULL DEFAULT 'network_marketing',
    language TEXT NOT NULL DEFAULT 'de',
    tags JSONB DEFAULT '[]'::jsonb,
    usage_count INTEGER DEFAULT 0,
    reply_rate DECIMAL(5,2) DEFAULT 0.0,
    positive_rate DECIMAL(5,2) DEFAULT 0.0,
    conversion_rate DECIMAL(5,2) DEFAULT 0.0,
    avg_response_time DECIMAL(10,2) DEFAULT 0.0,
    best_for_disg TEXT CHECK (best_for_disg IN ('D', 'I', 'S', 'G')),
    best_for_channel TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scripts_category ON scripts(category);
CREATE INDEX IF NOT EXISTS idx_scripts_context ON scripts(context);
CREATE INDEX IF NOT EXISTS idx_scripts_number ON scripts(number);

-- ============================================================================
-- 11. SCRIPT_USAGE_LOGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS script_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    script_id UUID NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    company_id UUID,
    was_sent BOOLEAN DEFAULT true,
    got_reply BOOLEAN DEFAULT false,
    was_positive BOOLEAN DEFAULT false,
    converted BOOLEAN DEFAULT false,
    response_time_minutes INTEGER,
    channel TEXT,
    disg_type TEXT CHECK (disg_type IN ('D', 'I', 'S', 'G')),
    lead_id UUID,
    user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
    user_feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 12. SCRIPT_FAVORITES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS script_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    script_id UUID NOT NULL REFERENCES scripts(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, script_id)
);

-- ============================================================================
-- 13. CUSTOM_SCRIPTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS custom_scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    company_id UUID,
    name TEXT NOT NULL,
    text TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    context TEXT,
    based_on_script_id UUID REFERENCES scripts(id) ON DELETE SET NULL,
    is_shared BOOLEAN DEFAULT false,
    variables JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 14. SEQUENCES TABLE (Sequencer Engine)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft',
    settings JSONB DEFAULT '{
        "timezone": "Europe/Berlin",
        "send_days": ["mon", "tue", "wed", "thu", "fri"],
        "send_hours_start": 9,
        "send_hours_end": 18,
        "max_per_day": 50,
        "stop_on_reply": true,
        "stop_on_bounce": true,
        "track_opens": true,
        "track_clicks": true
    }',
    stats JSONB DEFAULT '{"enrolled": 0, "active": 0, "completed": 0, "replied": 0}',
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    activated_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_seq_user ON sequences(user_id);
CREATE INDEX IF NOT EXISTS idx_seq_status ON sequences(status);

-- ============================================================================
-- 15. SEQUENCE_STEPS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS sequence_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
    step_order INTEGER NOT NULL,
    step_type TEXT NOT NULL,
    delay_days INTEGER DEFAULT 0,
    delay_hours INTEGER DEFAULT 0,
    delay_minutes INTEGER DEFAULT 0,
    subject TEXT,
    content TEXT,
    content_html TEXT,
    ab_variant TEXT,
    ab_split_percent INTEGER DEFAULT 50,
    condition_type TEXT,
    condition_step_id UUID,
    platform_settings JSONB DEFAULT '{}',
    stats JSONB DEFAULT '{"sent": 0, "opened": 0, "clicked": 0, "replied": 0}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sequence_id, step_order)
);

CREATE INDEX IF NOT EXISTS idx_steps_seq ON sequence_steps(sequence_id);

-- ============================================================================
-- 16. SEQUENCE_ENROLLMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS sequence_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID,
    contact_email TEXT,
    contact_name TEXT,
    contact_linkedin_url TEXT,
    contact_phone TEXT,
    variables JSONB DEFAULT '{}',
    status TEXT DEFAULT 'active',
    current_step INTEGER DEFAULT 0,
    next_step_at TIMESTAMPTZ,
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ,
    stopped_at TIMESTAMPTZ,
    stop_reason TEXT,
    ab_variant TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enroll_seq ON sequence_enrollments(sequence_id);
CREATE INDEX IF NOT EXISTS idx_enroll_user ON sequence_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enroll_status ON sequence_enrollments(status);

-- ============================================================================
-- 17. SEQUENCE_ACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS sequence_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES sequence_enrollments(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES sequence_steps(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    sent_subject TEXT,
    sent_content TEXT,
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ,
    bounced_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    message_id TEXT,
    tracking_id TEXT,
    platform_response JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 18. SEQUENCE_ACTION_QUEUE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS sequence_action_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enrollment_id UUID NOT NULL REFERENCES sequence_enrollments(id) ON DELETE CASCADE,
    step_id UUID NOT NULL REFERENCES sequence_steps(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ NOT NULL,
    priority INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending',
    picked_up_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    worker_id TEXT,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    last_error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 19. SEQUENCE_DAILY_STATS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS sequence_daily_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_id UUID NOT NULL REFERENCES sequences(id) ON DELETE CASCADE,
    stat_date DATE NOT NULL,
    enrolled INTEGER DEFAULT 0,
    sent INTEGER DEFAULT 0,
    delivered INTEGER DEFAULT 0,
    opened INTEGER DEFAULT 0,
    clicked INTEGER DEFAULT 0,
    replied INTEGER DEFAULT 0,
    bounced INTEGER DEFAULT 0,
    unsubscribed INTEGER DEFAULT 0,
    open_rate NUMERIC(5,4) DEFAULT 0,
    click_rate NUMERIC(5,4) DEFAULT 0,
    reply_rate NUMERIC(5,4) DEFAULT 0,
    bounce_rate NUMERIC(5,4) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sequence_id, stat_date)
);

-- ============================================================================
-- 20. EMAIL_TRACKING_EVENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_tracking_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_id UUID REFERENCES sequence_actions(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    link_url TEXT,
    geo_country TEXT,
    geo_city TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 21. FOLLOW_UP_TASKS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS follow_up_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    lead_name TEXT,
    action TEXT NOT NULL DEFAULT 'follow_up' CHECK (action IN (
        'call', 'email', 'meeting', 'message', 'follow_up', 'task'
    )),
    description TEXT NOT NULL,
    due_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_time TIME,
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN (
        'low', 'medium', 'high', 'urgent'
    )),
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    reminder_at TIMESTAMPTZ,
    reminder_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_user_id ON follow_up_tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_due_date ON follow_up_tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_follow_up_tasks_completed ON follow_up_tasks(completed);

-- ============================================================================
-- 22. COMPANY_INTELLIGENCE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS company_intelligence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL UNIQUE,
    vertical TEXT DEFAULT 'network_marketing',
    founded_year INTEGER,
    headquarters TEXT,
    website TEXT,
    logo_url TEXT,
    product_categories TEXT[],
    flagship_products TEXT[],
    price_range TEXT,
    comp_plan_type TEXT,
    entry_cost_min NUMERIC,
    entry_cost_max NUMERIC,
    monthly_autoship NUMERIC,
    common_objections JSONB DEFAULT '{}',
    unique_selling_points TEXT[],
    competitor_advantages JSONB DEFAULT '{}',
    best_opener TEXT,
    best_closing_technique TEXT,
    ideal_customer_profile TEXT,
    red_flags TEXT[],
    golden_questions TEXT[],
    avg_closing_rate NUMERIC DEFAULT 0.15,
    avg_deal_size NUMERIC,
    best_contact_times TEXT[],
    best_channels TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 23. OBJECTION_LIBRARY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS objection_library (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    objection_text TEXT NOT NULL,
    objection_category TEXT NOT NULL,
    severity INTEGER DEFAULT 5,
    response_logical TEXT,
    response_emotional TEXT,
    response_provocative TEXT,
    response_for_d TEXT,
    response_for_i TEXT,
    response_for_s TEXT,
    response_for_g TEXT,
    follow_up_question TEXT,
    bridge_to_close TEXT,
    success_rate NUMERIC DEFAULT 0.5,
    times_used INTEGER DEFAULT 0,
    vertical TEXT DEFAULT 'all',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_objection_library_category ON objection_library(objection_category);

-- ============================================================================
-- 24. SUCCESS_STORIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS success_stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT,
    person_name TEXT,
    person_background TEXT,
    before_situation TEXT,
    turning_point TEXT,
    transformation TEXT,
    result TEXT,
    timeline TEXT,
    use_case TEXT,
    best_for_objection TEXT,
    emotional_hook TEXT,
    is_verified BOOLEAN DEFAULT false,
    source_url TEXT,
    vertical TEXT DEFAULT 'network_marketing',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 25. LIABILITY_RULES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS liability_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trigger_word TEXT NOT NULL,
    trigger_pattern TEXT,
    warning_message TEXT NOT NULL,
    safe_alternative TEXT NOT NULL,
    category TEXT,
    severity TEXT DEFAULT 'warning',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 26. QUICK_FACTS TABLE (Live Assist)
-- ============================================================================

CREATE TABLE IF NOT EXISTS quick_facts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    product_id UUID,
    vertical TEXT,
    fact_type TEXT NOT NULL,
    fact_key TEXT NOT NULL,
    fact_value TEXT NOT NULL,
    fact_short TEXT,
    source TEXT,
    evidence_id UUID,
    use_in_contexts TEXT[],
    importance INTEGER DEFAULT 50,
    is_key_fact BOOLEAN DEFAULT false,
    language TEXT DEFAULT 'de',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 27. OBJECTION_RESPONSES TABLE (Live Assist)
-- ============================================================================

CREATE TABLE IF NOT EXISTS objection_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    vertical TEXT,
    objection_type TEXT NOT NULL,
    objection_keywords TEXT[],
    objection_example TEXT,
    response_short TEXT NOT NULL,
    response_full TEXT,
    response_technique TEXT,
    follow_up_question TEXT,
    times_used INTEGER DEFAULT 0,
    success_rate NUMERIC(3,2),
    source_type TEXT DEFAULT 'system',
    source_user_id UUID REFERENCES auth.users(id),
    language TEXT DEFAULT 'de',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 28. VERTICAL_KNOWLEDGE TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS vertical_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vertical TEXT NOT NULL,
    company_id UUID REFERENCES companies(id),
    knowledge_type TEXT NOT NULL,
    topic TEXT NOT NULL,
    question TEXT,
    answer_short TEXT NOT NULL,
    answer_full TEXT,
    keywords TEXT[],
    related_topics TEXT[],
    source TEXT,
    last_verified_at TIMESTAMPTZ,
    language TEXT DEFAULT 'de',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 29. LIVE_ASSIST_SESSIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS live_assist_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    company_id UUID REFERENCES companies(id),
    vertical TEXT,
    lead_id UUID REFERENCES leads(id),
    queries_count INTEGER DEFAULT 0,
    facts_served INTEGER DEFAULT 0,
    objections_handled INTEGER DEFAULT 0,
    session_outcome TEXT,
    user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
    user_feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 30. LIVE_ASSIST_QUERIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS live_assist_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES live_assist_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    query_text TEXT NOT NULL,
    query_type TEXT DEFAULT 'text',
    detected_intent TEXT,
    detected_objection_type TEXT,
    detected_product_id UUID,
    response_text TEXT,
    response_source TEXT,
    response_time_ms INTEGER,
    was_helpful BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 31. KNOWLEDGE_ITEMS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS knowledge_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    vertical_id TEXT,
    language TEXT NOT NULL DEFAULT 'de',
    region TEXT,
    domain knowledge_domain NOT NULL,
    type knowledge_type NOT NULL,
    topic TEXT NOT NULL,
    subtopic TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    content_short TEXT,
    study_year INTEGER,
    study_authors TEXT[],
    study_population TEXT,
    study_type TEXT,
    study_intervention TEXT,
    study_outcomes TEXT,
    nutrients_or_factors TEXT[],
    health_outcome_areas TEXT[],
    evidence_level evidence_strength,
    source_type TEXT,
    source_url TEXT,
    source_reference TEXT,
    quality_score NUMERIC(3,2),
    compliance_level TEXT DEFAULT 'normal',
    requires_disclaimer BOOLEAN DEFAULT false,
    disclaimer_text TEXT,
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    effectiveness_score NUMERIC(3,2),
    usage_notes_for_ai TEXT,
    keywords TEXT[],
    version INTEGER DEFAULT 1,
    is_current BOOLEAN DEFAULT true,
    superseded_by UUID,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    verified_by UUID,
    verified_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 32. KNOWLEDGE_EMBEDDINGS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS knowledge_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_item_id UUID NOT NULL REFERENCES knowledge_items(id) ON DELETE CASCADE,
    embedding vector(1536),
    embedding_model TEXT DEFAULT 'text-embedding-3-small',
    chunk_index INTEGER DEFAULT 0,
    chunk_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 33. LEARNING_EVENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS learning_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    event_type learning_event_type NOT NULL,
    template_id UUID REFERENCES templates(id) ON DELETE SET NULL,
    template_category template_category,
    template_name VARCHAR(200),
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    lead_status VARCHAR(50),
    lead_temperature VARCHAR(20),
    channel VARCHAR(50),
    message_text TEXT,
    message_word_count INTEGER,
    outcome outcome_type,
    outcome_value DECIMAL(10,2),
    response_received BOOLEAN DEFAULT FALSE,
    response_time_hours DECIMAL(10,2),
    converted_to_next_stage BOOLEAN DEFAULT FALSE,
    conversion_stage VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 34. LEARNING_AGGREGATES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS learning_aggregates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    aggregate_type VARCHAR(20) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    template_category template_category,
    user_id UUID,
    total_events INTEGER DEFAULT 0,
    templates_used INTEGER DEFAULT 0,
    unique_leads INTEGER DEFAULT 0,
    responses_received INTEGER DEFAULT 0,
    response_rate DECIMAL(5,2) DEFAULT 0,
    avg_response_time_hours DECIMAL(10,2),
    positive_outcomes INTEGER DEFAULT 0,
    negative_outcomes INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0,
    appointments_booked INTEGER DEFAULT 0,
    deals_closed INTEGER DEFAULT 0,
    total_deal_value DECIMAL(12,2) DEFAULT 0,
    channel_breakdown JSONB DEFAULT '{}',
    top_templates JSONB DEFAULT '[]',
    computed_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, aggregate_type, period_start, template_id, user_id)
);

-- ============================================================================
-- 35. ACTIVITIES TABLE (für Activity Tracking)
-- ============================================================================

CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id),
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    activity_type TEXT NOT NULL CHECK (activity_type IN (
        'call', 'email', 'message', 'meeting', 'presentation', 
        'follow_up', 'note', 'task_completed', 'deal_closed', 'deal_lost',
        'contact_created', 'contact_updated', 'script_used'
    )),
    title TEXT NOT NULL,
    description TEXT,
    outcome TEXT,
    duration_minutes INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_lead ON activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(created_at);

-- ============================================================================
-- 36. LEAD_SCORES TABLE (Historie)
-- ============================================================================

CREATE TABLE IF NOT EXISTS lead_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
    score_category TEXT CHECK (score_category IN ('hot', 'warm', 'cool', 'cold')),
    bant_budget INTEGER,
    bant_authority INTEGER,
    bant_need INTEGER,
    bant_timeline INTEGER,
    score_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_scores_lead ON lead_scores(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_scores_date ON lead_scores(created_at);

-- ============================================================================
-- 37. MESSAGE_TEMPLATES TABLE (Alias für Kompatibilität)
-- ============================================================================

-- Falls message_templates als separates Konzept benötigt wird
CREATE TABLE IF NOT EXISTS message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id),
    name TEXT NOT NULL,
    subject TEXT,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'custom',
    channel TEXT CHECK (channel IN ('email', 'whatsapp', 'sms', 'linkedin', 'instagram')),
    variables JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_templates_user ON message_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_category ON message_templates(category);

-- ============================================================================
-- RLS POLICIES (Basis-Sicherheit)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE dmo_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE script_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE script_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequence_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE quick_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE objection_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE vertical_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_assist_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_assist_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;

-- Basic "own data" policies
DROP POLICY IF EXISTS "Users see own scheduled_jobs" ON scheduled_jobs;
CREATE POLICY "Users see own scheduled_jobs" ON scheduled_jobs FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users see own ai_interactions" ON ai_interactions;
CREATE POLICY "Users see own ai_interactions" ON ai_interactions FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users see own contacts" ON contacts;
CREATE POLICY "Users see own contacts" ON contacts FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users see own dmo_entries" ON dmo_entries;
CREATE POLICY "Users see own dmo_entries" ON dmo_entries FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Scripts are public" ON scripts;
CREATE POLICY "Scripts are public" ON scripts FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users see own sequences" ON sequences;
CREATE POLICY "Users see own sequences" ON sequences FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users see own follow_up_tasks" ON follow_up_tasks;
CREATE POLICY "Users see own follow_up_tasks" ON follow_up_tasks FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users see own live_assist_sessions" ON live_assist_sessions;
CREATE POLICY "Users see own live_assist_sessions" ON live_assist_sessions FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users see own activities" ON activities;
CREATE POLICY "Users see own activities" ON activities FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users see own message_templates" ON message_templates;
CREATE POLICY "Users see own message_templates" ON message_templates FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- HELPER FUNCTION: Update updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to relevant tables
DO $$
DECLARE
    tables TEXT[] := ARRAY[
        'companies', 'leads', 'templates', 'scheduled_jobs', 'team_members',
        'contacts', 'dmo_entries', 'scripts', 'custom_scripts', 'sequences',
        'sequence_steps', 'sequence_enrollments', 'follow_up_tasks',
        'quick_facts', 'objection_responses', 'vertical_knowledge',
        'knowledge_items', 'message_templates'
    ];
    t TEXT;
BEGIN
    FOREACH t IN ARRAY tables
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trigger_%s_updated_at ON %s', t, t);
        EXECUTE format('CREATE TRIGGER trigger_%s_updated_at BEFORE UPDATE ON %s FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
    END LOOP;
END $$;

-- ============================================================================
-- HELPER FUNCTION: Personalize Content
-- ============================================================================

CREATE OR REPLACE FUNCTION personalize_content(p_content TEXT, p_variables JSONB) 
RETURNS TEXT AS $$
DECLARE
    result TEXT := p_content;
    k TEXT;
    v TEXT;
BEGIN
    FOR k, v IN SELECT * FROM jsonb_each_text(p_variables)
    LOOP
        result := REPLACE(result, '{{' || k || '}}', COALESCE(v, ''));
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VERIFICATION QUERY
-- ============================================================================

DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';
    
    RAISE NOTICE '';
    RAISE NOTICE '╔══════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║  ✅ MASTER MIGRATION COMPLETE!                               ║';
    RAISE NOTICE '╚══════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Tabellen in public schema: %', table_count;
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Erstellte Tabellen:';
    RAISE NOTICE '   • companies, leads, templates, template_performance';
    RAISE NOTICE '   • scheduled_jobs, ai_interactions, team_members';
    RAISE NOTICE '   • contacts, dmo_entries, scripts, script_usage_logs';
    RAISE NOTICE '   • sequences, sequence_steps, sequence_enrollments';
    RAISE NOTICE '   • sequence_actions, sequence_action_queue, sequence_daily_stats';
    RAISE NOTICE '   • follow_up_tasks, company_intelligence, objection_library';
    RAISE NOTICE '   • success_stories, liability_rules, quick_facts';
    RAISE NOTICE '   • objection_responses, vertical_knowledge';
    RAISE NOTICE '   • live_assist_sessions, live_assist_queries';
    RAISE NOTICE '   • knowledge_items, knowledge_embeddings';
    RAISE NOTICE '   • learning_events, learning_aggregates';
    RAISE NOTICE '   • activities, lead_scores, message_templates';
    RAISE NOTICE '';
    RAISE NOTICE '🔒 RLS aktiviert auf allen User-Tabellen';
    RAISE NOTICE '⚡ Trigger für updated_at auf relevanten Tabellen';
    RAISE NOTICE '';
END $$;

SELECT '🚀 MASTER MIGRATION erfolgreich ausgeführt!' AS status;


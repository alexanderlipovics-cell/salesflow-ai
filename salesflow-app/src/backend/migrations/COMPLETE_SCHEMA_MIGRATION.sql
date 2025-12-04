-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  COMPLETE SCHEMA MIGRATION - SALES FLOW AI                                ║
-- ║  Erstellt ALLE 140+ Tabellen die der Code erwartet                        ║
-- ║  Erstellt: 2024-12-04                                                      ║
-- ╚════════════════════════════════════════════════════════════════════════════╝
--
-- VOLLSTÄNDIGE TABELLEN-LISTE (aus Code-Analyse):
-- ================================================
-- 
-- Gefunden durch: grep -r "\.table\(" | Unique table names
--
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

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

-- ============================================================================
-- 1. CORE TABLES (Basis)
-- ============================================================================

-- profiles (Supabase Auth Extension)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    company_id UUID,
    vertical_id TEXT DEFAULT 'network_marketing',
    role TEXT DEFAULT 'user',
    onboarding_completed BOOLEAN DEFAULT false,
    settings JSONB DEFAULT '{}',
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    streak_days INTEGER DEFAULT 0,
    last_active_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- companies
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
-- 2. LEADS & CONTACTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    instagram_handle TEXT,
    whatsapp_number TEXT,
    status TEXT DEFAULT 'new',
    temperature TEXT DEFAULT 'cold',
    deal_state TEXT DEFAULT 'open',
    source TEXT,
    source_details TEXT,
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    last_contact_at TIMESTAMPTZ,
    next_follow_up_at TIMESTAMPTZ,
    -- BANT Scores
    bant_budget INTEGER DEFAULT 0,
    bant_authority INTEGER DEFAULT 0,
    bant_need INTEGER DEFAULT 0,
    bant_timeline INTEGER DEFAULT 0,
    lead_score INTEGER DEFAULT 0,
    score_category TEXT DEFAULT 'cold',
    disg_type TEXT,
    score_updated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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
    contact_type TEXT NOT NULL DEFAULT 'prospect',
    relationship_level TEXT DEFAULT 'cold',
    disc_type TEXT,
    disc_confidence DECIMAL(3, 2),
    pipeline_stage TEXT DEFAULT 'lead',
    first_contact_at TIMESTAMPTZ,
    last_contact_at TIMESTAMPTZ,
    next_follow_up_at TIMESTAMPTZ,
    total_interactions INTEGER DEFAULT 0,
    source TEXT,
    source_details TEXT,
    notes TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 3. ACTIVITIES & INTERACTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID,
    lead_id UUID,
    contact_id UUID,
    activity_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    outcome TEXT,
    duration_minutes INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    description TEXT,
    outcome TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID,
    session_id UUID,
    interaction_type TEXT NOT NULL,
    request_text TEXT NOT NULL,
    request_context JSONB,
    response_text TEXT,
    response_metadata JSONB,
    model TEXT NOT NULL DEFAULT 'gpt-4',
    provider TEXT NOT NULL DEFAULT 'openai',
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    estimated_cost_usd DECIMAL(10, 6),
    latency_ms INTEGER,
    action_tags JSONB DEFAULT '[]'::jsonb,
    actions_executed JSONB DEFAULT '[]'::jsonb,
    user_rating INTEGER,
    user_feedback TEXT,
    was_helpful BOOLEAN,
    compliance_flags JSONB DEFAULT '[]'::jsonb,
    was_filtered BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 4. FOLLOW-UPS
-- ============================================================================

CREATE TABLE IF NOT EXISTS follow_ups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    due_time TIME,
    priority TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    completed_at TIMESTAMPTZ,
    reminder_at TIMESTAMPTZ,
    reminder_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS follow_up_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID,
    lead_name TEXT,
    action TEXT NOT NULL DEFAULT 'follow_up',
    description TEXT NOT NULL,
    due_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_time TIME,
    priority TEXT NOT NULL DEFAULT 'medium',
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    reminder_at TIMESTAMPTZ,
    reminder_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID,
    contact_id UUID,
    scheduled_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_pending_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    priority TEXT DEFAULT 'medium',
    due_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. DAILY FLOW / DMO
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

CREATE TABLE IF NOT EXISTS daily_flow_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status_date DATE NOT NULL DEFAULT CURRENT_DATE,
    overall_progress DECIMAL(5,2) DEFAULT 0,
    status_level TEXT DEFAULT 'behind',
    activities_completed INTEGER DEFAULT 0,
    activities_total INTEGER DEFAULT 0,
    energy_level INTEGER DEFAULT 5,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, status_date)
);

CREATE TABLE IF NOT EXISTS daily_flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    flow_date DATE NOT NULL,
    status TEXT DEFAULT 'active',
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_flow_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_flow_id UUID REFERENCES daily_flows(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    priority INTEGER DEFAULT 5,
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_flow_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_date DATE NOT NULL,
    goals JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_date DATE NOT NULL,
    plan_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    analytics_date DATE NOT NULL,
    metrics JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, analytics_date)
);

-- ============================================================================
-- 6. GOALS
-- ============================================================================

CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID,
    goal_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    target_value DECIMAL(15,2),
    current_value DECIMAL(15,2) DEFAULT 0,
    target_date DATE,
    status TEXT DEFAULT 'active',
    progress DECIMAL(5,2) DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_kind TEXT NOT NULL,
    target_value DECIMAL(15,2) NOT NULL,
    timeframe_months INTEGER DEFAULT 12,
    vertical_id TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_goal_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    vertical_id TEXT NOT NULL,
    goal_templates JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7. TEAM
-- ============================================================================

CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    leader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    member_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'partner',
    custom_role TEXT,
    rank_level INTEGER DEFAULT 1,
    status TEXT NOT NULL DEFAULT 'active',
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
    preferred_channel TEXT,
    notification_preferences JSONB DEFAULT '{"daily_summary": true, "team_updates": true}'::jsonb,
    disc_type TEXT,
    notes TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    invited_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES auth.users(id),
    message TEXT NOT NULL,
    broadcast_type TEXT DEFAULT 'announcement',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_nudges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    from_user_id UUID REFERENCES auth.users(id),
    to_user_id UUID REFERENCES auth.users(id),
    message TEXT,
    nudge_type TEXT DEFAULT 'motivation',
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS team_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT,
    is_shared BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 8. SCRIPTS & TEMPLATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    number INTEGER UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    context TEXT NOT NULL,
    relationship_level TEXT NOT NULL DEFAULT 'warm',
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
    best_for_disg TEXT,
    best_for_channel TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS script_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    script_id UUID REFERENCES scripts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    company_id UUID,
    was_sent BOOLEAN DEFAULT true,
    got_reply BOOLEAN DEFAULT false,
    was_positive BOOLEAN DEFAULT false,
    converted BOOLEAN DEFAULT false,
    response_time_minutes INTEGER,
    channel TEXT,
    disg_type TEXT,
    lead_id UUID,
    user_rating INTEGER,
    user_feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    created_by UUID,
    name VARCHAR(200) NOT NULL,
    category TEXT NOT NULL DEFAULT 'custom',
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

CREATE TABLE IF NOT EXISTS template_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS template_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID REFERENCES templates(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    sends INTEGER DEFAULT 0,
    responses INTEGER DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID,
    name TEXT NOT NULL,
    subject TEXT,
    content TEXT NOT NULL,
    category TEXT DEFAULT 'custom',
    channel TEXT,
    variables JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    company_id UUID,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    template_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 9. SEQUENCES (Email/Outreach Automation)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft',
    settings JSONB DEFAULT '{}',
    stats JSONB DEFAULT '{"enrolled": 0, "active": 0, "completed": 0, "replied": 0}',
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    activated_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

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

CREATE TABLE IF NOT EXISTS email_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    provider TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 10. SCHEDULED JOBS
-- ============================================================================

CREATE TABLE IF NOT EXISTS scheduled_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_type TEXT NOT NULL,
    job_name TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID,
    lead_id UUID,
    contact_id UUID,
    payload JSONB DEFAULT '{}'::jsonb,
    priority INTEGER DEFAULT 5,
    scheduled_at TIMESTAMPTZ NOT NULL,
    repeat_interval TEXT DEFAULT 'once',
    cron_expression TEXT,
    next_run_at TIMESTAMPTZ,
    last_run_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'pending',
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

-- ============================================================================
-- 11. KNOWLEDGE & LEARNING
-- ============================================================================

CREATE TABLE IF NOT EXISTS knowledge_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    vertical_id TEXT,
    language TEXT NOT NULL DEFAULT 'de',
    region TEXT,
    domain TEXT NOT NULL,
    type TEXT NOT NULL,
    topic TEXT NOT NULL,
    subtopic TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    content_short TEXT,
    keywords TEXT[],
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_item_id UUID REFERENCES knowledge_items(id) ON DELETE CASCADE,
    embedding vector(1536),
    embedding_model TEXT DEFAULT 'text-embedding-3-small',
    chunk_index INTEGER DEFAULT 0,
    chunk_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    knowledge_type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learning_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    template_id UUID,
    template_category TEXT,
    template_name VARCHAR(200),
    lead_id UUID,
    lead_status VARCHAR(50),
    lead_temperature VARCHAR(20),
    channel VARCHAR(50),
    message_text TEXT,
    message_word_count INTEGER,
    outcome TEXT,
    outcome_value DECIMAL(10,2),
    response_received BOOLEAN DEFAULT FALSE,
    response_time_hours DECIMAL(10,2),
    converted_to_next_stage BOOLEAN DEFAULT FALSE,
    conversion_stage VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learning_aggregates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    aggregate_type VARCHAR(20) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    template_id UUID,
    template_category TEXT,
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
    computed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learning_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    signal_type TEXT NOT NULL,
    signal_data JSONB NOT NULL,
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learning_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    company_id UUID,
    pattern_type TEXT NOT NULL,
    pattern_key TEXT NOT NULL,
    frequency INTEGER DEFAULT 1,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learning_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    case_type TEXT NOT NULL,
    input_data JSONB NOT NULL,
    output_data JSONB,
    success BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 12. TEACH SYSTEM
-- ============================================================================

CREATE TABLE IF NOT EXISTS command_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID,
    trigger_pattern TEXT NOT NULL,
    action_type TEXT NOT NULL,
    action_config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 13. LIVE ASSIST
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
    source_user_id UUID,
    language TEXT DEFAULT 'de',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS live_assist_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    company_id UUID REFERENCES companies(id),
    vertical TEXT,
    lead_id UUID,
    queries_count INTEGER DEFAULT 0,
    facts_served INTEGER DEFAULT 0,
    objections_handled INTEGER DEFAULT 0,
    session_outcome TEXT,
    user_rating INTEGER,
    user_feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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

-- Live Assist with la_ prefix
CREATE TABLE IF NOT EXISTS la_quick_facts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    fact_key TEXT NOT NULL,
    fact_value TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS la_objection_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    objection_type TEXT NOT NULL,
    response TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS la_vertical_knowledge (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vertical TEXT NOT NULL,
    topic TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS la_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS la_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID,
    query_text TEXT NOT NULL,
    response_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS la_company_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    product_name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS la_company_guardrails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    guardrail_type TEXT NOT NULL,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS la_intent_learning_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    intent TEXT NOT NULL,
    pattern TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS la_objection_learning_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    objection_type TEXT NOT NULL,
    pattern TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 14. OUTREACH & MESSAGING
-- ============================================================================

CREATE TABLE IF NOT EXISTS outreach_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_id UUID,
    lead_id UUID,
    channel TEXT NOT NULL,
    direction TEXT NOT NULL,
    content TEXT,
    status TEXT DEFAULT 'sent',
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    replied_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS outreach_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pulse_outreach_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    contact_id UUID,
    message_type TEXT,
    content TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    conversation_id UUID,
    content TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    direction TEXT NOT NULL,
    content TEXT NOT NULL,
    channel TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    message_type TEXT NOT NULL,
    content TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS voice_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    transcript TEXT,
    audio_url TEXT,
    duration_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    lead_id UUID,
    contact_id UUID,
    channel TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    contact_id UUID,
    comm_type TEXT NOT NULL,
    content TEXT,
    status TEXT DEFAULT 'sent',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 15. GHOST BUSTER
-- ============================================================================

CREATE TABLE IF NOT EXISTS ghost_buster_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    company_id UUID,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    ghost_type TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ghost_followup_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_id UUID,
    lead_id UUID,
    scheduled_for TIMESTAMPTZ NOT NULL,
    priority INTEGER DEFAULT 5,
    status TEXT DEFAULT 'pending',
    ghost_type TEXT,
    template_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 16. SALES INTELLIGENCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    variants JSONB DEFAULT '[]',
    results JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ab_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID REFERENCES ab_tests(id) ON DELETE CASCADE,
    variant TEXT NOT NULL,
    converted BOOLEAN DEFAULT false,
    lead_id UUID,
    user_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ab_experiment_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    experiment_name TEXT NOT NULL,
    variant TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ab_experiment_outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES ab_experiment_assignments(id),
    outcome_type TEXT NOT NULL,
    outcome_value DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS framework_usage_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    framework_name TEXT NOT NULL,
    usage_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS buyer_type_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    buyer_type TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS industry_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    industry TEXT NOT NULL,
    leads_count INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS momentum_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    lead_id UUID,
    signal_type TEXT NOT NULL,
    signal_strength DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS momentum_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    lead_id UUID,
    score DECIMAL(5,2) NOT NULL,
    factors JSONB DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deal_momentum_signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    lead_id UUID,
    signal_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS deal_framework_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    lead_id UUID,
    framework_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS micro_coaching_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    coaching_type TEXT NOT NULL,
    content TEXT,
    dismissed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS phone_mode_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    calls_made INTEGER DEFAULT 0,
    connects INTEGER DEFAULT 0,
    duration_seconds INTEGER
);

CREATE TABLE IF NOT EXISTS daily_effectiveness (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    effectiveness_date DATE NOT NULL,
    score DECIMAL(5,2),
    factors JSONB DEFAULT '{}',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vertical_configs (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    description TEXT,
    compliance_level TEXT DEFAULT 'standard',
    default_tone TEXT,
    key_objections JSONB DEFAULT '[]',
    is_custom BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS framework_effectiveness_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    framework_name TEXT NOT NULL,
    effectiveness_date DATE NOT NULL,
    uses INTEGER DEFAULT 0,
    successes INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS conversion_funnel_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    funnel_date DATE NOT NULL,
    stage TEXT NOT NULL,
    count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cross_channel_strategies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    strategy_name TEXT NOT NULL,
    channels JSONB DEFAULT '[]',
    effectiveness DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS performer_benchmarks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    vertical TEXT,
    metric_name TEXT NOT NULL,
    top_performer_value DECIMAL(10,2),
    average_value DECIMAL(10,2),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 17. PERSONALITY PROFILES
-- ============================================================================

CREATE TABLE IF NOT EXISTS lead_personality_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    dominant_style TEXT,
    confidence DECIMAL(3,2),
    d_score DECIMAL(3,2),
    i_score DECIMAL(3,2),
    s_score DECIMAL(3,2),
    c_score DECIMAL(3,2),
    messages_analyzed INTEGER DEFAULT 0,
    last_analyzed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_behavior_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    response_time_avg DECIMAL(10,2),
    preferred_channel TEXT,
    engagement_score DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_psychology_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    buying_style TEXT,
    decision_factors JSONB DEFAULT '[]',
    pain_points JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    lead_id UUID,
    contact_id UUID,
    plan_type TEXT NOT NULL,
    next_contact_at TIMESTAMPTZ,
    next_channel TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 18. AUTONOMOUS BRAIN
-- ============================================================================

CREATE TABLE IF NOT EXISTS brain_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    decision_type TEXT NOT NULL,
    input_data JSONB NOT NULL,
    output_data JSONB,
    confidence DECIMAL(3,2),
    status TEXT DEFAULT 'pending',
    approved BOOLEAN,
    approved_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS brain_learnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    learning_type TEXT NOT NULL,
    pattern JSONB NOT NULL,
    frequency INTEGER DEFAULT 1,
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS autopilot_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT false,
    mode TEXT DEFAULT 'suggest',
    confidence_threshold DECIMAL(3,2) DEFAULT 0.8,
    allowed_actions JSONB DEFAULT '[]',
    daily_limits JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS autopilot_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    target_id UUID,
    target_type TEXT,
    status TEXT DEFAULT 'pending',
    confidence DECIMAL(3,2),
    reasoning TEXT,
    result JSONB,
    executed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS autopilot_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    draft_content JSONB NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_autopilot_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    override_type TEXT NOT NULL,
    override_value JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 19. INTEGRATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMPTZ,
    account_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, provider)
);

CREATE TABLE IF NOT EXISTS oauth_states (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    provider TEXT NOT NULL,
    redirect_uri TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS channel_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    channel_name TEXT NOT NULL,
    external_id TEXT,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 20. FEATURE FLAGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    company_id UUID,
    flags JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 21. NOTIFICATIONS & PUSH
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT,
    notification_type TEXT,
    data JSONB DEFAULT '{}',
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS push_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    schedule_type TEXT NOT NULL,
    scheduled_for TIMESTAMPTZ NOT NULL,
    content JSONB NOT NULL,
    status TEXT DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS push_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    push_type TEXT NOT NULL,
    content TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    alert_type TEXT NOT NULL,
    message TEXT NOT NULL,
    severity TEXT DEFAULT 'info',
    dismissed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 22. GAMIFICATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    xp INTEGER DEFAULT 0,
    level INTEGER DEFAULT 1,
    streak_days INTEGER DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    badges JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS xp_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    xp_amount INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id UUID,
    unlocked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS achievement_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    xp_reward INTEGER DEFAULT 0,
    criteria JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    streak_type TEXT NOT NULL,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_wins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    win_type TEXT NOT NULL,
    description TEXT,
    value DECIMAL(10,2),
    celebrated BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 23. FINANCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS finance_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    currency TEXT DEFAULT 'EUR',
    category TEXT,
    description TEXT,
    transaction_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    account_name TEXT NOT NULL,
    account_type TEXT,
    balance DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    goal_name TEXT NOT NULL,
    target_amount DECIMAL(15,2),
    current_amount DECIMAL(15,2) DEFAULT 0,
    target_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_recurring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    frequency TEXT NOT NULL,
    next_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_tax_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tax_year INTEGER NOT NULL,
    profile_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_mileage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    trip_date DATE NOT NULL,
    start_location TEXT,
    end_location TEXT,
    distance_km DECIMAL(10,2),
    purpose TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    export_type TEXT NOT NULL,
    file_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 24. BILLING & SUBSCRIPTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT false,
    stripe_subscription_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    subscription_id UUID REFERENCES subscriptions(id),
    amount DECIMAL(10,2) NOT NULL,
    currency TEXT DEFAULT 'EUR',
    status TEXT DEFAULT 'draft',
    stripe_invoice_id TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS usage_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    feature TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS monthly_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    offer_month DATE NOT NULL,
    offer_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 25. COMPANY SETTINGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    setting_key TEXT NOT NULL,
    setting_value JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(company_id, setting_key)
);

CREATE TABLE IF NOT EXISTS company_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    sku TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_stories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    story_type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS company_guardrails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    guardrail_type TEXT NOT NULL,
    config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 26. USER SETTINGS & ONBOARDING
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS user_onboarding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    current_step INTEGER DEFAULT 0,
    completed_steps JSONB DEFAULT '[]',
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS user_territories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    territory_name TEXT NOT NULL,
    config JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    correction_type TEXT NOT NULL,
    original_value TEXT,
    corrected_value TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS intent_corrections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    original_intent TEXT,
    corrected_intent TEXT,
    context TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 27. CHAT IMPORT
-- ============================================================================

CREATE TABLE IF NOT EXISTS imported_chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    contact_name TEXT,
    contact_id UUID,
    messages JSONB NOT NULL,
    imported_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS extracted_objections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES imported_chats(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    objection_text TEXT NOT NULL,
    objection_type TEXT,
    context TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 28. PHOENIX (Retention)
-- ============================================================================

CREATE TABLE IF NOT EXISTS phoenix_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_id UUID,
    session_type TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS phoenix_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    contact_id UUID,
    alert_type TEXT NOT NULL,
    message TEXT,
    priority TEXT DEFAULT 'medium',
    dismissed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS retention_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_id UUID,
    risk_score DECIMAL(5,2),
    last_engagement_at TIMESTAMPTZ,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 29. COLLECTIVE INTELLIGENCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS collective_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID,
    vertical TEXT,
    insight_type TEXT NOT NULL,
    insight_data JSONB NOT NULL,
    confidence DECIMAL(3,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS collective_adoptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    insight_id UUID REFERENCES collective_insights(id),
    user_id UUID REFERENCES auth.users(id),
    adopted_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rule_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID,
    user_id UUID REFERENCES auth.users(id),
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    result JSONB
);

-- ============================================================================
-- 30. SALES BRAIN
-- ============================================================================

CREATE TABLE IF NOT EXISTS sales_brain_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    company_id UUID,
    rule_type TEXT NOT NULL,
    rule_config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_brain_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    rule_id UUID,
    feedback_type TEXT NOT NULL,
    feedback_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 31. FIELD VISITS
-- ============================================================================

CREATE TABLE IF NOT EXISTS field_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    contact_id UUID,
    visit_date DATE NOT NULL,
    location TEXT,
    notes TEXT,
    outcome TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 32. users VIEW (compatibility) - SKIP if users table already exists
-- ============================================================================

-- Note: Skipping users view creation as 'users' table may already exist
-- If you need a users view, run this manually:
-- CREATE OR REPLACE VIEW public.users_view AS SELECT id, email, created_at FROM auth.users;

-- ============================================================================
-- RLS POLICIES (Basic)
-- ============================================================================

-- Enable RLS on critical tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE dmo_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE autopilot_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Basic own-data policies (DROP first to avoid errors)
DROP POLICY IF EXISTS "Users see own profiles" ON profiles;
DROP POLICY IF EXISTS "Users see own leads" ON leads;
DROP POLICY IF EXISTS "Users see own contacts" ON contacts;
DROP POLICY IF EXISTS "Users see own activities" ON activities;
DROP POLICY IF EXISTS "Users see own follow_ups" ON follow_ups;
DROP POLICY IF EXISTS "Users see own follow_up_tasks" ON follow_up_tasks;
DROP POLICY IF EXISTS "Users see own dmo_entries" ON dmo_entries;
DROP POLICY IF EXISTS "Users see own goals" ON goals;
DROP POLICY IF EXISTS "Users see own scheduled_jobs" ON scheduled_jobs;
DROP POLICY IF EXISTS "Users see own ai_interactions" ON ai_interactions;
DROP POLICY IF EXISTS "Users see own autopilot_settings" ON autopilot_settings;
DROP POLICY IF EXISTS "Users see own user_settings" ON user_settings;
DROP POLICY IF EXISTS "Users see own notifications" ON notifications;
DROP POLICY IF EXISTS "Scripts are public" ON scripts;
DROP POLICY IF EXISTS "Team members by leader" ON team_members;
DROP POLICY IF EXISTS "Sequences by owner" ON sequences;

CREATE POLICY "Users see own profiles" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users see own leads" ON leads FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own contacts" ON contacts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own activities" ON activities FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own follow_ups" ON follow_ups FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own follow_up_tasks" ON follow_up_tasks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own dmo_entries" ON dmo_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own goals" ON goals FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own scheduled_jobs" ON scheduled_jobs FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own ai_interactions" ON ai_interactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own autopilot_settings" ON autopilot_settings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own user_settings" ON user_settings FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Scripts are public" ON scripts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Team members by leader" ON team_members FOR ALL USING (auth.uid() = leader_id OR auth.uid() = member_id);
CREATE POLICY "Sequences by owner" ON sequences FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_leads_user ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_contacts_user ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(created_at);
CREATE INDEX IF NOT EXISTS idx_dmo_entries_user_date ON dmo_entries(user_id, entry_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_status ON scheduled_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_scheduled ON scheduled_jobs(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_ai_interactions_user ON ai_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_sequences_user ON sequences(user_id);
CREATE INDEX IF NOT EXISTS idx_scripts_category ON scripts(category);
-- Note: idx_scripts_number skipped - column may not exist in existing table
-- ALTER TABLE scripts ADD COLUMN IF NOT EXISTS number INTEGER;

-- ============================================================================
-- VERIFICATION
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
    RAISE NOTICE '║  ✅ COMPLETE SCHEMA MIGRATION DONE!                          ║';
    RAISE NOTICE '╚══════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE '📊 Tabellen erstellt: %', table_count;
    RAISE NOTICE '';
END $$;

SELECT '🚀 COMPLETE SCHEMA MIGRATION erfolgreich!' AS status;


-- SalesFlow AI - Event Backbone, AI Orchestrator & Domain Architecture
-- Migration: 001_events_ai_domain.sql
-- Author: SalesFlow AI Team
-- Date: 2024

-- ============ SYSTEM 1: EVENTS ==================

CREATE TABLE IF NOT EXISTS public.events (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NOT NULL,
    type            text NOT NULL,
    payload         jsonb NOT NULL DEFAULT '{}'::jsonb,
    source          text NOT NULL,
    status          text NOT NULL DEFAULT 'pending', -- pending|processed|failed
    correlation_id  uuid NULL,
    causation_id    uuid NULL,
    request_id      text NULL,
    meta            jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at      timestamptz NOT NULL DEFAULT now(),
    processed_at    timestamptz NULL,
    error_message   text NULL
);

CREATE INDEX IF NOT EXISTS idx_events_tenant_type_created
    ON public.events (tenant_id, type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_status
    ON public.events (status);

-- ============ SYSTEM 2: AI ORCHESTRATOR ==========

CREATE TABLE IF NOT EXISTS public.ai_prompt_templates (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       uuid NULL,
    scenario_id     text NOT NULL,
    version         integer NOT NULL,
    is_active       boolean NOT NULL DEFAULT true,
    system_prompt   text NOT NULL,
    user_template   text NOT NULL,
    metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_prompt_templates_unique
    ON public.ai_prompt_templates (
        coalesce(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid),
        scenario_id,
        version
    );

CREATE TABLE IF NOT EXISTS public.ai_call_logs (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           uuid NOT NULL,
    scenario_id         text NOT NULL,
    model               text NOT NULL,
    request_id          text NULL,
    prompt_tokens       integer NOT NULL,
    completion_tokens   integer NOT NULL,
    cost_usd            numeric(12,6) NOT NULL,
    latency_ms          integer NOT NULL,
    success             boolean NOT NULL,
    error_type          text NULL,
    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_call_logs_tenant_scenario
    ON public.ai_call_logs (tenant_id, scenario_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.ai_token_budgets (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           uuid NOT NULL,
    scenario_id         text NOT NULL,
    period_start        date NOT NULL,
    monthly_token_limit bigint NOT NULL,
    tokens_used         bigint NOT NULL DEFAULT 0,
    created_at          timestamptz NOT NULL DEFAULT now(),
    updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_token_budgets_unique
    ON public.ai_token_budgets (tenant_id, scenario_id, period_start);

-- ============ SYSTEM 3: DOMAIN LEADS / REVIEW ====

-- Add columns to existing leads table (if not exists)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leads' AND column_name = 'raw_context') THEN
        ALTER TABLE public.leads
            ADD COLUMN raw_context jsonb NOT NULL DEFAULT '{}'::jsonb;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'leads' AND column_name = 'is_confirmed') THEN
        ALTER TABLE public.leads
            ADD COLUMN is_confirmed boolean NOT NULL DEFAULT false;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.lead_review_tasks (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id           uuid NOT NULL,
    lead_id             uuid NULL,
    extraction_payload  jsonb NOT NULL,
    confidence          jsonb NOT NULL,
    status              text NOT NULL DEFAULT 'pending',
    notes               text NULL,
    created_at          timestamptz NOT NULL DEFAULT now(),
    reviewed_at         timestamptz NULL,
    reviewed_by         uuid NULL
);

CREATE INDEX IF NOT EXISTS idx_lead_review_tasks_tenant_status
    ON public.lead_review_tasks (tenant_id, status, created_at);

-- ============ RLS (Row Level Security) =====

ALTER TABLE public.events               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompt_templates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_call_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_token_budgets     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_review_tasks    ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS tenant_isolation_events ON public.events;
DROP POLICY IF EXISTS tenant_isolation_ai_prompts ON public.ai_prompt_templates;
DROP POLICY IF EXISTS tenant_isolation_ai_calls ON public.ai_call_logs;
DROP POLICY IF EXISTS tenant_isolation_ai_budgets ON public.ai_token_budgets;
DROP POLICY IF EXISTS tenant_isolation_lead_review_tasks ON public.lead_review_tasks;

CREATE POLICY tenant_isolation_events
    ON public.events
    USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_ai_prompts
    ON public.ai_prompt_templates
    USING (tenant_id IS NULL OR tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_ai_calls
    ON public.ai_call_logs
    USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_ai_budgets
    ON public.ai_token_budgets
    USING (tenant_id::text = current_setting('app.tenant_id', true));

CREATE POLICY tenant_isolation_lead_review_tasks
    ON public.lead_review_tasks
    USING (tenant_id::text = current_setting('app.tenant_id', true));

-- ============ SYSTEM 4: CONVERSATION ENGINE 2.0 ==========

CREATE TABLE IF NOT EXISTS public.channel_identities (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id         uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    channel_type    text NOT NULL,
    identifier      text NOT NULL,
    metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
    last_active_at  timestamptz NOT NULL DEFAULT now(),
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_channel_identities_lead_id
    ON public.channel_identities (lead_id);

CREATE INDEX IF NOT EXISTS idx_channel_identities_lookup
    ON public.channel_identities (channel_type, identifier);

CREATE TABLE IF NOT EXISTS public.conversation_summaries (
    id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id             uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    summary_text        text NOT NULL,
    key_facts           jsonb NOT NULL DEFAULT '{}'::jsonb,
    sentiment_snapshot  float NULL,
    start_message_id    uuid NULL,
    end_message_id      uuid NULL,
    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversation_summaries_lead_id
    ON public.conversation_summaries (lead_id, created_at DESC);

-- RLS für Conversation Tables
ALTER TABLE public.channel_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_summaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_channel_identities ON public.channel_identities;
DROP POLICY IF EXISTS tenant_isolation_conversation_summaries ON public.conversation_summaries;

-- RLS Policies für channel_identities und conversation_summaries
-- Prüfe ob leads.tenant_id existiert, sonst verwende user_id oder deaktiviere RLS

DO $$
BEGIN
    -- Prüfe ob tenant_id in leads existiert
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'leads' 
        AND column_name = 'tenant_id'
    ) THEN
        -- Falls tenant_id existiert: Tenant-basierte Isolation
        EXECUTE 'CREATE POLICY tenant_isolation_channel_identities
            ON public.channel_identities
            USING (
                lead_id IN (
                    SELECT id FROM public.leads 
                    WHERE tenant_id::text = current_setting(''app.tenant_id'', true)
                )
            )';
        
        EXECUTE 'CREATE POLICY tenant_isolation_conversation_summaries
            ON public.conversation_summaries
            USING (
                lead_id IN (
                    SELECT id FROM public.leads 
                    WHERE tenant_id::text = current_setting(''app.tenant_id'', true)
                )
            )';
    ELSE
        -- Falls tenant_id NICHT existiert: Deaktiviere RLS oder verwende user_id
        -- Für jetzt: Erlaube Zugriff (kann später angepasst werden)
        EXECUTE 'CREATE POLICY tenant_isolation_channel_identities
            ON public.channel_identities
            USING (true)';
        
        EXECUTE 'CREATE POLICY tenant_isolation_conversation_summaries
            ON public.conversation_summaries
            USING (true)';
    END IF;
END $$;


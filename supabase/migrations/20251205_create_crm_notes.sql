-- ============================================================================
-- Migration: create_crm_notes
-- Purpose  : CRM Notes Tabelle für Zero-Input CRM (automatische Zusammenfassungen)
-- ============================================================================

-- Tabelle erstellen
create table if not exists public.crm_notes (
    id uuid primary key default gen_random_uuid(),
    
    -- User Reference (wer hat die Note erstellt/zugeordnet)
    user_id uuid not null,
    
    -- Lead/Contact Reference (optional - einer von beiden sollte gesetzt sein)
    lead_id uuid default null,
    contact_id uuid default null,
    
    -- Deal Reference (optional)
    deal_id uuid default null,
    
    -- Note Content
    content text not null,
    
    -- Note Type (manual, ai_summary, call_summary, meeting_summary)
    note_type text not null default 'manual'
        check (note_type in ('manual', 'ai_summary', 'call_summary', 'meeting_summary')),
    
    -- Source (welches System hat die Note erstellt)
    source text default 'user'
        check (source in ('user', 'zero_input_crm', 'autopilot', 'import')),
    
    -- Metadata (für AI-generierte Notes: model, prompt_version, etc.)
    metadata jsonb default null,
    
    -- Timestamps
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Kommentare
comment on table public.crm_notes is 
    'CRM Notes für manuelle und KI-generierte Zusammenfassungen';
comment on column public.crm_notes.note_type is 
    'Art der Note: manual, ai_summary, call_summary, meeting_summary';
comment on column public.crm_notes.source is 
    'Quelle: user (manuell), zero_input_crm (automatisch), autopilot, import';

-- Indexes für Performance
create index if not exists crm_notes_user_id_idx 
    on public.crm_notes(user_id);

create index if not exists crm_notes_lead_id_idx 
    on public.crm_notes(lead_id) 
    where lead_id is not null;

create index if not exists crm_notes_contact_id_idx 
    on public.crm_notes(contact_id) 
    where contact_id is not null;

create index if not exists crm_notes_deal_id_idx 
    on public.crm_notes(deal_id) 
    where deal_id is not null;

create index if not exists crm_notes_created_at_idx 
    on public.crm_notes(created_at desc);

create index if not exists crm_notes_note_type_idx 
    on public.crm_notes(note_type);

-- Trigger für updated_at
create or replace function public.set_crm_notes_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists set_crm_notes_updated_at on public.crm_notes;
create trigger set_crm_notes_updated_at
before update on public.crm_notes
for each row
execute procedure public.set_crm_notes_updated_at();

-- RLS Policies (optional - kann später aktiviert werden)
-- alter table public.crm_notes enable row level security;



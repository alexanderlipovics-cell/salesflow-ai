-- ============================================================================
-- Migration: create_message_events
-- Purpose  : Unified Message Event Tabelle für Autopilot-Verarbeitung
-- ============================================================================

-- Falls Tabelle existiert, erst droppen (für saubere Migration)
drop table if exists public.message_events cascade;

-- Tabelle erstellen
create table public.message_events (
    id uuid primary key default gen_random_uuid(),
    
    -- User Reference
    user_id uuid not null,
    
    -- Contact Reference (optional)
    contact_id uuid default null,
    
    -- Kanal der Nachricht
    channel text not null 
        check (channel in ('email', 'whatsapp', 'instagram', 'linkedin', 'facebook', 'internal')),
    
    -- Richtung: eingehend oder ausgehend
    direction text not null 
        check (direction in ('inbound', 'outbound')),
    
    -- Normalisierter Text (für KI-Verarbeitung)
    normalized_text text not null,
    
    -- Original-Payload vom Kanal (JSON)
    raw_payload jsonb default null,
    
    -- Autopilot Verarbeitungsstatus
    autopilot_status text not null default 'pending'
        check (autopilot_status in ('pending', 'suggested', 'approved', 'sent', 'skipped')),
    
    -- Timestamp
    created_at timestamptz not null default now()
);

-- Kommentare
comment on table public.message_events is 
    'Unified Message Events für Autopilot-Verarbeitung über alle Kanäle';
comment on column public.message_events.channel is 
    'Kommunikationskanal: email, whatsapp, instagram, linkedin, facebook, internal';
comment on column public.message_events.direction is 
    'Nachrichtenrichtung: inbound (eingehend), outbound (ausgehend)';
comment on column public.message_events.normalized_text is 
    'Bereinigter Text für KI-Analyse (ohne HTML, Signaturen etc.)';
comment on column public.message_events.autopilot_status is 
    'Verarbeitungsstatus: pending, suggested, approved, sent, skipped';

-- Indexes für Performance
create index message_events_user_contact_idx 
    on public.message_events(user_id, contact_id);

create index message_events_user_status_idx 
    on public.message_events(user_id, autopilot_status);

create index message_events_created_at_idx 
    on public.message_events(created_at desc);

create index message_events_channel_idx 
    on public.message_events(channel);

create index message_events_direction_idx 
    on public.message_events(user_id, direction);


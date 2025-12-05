-- ============================================================================
-- Migration: alter_message_events_add_suggested_reply
-- Purpose  : Erweitert message_events um Spalte für KI-generierte Antwortvorschläge
-- ============================================================================

-- Spalte für AI-generierte Antwortvorschläge hinzufügen
-- Format: { "text": "...", "detected_action": "...", "channel": "...", "meta": {...} }
alter table public.message_events
    add column if not exists suggested_reply jsonb default null;

-- Kommentar für Dokumentation
comment on column public.message_events.suggested_reply is 
    'KI-generierter Antwortvorschlag: { text, detected_action, channel, meta }';

-- Index für Events mit Vorschlägen (für Dashboard-Queries)
create index if not exists message_events_has_reply_idx 
    on public.message_events(user_id, autopilot_status) 
    where suggested_reply is not null;


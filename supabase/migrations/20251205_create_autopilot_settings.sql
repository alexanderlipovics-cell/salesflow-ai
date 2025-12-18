-- ============================================================================
-- Migration: create_autopilot_settings
-- Purpose  : Speichert Autopilot-Einstellungen pro User (global oder pro Contact)
-- ============================================================================

-- Falls Tabelle existiert, erst droppen (für saubere Migration)
drop table if exists public.autopilot_settings cascade;

-- Trigger-Funktion droppen falls vorhanden
drop function if exists public.set_autopilot_settings_updated_at() cascade;

-- Tabelle erstellen
create table public.autopilot_settings (
    id uuid primary key default gen_random_uuid(),
    
    -- User Reference (analog zu anderen Settings-Tabellen)
    user_id uuid not null,
    
    -- Optional: Contact-spezifische Settings (NULL = globale User-Settings)
    contact_id uuid default null,
    
    -- Autopilot Modus
    mode text not null default 'off'
        check (mode in ('off', 'assist', 'one_click', 'auto')),
    
    -- Kanäle für Autopilot (z.B. ["email"], ["email", "whatsapp"])
    channels jsonb not null default '["email"]'::jsonb,
    
    -- Maximale automatische Antworten pro Tag
    max_auto_replies_per_day integer not null default 10
        check (max_auto_replies_per_day >= 0 and max_auto_replies_per_day <= 1000),
    
    -- Aktiv/Inaktiv Toggle
    is_active boolean not null default true,
    
    -- Timestamps
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Unique Index statt Constraint (behandelt NULL besser)
create unique index autopilot_settings_user_contact_uniq 
    on public.autopilot_settings (user_id, coalesce(contact_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- Kommentare für Dokumentation
comment on table public.autopilot_settings is 
    'Autopilot-Einstellungen: Global pro User oder spezifisch pro Contact';
comment on column public.autopilot_settings.mode is 
    'off=deaktiviert, assist=Vorschläge, one_click=Ein-Klick-Versand, auto=Vollautomatik';
comment on column public.autopilot_settings.channels is 
    'Array von Kanälen: email, whatsapp, linkedin, instagram, sms';
comment on column public.autopilot_settings.contact_id is 
    'NULL = globale User-Settings, sonst Contact-spezifische Überschreibung';

-- Indexes für Performance
create index autopilot_settings_user_id_idx 
    on public.autopilot_settings(user_id);

create index autopilot_settings_user_contact_idx 
    on public.autopilot_settings(user_id, contact_id);

create index autopilot_settings_active_idx 
    on public.autopilot_settings(user_id, is_active) 
    where is_active = true;

-- Trigger für updated_at
create function public.set_autopilot_settings_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger set_autopilot_settings_updated_at
    before update on public.autopilot_settings
    for each row
    execute procedure public.set_autopilot_settings_updated_at();

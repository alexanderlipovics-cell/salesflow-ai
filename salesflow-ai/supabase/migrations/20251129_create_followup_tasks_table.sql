-- Erstellt die Tabelle `followup_tasks` für das Follow-up Light Modul.
-- Diese Migration kann direkt in Supabase ausgeführt werden.

create extension if not exists "pgcrypto";

create table if not exists public.followup_tasks (
    id uuid primary key default gen_random_uuid(),
    lead_id uuid null,
    lead_name text not null,
    branch text not null,
    stage text not null check (stage in ('first_contact','followup1','followup2','reactivation')),
    channel text not null check (channel in ('whatsapp','email','dm')),
    tone text not null check (tone in ('du','sie')),
    context text null,
    due_at timestamptz not null,
    status text not null default 'open' check (status in ('open','done')),
    last_result text null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists followup_tasks_due_at_idx on public.followup_tasks using btree (date(due_at));
create index if not exists followup_tasks_status_idx on public.followup_tasks (status);

create or replace function public.set_followup_tasks_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists set_followup_tasks_updated_at on public.followup_tasks;
create trigger set_followup_tasks_updated_at
before update on public.followup_tasks
for each row
execute procedure public.set_followup_tasks_updated_at();



-- Ergänzt Planungsspalte für nächste Aktionen.

alter table public.leads
    add column if not exists next_action_at timestamptz;

comment on column public.leads.next_action_at is
    'Geplantes Datum/Zeitpunkt der nächsten Aktion.';

create index if not exists leads_next_action_at_idx
    on public.leads (next_action_at)
    where next_action_at is not null;

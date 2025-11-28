-- Fügt Felder für den Bestandskunden-Import hinzu.

alter table public.leads
    add column if not exists next_action text;

alter table public.leads
    add column if not exists needs_action boolean not null default true;

alter table public.leads
    add column if not exists import_batch_id uuid;

alter table public.leads
    add column if not exists source text;

comment on column public.leads.next_action is
    'Nächste empfohlene Aktion (FOLLOW_UP, CHECK_IN, VALUE, REFERRAL).';

comment on column public.leads.needs_action is
    'Kennzeichnet Kontakte ohne Kontext oder AI-Status.';

comment on column public.leads.import_batch_id is
    'UUID, um alle Leads eines Imports zu gruppieren.';

comment on column public.leads.source is
    'Angabe der Erfassungsquelle (z. B. import, manual, api).';

create index if not exists leads_needs_action_idx
    on public.leads (needs_action)
    where needs_action is true;

create index if not exists leads_import_batch_idx
    on public.leads (import_batch_id);

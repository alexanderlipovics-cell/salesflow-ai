create table if not exists public.sales_scenarios (
    id uuid primary key default gen_random_uuid(),
    vertical text not null,
    title text not null,
    channel text,
    stage text,
    outcome text,
    tags text[],
    transcript text not null,
    notes text,
    created_at timestamptz not null default now()
);

comment on table public.sales_scenarios is
    'Vertriebsszenarien und reale Gesprächsverläufe für Sales Flow AI.';

comment on column public.sales_scenarios.vertical is
    'Vertikale/Branche, z. B. art, network_marketing, real_estate.';
comment on column public.sales_scenarios.channel is
    'Kanal: whatsapp, instagram, email, phone, ...';
comment on column public.sales_scenarios.stage is
    'Vertriebsphase: first_contact, followup, closing, objection, reactivation.';
comment on column public.sales_scenarios.outcome is
    'Ergebnis: won, lost, open.';
comment on column public.sales_scenarios.tags is
    'Tags für schnelle Filterung, z. B. preis,provision,international.';

create index if not exists sales_scenarios_vertical_idx
    on public.sales_scenarios (vertical);

create index if not exists sales_scenarios_vertical_outcome_idx
    on public.sales_scenarios (vertical, outcome);

create index if not exists sales_scenarios_tags_idx
    on public.sales_scenarios using gin (tags);

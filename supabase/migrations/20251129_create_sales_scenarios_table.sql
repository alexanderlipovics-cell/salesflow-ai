create table if not exists public.sales_scenarios (
  id uuid primary key default gen_random_uuid(),
  vertical text not null,
  title text not null,
  channel text,
  stage text,
  outcome text,
  tags text[] default '{}',
  transcript text not null,
  notes text,
  created_at timestamptz not null default now()
);

comment on table public.sales_scenarios is
  'Speichert echte Vertriebs- und Gesprächsszenarien als Wissensbasis für CHIEF und vertikale Assistenten.';

comment on column public.sales_scenarios.vertical is
  'Vertical/Branche, z.B. art, b2b_enterprise, network_marketing.';

comment on column public.sales_scenarios.tags is
  'Freie Schlagworte zur Filterung, z.B. {"winstage","provision","roi"}.';

create index if not exists sales_scenarios_vertical_idx
  on public.sales_scenarios (vertical);

create index if not exists sales_scenarios_tags_idx
  on public.sales_scenarios
  using gin (tags);

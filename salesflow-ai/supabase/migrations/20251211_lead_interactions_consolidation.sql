-- Lead Interactions Konsolidierung
-- Safe to re-run (IF NOT EXISTS / idempotente Indizes & Policy)

-- 1) Haupttabelle absichern/erweitern
create table if not exists lead_interactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  lead_id uuid references leads(id) on delete cascade,
  interaction_type text,
  channel text,
  summary text,
  details jsonb default '{}'::jsonb,
  outcome text,
  duration_seconds integer,
  logged_by text,
  source text default 'manual',
  interaction_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz
);

alter table if exists lead_interactions
  add column if not exists user_id uuid,
  add column if not exists source text default 'manual',
  add column if not exists updated_at timestamptz,
  alter column details set default '{}'::jsonb;

-- 2) Performance-Indizes
create index if not exists idx_li_user_lead on lead_interactions(user_id, lead_id);
create index if not exists idx_li_interaction_at on lead_interactions(interaction_at desc);
create index if not exists idx_li_type on lead_interactions(interaction_type);
create index if not exists idx_li_user_id on lead_interactions(user_id);

-- 3) RLS Policy
alter table if exists lead_interactions enable row level security;

drop policy if exists "Users can manage own interactions" on lead_interactions;
create policy "Users can manage own interactions"
  on lead_interactions for all
  using (user_id = auth.uid() or user_id is null);

-- 4) Optional: Sichtprüfung
-- select column_name, data_type from information_schema.columns where table_name = 'lead_interactions' order by ordinal_position;


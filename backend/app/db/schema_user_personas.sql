-- ═══════════════════════════════════════════════════════════════════
-- Sales Agent Personas - User-spezifische KI-Einstellungen
-- ═══════════════════════════════════════════════════════════════════
--
-- Diese Tabelle speichert pro User die bevorzugte KI-Persona / Sales Mode.
-- Die Persona beeinflusst, wie die KI Nachrichten formuliert und Tasks priorisiert.
--
-- Persona-Modi:
--   speed        → Kurz, direkt, max Output. Fokus auf Tempo.
--   balanced     → Standard. Ausgewogene Mischung aus Effizienz und Beziehung.
--   relationship → Wärmer, mehr Kontext. Fokus auf Beziehungsebene.
--
-- Verwendung:
--   1. Dieses SQL in Supabase SQL-Editor ausführen
--   2. RLS-Policies nach Bedarf hinzufügen
--   3. Frontend-Service (salesPersonaService.ts) nutzen
--
-- ═══════════════════════════════════════════════════════════════════

-- Table: public.sales_agent_personas

create table if not exists public.sales_agent_personas (
  user_id uuid primary key references auth.users(id) on delete cascade,
  persona_key text not null default 'balanced' check (persona_key in ('speed', 'balanced', 'relationship')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Kommentar für Dokumentation
comment on table public.sales_agent_personas is 
  'User-spezifische KI-Persona-Einstellungen für Sales Flow AI';

comment on column public.sales_agent_personas.user_id is 
  'Referenz auf auth.users - ein User hat genau eine Persona';

comment on column public.sales_agent_personas.persona_key is 
  'Sales-Modus: speed (kurz, direkt), balanced (Standard), relationship (wärmer, mehr Kontext)';

comment on column public.sales_agent_personas.notes is 
  'Optionale Notizen für den User';

-- Index für schnelle Lookups (obwohl user_id bereits Primary Key ist)
-- Falls später nach persona_key gefiltert werden soll:
create index if not exists idx_sales_agent_personas_key
  on public.sales_agent_personas (persona_key);


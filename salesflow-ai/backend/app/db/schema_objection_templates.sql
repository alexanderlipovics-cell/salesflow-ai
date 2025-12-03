-- ═══════════════════════════════════════════════════════════════════
-- Objection Templates - Tabelle für wiederverwendbare Einwand-Antworten
-- ═══════════════════════════════════════════════════════════════════
--
-- Diese Tabelle speichert vordefinierte Templates zur Behandlung von
-- häufigen Einwänden. Manager können Templates manuell erstellen oder
-- via Playbook-Suggestor (KI-gestützt) generieren lassen.
--
-- Status-Workflow:
--   draft    → Template ist ein Entwurf (nicht in Produktion)
--   active   → Template ist freigegeben und kann verwendet werden
--   archived → Template ist veraltet/nicht mehr aktiv
--
-- Verwendung:
--   1. Dieses SQL in Supabase SQL-Editor ausführen
--   2. RLS-Policies nach Bedarf hinzufügen
--   3. Frontend-Service (objectionTemplatesService.ts) nutzen
--
-- ═══════════════════════════════════════════════════════════════════

-- Table: public.objection_templates

create table if not exists public.objection_templates (
  id uuid primary key default gen_random_uuid(),
  key text,
  title text not null,
  vertical text,
  objection_text text not null,
  template_message text not null,
  notes text,
  source text,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indizes für Performance

create index if not exists idx_objection_templates_vertical
  on public.objection_templates (vertical);

create index if not exists idx_objection_templates_status
  on public.objection_templates (status);

-- Kommentar für Dokumentation
comment on table public.objection_templates is 
  'Templates für häufige Einwände - KI-generiert oder manuell erstellt. Kann als Follow-up-Override verwendet werden.';

comment on column public.objection_templates.key is 
  'Optional: Follow-up Step Key zur Zuordnung eines Templates zu einem Follow-up-Schritt.
   Mögliche Werte (aus src/config/followupSequence.ts):
     - initial_contact
     - fu_1_bump
     - fu_2_value
     - fu_3_decision
     - fu_4_last_touch
     - rx_1_update
     - rx_2_value_asset
     - rx_3_yearly_checkin
     - rx_loop_checkin
   Wenn NULL: Template ist generisch (noch keinem Step zugeordnet).
   Wenn gesetzt UND status=active: Template überschreibt Standard-Konfiguration für diesen Step + Vertical.';

comment on column public.objection_templates.vertical is 
  'Branche (z.B. network, real_estate, finance) oder NULL für universell.
   Zusammen mit "key" bestimmt dies, welches Template für welchen Follow-up-Step + Branche aktiv ist.
   Pro Step+Vertical sollte nur EIN Template status=active haben.';

comment on column public.objection_templates.objection_text is 
  'Der Einwand, auf den dieses Template antwortet';

comment on column public.objection_templates.template_message is 
  'Die wiederverwendbare Standard-Antwort';

comment on column public.objection_templates.notes is 
  'Interne Notizen, Strategie-Hinweise, KI-Reasoning';

comment on column public.objection_templates.source is 
  'Herkunft des Templates (z.B. analytics_play_suggestor, manual)';

comment on column public.objection_templates.status is 
  'Status: draft, active, archived';


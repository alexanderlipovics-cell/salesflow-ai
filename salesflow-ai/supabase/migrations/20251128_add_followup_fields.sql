-- Ergänzt Follow-up-Felder für intelligente Importe.

alter table public.leads
    add column if not exists next_action_at timestamptz,
    add column if not exists next_action_description text;

alter table public.leads
    alter column needs_action set default false;

comment on column public.leads.next_action_at is
    'Zeitpunkt für das nächste Follow-up, automatisch vom Import gesetzt.';

comment on column public.leads.next_action_description is
    'Kurze Beschreibung der nächsten Aktion (z. B. Nachfassen nach Angebot).';

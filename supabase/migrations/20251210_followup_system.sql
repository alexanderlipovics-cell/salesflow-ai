-- Follow-up System mit KI-Vorschlägen
-- Safe to re-run: uses IF NOT EXISTS / ON CONFLICT

-- 1) message_templates
create table if not exists message_templates (
  id uuid primary key default gen_random_uuid(),
  template_key text not null unique,
  language text not null default 'de',
  channel text not null default 'WHATSAPP',
  purpose text not null,
  subject text,
  body text not null,
  variables jsonb default '[]'::jsonb,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

insert into message_templates (template_key, language, channel, purpose, body)
values
('COLD_FIRST_CONTACT', 'de', 'WHATSAPP', 'first_contact',
'Hey {name} 😊

ich bin gerade über dein Profil gestolpert – richtig spannend, was du da machst!

Kurz zu mir: Ich arbeite mit einem System, das Menschen wie dir hilft, mehr Struktur in ihre Kontakte zu bringen – ohne dass du noch mehr Zeit am Handy verbringen musst.

Wenn du magst, kann ich dir in 2–3 Sätzen erklären, wie das konkret für dich aussehen könnte. 😊'),

('F1_FRIENDLY_REMINDER', 'de', 'WHATSAPP', 'followup_stage_1',
'Hey {name} 😊

ich wollte nur schnell nachfragen, ob meine letzte Nachricht bei dir angekommen ist – manchmal verschwinden Nachrichten ja einfach im Alltag 🙈

Kein Stress, ich wollte nur sichergehen, dass sie nicht untergeht.

Liebe Grüße'),

('F2_MEHRWERT', 'de', 'WHATSAPP', 'followup_stage_2',
'Hey {name} 🙌

ich hab mir dein Profil nochmal angesehen – wirklich stark, was du da aufbaust!

Der Grund, warum ich dir ursprünglich geschrieben habe: Ich arbeite mit einem System, das genau Menschen wie dir hilft, ihre Kontakte besser zu sortieren und Follow-ups nicht mehr zu vergessen.

Ich will dir nichts aufschwatzen – aber ich glaube wirklich, dass das bei dir gut passen könnte. 🙂'),

('F3_LAST_BEFORE_PAUSE', 'de', 'WHATSAPP', 'followup_stage_3',
'Hey {name} ✨

ich weiß, wie voll der Alltag sein kann – deswegen ist das hier erstmal meine letzte Nachricht zu dem Thema.

Wenn es für dich irgendwann interessant wird, schreib mir einfach kurz „Info" und ich erklär dir alles entspannt – komplett unverbindlich.

Alles Liebe dir! 🙌'),

('F4_REAKTIVIERUNG', 'de', 'WHATSAPP', 'followup_reactivation',
'Hey {name} 😊

wir hatten vor einiger Zeit mal kurz Kontakt. Nur ein kurzes Update: Inzwischen nutzen schon viele das System und berichten, dass sie endlich ihre Follow-ups im Griff haben.

Wenn du irgendwann neugierig bist, melde dich gerne – ich freu mich. 🙂'),

('L1_SOFT_CHECKIN', 'de', 'WHATSAPP', 'interested_later_stage_1',
'Hey {name} 😊

wie versprochen melde ich mich kurz bei dir zurück.

Du hattest ja gesagt, dass das Thema grundsätzlich interessant ist, aber gerade viel los war. Wie sieht''s aktuell aus – ist es bei dir ein bisschen ruhiger geworden? 😄

Ganz entspannt, ohne Verpflichtung – du entscheidest. 🙂'),

('L2_LAST_CHECK', 'de', 'WHATSAPP', 'interested_later_stage_2',
'Hey {name} 👋

ich wollte nur ein letztes Mal kurz nachfühlen, bevor ich das Thema bei dir erstmal parke.

Bist du grundsätzlich noch neugierig oder passt es einfach gerade nicht zu deinen Prioritäten?

Beide Antworten sind völlig okay 😄'),

('POST_CALL_SUMMARY', 'de', 'WHATSAPP', 'post_call',
'Hey {name}, danke dir nochmal für das Gespräch! 🙌

Kurz zusammengefasst:
{summary}

Wenn Fragen auftauchen, schreib mir einfach jederzeit. 😊'),

('NO_SHOW_FOLLOWUP', 'de', 'WHATSAPP', 'no_show',
'Hey {name} 😊

ich hab gesehen, dass unser Termin heute nicht geklappt hat – alles gut, kann passieren.

Schick mir einfach 2–3 Zeitfenster, die bei dir passen, dann richten wir uns danach. 🙂')
on conflict (template_key) do nothing;

alter table if exists message_templates enable row level security;


-- 2) followup_rules
create table if not exists followup_rules (
  id uuid primary key default gen_random_uuid(),
  flow text not null,
  stage integer not null,
  template_key text references message_templates(template_key),
  wait_days integer not null,
  next_stage integer not null,
  next_status text not null,
  description text,
  created_at timestamptz default now(),
  unique(flow, stage)
);

insert into followup_rules (flow, stage, template_key, wait_days, next_stage, next_status, description) values
('COLD_NO_REPLY', 0, NULL, 2, 1, 'contacted', 'Erstkontakt gesendet'),
('COLD_NO_REPLY', 1, 'F1_FRIENDLY_REMINDER', 3, 2, 'contacted', 'Friendly Reminder'),
('COLD_NO_REPLY', 2, 'F2_MEHRWERT', 5, 3, 'contacted', 'Mehrwert Follow-up'),
('COLD_NO_REPLY', 3, 'F3_LAST_BEFORE_PAUSE', 20, 4, 'contacted', 'Letzte Nachricht'),
('COLD_NO_REPLY', 4, 'F4_REAKTIVIERUNG', 90, 4, 'parked', 'Reaktivierung'),
('INTERESTED_LATER', 0, NULL, 14, 1, 'warm', 'Warten nach Interesse'),
('INTERESTED_LATER', 1, 'L1_SOFT_CHECKIN', 16, 2, 'warm', 'Soft Check-in'),
('INTERESTED_LATER', 2, 'L2_LAST_CHECK', 90, 2, 'parked', 'Letzter Check')
on conflict (flow, stage) do nothing;

alter table if exists followup_rules enable row level security;


-- 3) followup_suggestions
create table if not exists followup_suggestions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lead_id uuid not null references leads(id) on delete cascade,
  flow text not null,
  stage integer not null,
  template_key text references message_templates(template_key),
  channel text default 'WHATSAPP',
  suggested_message text not null,
  reason text,
  due_at timestamptz not null,
  status text default 'pending' check (status in ('pending', 'sent', 'skipped', 'snoozed')),
  sent_at timestamptz,
  snoozed_until timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_suggestions_user_status on followup_suggestions(user_id, status);
create index if not exists idx_suggestions_due on followup_suggestions(due_at) where status = 'pending';

alter table if exists followup_suggestions enable row level security;

drop policy if exists "Users manage own suggestions" on followup_suggestions;
create policy "Users manage own suggestions"
  on followup_suggestions for all
  using (auth.uid() = user_id);

-- Schema-Erweiterung für vereinheitlichte Follow-ups
alter table if exists followup_suggestions
  add column if not exists title text,
  add column if not exists priority text default 'medium',
  add column if not exists task_type text default 'follow_up',
  add column if not exists created_by uuid,
  add column if not exists source text default 'system';

-- Zusätzlicher Index
create index if not exists idx_fs_lead_id on followup_suggestions(lead_id);

-- Migration: lead_tasks -> followup_suggestions (nur follow_up Tasks)
insert into followup_suggestions (
    id,
    user_id,
    lead_id,
    flow,
    stage,
    template_key,
    channel,
    suggested_message,
    reason,
    due_at,
    status,
    title,
    priority,
    task_type,
    source,
    created_at,
    created_by
)
select
    lt.id,
    lt.user_id,
    lt.lead_id,
    coalesce(lt.type, lt.task_type, 'MANUAL') as flow,
    0 as stage,
    coalesce(lt.template_key, 'MANUAL') as template_key,
    upper(coalesce(lt.template_key, 'WHATSAPP')) as channel,
    coalesce(lt.note, lt.description, lt.title, 'Follow-up') as suggested_message,
    'Migriert aus lead_tasks' as reason,
    coalesce(lt.due_at, lt.due_date, now() + interval '1 day') as due_at,
    case
        when lt.status in ('open', 'pending') then 'pending'
        when lt.status in ('done', 'completed') then 'sent'
        else 'pending'
    end as status,
    lt.title,
    coalesce(lt.priority, 'medium') as priority,
    coalesce(lt.task_type, lt.type, 'follow_up') as task_type,
    'migrated' as source,
    coalesce(lt.created_at, now()) as created_at,
    lt.user_id as created_by
from lead_tasks lt
where coalesce(lt.task_type, lt.type) = 'follow_up'
and not exists (
    select 1 from followup_suggestions fs where fs.id = lt.id
);

-- 3b) lead_interactions Konsolidierung
alter table if exists lead_interactions
  add column if not exists user_id uuid,
  add column if not exists source varchar default 'manual',
  add column if not exists updated_at timestamptz;

create index if not exists idx_li_user_lead on lead_interactions(user_id, lead_id);
create index if not exists idx_li_interaction_at on lead_interactions(interaction_at desc);
create index if not exists idx_li_type on lead_interactions(interaction_type);
create index if not exists idx_li_user_id on lead_interactions(user_id);

alter table if exists lead_interactions enable row level security;
drop policy if exists "Users can manage own interactions" on lead_interactions;
create policy "Users can manage own interactions"
  on lead_interactions for all
  using (user_id = auth.uid() or user_id is null);


-- 4) leads extension
alter table leads
  add column if not exists flow text,
  add column if not exists follow_up_stage integer default 0,
  add column if not exists next_follow_up_at timestamptz,
  add column if not exists last_outreach_at timestamptz,
  add column if not exists last_inbound_at timestamptz,
  add column if not exists do_not_contact boolean default false,
  add column if not exists preferred_channel text default 'WHATSAPP';



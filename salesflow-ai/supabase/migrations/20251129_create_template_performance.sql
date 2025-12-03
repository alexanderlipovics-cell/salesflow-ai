-- Erstellt die Tabelle `template_performance` zum Tracking von gesendeten Nachrichten und deren Ergebnissen
-- sowie die View `template_leaderboard` für aggregierte Template-Statistiken

create extension if not exists "pgcrypto";

-- Tabelle: template_performance
-- Trackt jede gesendete Nachricht mit Template und Ergebnis
create table if not exists public.template_performance (
    id uuid primary key default gen_random_uuid(),
    lead_id uuid null,
    template_key text not null,
    template_text text not null,
    channel text not null check (channel in ('whatsapp','email','dm','phone')),
    sent_at timestamptz not null default now(),
    result text null check (result in ('reply','meeting','no_response','negative','positive')),
    result_at timestamptz null,
    vertical text null,
    phase text null check (phase in ('cold_outreach','follow_up','reactivation','closing')),
    created_at timestamptz not null default now()
);

-- Indizes für Performance
create index if not exists template_performance_template_key_idx on public.template_performance (template_key);
create index if not exists template_performance_sent_at_idx on public.template_performance (sent_at);
create index if not exists template_performance_result_idx on public.template_performance (result);
create index if not exists template_performance_vertical_idx on public.template_performance (vertical);
create index if not exists template_performance_phase_idx on public.template_performance (phase);

-- View: template_leaderboard
-- Aggregiert Performance-Metriken pro Template
create or replace view public.template_leaderboard as
select 
    template_key,
    max(template_text) as template_preview,
    max(phase) as phase,
    max(channel) as primary_channel,
    count(*) as total_sent,
    count(case when result = 'reply' then 1 end) as replies,
    count(case when result = 'meeting' then 1 end) as meetings,
    count(case when result = 'positive' then 1 end) as positive_responses,
    count(case when result = 'negative' then 1 end) as negative_responses,
    count(case when result = 'no_response' then 1 end) as no_responses,
    count(case when result is not null then 1 end) as total_responses,
    -- Antwortrate (Reply Rate)
    round(
        (count(case when result = 'reply' then 1 end)::numeric / nullif(count(*), 0)) * 100, 
        1
    ) as reply_rate,
    -- Meeting Rate
    round(
        (count(case when result = 'meeting' then 1 end)::numeric / nullif(count(*), 0)) * 100, 
        1
    ) as meeting_rate,
    -- Response Rate (irgendeine Reaktion)
    round(
        (count(case when result is not null then 1 end)::numeric / nullif(count(*), 0)) * 100, 
        1
    ) as response_rate,
    -- Positiv-Rate (positive + meeting)
    round(
        ((count(case when result = 'positive' then 1 end) + count(case when result = 'meeting' then 1 end))::numeric / nullif(count(*), 0)) * 100, 
        1
    ) as success_rate,
    min(sent_at) as first_used,
    max(sent_at) as last_used
from public.template_performance
group by template_key
order by total_sent desc;

-- Kommentar für Dokumentation
comment on table public.template_performance is 'Trackt jede gesendete Nachricht mit Template und Ergebnis für Performance-Analyse';
comment on view public.template_leaderboard is 'Aggregierte Template-Performance-Metriken (Antwortrate, Meeting-Rate, etc.)';


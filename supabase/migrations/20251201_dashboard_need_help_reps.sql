-- ============================================================================
-- Migration: dashboard_need_help_reps + performance index
-- Purpose  : Provides the Squad Coach "Need Help" leaderboard with cached-friendly
--            logic (STABLE + covering index) for faster dashboard fetches.
-- ============================================================================

-- Function -------------------------------------------------------------------
create or replace function public.dashboard_need_help_reps(
  p_workspace_id   uuid,
  p_days_back      integer default 30,
  p_min_contacts   integer default 20,
  p_limit          integer default 5
)
returns table (
  user_id                  uuid,
  email                    text,
  full_name                text,
  contacts_contacted       integer,
  contacts_signed          integer,
  active_days_last_30      integer,
  conversion_rate_percent  numeric(5,2),
  avg_response_time_hours  numeric(10,2)
)
language sql
stable
security definer
set search_path = public, auth
as $$
with sent as (
  select
    user_id,
    count(distinct contact_id) as contacts_contacted
  from public.events
  where workspace_id = p_workspace_id
    and event_type = 'first_message_sent'
    and occurred_at >= now() - (p_days_back || ' days')::interval
  group by user_id
),
signed as (
  select
    user_id,
    count(distinct contact_id) as contacts_signed
  from public.events
  where workspace_id = p_workspace_id
    and event_type = 'signup_completed'
    and occurred_at >= now() - (p_days_back || ' days')::interval
  group by user_id
),
activity_days as (
  select
    user_id,
    count(distinct date_trunc('day', occurred_at)) as active_days_last_30
  from public.events
  where workspace_id = p_workspace_id
    and occurred_at >= now() - (p_days_back || ' days')::interval
  group by user_id
),
response_times as (
  select
    e1.user_id,
    avg(extract(epoch from (e2.occurred_at - e1.occurred_at)) / 3600.0) as avg_response_hours
  from public.events e1
  join public.events e2
    on e2.contact_id = e1.contact_id
   and e2.user_id = e1.user_id
   and e2.occurred_at > e1.occurred_at
  where e1.workspace_id = p_workspace_id
    and e1.event_type = 'first_message_sent'
    and e2.event_type = 'reply_received'
    and e1.occurred_at >= now() - (p_days_back || ' days')::interval
  group by e1.user_id
)
select
  wu.user_id,
  au.email,
  coalesce(au.raw_user_meta_data->>'full_name', au.email) as full_name,
  coalesce(s.contacts_contacted, 0)::integer as contacts_contacted,
  coalesce(si.contacts_signed, 0)::integer as contacts_signed,
  coalesce(a.active_days_last_30, 0)::integer as active_days_last_30,
  case
    when coalesce(s.contacts_contacted, 0) = 0 then 0
    else round(coalesce(si.contacts_signed, 0)::numeric * 100.0 / s.contacts_contacted, 2)
  end as conversion_rate_percent,
  round(coalesce(rt.avg_response_hours, 0)::numeric, 2) as avg_response_time_hours
from public.workspace_users wu
left join sent s on s.user_id = wu.user_id
left join signed si on si.user_id = wu.user_id
left join activity_days a on a.user_id = wu.user_id
left join response_times rt on rt.user_id = wu.user_id
join auth.users au on au.id = wu.user_id
where wu.workspace_id = p_workspace_id
  and wu.status = 'active'
  and coalesce(s.contacts_contacted, 0) >= p_min_contacts
order by conversion_rate_percent asc, contacts_contacted desc
limit p_limit;
$$;

comment on function public.dashboard_need_help_reps(uuid, integer, integer, integer)
  is 'Squad Coach helper: highlights highly active reps with poor conversion plus response time insights.';

-- Index ----------------------------------------------------------------------
create index if not exists events_user_type_contact_time_idx
  on public.events(workspace_id, user_id, event_type, contact_id, occurred_at)
  where event_type in ('first_message_sent', 'reply_received', 'signup_completed');


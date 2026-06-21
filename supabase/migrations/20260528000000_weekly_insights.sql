-- Create Weekly Digest and Insight tables
create table if not exists public.weekly_digests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.care_group(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique(group_id, start_date)
);

create table if not exists public.insight_cards (
  id uuid primary key default gen_random_uuid(),
  digest_id uuid not null references public.weekly_digests(id) on delete cascade,
  type text not null, -- e.g. 'pain_trend', 'medication_adherence', 'appointment_summary'
  title text not null,
  description text not null,
  trend_direction text, -- 'up', 'down', 'stable'
  data_link text, -- e.g. '/groups/:groupId/journal'
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_insight_dismissals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  insight_card_id uuid not null references public.insight_cards(id) on delete cascade,
  dismissed_at timestamptz not null default timezone('utc', now()),
  unique(user_id, insight_card_id)
);

-- RLS
alter table public.weekly_digests enable row level security;
alter table public.insight_cards enable row level security;
alter table public.user_insight_dismissals enable row level security;

-- Weekly Digests Policies
create policy "Group members can view weekly digests"
on public.weekly_digests for select
using (
  exists (
    select 1 from public.care_givers cg
    where cg.group_id = weekly_digests.group_id
    and cg.caregiver_id = auth.uid()
    and cg.status = 'active'
  )
);

-- Insight Cards Policies
create policy "Group members can view insight cards"
on public.insight_cards for select
using (
  exists (
    select 1 from public.weekly_digests wd
    join public.care_givers cg on cg.group_id = wd.group_id
    where wd.id = insight_cards.digest_id
    and cg.caregiver_id = auth.uid()
    and cg.status = 'active'
  )
);

-- User Insight Dismissals Policies
create policy "Users can view their own dismissals"
on public.user_insight_dismissals for select
using (auth.uid() = user_id);

create policy "Users can dismiss their own insights"
on public.user_insight_dismissals for insert
with check (auth.uid() = user_id);

-- Enable Realtime
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'weekly_digests'
  ) then
    alter publication supabase_realtime add table public.weekly_digests;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'insight_cards'
  ) then
    alter publication supabase_realtime add table public.insight_cards;
  end if;
end $$;

-- Refresh PostgREST schema cache so API queries can see the new tables immediately.
notify pgrst, 'reload schema';

create table if not exists public.handover_journal_entries (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.care_group(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete restrict,
  content text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint handover_journal_entries_content_not_blank check (btrim(content) <> '')
);

create index if not exists handover_journal_entries_group_created_idx
  on public.handover_journal_entries (group_id, created_at desc);

alter table public.handover_journal_entries enable row level security;

create policy "Group members can view handover journal entries"
on public.handover_journal_entries
for select
to public
using (
  exists (
    select 1
    from public.care_givers cg
    where cg.group_id = handover_journal_entries.group_id
      and cg.caregiver_id = auth.uid()
      and cg.status = 'active'
  )
);

create policy "Carers can add handover journal entries"
on public.handover_journal_entries
for insert
to public
with check (
  author_id = auth.uid()
  and exists (
    select 1
    from public.care_givers cg
    where cg.group_id = handover_journal_entries.group_id
      and cg.caregiver_id = auth.uid()
      and cg.status = 'active'
      and cg.role_in_care in ('primary_carer', 'secondary_carer')
  )
);
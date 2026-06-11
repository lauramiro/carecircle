alter table public.primary_carer_wellbeing_checkins
  add column if not exists support_message_dismissed_at timestamptz;

drop policy if exists "Primary carers can update their own wellbeing check-ins"
  on public.primary_carer_wellbeing_checkins;

create policy "Primary carers can update their own wellbeing check-ins"
on public.primary_carer_wellbeing_checkins
for update
using (auth.uid() = carer_id)
with check (auth.uid() = carer_id);
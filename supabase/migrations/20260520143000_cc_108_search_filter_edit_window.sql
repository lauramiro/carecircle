create or replace function public.set_handover_journal_entries_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_handover_journal_entries_updated_at
on public.handover_journal_entries;

create trigger set_handover_journal_entries_updated_at
before update on public.handover_journal_entries
for each row
execute function public.set_handover_journal_entries_updated_at();

create policy "Authors can edit handover journal entries for 60 minutes"
on public.handover_journal_entries
for update
to public
using (
  author_id = auth.uid()
  and created_at >= timezone('utc', now()) - interval '60 minutes'
)
with check (
  author_id = auth.uid()
  and created_at >= timezone('utc', now()) - interval '60 minutes'
);
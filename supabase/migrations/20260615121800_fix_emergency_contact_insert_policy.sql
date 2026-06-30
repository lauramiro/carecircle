-- Fix emergency_contacts insert policy recursion by moving the active-contact
-- count check into a trigger that bypasses RLS.

create schema if not exists private;

create or replace function private.enforce_emergency_contacts_limit()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  active_contact_count integer;
begin
  if new.is_active is not true then
    return new;
  end if;

  select count(*)
    into active_contact_count
  from public.emergency_contacts ec
  where ec.patient_id = new.patient_id
    and ec.is_active = true
    and ec.id <> new.id;

  if active_contact_count >= 2 then
    raise exception 'Only two emergency contacts can be active per patient'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_emergency_contacts_limit
  on public.emergency_contacts;

create trigger enforce_emergency_contacts_limit
  before insert or update of patient_id, is_active
  on public.emergency_contacts
  for each row
  execute function private.enforce_emergency_contacts_limit();

drop policy if exists "emergency_contacts_insert" on public.emergency_contacts;
create policy "emergency_contacts_insert"
  on public.emergency_contacts
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.care_givers cg
      where cg.patient_id = emergency_contacts.patient_id
        and cg.caregiver_id = auth.uid()
        and cg.status = 'active'
        and cg.role_in_care = any (array['primary_carer'::public.member_role, 'secondary_carer'::public.member_role])
    )
  );

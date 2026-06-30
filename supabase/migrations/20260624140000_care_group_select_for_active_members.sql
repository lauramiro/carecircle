-- care_group's only SELECT policy ("Users can view their care circle
-- memberships") restricts visibility to the primary caregiver
-- (auth.uid() = primary_caregiver_id). getGroups() embeds care_group!inner
-- from care_givers, so PostgREST drops the row for any caregiver who isn't
-- the primary caregiver — secondary carers and observers see zero groups
-- despite having an active care_givers membership row.
--
-- Add a second, additive SELECT policy (permissive policies for the same
-- command are OR'd) granting visibility to any active member, matching the
-- pattern already used on patients ("patients select for active caregivers").

create policy "active_members_select_care_group"
on public.care_group
for select
to authenticated
using (
  exists (
    select 1
    from public.care_givers cg
    where cg.group_id = care_group.id
      and cg.caregiver_id = auth.uid()
      and cg.status = 'active'
  )
);

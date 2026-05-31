-- CC-154: Persist member role changes from the group members page.
-- Only active primary carers may change roles. A primary carer may demote themselves
-- only when another active primary carer exists. If the demoted member is the group's
-- primary_caregiver_id, ownership transfers to the next active primary carer.

create or replace function public.update_care_giver_role(
  p_group_id uuid,
  p_caregiver_id uuid,
  p_new_role public.member_role
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_target_role public.member_role;
  v_other_primary_count integer;
  v_next_primary_id uuid;
begin
  if v_actor_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_new_role is null then
    raise exception 'Role is required';
  end if;

  if not exists (
    select 1
    from public.care_givers cg
    where cg.group_id = p_group_id
      and cg.caregiver_id = v_actor_id
      and cg.role_in_care = 'primary_carer'::public.member_role
      and cg.status = 'active'
  ) then
    raise exception 'Only primary carers can update member roles';
  end if;

  select cg.role_in_care
  into v_target_role
  from public.care_givers cg
  where cg.group_id = p_group_id
    and cg.caregiver_id = p_caregiver_id
    and cg.status = 'active';

  if not found then
    raise exception 'Member not found in this group';
  end if;

  if v_target_role = p_new_role then
    return;
  end if;

  if p_caregiver_id = v_actor_id
     and v_target_role = 'primary_carer'::public.member_role
     and p_new_role <> 'primary_carer'::public.member_role then
    select count(*)
    into v_other_primary_count
    from public.care_givers cg
    where cg.group_id = p_group_id
      and cg.caregiver_id <> p_caregiver_id
      and cg.role_in_care = 'primary_carer'::public.member_role
      and cg.status = 'active';

    if v_other_primary_count = 0 then
      raise exception 'You cannot change your role while you are the only primary carer';
    end if;
  end if;

  if v_target_role = 'primary_carer'::public.member_role
     and p_new_role <> 'primary_carer'::public.member_role
     and exists (
       select 1
       from public.care_group g
       where g.id = p_group_id
         and g.primary_caregiver_id = p_caregiver_id
     ) then
    select cg.caregiver_id
    into v_next_primary_id
    from public.care_givers cg
    where cg.group_id = p_group_id
      and cg.caregiver_id <> p_caregiver_id
      and cg.role_in_care = 'primary_carer'::public.member_role
      and cg.status = 'active'
    order by cg.joined_at asc
    limit 1;

    if v_next_primary_id is null then
      raise exception 'Cannot change role: assign another primary carer before demoting the group owner';
    end if;

    update public.care_group
    set primary_caregiver_id = v_next_primary_id,
        updated_at = now()
    where id = p_group_id;

    update public.patients
    set primary_caregiver_id = v_next_primary_id,
        updated_at = now()
    where group_id = p_group_id;
  end if;

  update public.care_givers
  set role_in_care = p_new_role,
      updated_at = now()
  where group_id = p_group_id
    and caregiver_id = p_caregiver_id
    and status = 'active';
end;
$$;

grant execute on function public.update_care_giver_role(uuid, uuid, public.member_role) to authenticated;

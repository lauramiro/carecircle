-- CC-165: Restore invite accept/reject RPC used by the invite flow.
create or replace function public.update_invite_status(
  p_invite_id uuid,
  p_status public.invite_status
)
returns table(group_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_invite public.invites%rowtype;
  v_patient_id uuid;
begin
  if v_actor_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_status not in ('accepted'::public.invite_status, 'rejected'::public.invite_status) then
    raise exception 'Unsupported invite status';
  end if;

  select *
  into v_invite
  from public.invites i
  where i.id = p_invite_id
    and i.invite_type = 'care_group'
    and i.status = 'pending'::public.invite_status
    and i.expires_at > now()
  for update;

  if not found then
    raise exception 'Invitation not found or no longer valid';
  end if;

  if lower(v_invite.email) <> v_actor_email then
    raise exception 'Invite email does not match authenticated user';
  end if;

  update public.invites
  set status = p_status,
      updated_at = now()
  where id = p_invite_id;

  if p_status = 'accepted'::public.invite_status then
    select p.id
    into v_patient_id
    from public.patients p
    where p.group_id = v_invite.group_id
    limit 1;

    if v_patient_id is null then
      raise exception 'Care group patient not found';
    end if;

    insert into public.care_givers (
      group_id,
      patient_id,
      caregiver_id,
      role_in_care,
      can_view_medical,
      can_schedule,
      can_communicate,
      status
    )
    values (
      v_invite.group_id,
      v_patient_id,
      v_actor_id,
      'secondary_carer'::public.member_role,
      true,
      true,
      true,
      'active'
    )
    on conflict (group_id, patient_id, caregiver_id)
    do update
    set status = 'active',
        updated_at = now();
  end if;

  group_id := v_invite.group_id;
  return next;
end;
$$;

grant execute on function public.update_invite_status(uuid, public.invite_status) to authenticated;

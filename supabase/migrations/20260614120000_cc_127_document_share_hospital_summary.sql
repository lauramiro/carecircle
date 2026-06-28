-- CC-127: Document download/share and hospital summary inclusion flag

alter table public.documents
  add column if not exists include_in_hospital_summary boolean not null default false;

comment on column public.documents.include_in_hospital_summary is
  'When true, this document is listed (and images embedded) in the generated hospital summary PDF.';

create or replace function public.set_document_include_in_hospital_summary(
  p_document_id uuid,
  p_include boolean
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid;
begin
  select patient_id into v_patient_id
  from public.documents
  where id = p_document_id;

  if v_patient_id is null then
    raise exception 'Document not found';
  end if;

  if not exists (
    select 1
    from public.care_givers cg
    where cg.patient_id = v_patient_id
      and cg.caregiver_id = auth.uid()
      and cg.status = 'active'
      and cg.role_in_care in (
        'primary_carer'::public.member_role,
        'secondary_carer'::public.member_role
      )
  ) then
    raise exception 'Not authorized to update hospital summary flag';
  end if;

  update public.documents
  set include_in_hospital_summary = p_include
  where id = p_document_id;
end;
$$;

grant execute on function public.set_document_include_in_hospital_summary(uuid, boolean) to authenticated;

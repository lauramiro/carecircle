CREATE OR REPLACE FUNCTION edit_medication(p_id uuid, p_changes jsonb)
RETURNS medications
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  old_row medications;
  new_row medications;
BEGIN
  SELECT * INTO old_row FROM medications WHERE id = p_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Medication % not found', p_id;
  END IF;

  UPDATE medications
  SET status = 'superseded', updated_at = now()
  WHERE id = p_id;

  INSERT INTO medications (
    id,
    patient_id,
    medication_name,
    generic_name,
    dosage,
    form,
    prescribed_by,
    prescribed_date,
    prescription_number,
    schedule_type,
    specific_times,
    interval_hours,
    days_of_week,
    day_of_month,
    instructions,
    route,
    take_with_food,
    start_date,
    end_date,
    status,
    discontinued_date,
    discontinued_reason,
    refills_remaining,
    last_refill_date,
    pharmacy,
    pharmacy_phone,
    side_effects,
    notes,
    version,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    old_row.patient_id,

    COALESCE(p_changes->>'medication_name', old_row.medication_name),
    old_row.generic_name,
    COALESCE(p_changes->>'dosage', old_row.dosage),
    old_row.form,
    old_row.prescribed_by,
    old_row.prescribed_date,
    old_row.prescription_number,

    COALESCE(p_changes->>'schedule_type', old_row.schedule_type),

    CASE
      WHEN p_changes ? 'specific_times' THEN
        CASE
          WHEN p_changes->'specific_times' = 'null'::jsonb THEN NULL
          ELSE ARRAY(SELECT jsonb_array_elements_text(p_changes->'specific_times'))
        END
      ELSE old_row.specific_times
    END,

    CASE
      WHEN p_changes ? 'interval_hours' THEN
        CASE
          WHEN p_changes->'interval_hours' = 'null'::jsonb THEN NULL
          ELSE (p_changes->>'interval_hours')::integer
        END
      ELSE old_row.interval_hours
    END,

    CASE
      WHEN p_changes ? 'days_of_week' THEN
        CASE
          WHEN p_changes->'days_of_week' = 'null'::jsonb THEN NULL
          ELSE ARRAY(SELECT jsonb_array_elements_text(p_changes->'days_of_week')::integer)
        END
      ELSE old_row.days_of_week
    END,

    CASE
      WHEN p_changes ? 'day_of_month' THEN
        CASE
          WHEN p_changes->'day_of_month' = 'null'::jsonb THEN NULL
          ELSE (p_changes->>'day_of_month')::integer
        END
      ELSE old_row.day_of_month
    END,

    CASE
      WHEN p_changes ? 'instructions' THEN p_changes->>'instructions'
      ELSE old_row.instructions
    END,

    old_row.route,
    old_row.take_with_food,

    COALESCE(p_changes->>'start_date', old_row.start_date::text)::date,

    old_row.end_date,
    'active',
    old_row.discontinued_date,
    old_row.discontinued_reason,
    old_row.refills_remaining,
    old_row.last_refill_date,
    old_row.pharmacy,
    old_row.pharmacy_phone,
    old_row.side_effects,

    CASE
      WHEN p_changes ? 'notes' THEN p_changes->>'notes'
      ELSE old_row.notes
    END,

    old_row.version + 1,
    now(),
    now()
  )
  RETURNING * INTO new_row;

  RETURN new_row;
END;
$$;

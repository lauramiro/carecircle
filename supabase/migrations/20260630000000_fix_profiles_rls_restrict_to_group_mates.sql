-- Drop the overly-permissive policy that lets any authenticated user read all profiles.
DROP POLICY IF EXISTS "Users can view all profiles" ON "public"."profiles";

-- Replace with a policy scoped to: own row OR users who share a care group.
CREATE POLICY "profiles_select_self_or_group_mate"
ON "public"."profiles"
FOR SELECT
USING (
  auth.uid() = id
  OR id IN (
    SELECT caregiver_id
    FROM public.care_givers
    WHERE group_id IN (
      SELECT group_id
      FROM public.care_givers
      WHERE caregiver_id = auth.uid()
        AND status = 'active'
    )
    AND status = 'active'
  )
);

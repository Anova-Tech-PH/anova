-- Expand role check constraint to include 'check_in'
ALTER TABLE public.organization_members DROP CONSTRAINT organization_members_role_check;
ALTER TABLE public.organization_members ADD CONSTRAINT organization_members_role_check
  CHECK (role IN ('owner', 'admin', 'editor', 'check_in', 'viewer'));

-- Update is_org_member to rank 'check_in' between viewer and editor
CREATE OR REPLACE FUNCTION public.is_org_member(
  _org_id uuid,
  _min_role text default 'viewer'
) RETURNS boolean AS $$
DECLARE
  _user_role text;
  _role_rank int;
  _min_rank int;
BEGIN
  SELECT role INTO _user_role
  FROM public.organization_members
  WHERE organization_id = _org_id
    AND user_id = auth.uid();

  IF _user_role IS NULL THEN
    RETURN false;
  END IF;

  _role_rank := CASE _user_role
    WHEN 'owner' THEN 5
    WHEN 'admin' THEN 4
    WHEN 'editor' THEN 3
    WHEN 'check_in' THEN 2
    WHEN 'viewer' THEN 1
    ELSE 0
  END;

  _min_rank := CASE _min_role
    WHEN 'owner' THEN 5
    WHEN 'admin' THEN 4
    WHEN 'editor' THEN 3
    WHEN 'check_in' THEN 2
    WHEN 'viewer' THEN 1
    ELSE 0
  END;

  RETURN _role_rank >= _min_rank;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Lookup user by email for team invitations
CREATE OR REPLACE FUNCTION public.lookup_user_by_email(_email text)
RETURNS TABLE(id uuid) AS $$
BEGIN
  -- Only allow authenticated users who are org admins/owners to call this
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT u.id
  FROM auth.users u
  WHERE u.email = lower(_email)
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.lookup_user_by_email(text) TO authenticated;

-- =============================================================================
-- Move demo seeding from auto-trigger to user choice (onboarding flow)
-- =============================================================================

-- Revert create_organization_with_owner to NOT auto-seed
CREATE OR REPLACE FUNCTION public.create_organization_with_owner(
  _name text,
  _slug text
) RETURNS uuid AS $$
DECLARE
  _org_id uuid;
BEGIN
  INSERT INTO public.organizations (name, slug)
  VALUES (_name, _slug)
  RETURNING id INTO _org_id;

  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (_org_id, auth.uid(), 'owner');

  RETURN _org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute on seed function so authenticated users can call it via RPC
GRANT EXECUTE ON FUNCTION public.seed_demo_event_for_org(uuid) TO authenticated;

-- =====================
-- Migration 095: Fix shared_templates RLS policies
-- The authenticated role cannot SELECT from auth.users directly.
-- Create a SECURITY DEFINER helper to get current user's email,
-- then rebuild the affected policies.
-- =====================

-- Helper function to get current user's email (bypasses RLS on auth.users)
CREATE OR REPLACE FUNCTION public.get_current_user_email()
RETURNS text AS $$
  SELECT email FROM auth.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.get_current_user_email() TO authenticated;

-- Drop and recreate shared_templates SELECT policy
DROP POLICY IF EXISTS "Sender or recipient can view shared templates" ON public.shared_templates;
CREATE POLICY "Sender or recipient can view shared templates"
  ON public.shared_templates FOR SELECT
  USING (
    auth.uid() = shared_by
    OR shared_with_email = public.get_current_user_email()
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = shared_with_org_id
        AND om.user_id = auth.uid()
    )
  );

-- Drop and recreate shared_templates UPDATE policy
DROP POLICY IF EXISTS "Involved parties can update shared templates" ON public.shared_templates;
CREATE POLICY "Involved parties can update shared templates"
  ON public.shared_templates FOR UPDATE
  USING (
    auth.uid() = shared_by
    OR shared_with_email = public.get_current_user_email()
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = shared_with_org_id
        AND om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = shared_by
    OR shared_with_email = public.get_current_user_email()
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = shared_with_org_id
        AND om.user_id = auth.uid()
    )
  );

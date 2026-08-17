-- =====================
-- Migration 094: Admin Settings
-- Adds invitation codes, event_admins, shared_templates, template_requests
-- =====================

-- =====================
-- 1. Add invitation code columns to events
-- =====================
ALTER TABLE public.events
  ADD COLUMN invitation_code TEXT,
  ADD COLUMN invitation_code_required BOOLEAN NOT NULL DEFAULT false;

-- =====================
-- 2. event_admins — per-event admin/check_in access
-- =====================
CREATE TABLE public.event_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  email text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'check_in')),
  added_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, email)
);

CREATE INDEX idx_event_admins_event ON public.event_admins(event_id);
CREATE INDEX idx_event_admins_user ON public.event_admins(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_admins TO authenticated;

ALTER TABLE public.event_admins ENABLE ROW LEVEL SECURITY;

-- =====================
-- 3. shared_templates — share event templates with others
-- =====================
CREATE TABLE public.shared_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  shared_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with_email text,
  shared_with_org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (shared_with_email IS NOT NULL OR shared_with_org_id IS NOT NULL)
);

CREATE INDEX idx_shared_templates_source_event ON public.shared_templates(source_event_id);
CREATE INDEX idx_shared_templates_email ON public.shared_templates(shared_with_email);
CREATE INDEX idx_shared_templates_org ON public.shared_templates(shared_with_org_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.shared_templates TO authenticated;

ALTER TABLE public.shared_templates ENABLE ROW LEVEL SECURITY;

-- =====================
-- 4. template_requests — request to use another event as template
-- =====================
CREATE TABLE public.template_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requesting_event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_template_requests_requesting_event ON public.template_requests(requesting_event_id);
CREATE INDEX idx_template_requests_target_event ON public.template_requests(target_event_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_requests TO authenticated;

ALTER TABLE public.template_requests ENABLE ROW LEVEL SECURITY;

-- =====================
-- 5. has_event_access function
-- =====================
CREATE OR REPLACE FUNCTION public.has_event_access(
  _event_id uuid,
  _min_role text DEFAULT 'viewer'
) RETURNS boolean AS $$
DECLARE
  _org_id uuid;
  _ea_role text;
  _role_rank int;
  _min_rank int;
BEGIN
  -- Map minimum role to rank
  _min_rank := CASE _min_role
    WHEN 'owner' THEN 5
    WHEN 'admin' THEN 4
    WHEN 'editor' THEN 3
    WHEN 'check_in' THEN 2
    WHEN 'viewer' THEN 1
    ELSE 0
  END;

  -- First check org membership (org roles outrank event-level roles)
  SELECT organization_id INTO _org_id
  FROM public.events
  WHERE id = _event_id;

  IF _org_id IS NOT NULL AND public.is_org_member(_org_id, _min_role) THEN
    RETURN true;
  END IF;

  -- Then check event_admins table
  SELECT ea.role INTO _ea_role
  FROM public.event_admins ea
  WHERE ea.event_id = _event_id
    AND ea.user_id = auth.uid();

  IF _ea_role IS NULL THEN
    RETURN false;
  END IF;

  _role_rank := CASE _ea_role
    WHEN 'admin' THEN 4
    WHEN 'check_in' THEN 2
    ELSE 0
  END;

  RETURN _role_rank >= _min_rank;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.has_event_access(uuid, text) TO authenticated;

-- =====================
-- 6. RLS Policies — event_admins
-- =====================

CREATE POLICY "Event viewers can view event admins"
  ON public.event_admins FOR SELECT
  USING (public.has_event_access(event_id, 'viewer'));

CREATE POLICY "Event admins can insert event admins"
  ON public.event_admins FOR INSERT
  WITH CHECK (public.has_event_access(event_id, 'admin'));

CREATE POLICY "Event admins can update event admins"
  ON public.event_admins FOR UPDATE
  USING (public.has_event_access(event_id, 'admin'))
  WITH CHECK (public.has_event_access(event_id, 'admin'));

CREATE POLICY "Event admins can delete event admins"
  ON public.event_admins FOR DELETE
  USING (public.has_event_access(event_id, 'admin'));

-- =====================
-- 7. RLS Policies — shared_templates
-- =====================

CREATE POLICY "Sender or recipient can view shared templates"
  ON public.shared_templates FOR SELECT
  USING (
    auth.uid() = shared_by
    OR shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = shared_with_org_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Sender can insert shared templates"
  ON public.shared_templates FOR INSERT
  WITH CHECK (auth.uid() = shared_by);

CREATE POLICY "Involved parties can update shared templates"
  ON public.shared_templates FOR UPDATE
  USING (
    auth.uid() = shared_by
    OR shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = shared_with_org_id
        AND om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() = shared_by
    OR shared_with_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = shared_with_org_id
        AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Sender can delete shared templates"
  ON public.shared_templates FOR DELETE
  USING (auth.uid() = shared_by);

-- =====================
-- 8. RLS Policies — template_requests
-- =====================

CREATE POLICY "Requester or target admins can view template requests"
  ON public.template_requests FOR SELECT
  USING (
    auth.uid() = requested_by
    OR public.has_event_access(target_event_id, 'admin')
  );

CREATE POLICY "Requester can insert template requests"
  ON public.template_requests FOR INSERT
  WITH CHECK (auth.uid() = requested_by);

CREATE POLICY "Target admins can update template requests"
  ON public.template_requests FOR UPDATE
  USING (public.has_event_access(target_event_id, 'admin'))
  WITH CHECK (public.has_event_access(target_event_id, 'admin'));

CREATE POLICY "Requester can delete template requests"
  ON public.template_requests FOR DELETE
  USING (auth.uid() = requested_by);

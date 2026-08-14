-- Migration 062: Social Groups feature
-- Small interest-based groups within events for community building

-- =====================
-- 1. SOCIAL_GROUPS TABLE
-- =====================

CREATE TABLE public.social_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.social_groups ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_groups TO authenticated;

CREATE INDEX idx_social_groups_event ON public.social_groups(event_id);

-- RLS: Org members can manage all social groups for their events
CREATE POLICY "Org members can view social groups"
  ON public.social_groups FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = social_groups.event_id
    AND is_org_member(e.organization_id)
  ));

CREATE POLICY "Org members can create social groups"
  ON public.social_groups FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = social_groups.event_id
    AND is_org_member(e.organization_id)
  ));

CREATE POLICY "Org members can update social groups"
  ON public.social_groups FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = social_groups.event_id
    AND is_org_member(e.organization_id)
  ));

CREATE POLICY "Org members can delete social groups"
  ON public.social_groups FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = social_groups.event_id
    AND is_org_member(e.organization_id)
  ));

-- Attendees can view visible groups for published events
CREATE POLICY "Attendees can view visible social groups"
  ON public.social_groups FOR SELECT TO authenticated
  USING (
    is_visible = true
    AND EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = social_groups.event_id AND e.status = 'published'
    )
  );

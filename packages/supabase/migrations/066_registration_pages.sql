-- Migration 066: Registration pages
-- Multiple registration page variants with different ticket subsets

CREATE TABLE public.registration_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  ticket_type_ids UUID[] NOT NULL DEFAULT '{}',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, slug)
);

ALTER TABLE public.registration_pages ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registration_pages TO authenticated;
GRANT SELECT ON public.registration_pages TO anon;

CREATE INDEX idx_registration_pages_event ON public.registration_pages(event_id);

CREATE POLICY "Org members can manage registration pages"
  ON public.registration_pages FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = registration_pages.event_id AND is_org_member(e.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = registration_pages.event_id AND is_org_member(e.organization_id)
  ));

CREATE POLICY "Public can view registration pages"
  ON public.registration_pages FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = registration_pages.event_id AND e.status = 'published'
  ));

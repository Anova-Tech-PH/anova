-- Migration 064: Ticket add-ons
CREATE TABLE public.ticket_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  quantity INT,
  applies_to_tickets UUID[],
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ticket_addons ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_addons TO authenticated;

CREATE INDEX idx_ticket_addons_event ON public.ticket_addons(event_id);

CREATE POLICY "Org members can manage ticket addons"
  ON public.ticket_addons FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = ticket_addons.event_id AND is_org_member(e.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = ticket_addons.event_id AND is_org_member(e.organization_id)
  ));

CREATE POLICY "Public can view ticket addons"
  ON public.ticket_addons FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = ticket_addons.event_id AND e.status = 'published'
  ));

CREATE TABLE public.registration_addons (
  registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  addon_id UUID NOT NULL REFERENCES public.ticket_addons(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1,
  PRIMARY KEY (registration_id, addon_id)
);

ALTER TABLE public.registration_addons ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registration_addons TO authenticated;

CREATE POLICY "Org members can manage registration addons"
  ON public.registration_addons FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM registrations r JOIN events e ON e.id = r.event_id
    WHERE r.id = registration_addons.registration_id AND is_org_member(e.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM registrations r JOIN events e ON e.id = r.event_id
    WHERE r.id = registration_addons.registration_id AND is_org_member(e.organization_id)
  ));

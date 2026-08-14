-- =====================
-- Migration 069: Attendee Categories
-- =====================

-- =====================
-- 1. attendee_categories table
-- =====================

CREATE TABLE public.attendee_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT 'blue',
  is_visible_in_directory BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.attendee_categories ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendee_categories TO authenticated;
GRANT SELECT ON public.attendee_categories TO anon;

CREATE UNIQUE INDEX idx_attendee_categories_event_name ON public.attendee_categories(event_id, name);
CREATE INDEX idx_attendee_categories_event ON public.attendee_categories(event_id);

CREATE POLICY "Org members can manage attendee categories"
  ON public.attendee_categories FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = attendee_categories.event_id AND is_org_member(e.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = attendee_categories.event_id AND is_org_member(e.organization_id)
  ));

CREATE POLICY "Public can view attendee categories"
  ON public.attendee_categories FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = attendee_categories.event_id AND e.status = 'published'
  ));

CREATE POLICY "Anon can view attendee categories"
  ON public.attendee_categories FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = attendee_categories.event_id AND e.status = 'published'
  ));

-- =====================
-- 2. ticket_type_categories join table
-- =====================

CREATE TABLE public.ticket_type_categories (
  ticket_type_id UUID NOT NULL REFERENCES public.ticket_types(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.attendee_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (ticket_type_id, category_id)
);

ALTER TABLE public.ticket_type_categories ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_type_categories TO authenticated;

CREATE INDEX idx_ticket_type_categories_category ON public.ticket_type_categories(category_id);

CREATE POLICY "Org members can manage ticket type categories"
  ON public.ticket_type_categories FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM ticket_types tt
    JOIN events e ON e.id = tt.event_id
    WHERE tt.id = ticket_type_categories.ticket_type_id AND is_org_member(e.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM ticket_types tt
    JOIN events e ON e.id = tt.event_id
    WHERE tt.id = ticket_type_categories.ticket_type_id AND is_org_member(e.organization_id)
  ));

CREATE POLICY "Public can view ticket type categories"
  ON public.ticket_type_categories FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM ticket_types tt
    JOIN events e ON e.id = tt.event_id
    WHERE tt.id = ticket_type_categories.ticket_type_id AND e.status = 'published'
  ));

-- =====================
-- 3. category_visibility matrix table
-- =====================

CREATE TABLE public.category_visibility (
  viewer_category_id UUID NOT NULL REFERENCES public.attendee_categories(id) ON DELETE CASCADE,
  visible_category_id UUID NOT NULL REFERENCES public.attendee_categories(id) ON DELETE CASCADE,
  PRIMARY KEY (viewer_category_id, visible_category_id)
);

ALTER TABLE public.category_visibility ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.category_visibility TO authenticated;

CREATE INDEX idx_category_visibility_viewer ON public.category_visibility(viewer_category_id);
CREATE INDEX idx_category_visibility_visible ON public.category_visibility(visible_category_id);

CREATE POLICY "Org members can manage category visibility"
  ON public.category_visibility FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM attendee_categories ac
    JOIN events e ON e.id = ac.event_id
    WHERE ac.id = category_visibility.viewer_category_id AND is_org_member(e.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM attendee_categories ac
    JOIN events e ON e.id = ac.event_id
    WHERE ac.id = category_visibility.viewer_category_id AND is_org_member(e.organization_id)
  ));

CREATE POLICY "Public can view category visibility"
  ON public.category_visibility FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM attendee_categories ac
    JOIN events e ON e.id = ac.event_id
    WHERE ac.id = category_visibility.viewer_category_id AND e.status = 'published'
  ));

-- =====================
-- 4. Add category_id FK to registrations
-- =====================

ALTER TABLE public.registrations
  ADD COLUMN category_id UUID REFERENCES public.attendee_categories(id) ON DELETE SET NULL;

CREATE INDEX idx_registrations_category_id ON public.registrations(event_id, category_id);

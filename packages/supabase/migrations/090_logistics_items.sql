-- =============================================================================
-- Migration 089: Logistics Items (Whova-style generic logistics)
-- Replaces the structured logistics JSONB column with a proper items table.
-- =============================================================================

-- =====================
-- 1. LOGISTICS_ITEMS TABLE
-- =====================

CREATE TABLE public.logistics_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  template TEXT NOT NULL CHECK (template IN ('welcome', 'venue', 'parking', 'hotel', 'travel_info', 'floor_map', 'custom')),
  title TEXT NOT NULL CHECK (char_length(title) <= 100),
  content TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.logistics_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_logistics_items_event_sort ON public.logistics_items(event_id, sort_order);

GRANT SELECT ON public.logistics_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.logistics_items TO authenticated;

-- =====================
-- 2. RLS POLICIES
-- =====================

-- Org members: full CRUD
CREATE POLICY "Org members can view logistics items"
  ON public.logistics_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = logistics_items.event_id
    AND is_org_member(e.organization_id)
  ));

CREATE POLICY "Org members can create logistics items"
  ON public.logistics_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = logistics_items.event_id
    AND is_org_member(e.organization_id)
  ));

CREATE POLICY "Org members can update logistics items"
  ON public.logistics_items FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = logistics_items.event_id
    AND is_org_member(e.organization_id)
  ));

CREATE POLICY "Org members can delete logistics items"
  ON public.logistics_items FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = logistics_items.event_id
    AND is_org_member(e.organization_id)
  ));

-- Public: anyone can read items for published events
CREATE POLICY "Anyone can view logistics for published events"
  ON public.logistics_items FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = logistics_items.event_id AND e.status = 'published'
  ));

CREATE POLICY "Authenticated can view logistics for published events"
  ON public.logistics_items FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = logistics_items.event_id AND e.status = 'published'
  ));

-- =====================
-- 3. DROP OLD JSONB COLUMN
-- =====================

ALTER TABLE public.events DROP COLUMN IF EXISTS logistics;

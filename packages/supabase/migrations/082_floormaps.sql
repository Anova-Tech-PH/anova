-- =============================================================================
-- Migration 082: Floor Maps
-- Interactive floor maps with markers for events
-- =============================================================================

-- =====================
-- 1. Storage bucket: floormap-images
-- =====================
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('floormap-images', 'floormap-images', true, 10485760)
ON CONFLICT (id) DO NOTHING;

-- Public read
CREATE POLICY "Anyone can view floormap images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'floormap-images');

-- Authenticated upload
CREATE POLICY "Authenticated users can upload floormap images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'floormap-images'
    AND auth.role() = 'authenticated'
  );

-- Authenticated delete
CREATE POLICY "Authenticated users can delete floormap images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'floormap-images'
    AND auth.role() = 'authenticated'
  );

-- =====================
-- 2. floormaps table
-- =====================
CREATE TABLE public.floormaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Floor Map',
  image_url TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_floormaps_event ON public.floormaps(event_id);

GRANT SELECT ON public.floormaps TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.floormaps TO authenticated;

ALTER TABLE public.floormaps ENABLE ROW LEVEL SECURITY;

-- Anyone can read floormaps
CREATE POLICY "Anyone can view floormaps"
  ON public.floormaps FOR SELECT
  USING (true);

-- Org members can manage floormaps
CREATE POLICY "Org members can manage floormaps"
  ON public.floormaps FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = floormaps.event_id
      AND public.is_org_member(e.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = floormaps.event_id
      AND public.is_org_member(e.organization_id)
    )
  );

-- =====================
-- 3. floormap_markers table
-- =====================
CREATE TABLE public.floormap_markers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  floormap_id UUID NOT NULL REFERENCES public.floormaps(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  x DOUBLE PRECISION NOT NULL,
  y DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_floormap_markers_floormap ON public.floormap_markers(floormap_id);

GRANT SELECT ON public.floormap_markers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.floormap_markers TO authenticated;

ALTER TABLE public.floormap_markers ENABLE ROW LEVEL SECURITY;

-- Anyone can read markers
CREATE POLICY "Anyone can view floormap markers"
  ON public.floormap_markers FOR SELECT
  USING (true);

-- Org members can manage markers (join through floormaps → events)
CREATE POLICY "Org members can manage floormap markers"
  ON public.floormap_markers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.floormaps f
      JOIN public.events e ON e.id = f.event_id
      WHERE f.id = floormap_markers.floormap_id
      AND public.is_org_member(e.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.floormaps f
      JOIN public.events e ON e.id = f.event_id
      WHERE f.id = floormap_markers.floormap_id
      AND public.is_org_member(e.organization_id)
    )
  );

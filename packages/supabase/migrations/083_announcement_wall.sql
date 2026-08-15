-- =============================================================================
-- Migration 083: Announcement Wall
-- Config and custom slides for the public announcement wall display
-- =============================================================================

-- =====================
-- 1. announcement_wall_config table
-- =====================
CREATE TABLE public.announcement_wall_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE UNIQUE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  rotation_speed INT NOT NULL DEFAULT 20,
  theme TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark', 'light')),
  show_event_overview BOOLEAN NOT NULL DEFAULT true,
  show_announcements BOOLEAN NOT NULL DEFAULT true,
  show_upcoming_sessions BOOLEAN NOT NULL DEFAULT true,
  show_sponsors BOOLEAN NOT NULL DEFAULT true,
  show_polls BOOLEAN NOT NULL DEFAULT true,
  show_custom_slides BOOLEAN NOT NULL DEFAULT true,
  session_lookahead_minutes INT NOT NULL DEFAULT 120,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_announcement_wall_config_event ON public.announcement_wall_config(event_id);

GRANT SELECT ON public.announcement_wall_config TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcement_wall_config TO authenticated;

ALTER TABLE public.announcement_wall_config ENABLE ROW LEVEL SECURITY;

-- Anyone can read wall config
CREATE POLICY "Anyone can view announcement wall config"
  ON public.announcement_wall_config FOR SELECT
  USING (true);

-- Org members can manage wall config
CREATE POLICY "Org members can manage announcement wall config"
  ON public.announcement_wall_config FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = announcement_wall_config.event_id
      AND public.is_org_member(e.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = announcement_wall_config.event_id
      AND public.is_org_member(e.organization_id)
    )
  );

-- =====================
-- 2. announcement_wall_slides table
-- =====================
CREATE TABLE public.announcement_wall_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  bg_color TEXT NOT NULL DEFAULT '#1e293b',
  display_order INT NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_announcement_wall_slides_event ON public.announcement_wall_slides(event_id);

GRANT SELECT ON public.announcement_wall_slides TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcement_wall_slides TO authenticated;

ALTER TABLE public.announcement_wall_slides ENABLE ROW LEVEL SECURITY;

-- Anyone can read slides
CREATE POLICY "Anyone can view announcement wall slides"
  ON public.announcement_wall_slides FOR SELECT
  USING (true);

-- Org members can manage slides
CREATE POLICY "Org members can manage announcement wall slides"
  ON public.announcement_wall_slides FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = announcement_wall_slides.event_id
      AND public.is_org_member(e.organization_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = announcement_wall_slides.event_id
      AND public.is_org_member(e.organization_id)
    )
  );

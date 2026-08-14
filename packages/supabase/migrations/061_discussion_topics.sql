-- Migration 061: Discussion Topics feature
-- Structured discussion topics within events

-- =====================
-- 1. DISCUSSION_TOPICS TABLE
-- =====================

CREATE TABLE public.discussion_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  is_built_in BOOLEAN NOT NULL DEFAULT false,
  built_in_key TEXT,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.discussion_topics ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discussion_topics TO authenticated;

CREATE INDEX idx_discussion_topics_event ON public.discussion_topics(event_id);

-- Unique constraint: prevent duplicate built-in topics per event
CREATE UNIQUE INDEX idx_discussion_topics_builtin_unique
  ON public.discussion_topics(event_id, built_in_key)
  WHERE built_in_key IS NOT NULL;

-- RLS: Org members can manage all discussion topics for their events
CREATE POLICY "Org members can view discussion topics"
  ON public.discussion_topics FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = discussion_topics.event_id
    AND is_org_member(e.organization_id)
  ));

CREATE POLICY "Org members can create discussion topics"
  ON public.discussion_topics FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = discussion_topics.event_id
    AND is_org_member(e.organization_id)
  ));

CREATE POLICY "Org members can update discussion topics"
  ON public.discussion_topics FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = discussion_topics.event_id
    AND is_org_member(e.organization_id)
  ));

CREATE POLICY "Org members can delete discussion topics"
  ON public.discussion_topics FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = discussion_topics.event_id
    AND is_org_member(e.organization_id)
  ));

-- Attendees can view visible topics for published events
CREATE POLICY "Attendees can view visible discussion topics"
  ON public.discussion_topics FOR SELECT TO authenticated
  USING (
    is_visible = true
    AND EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = discussion_topics.event_id AND e.status = 'published'
    )
  );

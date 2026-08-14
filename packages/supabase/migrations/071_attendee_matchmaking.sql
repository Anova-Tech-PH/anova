-- =====================
-- Migration 071: Attendee Matchmaking
-- event_interests: organizer-defined interests per event
-- attendee_interests: attendee selections
-- =====================

-- Event interests (organizer-managed)
CREATE TABLE public.event_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) <= 30),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_event_interests_event ON public.event_interests(event_id, sort_order);

-- Attendee interest selections
CREATE TABLE public.attendee_interests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  interest_id uuid NOT NULL REFERENCES public.event_interests(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, interest_id)
);

CREATE INDEX idx_attendee_interests_event_user ON public.attendee_interests(event_id, user_id);
CREATE INDEX idx_attendee_interests_interest ON public.attendee_interests(interest_id);

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_interests TO authenticated;
GRANT SELECT ON public.event_interests TO anon;
GRANT SELECT, INSERT, DELETE ON public.attendee_interests TO authenticated;

-- RLS: event_interests
ALTER TABLE public.event_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view event interests"
  ON public.event_interests FOR SELECT
  USING (true);

CREATE POLICY "Org members can manage event interests"
  ON public.event_interests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id
        AND public.is_org_member(e.organization_id)
    )
  );

-- RLS: attendee_interests
ALTER TABLE public.attendee_interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view attendee interests for their event"
  ON public.attendee_interests FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own interest selections"
  ON public.attendee_interests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interest selections"
  ON public.attendee_interests FOR DELETE
  USING (auth.uid() = user_id);

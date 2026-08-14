-- Migration 060: Meet-ups feature
-- Whova-style informal gatherings within events

-- =====================
-- 1. MEETUPS TABLE
-- =====================

CREATE TABLE public.meetups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  location TEXT,
  capacity INT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.meetups ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meetups TO authenticated;

CREATE INDEX idx_meetups_event ON public.meetups(event_id);
CREATE INDEX idx_meetups_status ON public.meetups(event_id, status);

-- RLS: Org members can manage all meetups for their events
CREATE POLICY "Org members can view meetups"
  ON public.meetups FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = meetups.event_id
    AND is_org_member(e.organization_id)
  ));

CREATE POLICY "Org members can create meetups"
  ON public.meetups FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = meetups.event_id
    AND is_org_member(e.organization_id)
  ));

CREATE POLICY "Org members can update meetups"
  ON public.meetups FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = meetups.event_id
    AND is_org_member(e.organization_id)
  ));

CREATE POLICY "Org members can delete meetups"
  ON public.meetups FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = meetups.event_id
    AND is_org_member(e.organization_id)
  ));

-- Attendees can view active meetups for published events
CREATE POLICY "Attendees can view active meetups"
  ON public.meetups FOR SELECT TO authenticated
  USING (
    status = 'active'
    AND EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = meetups.event_id AND e.status = 'published'
    )
  );

-- =====================
-- 2. MEETUP RSVPS TABLE
-- =====================

CREATE TABLE public.meetup_rsvps (
  meetup_id UUID NOT NULL REFERENCES public.meetups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'waitlisted', 'cancelled')),
  waitlist_position INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (meetup_id, user_id)
);

ALTER TABLE public.meetup_rsvps ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meetup_rsvps TO authenticated;

CREATE INDEX idx_meetup_rsvps_meetup ON public.meetup_rsvps(meetup_id);
CREATE INDEX idx_meetup_rsvps_user ON public.meetup_rsvps(user_id);
CREATE INDEX idx_meetup_rsvps_status ON public.meetup_rsvps(meetup_id, status);

-- Org members can view all RSVPs for their events
CREATE POLICY "Org members can manage meetup RSVPs"
  ON public.meetup_rsvps FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM meetups m JOIN events e ON e.id = m.event_id
    WHERE m.id = meetup_rsvps.meetup_id AND is_org_member(e.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM meetups m JOIN events e ON e.id = m.event_id
    WHERE m.id = meetup_rsvps.meetup_id AND is_org_member(e.organization_id)
  ));

-- Users can manage their own RSVPs
CREATE POLICY "Users can manage own meetup RSVPs"
  ON public.meetup_rsvps FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Anyone can view RSVP counts (for display)
CREATE POLICY "Attendees can view meetup RSVPs"
  ON public.meetup_rsvps FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM meetups m JOIN events e ON e.id = m.event_id
    WHERE m.id = meetup_rsvps.meetup_id AND e.status = 'published'
  ));

-- =====================
-- 3. RSVP FUNCTIONS
-- =====================

CREATE OR REPLACE FUNCTION public.rsvp_to_meetup(_meetup_id UUID)
RETURNS TEXT AS $$
DECLARE
  _capacity INT;
  _confirmed_count INT;
  _existing RECORD;
  _status TEXT;
  _waitlist_pos INT;
BEGIN
  SELECT * INTO _existing FROM meetup_rsvps
    WHERE meetup_id = _meetup_id AND user_id = auth.uid();
  IF _existing IS NOT NULL AND _existing.status != 'cancelled' THEN
    RETURN _existing.status;
  END IF;

  SELECT capacity INTO _capacity FROM meetups WHERE id = _meetup_id;

  IF _capacity IS NOT NULL THEN
    SELECT count(*) INTO _confirmed_count FROM meetup_rsvps
      WHERE meetup_id = _meetup_id AND status = 'confirmed';

    IF _confirmed_count >= _capacity THEN
      SELECT coalesce(max(waitlist_position), 0) + 1 INTO _waitlist_pos
        FROM meetup_rsvps WHERE meetup_id = _meetup_id AND status = 'waitlisted';
      _status := 'waitlisted';
    ELSE
      _status := 'confirmed';
      _waitlist_pos := NULL;
    END IF;
  ELSE
    _status := 'confirmed';
    _waitlist_pos := NULL;
  END IF;

  IF _existing IS NOT NULL THEN
    UPDATE meetup_rsvps SET status = _status, waitlist_position = _waitlist_pos
      WHERE meetup_id = _meetup_id AND user_id = auth.uid();
  ELSE
    INSERT INTO meetup_rsvps (meetup_id, user_id, status, waitlist_position)
      VALUES (_meetup_id, auth.uid(), _status, _waitlist_pos);
  END IF;

  RETURN _status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.cancel_meetup_rsvp(_meetup_id UUID)
RETURNS VOID AS $$
DECLARE
  _next RECORD;
BEGIN
  UPDATE meetup_rsvps SET status = 'cancelled'
    WHERE meetup_id = _meetup_id AND user_id = auth.uid();

  SELECT * INTO _next FROM meetup_rsvps
    WHERE meetup_id = _meetup_id AND status = 'waitlisted'
    ORDER BY waitlist_position ASC LIMIT 1;

  IF _next IS NOT NULL THEN
    UPDATE meetup_rsvps SET status = 'confirmed', waitlist_position = NULL
      WHERE meetup_id = _next.meetup_id AND user_id = _next.user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

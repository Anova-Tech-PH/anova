-- ============================================================
-- Phase 1: Engagement Features
-- Announcements, Session Feedback, Live Polling, Session RSVP
-- ============================================================

-- =====================
-- 1. ANNOUNCEMENTS
-- =====================

CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  target_audience JSONB NOT NULL DEFAULT '{"type": "all"}',
  channels TEXT[] NOT NULL DEFAULT '{in_app}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent')),
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  read_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.announcement_reads (
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (announcement_id, user_id)
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT SELECT, INSERT ON public.announcement_reads TO authenticated;

CREATE POLICY "Org members can manage announcements" ON public.announcements FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e WHERE e.id = announcements.event_id
    AND is_org_member(e.organization_id, 'editor')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM events e WHERE e.id = announcements.event_id
    AND is_org_member(e.organization_id, 'editor')
  ));

CREATE POLICY "Attendees can view sent announcements" ON public.announcements FOR SELECT TO authenticated
  USING (status = 'sent' AND is_event_attendee(event_id));

CREATE POLICY "Users can insert own reads" ON public.announcement_reads FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own reads" ON public.announcement_reads FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.increment_announcement_read_count()
RETURNS trigger AS $$
BEGIN
  UPDATE public.announcements SET read_count = read_count + 1 WHERE id = NEW.announcement_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_announcement_read
  AFTER INSERT ON public.announcement_reads
  FOR EACH ROW EXECUTE FUNCTION public.increment_announcement_read_count();

CREATE INDEX idx_announcements_event ON public.announcements(event_id);
CREATE INDEX idx_announcements_status ON public.announcements(status);
CREATE INDEX idx_announcement_reads_user ON public.announcement_reads(user_id);

-- =====================
-- 1b. PRE-REQUISITE ALTERS
-- (needed by feedback + polling policies that reference speakers.user_id)
-- =====================

ALTER TABLE public.speakers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- =====================
-- 2. SESSION FEEDBACK
-- =====================

CREATE TABLE public.feedback_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Default Feedback',
  questions JSONB NOT NULL DEFAULT '[]',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS feedback_form_id UUID REFERENCES public.feedback_forms(id) ON DELETE SET NULL;

CREATE TABLE public.session_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feedback_form_id UUID NOT NULL REFERENCES public.feedback_forms(id) ON DELETE CASCADE,
  answers JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

ALTER TABLE public.feedback_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_feedback ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback_forms TO authenticated;
GRANT SELECT, INSERT ON public.session_feedback TO authenticated;

CREATE POLICY "Org members can manage feedback forms" ON public.feedback_forms FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e WHERE e.id = feedback_forms.event_id
    AND is_org_member(e.organization_id, 'editor')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM events e WHERE e.id = feedback_forms.event_id
    AND is_org_member(e.organization_id, 'editor')
  ));

CREATE POLICY "Attendees can view feedback forms" ON public.feedback_forms FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e WHERE e.id = feedback_forms.event_id
    AND e.status IN ('published', 'completed') AND is_event_attendee(e.id)
  ));

CREATE POLICY "Attendees can submit session feedback" ON public.session_feedback FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Org members can view session feedback" ON public.session_feedback FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sessions s JOIN events e ON e.id = s.event_id
    WHERE s.id = session_feedback.session_id AND is_org_member(e.organization_id)
  ));

CREATE POLICY "Speakers can view own session feedback" ON public.session_feedback FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM session_speakers ss JOIN speakers sp ON sp.id = ss.speaker_id
    WHERE ss.session_id = session_feedback.session_id AND sp.user_id = auth.uid()
  ));

CREATE INDEX idx_feedback_forms_event ON public.feedback_forms(event_id);
CREATE INDEX idx_session_feedback_session ON public.session_feedback(session_id);

-- =====================
-- 3. LIVE POLLING
-- =====================

CREATE TABLE public.live_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'closed')),
  show_results BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.live_poll_votes (
  poll_id UUID NOT NULL REFERENCES public.live_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (poll_id, user_id)
);

ALTER TABLE public.live_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_poll_votes ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_polls TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.live_poll_votes TO authenticated;

CREATE POLICY "Org members can manage live polls" ON public.live_polls FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e WHERE e.id = live_polls.event_id
    AND is_org_member(e.organization_id, 'editor')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM events e WHERE e.id = live_polls.event_id
    AND is_org_member(e.organization_id, 'editor')
  ));

CREATE POLICY "Speakers can manage own session polls" ON public.live_polls FOR ALL TO authenticated
  USING (
    created_by = auth.uid() AND session_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM session_speakers ss JOIN speakers sp ON sp.id = ss.speaker_id
      WHERE ss.session_id = live_polls.session_id AND sp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    created_by = auth.uid() AND session_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM session_speakers ss JOIN speakers sp ON sp.id = ss.speaker_id
      WHERE ss.session_id = live_polls.session_id AND sp.user_id = auth.uid()
    )
  );

CREATE POLICY "Attendees can view polls" ON public.live_polls FOR SELECT TO authenticated
  USING (status IN ('open', 'closed') AND is_event_attendee(event_id));

CREATE POLICY "Attendees can vote" ON public.live_poll_votes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Attendees can change vote" ON public.live_poll_votes FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Org members can view votes" ON public.live_poll_votes FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM live_polls lp JOIN events e ON e.id = lp.event_id
    WHERE lp.id = live_poll_votes.poll_id AND is_org_member(e.organization_id)
  ));

CREATE POLICY "Users can view own votes" ON public.live_poll_votes FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX idx_live_polls_event ON public.live_polls(event_id);
CREATE INDEX idx_live_polls_session ON public.live_polls(session_id);
CREATE INDEX idx_live_poll_votes_poll ON public.live_poll_votes(poll_id);

-- =====================
-- 4. SESSION RSVP + CAPACITY
-- =====================

ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS capacity INT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS rsvp_enabled BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE public.session_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'waitlisted', 'cancelled')),
  waitlist_position INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

ALTER TABLE public.session_rsvps ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_rsvps TO authenticated;

CREATE POLICY "Org members can manage RSVPs" ON public.session_rsvps FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sessions s JOIN events e ON e.id = s.event_id
    WHERE s.id = session_rsvps.session_id AND is_org_member(e.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM sessions s JOIN events e ON e.id = s.event_id
    WHERE s.id = session_rsvps.session_id AND is_org_member(e.organization_id)
  ));

CREATE POLICY "Attendees can manage own RSVPs" ON public.session_rsvps FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Attendees can view RSVPs" ON public.session_rsvps FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sessions s JOIN events e ON e.id = s.event_id
    WHERE s.id = session_rsvps.session_id AND e.status = 'published'
  ));

CREATE OR REPLACE FUNCTION public.rsvp_to_session(_session_id UUID)
RETURNS TEXT AS $$
DECLARE
  _capacity INT;
  _confirmed_count INT;
  _existing RECORD;
  _status TEXT;
  _waitlist_pos INT;
BEGIN
  SELECT * INTO _existing FROM session_rsvps
    WHERE session_id = _session_id AND user_id = auth.uid();
  IF _existing IS NOT NULL AND _existing.status != 'cancelled' THEN
    RETURN _existing.status;
  END IF;

  SELECT capacity INTO _capacity FROM sessions WHERE id = _session_id;

  IF _capacity IS NOT NULL THEN
    SELECT count(*) INTO _confirmed_count FROM session_rsvps
      WHERE session_id = _session_id AND status = 'confirmed';

    IF _confirmed_count >= _capacity THEN
      SELECT coalesce(max(waitlist_position), 0) + 1 INTO _waitlist_pos
        FROM session_rsvps WHERE session_id = _session_id AND status = 'waitlisted';
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
    UPDATE session_rsvps SET status = _status, waitlist_position = _waitlist_pos,
      updated_at = now() WHERE id = _existing.id;
  ELSE
    INSERT INTO session_rsvps (session_id, user_id, status, waitlist_position)
      VALUES (_session_id, auth.uid(), _status, _waitlist_pos);
  END IF;

  RETURN _status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.cancel_session_rsvp(_session_id UUID)
RETURNS VOID AS $$
DECLARE
  _next RECORD;
BEGIN
  UPDATE session_rsvps SET status = 'cancelled', updated_at = now()
    WHERE session_id = _session_id AND user_id = auth.uid();

  SELECT * INTO _next FROM session_rsvps
    WHERE session_id = _session_id AND status = 'waitlisted'
    ORDER BY waitlist_position ASC LIMIT 1;

  IF _next IS NOT NULL THEN
    UPDATE session_rsvps SET status = 'confirmed', waitlist_position = NULL, updated_at = now()
      WHERE id = _next.id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE INDEX idx_session_rsvps_session ON public.session_rsvps(session_id);
CREATE INDEX idx_session_rsvps_user ON public.session_rsvps(user_id);
CREATE INDEX idx_session_rsvps_status ON public.session_rsvps(session_id, status);

-- Migration 067: Registration settings + waitlist

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS registration_settings JSONB NOT NULL DEFAULT '{}';

CREATE TABLE public.waitlist_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  ticket_type_id UUID REFERENCES public.ticket_types(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, email)
);

ALTER TABLE public.waitlist_entries ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.waitlist_entries TO authenticated;
GRANT INSERT ON public.waitlist_entries TO anon;

CREATE INDEX idx_waitlist_event ON public.waitlist_entries(event_id);

CREATE POLICY "Org members can manage waitlist"
  ON public.waitlist_entries FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = waitlist_entries.event_id AND is_org_member(e.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = waitlist_entries.event_id AND is_org_member(e.organization_id)
  ));

CREATE POLICY "Anon can join waitlist"
  ON public.waitlist_entries FOR INSERT TO anon
  WITH CHECK (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = waitlist_entries.event_id AND e.status = 'published'
  ));

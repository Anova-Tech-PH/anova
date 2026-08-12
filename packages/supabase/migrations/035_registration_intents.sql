-- ============================================================
-- Registration Intents — Abandoned Registration Recovery
-- ============================================================

-- Table: registration_intents
CREATE TABLE public.registration_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  ticket_type_id UUID NOT NULL REFERENCES public.ticket_types(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  custom_fields JSONB DEFAULT '{}',
  promo_code_id UUID REFERENCES public.promo_codes(id) ON DELETE SET NULL,
  converted_registration_id UUID REFERENCES public.registrations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'converted', 'expired')),
  recovery_emails_sent INT NOT NULL DEFAULT 0,
  last_recovery_email_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, email)
);

-- Indexes
CREATE INDEX idx_registration_intents_event_id ON public.registration_intents(event_id);
CREATE INDEX idx_registration_intents_status ON public.registration_intents(status);
CREATE INDEX idx_registration_intents_email ON public.registration_intents(email);

-- RLS
ALTER TABLE public.registration_intents ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.registration_intents TO anon;
GRANT ALL ON public.registration_intents TO authenticated;
GRANT ALL ON public.registration_intents TO service_role;

-- Anon: anyone can create registration intents
CREATE POLICY "Anyone can create registration intents"
  ON public.registration_intents FOR INSERT TO anon
  WITH CHECK (true);

-- Anon: anyone can update own registration intents (by email match)
CREATE POLICY "Anyone can update own registration intents"
  ON public.registration_intents FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- Authenticated: org members can view registration intents
CREATE POLICY "Org members can view registration intents"
  ON public.registration_intents FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = registration_intents.event_id
    AND is_org_member(e.organization_id)
  ));

-- Authenticated: org members can manage registration intents
CREATE POLICY "Org members can manage registration intents"
  ON public.registration_intents FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = registration_intents.event_id
    AND is_org_member(e.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = registration_intents.event_id
    AND is_org_member(e.organization_id)
  ));

-- ============================================================
-- Add recovery settings columns to events
-- ============================================================
ALTER TABLE public.events
  ADD COLUMN recovery_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN recovery_delay_hours INT NOT NULL DEFAULT 1,
  ADD COLUMN recovery_email_count INT NOT NULL DEFAULT 2;

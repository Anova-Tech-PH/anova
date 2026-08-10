-- ============================================================
-- Phase 2: Certificate Configuration & Issuance
-- ============================================================

CREATE TABLE public.certificate_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Certificate of Attendance',
  min_check_ins INT NOT NULL DEFAULT 1,
  required_session_ids UUID[] NOT NULL DEFAULT '{}',
  custom_fields JSONB NOT NULL DEFAULT '{}',
  template_style TEXT NOT NULL DEFAULT 'classic',
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id)
);

CREATE TABLE public.certificates_issued (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID NOT NULL REFERENCES public.certificate_configs(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES public.registrations(id) ON DELETE CASCADE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  emailed_at TIMESTAMPTZ,
  UNIQUE(config_id, registration_id)
);

-- RLS
ALTER TABLE public.certificate_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates_issued ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.certificate_configs TO authenticated;
GRANT SELECT, INSERT ON public.certificates_issued TO authenticated;
GRANT SELECT ON public.certificate_configs TO anon;
GRANT SELECT ON public.certificates_issued TO anon;

-- Org editors can manage certificate configs
CREATE POLICY "Org members can manage certificate configs" ON public.certificate_configs FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e WHERE e.id = certificate_configs.event_id
    AND is_org_member(e.organization_id, 'editor')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM events e WHERE e.id = certificate_configs.event_id
    AND is_org_member(e.organization_id, 'editor')
  ));

-- Anyone can view enabled configs (for public download page)
CREATE POLICY "Anyone can view enabled certificate configs" ON public.certificate_configs FOR SELECT
  USING (enabled AND EXISTS (
    SELECT 1 FROM events e WHERE e.id = certificate_configs.event_id
    AND e.status IN ('published', 'completed')
  ));

-- Org members can view all issued certificates
CREATE POLICY "Org members can view issued certificates" ON public.certificates_issued FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM certificate_configs cc
    JOIN events e ON e.id = cc.event_id
    WHERE cc.id = certificates_issued.config_id
    AND is_org_member(e.organization_id)
  ));

-- Org editors can insert issued certificates
CREATE POLICY "Org editors can insert issued certificates" ON public.certificates_issued FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM certificate_configs cc
    JOIN events e ON e.id = cc.event_id
    WHERE cc.id = certificates_issued.config_id
    AND is_org_member(e.organization_id, 'editor')
  ));

-- Attendees can view their own certificates (by matching registration)
CREATE POLICY "Attendees can view own certificates" ON public.certificates_issued FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM registrations r
    WHERE r.id = certificates_issued.registration_id
    AND r.user_id = auth.uid()
  ));

-- Indexes
CREATE INDEX idx_certificate_configs_event ON public.certificate_configs(event_id);
CREATE INDEX idx_certificates_issued_config ON public.certificates_issued(config_id);
CREATE INDEX idx_certificates_issued_registration ON public.certificates_issued(registration_id);

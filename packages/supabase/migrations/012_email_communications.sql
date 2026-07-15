-- =============================================================================
-- Email & Communications: templates, logs, automations, and unsubscribe support
-- =============================================================================

-- Email templates (reusable per organization)
CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'transactional' CHECK (type IN ('transactional', 'marketing')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Email send log
CREATE TABLE public.email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.email_templates(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'delivered', 'failed', 'bounced')),
  resend_id TEXT,
  sent_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Automated email rules per event
CREATE TABLE public.email_automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  trigger TEXT NOT NULL CHECK (trigger IN ('on_registration', 'pre_event_24h', 'pre_event_1h', 'post_event')),
  template_id UUID NOT NULL REFERENCES public.email_templates(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, trigger)
);

-- Add unsubscribed flag to registrations
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS unsubscribed BOOLEAN NOT NULL DEFAULT false;

-- Indexes
CREATE INDEX idx_email_logs_event_id ON public.email_logs(event_id);
CREATE INDEX idx_email_logs_status ON public.email_logs(status);
CREATE INDEX idx_email_automations_event_id ON public.email_automations(event_id);
CREATE INDEX idx_email_templates_org_id ON public.email_templates(organization_id);

-- RLS policies
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_automations ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_templates TO authenticated;
GRANT SELECT, INSERT ON public.email_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_automations TO authenticated;

-- email_templates: org members can manage
CREATE POLICY "Org members can manage email templates"
  ON public.email_templates FOR ALL TO authenticated
  USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));

-- email_logs: org members can view and insert
CREATE POLICY "Org members can view email logs"
  ON public.email_logs FOR SELECT TO authenticated
  USING (is_org_member(organization_id));

CREATE POLICY "Org members can insert email logs"
  ON public.email_logs FOR INSERT TO authenticated
  WITH CHECK (is_org_member(organization_id));

-- email_automations: via event's org membership
CREATE POLICY "Org members can manage email automations"
  ON public.email_automations FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE e.id = email_automations.event_id AND om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.organization_members om ON om.organization_id = e.organization_id
      WHERE e.id = email_automations.event_id AND om.user_id = auth.uid()
    )
  );

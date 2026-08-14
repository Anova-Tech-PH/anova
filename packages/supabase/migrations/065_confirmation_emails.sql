-- Migration 065: Confirmation email templates

CREATE TABLE public.confirmation_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  ticket_type_id UUID REFERENCES public.ticket_types(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, ticket_type_id)
);

ALTER TABLE public.confirmation_email_templates ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.confirmation_email_templates TO authenticated;

CREATE INDEX idx_confirmation_emails_event ON public.confirmation_email_templates(event_id);

CREATE POLICY "Org members can manage confirmation emails"
  ON public.confirmation_email_templates FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = confirmation_email_templates.event_id AND is_org_member(e.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM events e
    WHERE e.id = confirmation_email_templates.event_id AND is_org_member(e.organization_id)
  ));

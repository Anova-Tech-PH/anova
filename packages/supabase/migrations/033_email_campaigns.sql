-- ============================================================
-- Email Campaigns: Contact Lists, Contacts, Campaigns
-- ============================================================

-- Contact Lists (per organization)
CREATE TABLE public.contact_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Contacts (within a list)
CREATE TABLE public.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_list_id UUID NOT NULL REFERENCES public.contact_lists(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  unsubscribed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(contact_list_id, email)
);

-- Email Campaigns
CREATE TABLE public.email_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL DEFAULT '',
  sender_name TEXT,
  reply_to TEXT,
  recipient_source TEXT NOT NULL DEFAULT 'registrants',
  contact_list_id UUID REFERENCES public.contact_lists(id) ON DELETE SET NULL,
  segment_filters JSONB,
  include_cta BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'draft',
  sent_count INT NOT NULL DEFAULT 0,
  failed_count INT NOT NULL DEFAULT 0,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add campaign_id to email_logs
ALTER TABLE public.email_logs ADD COLUMN campaign_id UUID REFERENCES public.email_campaigns(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE public.contact_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_lists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.email_campaigns TO authenticated;

-- Contact Lists: org members can manage
CREATE POLICY "Org members manage contact lists" ON public.contact_lists FOR ALL TO authenticated
  USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));

-- Contacts: org members can manage (via join to contact_lists)
CREATE POLICY "Org members manage contacts" ON public.contacts FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM contact_lists cl WHERE cl.id = contacts.contact_list_id
    AND is_org_member(cl.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM contact_lists cl WHERE cl.id = contacts.contact_list_id
    AND is_org_member(cl.organization_id)
  ));

-- Email Campaigns: org members can manage (via join to events)
CREATE POLICY "Org members manage campaigns" ON public.email_campaigns FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e WHERE e.id = email_campaigns.event_id
    AND is_org_member(e.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM events e WHERE e.id = email_campaigns.event_id
    AND is_org_member(e.organization_id)
  ));

-- Indexes
CREATE INDEX idx_contact_lists_org ON public.contact_lists(organization_id);
CREATE INDEX idx_contacts_list ON public.contacts(contact_list_id);
CREATE INDEX idx_email_campaigns_event ON public.email_campaigns(event_id);
CREATE INDEX idx_email_logs_campaign ON public.email_logs(campaign_id);

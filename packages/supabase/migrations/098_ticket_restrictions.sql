-- Migration 098: Ticket restrictions for member & invite-only ticketing
-- Supports 4 restriction types matching Whova:
--   1. email_list - invited email addresses
--   2. org_domain - specific organizations (e.g., @harvard.edu)
--   3. domain_type - organization types (e.g., .edu, .gov)
--   4. membership - membership levels/IDs

CREATE TABLE public.ticket_restrictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_type_id uuid NOT NULL REFERENCES public.ticket_types(id) ON DELETE CASCADE,
  restriction_type text NOT NULL CHECK (restriction_type IN ('email_list', 'org_domain', 'domain_type', 'membership')),
  values text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ticket_type_id, restriction_type)
);

ALTER TABLE public.ticket_restrictions ENABLE ROW LEVEL SECURITY;

-- Grant access to authenticated and anon (RLS handles row-level)
GRANT SELECT ON public.ticket_restrictions TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.ticket_restrictions TO authenticated;

-- Organizers can view and manage restrictions
CREATE POLICY "Restrictions follow ticket visibility"
  ON public.ticket_restrictions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.ticket_types tt
    JOIN public.events e ON e.id = tt.event_id
    WHERE tt.id = ticket_restrictions.ticket_type_id
      AND (e.status = 'published' OR public.is_org_member(e.organization_id))
  ));

CREATE POLICY "Editors can manage restrictions"
  ON public.ticket_restrictions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.ticket_types tt
    JOIN public.events e ON e.id = tt.event_id
    WHERE tt.id = ticket_restrictions.ticket_type_id
      AND public.is_org_member(e.organization_id, 'editor')
  ));

CREATE INDEX idx_ticket_restrictions_ticket ON public.ticket_restrictions(ticket_type_id);

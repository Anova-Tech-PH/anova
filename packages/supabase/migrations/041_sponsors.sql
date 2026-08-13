-- =============================================================================
-- Sponsor Center
-- Sponsor tiers, sponsors, documents, coupons, leads, booth messages & visits
-- =============================================================================

-- Sponsor Tiers
CREATE TABLE public.sponsor_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  logo_size TEXT NOT NULL DEFAULT 'medium' CHECK (logo_size IN ('large', 'medium', 'small')),
  benefits JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sponsors
CREATE TABLE public.sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  tier_id UUID REFERENCES public.sponsor_tiers(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  logo TEXT,
  description TEXT,
  website_url TEXT,
  promo_video_url TEXT,
  booth_enabled BOOLEAN NOT NULL DEFAULT false,
  contact_email TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sponsor Documents
CREATE TABLE public.sponsor_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID NOT NULL REFERENCES public.sponsors(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sponsor Coupons
CREATE TABLE public.sponsor_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID NOT NULL REFERENCES public.sponsors(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT,
  discount_value NUMERIC NOT NULL,
  discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  valid_until TIMESTAMPTZ,
  max_uses INT,
  current_uses INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sponsor Leads
CREATE TABLE public.sponsor_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID NOT NULL REFERENCES public.sponsors(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  company TEXT,
  job_title TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sponsor_id, user_id)
);

-- Booth Messages
CREATE TABLE public.booth_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID NOT NULL REFERENCES public.sponsors(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  is_from_sponsor BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Booth Visits
CREATE TABLE public.booth_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID NOT NULL REFERENCES public.sponsors(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sponsor_id, user_id)
);

-- =============================================================================
-- Indexes
-- =============================================================================

CREATE INDEX idx_sponsor_tiers_event ON public.sponsor_tiers(event_id);
CREATE INDEX idx_sponsors_event ON public.sponsors(event_id);
CREATE INDEX idx_sponsors_tier ON public.sponsors(tier_id);
CREATE INDEX idx_sponsor_documents_sponsor ON public.sponsor_documents(sponsor_id);
CREATE INDEX idx_sponsor_coupons_sponsor ON public.sponsor_coupons(sponsor_id);
CREATE INDEX idx_sponsor_leads_sponsor ON public.sponsor_leads(sponsor_id);
CREATE INDEX idx_sponsor_leads_event ON public.sponsor_leads(event_id);
CREATE INDEX idx_sponsor_leads_user ON public.sponsor_leads(user_id);
CREATE INDEX idx_booth_messages_sponsor ON public.booth_messages(sponsor_id);
CREATE INDEX idx_booth_messages_event ON public.booth_messages(event_id);
CREATE INDEX idx_booth_messages_user ON public.booth_messages(user_id);
CREATE INDEX idx_booth_visits_sponsor ON public.booth_visits(sponsor_id);
CREATE INDEX idx_booth_visits_event ON public.booth_visits(event_id);
CREATE INDEX idx_booth_visits_user ON public.booth_visits(user_id);

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE public.sponsor_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booth_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booth_visits ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Grants
-- =============================================================================

-- Tiers
GRANT SELECT ON public.sponsor_tiers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsor_tiers TO authenticated;
GRANT ALL ON public.sponsor_tiers TO service_role;

-- Sponsors
GRANT SELECT ON public.sponsors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsors TO authenticated;
GRANT ALL ON public.sponsors TO service_role;

-- Sponsor Documents
GRANT SELECT ON public.sponsor_documents TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsor_documents TO authenticated;
GRANT ALL ON public.sponsor_documents TO service_role;

-- Sponsor Coupons
GRANT SELECT ON public.sponsor_coupons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsor_coupons TO authenticated;
GRANT ALL ON public.sponsor_coupons TO service_role;

-- Leads
GRANT SELECT, INSERT ON public.sponsor_leads TO authenticated;
GRANT ALL ON public.sponsor_leads TO service_role;

-- Booth Messages
GRANT SELECT, INSERT ON public.booth_messages TO authenticated;
GRANT ALL ON public.booth_messages TO service_role;

-- Booth Visits
GRANT SELECT, INSERT ON public.booth_visits TO authenticated;
GRANT ALL ON public.booth_visits TO service_role;

-- =============================================================================
-- RLS Policies — Sponsor Tiers
-- =============================================================================

CREATE POLICY "Anyone can view tiers for published events"
  ON public.sponsor_tiers FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM events e WHERE e.id = sponsor_tiers.event_id AND e.status = 'published'
  ));

CREATE POLICY "Authenticated can view tiers"
  ON public.sponsor_tiers FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e WHERE e.id = sponsor_tiers.event_id
    AND (e.status = 'published' OR is_org_member(e.organization_id))
  ));

CREATE POLICY "Org members can manage tiers"
  ON public.sponsor_tiers FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e WHERE e.id = sponsor_tiers.event_id AND is_org_member(e.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM events e WHERE e.id = sponsor_tiers.event_id AND is_org_member(e.organization_id)
  ));

-- =============================================================================
-- RLS Policies — Sponsors
-- =============================================================================

CREATE POLICY "Anyone can view sponsors for published events"
  ON public.sponsors FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM events e WHERE e.id = sponsors.event_id AND e.status = 'published'
  ));

CREATE POLICY "Authenticated can view sponsors"
  ON public.sponsors FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e WHERE e.id = sponsors.event_id
    AND (e.status = 'published' OR is_org_member(e.organization_id))
  ));

CREATE POLICY "Org members can manage sponsors"
  ON public.sponsors FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM events e WHERE e.id = sponsors.event_id AND is_org_member(e.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM events e WHERE e.id = sponsors.event_id AND is_org_member(e.organization_id)
  ));

-- =============================================================================
-- RLS Policies — Sponsor Documents
-- =============================================================================

CREATE POLICY "Anyone can view sponsor documents for published events"
  ON public.sponsor_documents FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM sponsors s
    JOIN events e ON e.id = s.event_id
    WHERE s.id = sponsor_documents.sponsor_id AND e.status = 'published'
  ));

CREATE POLICY "Authenticated can view sponsor documents"
  ON public.sponsor_documents FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sponsors s
    JOIN events e ON e.id = s.event_id
    WHERE s.id = sponsor_documents.sponsor_id
    AND (e.status = 'published' OR is_org_member(e.organization_id))
  ));

CREATE POLICY "Org members can manage sponsor documents"
  ON public.sponsor_documents FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sponsors s
    JOIN events e ON e.id = s.event_id
    WHERE s.id = sponsor_documents.sponsor_id AND is_org_member(e.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM sponsors s
    JOIN events e ON e.id = s.event_id
    WHERE s.id = sponsor_documents.sponsor_id AND is_org_member(e.organization_id)
  ));

-- =============================================================================
-- RLS Policies — Sponsor Coupons
-- =============================================================================

CREATE POLICY "Anyone can view sponsor coupons for published events"
  ON public.sponsor_coupons FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM sponsors s
    JOIN events e ON e.id = s.event_id
    WHERE s.id = sponsor_coupons.sponsor_id AND e.status = 'published'
  ));

CREATE POLICY "Authenticated can view sponsor coupons"
  ON public.sponsor_coupons FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sponsors s
    JOIN events e ON e.id = s.event_id
    WHERE s.id = sponsor_coupons.sponsor_id
    AND (e.status = 'published' OR is_org_member(e.organization_id))
  ));

CREATE POLICY "Org members can manage sponsor coupons"
  ON public.sponsor_coupons FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM sponsors s
    JOIN events e ON e.id = s.event_id
    WHERE s.id = sponsor_coupons.sponsor_id AND is_org_member(e.organization_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM sponsors s
    JOIN events e ON e.id = s.event_id
    WHERE s.id = sponsor_coupons.sponsor_id AND is_org_member(e.organization_id)
  ));

-- =============================================================================
-- RLS Policies — Sponsor Leads
-- =============================================================================

CREATE POLICY "Users can submit own leads"
  ON public.sponsor_leads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own leads"
  ON public.sponsor_leads FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM events e WHERE e.id = sponsor_leads.event_id AND is_org_member(e.organization_id)
    )
  );

-- =============================================================================
-- RLS Policies — Booth Messages
-- =============================================================================

CREATE POLICY "Users can send booth messages"
  ON public.booth_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own or org booth messages"
  ON public.booth_messages FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM events e WHERE e.id = booth_messages.event_id AND is_org_member(e.organization_id)
    )
  );

-- =============================================================================
-- RLS Policies — Booth Visits
-- =============================================================================

CREATE POLICY "Users can record own booth visits"
  ON public.booth_visits FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Org members can view booth visits"
  ON public.booth_visits FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM events e WHERE e.id = booth_visits.event_id AND is_org_member(e.organization_id)
    )
  );

-- =============================================================================
-- Realtime
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.booth_messages;

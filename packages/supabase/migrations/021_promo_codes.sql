CREATE TABLE public.promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC(10, 2) NOT NULL,
  max_uses INT,
  current_uses INT NOT NULL DEFAULT 0,
  applies_to UUID[] DEFAULT '{}',
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, code)
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.promo_codes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promo_codes TO authenticated;

CREATE POLICY "Codes readable for published events"
  ON public.promo_codes FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = promo_codes.event_id
      AND (events.status = 'published' OR public.is_org_member(events.organization_id))
  ));

CREATE POLICY "Editors can manage promo codes"
  ON public.promo_codes FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = promo_codes.event_id
      AND public.is_org_member(events.organization_id, 'editor')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = promo_codes.event_id
      AND public.is_org_member(events.organization_id, 'editor')
  ));

ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES public.promo_codes(id) ON DELETE SET NULL;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0;

CREATE INDEX idx_promo_codes_event ON public.promo_codes(event_id);
CREATE INDEX idx_promo_codes_code ON public.promo_codes(event_id, code);

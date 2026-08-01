CREATE TABLE public.custom_registration_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  field_key TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'textarea', 'select', 'checkbox', 'number', 'date')),
  required BOOLEAN NOT NULL DEFAULT false,
  options JSONB DEFAULT '[]',
  placeholder TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, field_key)
);

ALTER TABLE public.custom_registration_fields ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.custom_registration_fields TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.custom_registration_fields TO authenticated;

CREATE POLICY "Fields visible for published events"
  ON public.custom_registration_fields FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = custom_registration_fields.event_id
      AND (events.status = 'published' OR public.is_org_member(events.organization_id))
  ));

CREATE POLICY "Editors can manage custom fields"
  ON public.custom_registration_fields FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = custom_registration_fields.event_id
      AND public.is_org_member(events.organization_id, 'editor')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = custom_registration_fields.event_id
      AND public.is_org_member(events.organization_id, 'editor')
  ));

CREATE INDEX idx_custom_reg_fields_event ON public.custom_registration_fields(event_id);

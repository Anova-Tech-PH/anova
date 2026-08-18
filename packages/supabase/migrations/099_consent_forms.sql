-- =============================================================
-- 099 – Release & Consent Forms
-- =============================================================

-- -----------------------------------------------------------
-- 1. consent_forms (max 2 per event, enforced at app level)
-- -----------------------------------------------------------
CREATE TABLE public.consent_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  audience text NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'attendees', 'speakers', 'volunteers')),
  require_before_checkin boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_consent_forms_event ON public.consent_forms(event_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.consent_forms TO authenticated;
GRANT SELECT ON public.consent_forms TO anon;

ALTER TABLE public.consent_forms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage consent forms"
  ON public.consent_forms FOR ALL TO authenticated
  USING (public.has_event_access(event_id, 'admin'))
  WITH CHECK (public.has_event_access(event_id, 'admin'));

CREATE POLICY "Public can view published consent forms"
  ON public.consent_forms FOR SELECT TO anon
  USING (status = 'published');

-- -----------------------------------------------------------
-- 2. consent_form_elements (form content blocks)
-- -----------------------------------------------------------
CREATE TABLE public.consent_form_elements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.consent_forms(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('description', 'checkbox', 'text', 'textarea', 'signature')),
  label text NOT NULL,
  is_required boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_consent_form_elements_form ON public.consent_form_elements(form_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.consent_form_elements TO authenticated;
GRANT SELECT ON public.consent_form_elements TO anon;

ALTER TABLE public.consent_form_elements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage consent form elements"
  ON public.consent_form_elements FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.consent_forms cf
    WHERE cf.id = consent_form_elements.form_id
      AND public.has_event_access(cf.event_id, 'admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.consent_forms cf
    WHERE cf.id = consent_form_elements.form_id
      AND public.has_event_access(cf.event_id, 'admin')
  ));

CREATE POLICY "Public can view published form elements"
  ON public.consent_form_elements FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.consent_forms cf
    WHERE cf.id = consent_form_elements.form_id AND cf.status = 'published'
  ));

-- -----------------------------------------------------------
-- 3. consent_form_submissions (one per person per form)
-- -----------------------------------------------------------
CREATE TABLE public.consent_form_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.consent_forms(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  name text NOT NULL,
  signed_name text NOT NULL,
  answers jsonb NOT NULL DEFAULT '{}',
  signed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_consent_form_submissions_unique ON public.consent_form_submissions(form_id, email);
CREATE INDEX idx_consent_form_submissions_event ON public.consent_form_submissions(event_id);
CREATE INDEX idx_consent_form_submissions_form ON public.consent_form_submissions(form_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.consent_form_submissions TO authenticated;
GRANT SELECT, INSERT ON public.consent_form_submissions TO anon;

ALTER TABLE public.consent_form_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage submissions"
  ON public.consent_form_submissions FOR ALL TO authenticated
  USING (public.has_event_access(event_id, 'admin'))
  WITH CHECK (public.has_event_access(event_id, 'admin'));

CREATE POLICY "Public can submit to published forms"
  ON public.consent_form_submissions FOR INSERT TO anon
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.consent_forms cf
    WHERE cf.id = consent_form_submissions.form_id AND cf.status = 'published'
  ));

CREATE POLICY "Users can view own submissions"
  ON public.consent_form_submissions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

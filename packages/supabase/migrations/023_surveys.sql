CREATE TABLE public.surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Post-Event Feedback',
  questions JSONB NOT NULL DEFAULT '[]',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id)
);

CREATE TABLE public.survey_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  registration_id UUID REFERENCES public.registrations(id) ON DELETE SET NULL,
  respondent_email TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(survey_id, respondent_email)
);

ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.surveys TO authenticated;
GRANT SELECT ON public.surveys TO anon;
GRANT SELECT, INSERT ON public.survey_responses TO anon;
GRANT SELECT, INSERT ON public.survey_responses TO authenticated;

CREATE POLICY "Org members can manage surveys" ON public.surveys FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM events WHERE events.id = surveys.event_id AND is_org_member(events.organization_id, 'editor')))
  WITH CHECK (EXISTS (SELECT 1 FROM events WHERE events.id = surveys.event_id AND is_org_member(events.organization_id, 'editor')));

CREATE POLICY "Survey viewable for published events" ON public.surveys FOR SELECT
  USING (active AND EXISTS (SELECT 1 FROM events WHERE events.id = surveys.event_id AND events.status IN ('published', 'completed')));

CREATE POLICY "Anyone can submit survey responses" ON public.survey_responses FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM surveys WHERE surveys.id = survey_responses.survey_id AND surveys.active));

CREATE POLICY "Org members can view responses" ON public.survey_responses FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM surveys s JOIN events e ON e.id = s.event_id
    WHERE s.id = survey_responses.survey_id AND is_org_member(e.organization_id)
  ));

CREATE INDEX idx_surveys_event ON public.surveys(event_id);
CREATE INDEX idx_survey_responses_survey ON public.survey_responses(survey_id);

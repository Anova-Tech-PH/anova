-- Attendee profile extensions: affiliations, education, and links

-- 1. Attendee affiliations (work history)
CREATE TABLE IF NOT EXISTS public.attendee_affiliations (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id     uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  organization text NOT NULL CHECK (char_length(organization) <= 200),
  role         text CHECK (role IS NULL OR char_length(role) <= 200),
  start_date   text,
  end_date     text,
  sort_order   int NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.attendee_affiliations ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.attendee_affiliations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendee_affiliations TO authenticated;

CREATE POLICY "Anyone can view affiliations"
  ON public.attendee_affiliations FOR SELECT
  USING (true);

CREATE POLICY "Users manage own affiliations"
  ON public.attendee_affiliations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_attendee_affiliations_event_user
  ON public.attendee_affiliations(event_id, user_id);

-- 2. Attendee education (education history)
CREATE TABLE IF NOT EXISTS public.attendee_education (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id       uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  school         text NOT NULL CHECK (char_length(school) <= 200),
  degree         text CHECK (degree IS NULL OR char_length(degree) <= 200),
  field_of_study text CHECK (field_of_study IS NULL OR char_length(field_of_study) <= 200),
  start_year     int,
  end_year       int,
  sort_order     int NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.attendee_education ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON public.attendee_education TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendee_education TO authenticated;

CREATE POLICY "Anyone can view education"
  ON public.attendee_education FOR SELECT
  USING (true);

CREATE POLICY "Users manage own education"
  ON public.attendee_education FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_attendee_education_event_user
  ON public.attendee_education(event_id, user_id);

-- 3. Add links JSONB column to attendee_profiles
ALTER TABLE public.attendee_profiles ADD COLUMN IF NOT EXISTS links jsonb NOT NULL DEFAULT '[]';

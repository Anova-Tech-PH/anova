-- =====================
-- Migration 096: Volunteer Manager
-- Call for Volunteers system: settings, roles, questions, applications, invitations
-- =====================

-- =====================
-- 1. volunteer_settings — per-event volunteer program config
-- =====================
CREATE TABLE public.volunteer_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Call for Volunteers',
  instructions text,
  banner_image_url text,
  application_deadline timestamptz,
  auto_accept boolean NOT NULL DEFAULT false,
  auto_add_to_attendees boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id)
);

CREATE INDEX idx_volunteer_settings_event ON public.volunteer_settings(event_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_settings TO authenticated;
GRANT SELECT ON public.volunteer_settings TO anon;

ALTER TABLE public.volunteer_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage volunteer settings"
  ON public.volunteer_settings FOR ALL TO authenticated
  USING (public.has_event_access(event_id, 'admin'))
  WITH CHECK (public.has_event_access(event_id, 'admin'));

CREATE POLICY "Public can view published volunteer settings"
  ON public.volunteer_settings FOR SELECT TO anon
  USING (is_published = true);

CREATE POLICY "Authenticated can view published volunteer settings"
  ON public.volunteer_settings FOR SELECT TO authenticated
  USING (is_published = true);

-- =====================
-- 2. volunteer_roles — roles available for volunteers
-- =====================
CREATE TABLE public.volunteer_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  max_volunteers int,
  role_type text NOT NULL DEFAULT 'custom' CHECK (role_type IN ('built_in', 'custom')),
  built_in_key text CHECK (built_in_key IN ('session_moderator', 'community_moderator', 'checkin_staff')),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_volunteer_roles_event ON public.volunteer_roles(event_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_roles TO authenticated;
GRANT SELECT ON public.volunteer_roles TO anon;

ALTER TABLE public.volunteer_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage volunteer roles"
  ON public.volunteer_roles FOR ALL TO authenticated
  USING (public.has_event_access(event_id, 'admin'))
  WITH CHECK (public.has_event_access(event_id, 'admin'));

CREATE POLICY "Public can view volunteer roles"
  ON public.volunteer_roles FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.volunteer_settings vs
    WHERE vs.event_id = volunteer_roles.event_id AND vs.is_published = true
  ));

CREATE POLICY "Authenticated can view published volunteer roles"
  ON public.volunteer_roles FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.volunteer_settings vs
    WHERE vs.event_id = volunteer_roles.event_id AND vs.is_published = true
  ));

-- =====================
-- 3. volunteer_questions — custom application questions
-- =====================
CREATE TABLE public.volunteer_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  is_required boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_volunteer_questions_event ON public.volunteer_questions(event_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_questions TO authenticated;
GRANT SELECT ON public.volunteer_questions TO anon;

ALTER TABLE public.volunteer_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage volunteer questions"
  ON public.volunteer_questions FOR ALL TO authenticated
  USING (public.has_event_access(event_id, 'admin'))
  WITH CHECK (public.has_event_access(event_id, 'admin'));

CREATE POLICY "Public can view volunteer questions"
  ON public.volunteer_questions FOR SELECT TO anon
  USING (EXISTS (
    SELECT 1 FROM public.volunteer_settings vs
    WHERE vs.event_id = volunteer_questions.event_id AND vs.is_published = true
  ));

CREATE POLICY "Authenticated can view published volunteer questions"
  ON public.volunteer_questions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.volunteer_settings vs
    WHERE vs.event_id = volunteer_questions.event_id AND vs.is_published = true
  ));

-- =====================
-- 4. volunteer_applications — submitted applications
-- =====================
CREATE TABLE public.volunteer_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  name text NOT NULL,
  phone text,
  organization text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  accepted_at timestamptz,
  rejected_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, email)
);

CREATE INDEX idx_volunteer_applications_event ON public.volunteer_applications(event_id);
CREATE INDEX idx_volunteer_applications_status ON public.volunteer_applications(event_id, status);
CREATE INDEX idx_volunteer_applications_user ON public.volunteer_applications(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_applications TO authenticated;
GRANT INSERT ON public.volunteer_applications TO anon;

ALTER TABLE public.volunteer_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage volunteer applications"
  ON public.volunteer_applications FOR ALL TO authenticated
  USING (public.has_event_access(event_id, 'admin'))
  WITH CHECK (public.has_event_access(event_id, 'admin'));

CREATE POLICY "Users can view own applications"
  ON public.volunteer_applications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Anyone can submit applications"
  ON public.volunteer_applications FOR INSERT TO anon
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.volunteer_settings vs
    WHERE vs.event_id = volunteer_applications.event_id
      AND vs.is_published = true
      AND (vs.application_deadline IS NULL OR vs.application_deadline > now())
  ));

CREATE POLICY "Authenticated users can submit applications"
  ON public.volunteer_applications FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.volunteer_settings vs
    WHERE vs.event_id = volunteer_applications.event_id
      AND vs.is_published = true
      AND (vs.application_deadline IS NULL OR vs.application_deadline > now())
  ));

-- =====================
-- 5. volunteer_application_answers — answers to custom questions
-- =====================
CREATE TABLE public.volunteer_application_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.volunteer_applications(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.volunteer_questions(id) ON DELETE CASCADE,
  answer_text text NOT NULL DEFAULT ''
);

CREATE INDEX idx_volunteer_answers_application ON public.volunteer_application_answers(application_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_application_answers TO authenticated;
GRANT INSERT ON public.volunteer_application_answers TO anon;

ALTER TABLE public.volunteer_application_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage answers"
  ON public.volunteer_application_answers FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.volunteer_applications va
    WHERE va.id = volunteer_application_answers.application_id
      AND public.has_event_access(va.event_id, 'admin')
  ));

CREATE POLICY "Users can view own answers"
  ON public.volunteer_application_answers FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.volunteer_applications va
    WHERE va.id = volunteer_application_answers.application_id
      AND va.user_id = auth.uid()
  ));

CREATE POLICY "Anon can insert answers"
  ON public.volunteer_application_answers FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated can insert answers"
  ON public.volunteer_application_answers FOR INSERT TO authenticated
  WITH CHECK (true);

-- =====================
-- 6. volunteer_application_roles — role preferences
-- =====================
CREATE TABLE public.volunteer_application_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.volunteer_applications(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.volunteer_roles(id) ON DELETE CASCADE
);

CREATE INDEX idx_volunteer_app_roles_application ON public.volunteer_application_roles(application_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_application_roles TO authenticated;
GRANT INSERT ON public.volunteer_application_roles TO anon;

ALTER TABLE public.volunteer_application_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage app roles"
  ON public.volunteer_application_roles FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.volunteer_applications va
    WHERE va.id = volunteer_application_roles.application_id
      AND public.has_event_access(va.event_id, 'admin')
  ));

CREATE POLICY "Users can view own role prefs"
  ON public.volunteer_application_roles FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.volunteer_applications va
    WHERE va.id = volunteer_application_roles.application_id
      AND va.user_id = auth.uid()
  ));

CREATE POLICY "Anon can insert role prefs"
  ON public.volunteer_application_roles FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated can insert role prefs"
  ON public.volunteer_application_roles FOR INSERT TO authenticated
  WITH CHECK (true);

-- =====================
-- 7. volunteer_application_availability — availability slots
-- =====================
CREATE TABLE public.volunteer_application_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.volunteer_applications(id) ON DELETE CASCADE,
  available_date date NOT NULL,
  start_time time,
  end_time time
);

CREATE INDEX idx_volunteer_availability_application ON public.volunteer_application_availability(application_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_application_availability TO authenticated;
GRANT INSERT ON public.volunteer_application_availability TO anon;

ALTER TABLE public.volunteer_application_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage availability"
  ON public.volunteer_application_availability FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.volunteer_applications va
    WHERE va.id = volunteer_application_availability.application_id
      AND public.has_event_access(va.event_id, 'admin')
  ));

CREATE POLICY "Users can view own availability"
  ON public.volunteer_application_availability FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.volunteer_applications va
    WHERE va.id = volunteer_application_availability.application_id
      AND va.user_id = auth.uid()
  ));

CREATE POLICY "Anon can insert availability"
  ON public.volunteer_application_availability FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Authenticated can insert availability"
  ON public.volunteer_application_availability FOR INSERT TO authenticated
  WITH CHECK (true);

-- =====================
-- 8. volunteer_role_assignments — actual role assignments after acceptance
-- =====================
CREATE TABLE public.volunteer_role_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES public.volunteer_applications(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES public.volunteer_roles(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(application_id, role_id)
);

CREATE INDEX idx_volunteer_assignments_application ON public.volunteer_role_assignments(application_id);
CREATE INDEX idx_volunteer_assignments_role ON public.volunteer_role_assignments(role_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_role_assignments TO authenticated;

ALTER TABLE public.volunteer_role_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage role assignments"
  ON public.volunteer_role_assignments FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.volunteer_applications va
    WHERE va.id = volunteer_role_assignments.application_id
      AND public.has_event_access(va.event_id, 'admin')
  ));

CREATE POLICY "Users can view own assignments"
  ON public.volunteer_role_assignments FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.volunteer_applications va
    WHERE va.id = volunteer_role_assignments.application_id
      AND va.user_id = auth.uid()
  ));

-- =====================
-- 9. volunteer_invitations — email invitations to volunteer
-- =====================
CREATE TABLE public.volunteer_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'opened', 'applied')),
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_volunteer_invitations_event ON public.volunteer_invitations(event_id);
CREATE INDEX idx_volunteer_invitations_email ON public.volunteer_invitations(event_id, email);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_invitations TO authenticated;

ALTER TABLE public.volunteer_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can manage invitations"
  ON public.volunteer_invitations FOR ALL TO authenticated
  USING (public.has_event_access(event_id, 'admin'))
  WITH CHECK (public.has_event_access(event_id, 'admin'));

-- =====================
-- 10. Create Supabase Storage bucket for volunteer banners
-- =====================
INSERT INTO storage.buckets (id, name, public)
VALUES ('volunteer-banners', 'volunteer-banners', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload volunteer banners"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'volunteer-banners');

CREATE POLICY "Anyone can view volunteer banners"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'volunteer-banners');

CREATE POLICY "Authenticated can view volunteer banners"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'volunteer-banners');

CREATE POLICY "Authenticated users can delete volunteer banners"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'volunteer-banners');

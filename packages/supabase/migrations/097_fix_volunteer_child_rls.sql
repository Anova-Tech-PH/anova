-- Migration 097: Tighten volunteer child table INSERT policies
-- Previously WITH CHECK (true) — now verify the application belongs to a published event

-- ─── volunteer_application_answers ───────────────────────────

DROP POLICY IF EXISTS "Anon can insert answers" ON public.volunteer_application_answers;
CREATE POLICY "Anon can insert answers"
  ON public.volunteer_application_answers FOR INSERT TO anon
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.volunteer_applications va
    JOIN public.volunteer_settings vs ON vs.event_id = va.event_id
    WHERE va.id = volunteer_application_answers.application_id
      AND vs.is_published = true
  ));

DROP POLICY IF EXISTS "Authenticated can insert answers" ON public.volunteer_application_answers;
CREATE POLICY "Authenticated can insert answers"
  ON public.volunteer_application_answers FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.volunteer_applications va
    JOIN public.volunteer_settings vs ON vs.event_id = va.event_id
    WHERE va.id = volunteer_application_answers.application_id
      AND vs.is_published = true
  ));

-- ─── volunteer_application_roles ─────────────────────────────

DROP POLICY IF EXISTS "Anon can insert role prefs" ON public.volunteer_application_roles;
CREATE POLICY "Anon can insert role prefs"
  ON public.volunteer_application_roles FOR INSERT TO anon
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.volunteer_applications va
    JOIN public.volunteer_settings vs ON vs.event_id = va.event_id
    WHERE va.id = volunteer_application_roles.application_id
      AND vs.is_published = true
  ));

DROP POLICY IF EXISTS "Authenticated can insert role prefs" ON public.volunteer_application_roles;
CREATE POLICY "Authenticated can insert role prefs"
  ON public.volunteer_application_roles FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.volunteer_applications va
    JOIN public.volunteer_settings vs ON vs.event_id = va.event_id
    WHERE va.id = volunteer_application_roles.application_id
      AND vs.is_published = true
  ));

-- ─── volunteer_application_availability ──────────────────────

DROP POLICY IF EXISTS "Anon can insert availability" ON public.volunteer_application_availability;
CREATE POLICY "Anon can insert availability"
  ON public.volunteer_application_availability FOR INSERT TO anon
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.volunteer_applications va
    JOIN public.volunteer_settings vs ON vs.event_id = va.event_id
    WHERE va.id = volunteer_application_availability.application_id
      AND vs.is_published = true
  ));

DROP POLICY IF EXISTS "Authenticated can insert availability" ON public.volunteer_application_availability;
CREATE POLICY "Authenticated can insert availability"
  ON public.volunteer_application_availability FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.volunteer_applications va
    JOIN public.volunteer_settings vs ON vs.event_id = va.event_id
    WHERE va.id = volunteer_application_availability.application_id
      AND vs.is_published = true
  ));
